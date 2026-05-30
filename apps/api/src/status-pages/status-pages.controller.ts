import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatusPagesService } from './status-pages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('status-pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/status-pages')
export class StatusPagesController {
  constructor(
    private statusPagesService: StatusPagesService,
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
  async list(@Param('workspaceId') workspaceId: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.list(resolvedId);
  }

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; slug: string; logoUrl?: string; accentColor?: string; introText?: string }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.create(resolvedId, body);
  }

  @Get(':id')
  async get(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.findById(resolvedId, id);
  }

  @Put(':id')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.update(resolvedId, id, body);
  }

  @Delete(':id')
  async delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.delete(resolvedId, id);
  }

  @Post(':id/components')
  async addComponent(
    @Param('workspaceId') workspaceId: string,
    @Param('id') pageId: string,
    @Body() body: { serviceId?: string; monitorId?: string; name: string; sortOrder?: number }
  ) {
    return this.statusPagesService.addComponent(pageId, body);
  }

  @Put('components/:componentId')
  async updateComponent(
    @Param('workspaceId') workspaceId: string,
    @Param('componentId') componentId: string,
    @Body() body: { name?: string; sortOrder?: number }
  ) {
    return this.statusPagesService.updateComponent(componentId, body);
  }

  @Delete('components/:componentId')
  async deleteComponent(@Param('workspaceId') workspaceId: string, @Param('componentId') componentId: string) {
    return this.statusPagesService.deleteComponent(componentId);
  }

  @Post(':id/publish')
  async publish(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.update(resolvedId, id, { published: true });
  }

  @Post(':id/unpublish')
  async unpublish(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.statusPagesService.update(resolvedId, id, { published: false });
  }
}

// Public controller (no auth required)
@ApiTags('public-status')
@Controller('public/status')
export class PublicStatusController {
  constructor(private statusPagesService: StatusPagesService) {}

  @Get(':slug')
  async getPublicStatus(@Param('slug') slug: string) {
    return this.statusPagesService.getPublicStatusPage(slug);
  }
}