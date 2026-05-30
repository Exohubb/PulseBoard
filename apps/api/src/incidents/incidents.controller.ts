import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IncidentsService } from './incidents.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/incidents')
export class IncidentsController {
  constructor(
    private incidentsService: IncidentsService,
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
    @Request() req: any,
    @Body() filters?: { status?: string[]; severity?: string[]; serviceId?: string }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.list(resolvedId, filters);
  }

  @Get('active')
  async getActive(@Param('workspaceId') workspaceId: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.getActiveIncidents(resolvedId);
  }

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Body() body: {
      title: string;
      severity: string;
      serviceIds?: string[];
      monitorIds?: string[];
      impactSummary?: string;
    }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.create(resolvedId, req.user?.id, body);
  }

  @Get(':id')
  async get(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.findById(resolvedId, id);
  }

  @Put(':id')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.update(resolvedId, id, req.user?.id, body);
  }

  @Post(':id/updates')
  async addUpdate(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { type: string; message: string; internalOnly?: boolean }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.addUpdate(resolvedId, id, req.user?.id, body);
  }

  @Post(':id/resolve')
  async resolve(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() body?: { publicSummary?: string }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.resolve(resolvedId, id, req.user?.id, body?.publicSummary);
  }

  @Post(':id/close')
  async close(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Request() req: any) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.close(resolvedId, id, req.user?.id);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.incidentsService.getIncidentTimeline(resolvedId, id);
  }
}