import { Controller, Get, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChecksService } from './checks.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('checks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/checks')
export class ChecksController {
  constructor(
    private checksService: ChecksService,
    private workspacesService: WorkspacesService
  ) {}

  private async resolveWorkspaceId(workspaceIdOrSlug: string): Promise<string> {
    if (workspaceIdOrSlug.includes('-') && workspaceIdOrSlug.length > 20) {
      return workspaceIdOrSlug;
    }
    const workspace = await this.workspacesService.findBySlug(workspaceIdOrSlug);
    return workspace.id;
  }

  @Get()
  async list(
    @Param('workspaceId') workspaceId: string,
    @Query('monitorId') monitorId?: string,
    @Query('success') success?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.checksService.list(resolvedId, {
      monitorId,
      success: success !== undefined ? success === 'true' : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('recent')
  async getRecentChecks(@Param('workspaceId') workspaceId: string, @Query('limit') limit?: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.checksService.getRecentChecks(resolvedId, limit ? parseInt(limit) : 50);
  }

  @Get(':id')
  async get(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.checksService.findById(resolvedId, id);
  }

  @Get('monitor/:monitorId')
  async getMonitorChecks(@Param('workspaceId') workspaceId: string, @Param('monitorId') monitorId: string, @Query('limit') limit?: string) {
    return this.checksService.getChecksForMonitor(monitorId, limit ? parseInt(limit) : 100);
  }

  @Get('monitor/:monitorId/latency')
  async getLatencyHistory(@Param('workspaceId') workspaceId: string, @Param('monitorId') monitorId: string, @Query('days') days?: string) {
    return this.checksService.getLatencyHistory(monitorId, days ? parseInt(days) : 7);
  }

  @Get('monitor/:monitorId/uptime')
  async getUptimeStats(@Param('workspaceId') workspaceId: string, @Param('monitorId') monitorId: string) {
    return this.checksService.getUptimeStats(monitorId, monitorId);
  }

  @Delete(':id')
  async delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.checksService.delete(resolvedId, id);
  }

  @Delete('monitor/:monitorId')
  async deleteByMonitor(@Param('workspaceId') workspaceId: string, @Param('monitorId') monitorId: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.checksService.deleteByMonitor(resolvedId, monitorId);
  }
}