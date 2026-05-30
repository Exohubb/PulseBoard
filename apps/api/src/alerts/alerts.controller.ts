import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/alerts')
export class AlertsController {
  constructor(
    private alertsService: AlertsService,
    private workspacesService: WorkspacesService
  ) {}

  private async resolveWorkspaceId(workspaceIdOrSlug: string): Promise<string> {
    if (workspaceIdOrSlug.includes('-') && workspaceIdOrSlug.length > 20) {
      return workspaceIdOrSlug;
    }
    const workspace = await this.workspacesService.findBySlug(workspaceIdOrSlug);
    return workspace.id;
  }

  // Channels
  @Get('channels')
  async listChannels(@Param('workspaceId') workspaceId: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.listChannels(resolvedId);
  }

  @Post('channels')
  async createChannel(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { type: string; name: string; config: Record<string, any> }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.createChannel(resolvedId, body);
  }

  @Put('channels/:id')
  async updateChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; enabled?: boolean; config?: Record<string, any> }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.updateChannel(resolvedId, id, body);
  }

  @Delete('channels/:id')
  async deleteChannel(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.deleteChannel(resolvedId, id);
  }

  // Policies
  @Get('policies')
  async listPolicies(@Param('workspaceId') workspaceId: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.listPolicies(resolvedId);
  }

  @Post('policies')
  async createPolicy(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; event: string; severity?: string; serviceTags?: string[]; alertChannelIds: string[]; cooldownMinutes?: number }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.createPolicy(resolvedId, body);
  }

  @Put('policies/:id')
  async updatePolicy(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.updatePolicy(resolvedId, id, body);
  }

  @Delete('policies/:id')
  async deletePolicy(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.deletePolicy(resolvedId, id);
  }

  // Deliveries
  @Get('deliveries')
  async listDeliveries(
    @Param('workspaceId') workspaceId: string,
    @Body() filters?: { policyId?: string; channelId?: string; status?: string }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.listDeliveries(resolvedId, filters);
  }

  @Post('test')
  async sendTestAlert(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { channelId: string; title: string; message: string }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.alertsService.sendAlert('test', body.channelId, null, {
      title: body.title,
      message: body.message,
    });
  }
}