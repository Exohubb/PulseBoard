import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScannerService } from './scanner.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('scanner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/scanner')
export class ScannerController {
  constructor(
    private scannerService: ScannerService,
    private workspacesService: WorkspacesService
  ) {}

  private async resolveWorkspaceId(workspaceIdOrSlug: string): Promise<string> {
    if (workspaceIdOrSlug.includes('-') && workspaceIdOrSlug.length > 20) {
      return workspaceIdOrSlug;
    }
    const workspace = await this.workspacesService.findBySlug(workspaceIdOrSlug);
    return workspace.id;
  }

  @Post('run')
  async createAndRun(
    @Param('workspaceId') workspaceId: string,
    @Body() body: {
      monitorId?: string;
      url: string;
      headers?: Record<string, string>;
      authType?: string;
      authConfig?: Record<string, string>;
      scanMode?: string;
      maxDurationMs?: number;
      maxMessages?: number;
      allowOriginChecks?: boolean;
      allowSchemaFuzz?: boolean;
      allowAuthChecks?: boolean;
      allowRateLimitProbe?: boolean;
      allowEventEnumProbe?: boolean;
      allowPayloadSizeProbe?: boolean;
      legalAcknowledged?: boolean;
      ownershipConfirmed?: boolean;
    }
  ) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    const scanRun = await this.scannerService.createScanRun(resolvedId, body.monitorId || null, body);
    return this.scannerService.runScan(resolvedId, scanRun.id);
  }

  @Get('runs')
  async listRuns(@Param('workspaceId') workspaceId: string, @Body() filters?: { monitorId?: string }) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.scannerService.listScanRuns(resolvedId, filters?.monitorId);
  }

  @Get('runs/:id')
  async getRun(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.scannerService.getScanRun(resolvedId, id);
  }

  @Get('runs/:id/findings')
  async getFindings(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() filters?: { severity?: string }) {
    return this.scannerService.getFindings(id, filters?.severity);
  }

  @Delete('runs/:id')
  async deleteRun(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    await this.scannerService.deleteScanRun(resolvedId, id);
    return { success: true };
  }

  @Get('stats')
  async getStats(@Param('workspaceId') workspaceId: string) {
    const resolvedId = await this.resolveWorkspaceId(workspaceId);
    return this.scannerService.getScanStats(resolvedId);
  }
}