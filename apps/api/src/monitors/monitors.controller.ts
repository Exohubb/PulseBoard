import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitorsService } from './monitors.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('monitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/monitors')
export class MonitorsController {
  constructor(
    private monitorsService: MonitorsService,
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
  async list(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.list(resolvedId);
  }

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: {
      serviceId: string;
      type: string;
      name: string;
      active?: boolean;
      intervalSeconds?: number;
      timeoutMs?: number;
    }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.create(resolvedId, body);
  }

  @Get(':id')
  async get(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.findById(resolvedId, id);
  }

  @Put(':id')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.update(resolvedId, id, body);
  }

  @Delete(':id')
  async delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.delete(resolvedId, id);
  }

  @Post(':id/pause')
  async pause(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.pause(resolvedId, id);
  }

  @Post(':id/resume')
  async resume(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.monitorsService.resume(resolvedId, id);
  }

  @Post(':id/http-config')
  async createHttpConfig(@Param('workspaceId') workspaceId: string, @Param('id') monitorId: string, @Body() body: any) {
    return this.monitorsService.createHttpConfig(monitorId, body);
  }

  @Post(':id/ws-config')
  async createWsConfig(@Param('workspaceId') workspaceId: string, @Param('id') monitorId: string, @Body() body: any) {
    return this.monitorsService.createWsConfig(monitorId, body);
  }

  @Post(':id/scan-config')
  async createScanConfig(@Param('workspaceId') workspaceId: string, @Param('id') monitorId: string, @Body() body: any) {
    return this.monitorsService.createScanConfig(monitorId, body);
  }
}