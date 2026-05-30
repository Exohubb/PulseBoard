import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { WebSocket } from 'ws';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { IncidentsService } from '../incidents/incidents.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class CheckExecutor {
  private readonly logger = new Logger(CheckExecutor.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private incidentsService: IncidentsService,
    private alertsService: AlertsService
  ) {}

  async executeHttpCheck(monitor: any) {
    const startTime = Date.now();
    const config = monitor.httpConfig;
    const slowThreshold = monitor.slowThresholdMs || 1000; // Default 1s

    let checkRun: any;
    try {
      // Create initial check run record
      checkRun = await this.prisma.checkRun.create({
        data: {
          monitorId: monitor.id,
          workspaceId: monitor.workspaceId,
          startedAt: new Date(),
          availabilityState: 'pending',
          success: false,
        },
      });

      // Build request headers
      const headers: Record<string, string> = typeof config.headers === 'string'
        ? JSON.parse(config.headers)
        : (config.headers || {});

      // Parse auth config
      const authConfig = typeof config.authConfig === 'string' ? JSON.parse(config.authConfig) : config.authConfig;

      // Add auth headers
      if (config.authType === 'bearer' && authConfig?.token) {
        headers['Authorization'] = `Bearer ${authConfig.token}`;
      } else if (config.authType === 'basic' && authConfig?.username) {
        const credentials = Buffer.from(`${authConfig.username}:${authConfig.password || ''}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Make HTTP request
      const connectStart = Date.now();
      const response = await axios({
        method: config.method || 'GET',
        url: config.url,
        headers,
        data: config.body ? JSON.parse(config.body) : undefined,
        timeout: monitor.timeoutMs || 30000,
        validateStatus: () => true, // Don't throw on non-2xx
      });

      const totalTime = Date.now() - startTime;
      const connectTime = Date.now() - connectStart;

      // Determine availability state
      let availabilityState = 'up';
      if (totalTime > slowThreshold) {
        availabilityState = 'slow';
      }

      // Evaluate success
      const statusOk = response.status === (config.expectedStatus || 200);
      let success = statusOk;

      // Check JSON path assertion if configured
      if (success && config.expectedJsonPath && config.expectedJsonValue) {
        try {
          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          const value = this.getJsonPathValue(data, config.expectedJsonPath);
          success = value?.toString() === config.expectedJsonValue;
        } catch {
          success = false;
        }
      }

      // Create assertions
      await this.prisma.checkAssertion.createMany({
        data: [
          { checkRunId: checkRun.id, passed: statusOk, name: 'status_code', expected: `${config.expectedStatus || 200}`, actual: `${response.status}` },
          ...(config.expectedJsonPath ? [{ checkRunId: checkRun.id, passed: success, name: 'json_assertion', expected: config.expectedJsonValue, actual: this.getJsonPathValue(typeof response.data === 'string' ? JSON.parse(response.data) : response.data, config.expectedJsonPath)?.toString() }] : []),
        ],
      });

      // Update check run
      await this.prisma.checkRun.update({
        where: { id: checkRun.id },
        data: {
          completedAt: new Date(),
          durationMs: totalTime,
          success,
          statusCode: response.status,
          latencyConnectMs: connectTime,
          latencyTotalMs: totalTime,
          responseSizeBytes: JSON.stringify(response.data).length,
          availabilityState: success ? availabilityState : 'down',
        },
      });

      // Update monitor status (use 'slow' as 'up' for status purposes)
      await this.updateMonitorStatus(monitor, success, totalTime);

      // Emit realtime event
      this.realtimeGateway.emitCheckCompleted(monitor.workspaceId, checkRun.id, monitor.id, success, totalTime);

    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      // Determine error type
      let errorCode = 'ERROR';
      let errorMessage = error.message;

      if (error.code === 'ECONNREFUSED') {
        errorCode = 'CONNECTION_REFUSED';
        errorMessage = 'Connection refused - server is not accepting connections';
      } else if (error.code === 'ENOTFOUND') {
        errorCode = 'DNS_ERROR';
        errorMessage = 'DNS error - could not resolve hostname. Check if the domain is correct.';
      } else if (error.code === 'ETIMEDOUT') {
        errorCode = 'TIMEOUT';
        errorMessage = 'Connection timed out - server took too long to respond';
      } else if (error.code === 'ECONNRESET') {
        errorCode = 'CONNECTION_RESET';
        errorMessage = 'Connection was reset by the server';
      } else if (error.code === 'SSL_ERROR' || error.message.includes('certificate')) {
        errorCode = 'SSL_ERROR';
        errorMessage = 'SSL certificate error - certificate is invalid or expired';
      } else if (error.code === 'EHOSTUNREACH') {
        errorCode = 'HOST_UNREACHABLE';
        errorMessage = 'Host unreachable - cannot reach the server';
      } else if (error.message.includes('getaddrinfo') || error.message.includes('DNS')) {
        errorCode = 'DNS_ERROR';
        errorMessage = 'DNS resolution failed - could not resolve the domain name';
      }

      // Update check run with error
      if (checkRun) {
        await this.prisma.checkRun.update({
          where: { id: checkRun.id },
          data: {
            completedAt: new Date(),
            durationMs: totalTime,
            success: false,
            errorCode,
            errorMessage,
            availabilityState: 'down',
          },
        });
      }

      // Update monitor status
      await this.updateMonitorStatus(monitor, false, totalTime, errorMessage);

      this.logger.error(`HTTP check failed for ${monitor.name}: ${errorMessage}`);
    }
  }

  async executeWebSocketCheck(monitor: any) {
    const startTime = Date.now();
    const config = monitor.wsConfig;

    let checkRun: any;
    let ws: WebSocket | null = null;
    let resolved = false;

    return new Promise<void>((resolve) => {
      const cleanup = async () => {
        if (!resolved) {
          resolved = true;
          if (ws) {
            ws.close();
          }
          resolve();
        }
      };

      (async () => {
        try {
          // Create initial check run record
          checkRun = await this.prisma.checkRun.create({
            data: {
              monitorId: monitor.id,
              workspaceId: monitor.workspaceId,
              startedAt: new Date(),
              availabilityState: 'pending',
              success: false,
            },
          });

          // Build headers
          const wsHeaders: Record<string, string> = typeof config.headers === 'string'
            ? JSON.parse(config.headers)
            : (config.headers || {});
          const wsAuthConfig = typeof config.authConfig === 'string' ? JSON.parse(config.authConfig) : config.authConfig;

          if (config.authType === 'bearer' && wsAuthConfig?.token) {
            wsHeaders['Authorization'] = `Bearer ${wsAuthConfig.token}`;
          }

          // Set up timeout
          const timeout = setTimeout(() => {
            this.handleWsError(checkRun, monitor, Date.now() - startTime, 'TIMEOUT', 'Connection timeout');
            cleanup();
          }, monitor.timeoutMs || 5000);

          // Connect to WebSocket
          const connectStart = Date.now();
          ws = new WebSocket(config.url, { headers: wsHeaders });

          ws.on('open', async () => {
            const connectTime = Date.now() - connectStart;

            // Send auth message if configured
            if (wsAuthConfig?.token && config.subscribeMessage) {
              ws?.send(config.subscribeMessage);
            }

            // Wait for welcome message if expected
            if (config.expectWelcomeMessage) {
              const waitStart = Date.now();

              ws?.once('message', (data) => {
                const waitTime = Date.now() - waitStart;
                const message = data.toString();
                let matches = false;

                if (config.welcomeMatchType === 'contains') {
                  matches = message.includes(config.welcomeMatchValue || '');
                } else if (config.welcomeMatchType === 'exact') {
                  matches = message === config.welcomeMatchValue;
                } else if (config.welcomeMatchType === 'json_path' && config.welcomeMatchValue) {
                  try {
                    const parsed = JSON.parse(message);
                    matches = this.getJsonPathValue(parsed, config.welcomeMatchValue) !== undefined;
                  } catch {
                    matches = false;
                  }
                }

                if (!matches) {
                  this.handleWsError(checkRun, monitor, Date.now() - startTime, 'MESSAGE_MISMATCH', 'Welcome message did not match expected');
                  cleanup();
                  return;
                }

                this.handleWsSuccess(checkRun, monitor, Date.now() - startTime, connectTime, waitTime);
                cleanup();
              });

              ws?.on('error', (err) => {
                this.handleWsError(checkRun, monitor, Date.now() - startTime, 'WS_ERROR', err.message);
                cleanup();
              });
            } else {
              // No welcome message expected, check successful
              this.handleWsSuccess(checkRun, monitor, Date.now() - startTime, connectTime);
              cleanup();
            }
          });

          ws.on('error', (err) => {
            clearTimeout(timeout);
            this.handleWsError(checkRun, monitor, Date.now() - startTime, 'WS_ERROR', err.message);
            cleanup();
          });

          ws.on('close', (code, reason) => {
            clearTimeout(timeout);
            if (!resolved) {
              this.handleWsError(checkRun, monitor, Date.now() - startTime, 'CONNECTION_CLOSED', `Connection closed: ${code} ${reason}`);
              cleanup();
            }
          });

        } catch (error: any) {
          await this.handleWsError(checkRun, monitor, Date.now() - startTime, 'ERROR', error.message);
          cleanup();
        }
      })();
    });
  }

  private async handleWsSuccess(checkRun: any, monitor: any, totalTime: number, connectTime: number, waitTime?: number) {
    await this.prisma.checkRun.update({
      where: { id: checkRun.id },
      data: {
        completedAt: new Date(),
        durationMs: totalTime,
        success: true,
        latencyConnectMs: connectTime,
        latencyTotalMs: totalTime,
        availabilityState: 'up',
        rawMeta: JSON.stringify({ waitTime }),
      },
    });

    await this.updateMonitorStatus(monitor, true, totalTime);
    this.realtimeGateway.emitCheckCompleted(monitor.workspaceId, checkRun.id, monitor.id, true, totalTime);
  }

  private async handleWsError(checkRun: any, monitor: any, totalTime: number, errorCode: string, errorMessage: string) {
    if (checkRun) {
      await this.prisma.checkRun.update({
        where: { id: checkRun.id },
        data: {
          completedAt: new Date(),
          durationMs: totalTime,
          success: false,
          errorCode,
          errorMessage,
          availabilityState: 'down',
        },
      });
    }

    await this.updateMonitorStatus(monitor, false, totalTime, errorMessage);
    this.logger.error(`WebSocket check failed for ${monitor.name}: ${errorMessage}`);
  }

  private async updateMonitorStatus(monitor: any, success: boolean, latencyMs?: number, errorMessage?: string) {
    const consecutiveFailures = success ? 0 : (monitor.consecutiveFailures || 0) + 1;
    const consecutiveSuccesses = success ? (monitor.consecutiveSuccesses || 0) + 1 : 0;

    const status = success ? 'up' : 'down';

    await this.prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        lastRunAt: new Date(),
        lastStatus: status,
        consecutiveFailures,
        consecutiveSuccesses,
      },
    });

    // Emit monitor update event
    this.realtimeGateway.emitMonitorUpdate(monitor.workspaceId, monitor.id, status, monitor.lastStatus);

    // Update service status if needed
    if (success) {
      await this.updateServiceStatus(monitor.serviceId, monitor.workspaceId, 'up');
    } else if (consecutiveFailures >= monitor.failureThreshold) {
      await this.updateServiceStatus(monitor.serviceId, monitor.workspaceId, 'down');

      // Check if we should create an incident
      if (monitor.incidentAutoCreate && consecutiveFailures === monitor.failureThreshold) {
        await this.incidentsService.autoCreateIncident(
          monitor.workspaceId,
          monitor.id,
          '',
          errorMessage || 'Monitor failed'
        );
      }
    }

    // Check for recovery
    if (!success && consecutiveSuccesses >= monitor.recoveryThreshold) {
      await this.incidentsService.autoResolveIfStable(monitor.workspaceId, monitor.id);
    }
  }

  private async updateServiceStatus(serviceId: string, workspaceId: string, status: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { monitors: true },
    });

    if (!service) return;

    // Update service based on monitor statuses
    let newStatus = 'up';
    const hasFailing = service.monitors.some(m => m.lastStatus === 'down');

    if (hasFailing) {
      const totalMonitors = service.monitors.length;
      const failingMonitors = service.monitors.filter(m => m.lastStatus === 'down').length;

      if (failingMonitors === totalMonitors) {
        newStatus = 'down';
      } else {
        newStatus = 'degraded';
      }
    }

    if (service.status !== newStatus) {
      await this.prisma.service.update({
        where: { id: serviceId },
        data: { status: newStatus },
      });

      this.realtimeGateway.emitServiceStatus(workspaceId, serviceId, newStatus);
    }
  }

  private getJsonPathValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;

      // Handle array access like items[0]
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]];
        if (Array.isArray(current)) {
          current = current[parseInt(arrayMatch[2])];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }

    return current;
  }
}