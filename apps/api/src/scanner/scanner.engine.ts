import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ScanTarget {
  url: string;
  headers?: Record<string, string>;
  authType?: string;
  authConfig?: Record<string, string>;
}

export interface ScanOptions {
  scanMode: 'passive' | 'safe_active' | 'custom';
  maxDurationMs?: number;
  maxMessages?: number;
  allowOriginChecks?: boolean;
  allowSchemaFuzz?: boolean;
  allowAuthChecks?: boolean;
  allowRateLimitProbe?: boolean;
  allowEventEnumProbe?: boolean;
  allowPayloadSizeProbe?: boolean;
}

export interface Finding {
  id: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'pass' | 'fail' | 'warning' | 'info' | 'skipped' | 'not_testable';
  evidence?: string;
  recommendation?: string;
  cweOwaspReference?: string;
  skippedReason?: string;
}

@Injectable()
export class ScannerEngine {
  private readonly logger = new Logger(ScannerEngine.name);
  private checks: Map<string, (target: ScanTarget, options: ScanOptions) => Promise<Finding>> = new Map();

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks() {
    // Transport Security Check
    this.registerCheck('transport_security', async (target, options) => {
      if (target.url.startsWith('ws://')) {
        return {
          id: 'transport_security',
          title: 'Insecure WebSocket Transport',
          category: 'transport_security',
          severity: 'high',
          status: 'fail',
          evidence: `Target uses ws:// instead of wss://`,
          recommendation: 'Use wss:// for encrypted WebSocket connections to prevent man-in-the-middle attacks.',
          cweOwaspReference: 'CWE-319: Cleartext Transmission of Sensitive Information',
        };
      }
      return {
        id: 'transport_security',
        title: 'Secure WebSocket Transport',
        category: 'transport_security',
        severity: 'info',
        status: 'pass',
        evidence: 'Target uses wss:// for encrypted communication',
      };
    });

    // Origin Check
    this.registerCheck('origin_handling', async (target, options) => {
      if (!options.allowOriginChecks) {
        return {
          id: 'origin_handling',
          title: 'Origin Handling Check',
          category: 'origin_handling',
          severity: 'info',
          status: 'skipped',
          skippedReason: 'Origin checks disabled in configuration',
        };
      }

      return {
        id: 'origin_handling',
        title: 'Origin Header Validation',
        category: 'origin_handling',
        severity: 'medium',
        status: 'info',
        evidence: 'Origin validation should be verified manually with curl or browser tools',
        recommendation: 'Configure CORS/origin restrictions on your WebSocket server to prevent cross-origin abuse.',
      };
    });

    // Auth Required Check
    this.registerCheck('auth_required', async (target, options) => {
      if (!options.allowAuthChecks) {
        return {
          id: 'auth_required',
          title: 'Authentication Requirement Check',
          category: 'authentication',
          severity: 'info',
          status: 'skipped',
          skippedReason: 'Auth checks disabled in configuration',
        };
      }

      if (!target.authType || target.authType === 'none') {
        return {
          id: 'auth_required',
          title: 'No Authentication Configured',
          category: 'authentication',
          severity: 'medium',
          status: 'warning',
          evidence: 'No authentication mechanism configured for this WebSocket endpoint',
          recommendation: 'Implement authentication for your WebSocket endpoint to prevent unauthorized access.',
          cweOwaspReference: 'CWE-306: Missing Authentication for Critical Function',
        };
      }

      return {
        id: 'auth_required',
        title: 'Authentication Configured',
        category: 'authentication',
        severity: 'info',
        status: 'pass',
        evidence: 'Authentication mechanism is configured',
      };
    });

    // Query String Token Check
    this.registerCheck('query_token_leak', async (target, options) => {
      try {
        const url = new URL(target.url);
        if (url.search) {
          return {
            id: 'query_token_leak',
            title: 'Query String Token Detected',
            category: 'data_exposure',
            severity: 'high',
            status: 'fail',
            evidence: `Token/parameters found in URL query string: ${url.search}`,
            recommendation: 'Avoid passing sensitive tokens or credentials in URL query strings. Use headers or WebSocket subprotocol for authentication.',
            cweOwaspReference: 'CWE-598: Information Exposure Through Query Strings',
          };
        }
      } catch {
        // Invalid URL
      }

      return {
        id: 'query_token_leak',
        title: 'No Query String Tokens',
        category: 'data_exposure',
        severity: 'info',
        status: 'pass',
        evidence: 'No tokens or sensitive data in query string',
      };
    });

    // Rate Limit Check
    this.registerCheck('rate_limit', async (target, options) => {
      if (!options.allowRateLimitProbe) {
        return {
          id: 'rate_limit',
          title: 'Rate Limiting Check',
          category: 'rate_limiting',
          severity: 'info',
          status: 'skipped',
          skippedReason: 'Rate limit probe disabled in configuration',
        };
      }

      return {
        id: 'rate_limit',
        title: 'Rate Limit Configuration',
        category: 'rate_limiting',
        severity: 'medium',
        status: 'info',
        evidence: 'Rate limiting should be verified with multiple rapid connections',
        recommendation: 'Implement rate limiting on your WebSocket server to prevent abuse and DoS attacks.',
        cweOwaspReference: 'CWE-307: Excessive Authentication Attempts',
      };
    });

    // Error Handling Check
    this.registerCheck('error_handling', async (target, options) => {
      return {
        id: 'error_handling',
        title: 'Error Message Verbosity',
        category: 'error_handling',
        severity: 'medium',
        status: 'info',
        evidence: 'Error handling should be tested with malformed messages',
        recommendation: 'Ensure error messages do not expose internal server details, stack traces, or sensitive configuration.',
        cweOwaspReference: 'CWE-210: Web Server Error Message Information Exposure',
      };
    });

    // Schema Validation Check
    this.registerCheck('schema_validation', async (target, options) => {
      if (!options.allowSchemaFuzz) {
        return {
          id: 'schema_validation',
          title: 'Message Schema Validation',
          category: 'input_validation',
          severity: 'info',
          status: 'skipped',
          skippedReason: 'Schema fuzzing disabled in configuration',
        };
      }

      return {
        id: 'schema_validation',
        title: 'Message Schema Validation',
        category: 'input_validation',
        severity: 'medium',
        status: 'info',
        evidence: 'Test with malformed/oversized messages to verify validation',
        recommendation: 'Implement strict message schema validation to prevent injection attacks and unexpected behavior.',
        cweOwaspReference: 'CWE-20: Improper Input Validation',
      };
    });

    // Event Enumeration Check
    this.registerCheck('event_enumeration', async (target, options) => {
      if (!options.allowEventEnumProbe) {
        return {
          id: 'event_enumeration',
          title: 'Event Enumeration Protection',
          category: 'authorization',
          severity: 'info',
          status: 'skipped',
          skippedReason: 'Event enumeration probe disabled in configuration',
        };
      }

      return {
        id: 'event_enumeration',
        title: 'Event/Channel Authorization',
        category: 'authorization',
        severity: 'high',
        status: 'info',
        evidence: 'Subscribe to various event names to check authorization',
        recommendation: 'Ensure users cannot subscribe to channels or receive events they are not authorized to access.',
        cweOwaspReference: 'CWE-862: Missing Authorization',
      };
    });

    // Payload Size Check
    this.registerCheck('payload_size', async (target, options) => {
      if (!options.allowPayloadSizeProbe) {
        return {
          id: 'payload_size',
          title: 'Payload Size Limits',
          category: 'input_validation',
          severity: 'info',
          status: 'skipped',
          skippedReason: 'Payload size probe disabled in configuration',
        };
      }

      return {
        id: 'payload_size',
        title: 'Payload Size Limits',
        category: 'input_validation',
        severity: 'medium',
        status: 'info',
        evidence: 'Test with oversized payloads to verify limits',
        recommendation: 'Implement maximum message size limits to prevent memory exhaustion attacks.',
        cweOwaspReference: 'CWE-400: Uncontrolled Resource Consumption',
      };
    });

    // Heartbeat Check
    this.registerCheck('heartbeat', async (target, options) => {
      return {
        id: 'heartbeat',
        title: 'Idle Timeout / Heartbeat Configuration',
        category: 'transport_security',
        severity: 'low',
        status: 'info',
        evidence: 'Server should implement heartbeat/ping mechanism',
        recommendation: 'Configure idle timeouts and heartbeat mechanisms to detect broken connections.',
        cweOwaspReference: 'CWE-835: Loop with Unreachable Exit Condition',
      };
    });
  }

  registerCheck(id: string, fn: (target: ScanTarget, options: ScanOptions) => Promise<Finding>) {
    this.checks.set(id, fn);
  }

  async runScan(target: ScanTarget, options: ScanOptions): Promise<Finding[]> {
    const findings: Finding[] = [];
    const startTime = Date.now();
    const maxDuration = options.maxDurationMs || 30000;

    for (const [id, checkFn] of this.checks) {
      if (Date.now() - startTime > maxDuration) {
        break;
      }

      try {
        const finding = await checkFn(target, options);
        findings.push(finding);
      } catch (error: any) {
        this.logger.error(`Check ${id} failed: ${error.message}`);
        findings.push({
          id,
          title: `Check: ${id}`,
          category: 'error',
          severity: 'info',
          status: 'not_testable',
          evidence: `Check failed: ${error.message}`,
        });
      }
    }

    return findings;
  }

  calculateScore(findings: Finding[]): { score: number; verdict: 'secure' | 'warning' | 'vulnerable' | 'inconclusive' } {
    const maxScore = 100;
    const criticalWeight = 30;
    const highWeight = 20;
    const mediumWeight = 10;
    const lowWeight = 5;

    let deductions = 0;
    let notTestableCount = 0;

    for (const finding of findings) {
      if (finding.status === 'not_testable') {
        notTestableCount++;
        continue;
      }

      switch (finding.severity) {
        case 'critical':
          deductions += criticalWeight;
          break;
        case 'high':
          deductions += highWeight;
          break;
        case 'medium':
          deductions += mediumWeight;
          break;
        case 'low':
          deductions += lowWeight;
          break;
      }
    }

    // Penalty for not testable checks
    if (findings.length > 0 && notTestableCount > 0) {
      const notTestableRatio = notTestableCount / findings.length;
      deductions += Math.round(maxScore * notTestableRatio * 0.3);
    }

    const score = Math.max(0, maxScore - deductions);

    let verdict: 'secure' | 'warning' | 'vulnerable' | 'inconclusive';
    if (notTestableCount >= findings.length / 2) {
      verdict = 'inconclusive';
    } else if (score >= 80) {
      verdict = 'secure';
    } else if (score >= 50) {
      verdict = 'warning';
    } else {
      verdict = 'vulnerable';
    }

    return { score, verdict };
  }
}