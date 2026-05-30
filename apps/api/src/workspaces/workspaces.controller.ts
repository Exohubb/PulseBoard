import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  private async resolveWorkspaceId(idOrSlug: string): Promise<string> {
    if (idOrSlug.length > 20 && /^c[a-z0-9]+$/.test(idOrSlug)) {
      return idOrSlug;
    }
    const ws = await this.workspacesService.findBySlug(idOrSlug);
    return ws.id;
  }

  @Get()
  async list(@Request() req: any) {
    const memberships = await this.workspacesService.listUserWorkspaces(req.user.id);
    return memberships.map(m => m.workspace);
  }

  @Post()
  async create(@Request() req: any, @Body() body: { name: string; slug: string; description?: string }) {
    return this.workspacesService.create(req.user.id, body);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(id);
    await this.workspacesService.findUserWorkspace(req.user.id, resolvedId);
    return this.workspacesService.findById(resolvedId);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: { name?: string; description?: string; logoUrl?: string; accentColor?: string }) {
    const resolvedId = await this.resolveWorkspaceId(id);
    await this.workspacesService.findUserWorkspace(req.user.id, resolvedId);
    return this.workspacesService.update(req.user.id, resolvedId, body);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(id);
    await this.workspacesService.findUserWorkspace(req.user.id, resolvedId);
    await this.workspacesService.removeWorkspace(req.user.id, resolvedId);
    return { success: true };
  }

  @Get(':id/members')
  async getMembers(@Request() req: any, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(id);
    await this.workspacesService.findUserWorkspace(req.user.id, resolvedId);
    const workspace = await this.workspacesService.findById(resolvedId);
    return workspace.members;
  }

  @Post(':id/members')
  async addMember(@Request() req: any, @Param('id') id: string, @Body() body: { email: string; role: string }) {
    const resolvedId = await this.resolveWorkspaceId(id);
    return this.workspacesService.addMember(req.user.id, resolvedId, body.email, body.role);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    const resolvedId = await this.resolveWorkspaceId(id);
    return this.workspacesService.removeMember(req.user.id, resolvedId, userId);
  }

  @Put(':id/members/:userId')
  async updateMemberRole(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string, @Body() body: { role: string }) {
    const resolvedId = await this.resolveWorkspaceId(id);
    return this.workspacesService.updateMemberRole(req.user.id, resolvedId, userId, body.role);
  }

  @Get(':id/stats')
  async getStats(@Request() req: any, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(id);
    await this.workspacesService.findUserWorkspace(req.user.id, resolvedId);
    return this.workspacesService.getStats(resolvedId);
  }
}