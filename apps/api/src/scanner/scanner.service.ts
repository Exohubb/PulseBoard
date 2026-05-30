import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScannerEngine, ScanTarget, ScanOptions, Finding } from './scanner.engine';

@Injectable()
export class ScannerService {
  constructor(
    private prisma: PrismaService,
    private scannerEngine: ScannerEngine
  ) {}

  async createScanRun(workspaceId: string, monitorId: string | null, data: {
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
  }) {
    if (!data.legalAcknowledged) {
      throw new BadRequestException('Legal acknowledgment required before running scan');
    }

    if (!data.ownershipConfirmed) {
      throw new BadRequestException('Ownership confirmation required before running scan');
    }

    const scanRun = await this.prisma.scannerRun.create({
      data: {
        workspaceId,
        monitorId: monitorId || undefined,
        verdict: 'inconclusive',
        meta: JSON.stringify({ options: data }),
      },
    });

    return scanRun;
  }

  async runScan(workspaceId: string, scanRunId: string) {
    const scanRun = await this.prisma.scannerRun.findFirst({
      where: { id: scanRunId, workspaceId },
      include: { monitor: { include: { scanConfig: true } } },
    });

    if (!scanRun) throw new NotFoundException('Scan run not found');

    const meta = scanRun.meta as any || {};
    const target: ScanTarget = {
      url: meta.url,
      headers: meta.headers || {},
      authType: meta.authType,
      authConfig: meta.authConfig,
    };

    const options: ScanOptions = {
      scanMode: meta.scanMode || 'passive',
      maxDurationMs: meta.maxDurationMs || 30000,
      maxMessages: meta.maxMessages || 50,
      allowOriginChecks: meta.allowOriginChecks ?? true,
      allowSchemaFuzz: meta.allowSchemaFuzz ?? false,
      allowAuthChecks: meta.allowAuthChecks ?? true,
      allowRateLimitProbe: meta.allowRateLimitProbe ?? true,
      allowEventEnumProbe: meta.allowEventEnumProbe ?? true,
      allowPayloadSizeProbe: meta.allowPayloadSizeProbe ?? true,
    };

    const findings = await this.scannerEngine.runScan(target, options);
    const { score, verdict } = this.scannerEngine.calculateScore(findings);

    // Create finding records
    await this.prisma.scannerFinding.createMany({
      data: findings.map(f => ({
        scannerRunId: scanRunId,
        category: f.category,
        title: f.title,
        severity: f.severity,
        status: f.status,
        evidence: f.evidence,
        recommendation: f.recommendation,
        cweOwaspReference: f.cweOwaspReference,
        meta: JSON.stringify({ skippedReason: f.skippedReason }),
      })),
    });

    // Update scan run
    const updatedRun = await this.prisma.scannerRun.update({
      where: { id: scanRunId },
      data: {
        completedAt: new Date(),
        score,
        verdict,
        summary: this.generateSummary(findings, score),
        meta: JSON.stringify({ ...meta, completedAt: new Date().toISOString() }),
      },
      include: { findings: true },
    });

    return updatedRun;
  }

  private generateSummary(findings: Finding[], score: number): string {
    const fails = findings.filter(f => f.status === 'fail').length;
    const warnings = findings.filter(f => f.status === 'warning').length;
    const passed = findings.filter(f => f.status === 'pass').length;
    const skipped = findings.filter(f => f.status === 'skipped' || f.status === 'not_testable').length;

    return `${findings.length} checks performed: ${passed} passed, ${fails} failed, ${warnings} warnings, ${skipped} skipped. Score: ${score}/100`;
  }

  async getScanRun(workspaceId: string, scanRunId: string) {
    const scanRun = await this.prisma.scannerRun.findFirst({
      where: { id: scanRunId, workspaceId },
      include: { findings: true, monitor: true },
    });
    if (!scanRun) throw new NotFoundException('Scan run not found');
    return scanRun;
  }

  async listScanRuns(workspaceId: string, monitorId?: string) {
    return this.prisma.scannerRun.findMany({
      where: { workspaceId, ...(monitorId && { monitorId }) },
      include: { findings: true, monitor: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getFindings(scanRunId: string, severity?: string) {
    const findings = await this.prisma.scannerFinding.findMany({
      where: {
        scannerRunId: scanRunId,
        ...(severity && { severity }),
      },
      orderBy: [
        { severity: 'asc' },
        { category: 'asc' },
      ],
    });
    return findings;
  }

  async getScanStats(workspaceId: string) {
    const total = await this.prisma.scannerRun.count({ where: { workspaceId } });
    const scores = await this.prisma.scannerRun.findMany({
      where: { workspaceId, score: { not: null } },
      select: { score: true, verdict: true },
    });

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + (b.score || 0), 0) / scores.length)
      : 0;

    const verdictCounts = scores.reduce((acc, s) => {
      acc[s.verdict] = (acc[s.verdict] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityCounts = await this.prisma.scannerFinding.groupBy({
      by: ['severity'],
      where: { scannerRun: { workspaceId } },
      _count: true,
    });

    return {
      totalScans: total,
      averageScore: avgScore,
      verdictCounts,
      findingsBySeverity: severityCounts.reduce((acc, s) => {
        acc[s.severity] = s._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async deleteScanRun(workspaceId: string, scanRunId: string) {
    const scanRun = await this.prisma.scannerRun.findFirst({
      where: { id: scanRunId, workspaceId },
    });
    if (!scanRun) throw new NotFoundException('Scan run not found');

    await this.prisma.scannerRun.delete({
      where: { id: scanRunId },
    });
  }
}