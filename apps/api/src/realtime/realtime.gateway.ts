import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedClients: Map<string, { workspaceId: string; userId?: string }> = new Map();

  constructor(private realtimeService: RealtimeService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.leaveAllRooms(client);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { workspaceId: string; userId?: string }) {
    const room = `workspace:${data.workspaceId}`;
    client.join(room);
    this.connectedClients.set(client.id, data);

    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { workspaceId: string }) {
    const room = `workspace:${data.workspaceId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    return { success: true };
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { channel: string }) {
    client.join(data.channel);
    return { success: true, channel: data.channel };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { channel: string }) {
    client.leave(data.channel);
    return { success: true };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', timestamp: new Date().toISOString() };
  }

  emitToWorkspace(workspaceId: string, event: string, data: any) {
    const room = `workspace:${workspaceId}`;
    this.server.to(room).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, data);
  }

  emitMonitorUpdate(workspaceId: string, monitorId: string, status: string, previousStatus?: string) {
    this.emitToWorkspace(workspaceId, 'monitor.updated', {
      monitorId,
      status,
      previousStatus,
      timestamp: new Date().toISOString(),
    });
  }

  emitCheckCompleted(workspaceId: string, checkRunId: string, monitorId: string, success: boolean, latencyMs?: number) {
    this.emitToWorkspace(workspaceId, 'check.completed', {
      checkRunId,
      monitorId,
      success,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }

  emitIncidentCreated(workspaceId: string, incident: any) {
    this.emitToWorkspace(workspaceId, 'incident.created', {
      incident,
      timestamp: new Date().toISOString(),
    });
  }

  emitIncidentUpdated(workspaceId: string, incidentId: string, status: string, severity?: string) {
    this.emitToWorkspace(workspaceId, 'incident.updated', {
      incidentId,
      status,
      severity,
      timestamp: new Date().toISOString(),
    });
  }

  emitServiceStatus(workspaceId: string, serviceId: string, status: string) {
    this.emitToWorkspace(workspaceId, 'service.status.changed', {
      serviceId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  emitScannerCompleted(workspaceId: string, scanRun: any) {
    this.emitToWorkspace(workspaceId, 'scanner.completed', {
      scanRun,
      timestamp: new Date().toISOString(),
    });
  }

  private leaveAllRooms(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData?.workspaceId) {
      client.leave(`workspace:${clientData.workspaceId}`);
    }
  }

  getConnectedCount(): number {
    return this.connectedClients.size;
  }
}