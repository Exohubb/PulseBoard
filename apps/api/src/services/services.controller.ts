import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServicesService } from './services.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/services')
export class ServicesController {
  constructor(
    private servicesService: ServicesService,
    private workspacesService: WorkspacesService
  ) {}

  private async resolveWorkspaceId(workspaceIdOrSlug: string): Promise<string> {
    // Check if it looks like a UUID (has hyphens and length > 20)
    if (workspaceIdOrSlug.includes('-') && workspaceIdOrSlug.length > 20) {
      return workspaceIdOrSlug;
    }
    // Otherwise it's a slug, resolve to ID
    const workspace = await this.workspacesService.findBySlug(workspaceIdOrSlug);
    return workspace.id;
  }

  @Get()
  async list(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Query('environment') environment?: string,
    @Query('status') status?: string
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.servicesService.list(resolvedId, { environment, status });
  }

  @Post()
  async create(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; description?: string; environment?: string; ownerTeam?: string; tags?: string[] }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.servicesService.create(resolvedId, req.user.id, body);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.servicesService.findById(resolvedId, id);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; environment?: string; ownerTeam?: string; tags?: string[] }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.servicesService.update(resolvedId, id, body);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.servicesService.delete(resolvedId, id);
  }

  @Get(':id/stats')
  async getStats(@Request() req: any, @Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.servicesService.getServiceStats(resolvedId, id);
  }
}