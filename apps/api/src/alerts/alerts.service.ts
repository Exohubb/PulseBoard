import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  // Alert Channels
  async createChannel(workspaceId: string, data: {
    type: string;
    name: string;
    config: Record<string, any>;
  }) {
    return this.prisma.alertChannel.create({
      data: {
        workspaceId,
        type: data.type,
        name: data.name,
        config: JSON.stringify(data.config),
      },
    });
  }

  async listChannels(workspaceId: string) {
    return this.prisma.alertChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateChannel(workspaceId: string, channelId: string, data: { name?: string; enabled?: boolean; config?: Record<string, any> }) {
    const channel = await this.prisma.alertChannel.findFirst({ where: { id: channelId, workspaceId } });
    if (!channel) throw new NotFoundException('Alert channel not found');
    return this.prisma.alertChannel.update({
      where: { id: channelId },
      data: {
        ...data,
        config: data.config ? JSON.stringify(data.config) : undefined,
      },
    });
  }

  async deleteChannel(workspaceId: string, channelId: string) {
    const channel = await this.prisma.alertChannel.findFirst({ where: { id: channelId, workspaceId } });
    if (!channel) throw new NotFoundException('Alert channel not found');
    return this.prisma.alertChannel.delete({ where: { id: channelId } });
  }

  // Alert Policies
  async createPolicy(workspaceId: string, data: {
    name: string;
    event: string;
    severity?: string;
    serviceTags?: string[];
    alertChannelIds: string[];
    cooldownMinutes?: number;
  }) {
    return this.prisma.alertPolicy.create({
      data: {
        workspaceId,
        name: data.name,
        event: data.event,
        severity: data.severity,
        serviceTags: JSON.stringify(data.serviceTags || []),
        alertChannelIds: JSON.stringify(data.alertChannelIds),
        cooldownMinutes: data.cooldownMinutes ?? 5,
      },
    });
  }

  async listPolicies(workspaceId: string) {
    return this.prisma.alertPolicy.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePolicy(workspaceId: string, policyId: string, data: {
    name?: string;
    enabled?: boolean;
    event?: string;
    severity?: string;
    serviceTags?: string[];
    alertChannelIds?: string[];
    cooldownMinutes?: number;
  }) {
    const policy = await this.prisma.alertPolicy.findFirst({ where: { id: policyId, workspaceId } });
    if (!policy) throw new NotFoundException('Alert policy not found');
    return this.prisma.alertPolicy.update({
      where: { id: policyId },
      data: {
        ...data,
        serviceTags: data.serviceTags ? JSON.stringify(data.serviceTags) : undefined,
        alertChannelIds: data.alertChannelIds ? JSON.stringify(data.alertChannelIds) : undefined,
      },
    });
  }

  async deletePolicy(workspaceId: string, policyId: string) {
    const policy = await this.prisma.alertPolicy.findFirst({ where: { id: policyId, workspaceId } });
    if (!policy) throw new NotFoundException('Alert policy not found');
    return this.prisma.alertPolicy.delete({ where: { id: policyId } });
  }

  // Alert Deliveries
  async sendAlert(policyId: string, channelId: string, incidentId: string | null, alertData: {
    title: string;
    message: string;
    severity?: string;
    incidentUrl?: string;
  }) {
    const policy = await this.prisma.alertPolicy.findUnique({
      where: { id: policyId },
    });
    if (!policy || !policy.enabled) return null;

    const channel = await this.prisma.alertChannel.findUnique({ where: { id: channelId } });
    if (!channel || !channel.enabled) return null;

    // Check cooldown
    const cooldownKey = `alert:${policyId}:${channelId}:cooldown`;
    const lastAlert = await this.prisma.alertDelivery.findFirst({
      where: { alertPolicyId: policyId, alertChannelId: channelId, status: 'sent' },
      orderBy: { createdAt: 'desc' },
    });

    if (lastAlert && policy.cooldownMinutes > 0) {
      const cooldownMs = policy.cooldownMinutes * 60 * 1000;
      const timeSinceLastAlert = Date.now() - lastAlert.createdAt.getTime();
      if (timeSinceLastAlert < cooldownMs) {
        return null; // Still in cooldown
      }
    }

    const delivery = await this.prisma.alertDelivery.create({
      data: {
        alertPolicyId: policyId,
        alertChannelId: channelId,
        incidentId: incidentId || undefined,
        status: 'pending',
      },
    });

    try {
      const config = typeof channel.config === 'string' ? JSON.parse(channel.config) : channel.config;
      let result: { success: boolean; error?: string; responseCode?: number };

      switch (channel.type) {
        case 'slack':
          result = await this.sendSlack(config, alertData);
          break;
        case 'email':
          result = await this.sendEmail(config, alertData);
          break;
        case 'webhook':
          result = await this.sendWebhook(config, alertData);
          break;
        default:
          result = { success: false, error: 'Unknown channel type' };
      }

      await this.prisma.alertDelivery.update({
        where: { id: delivery.id },
        data: {
          status: result.success ? 'sent' : 'failed',
          attempts: 1,
          lastAttemptAt: new Date(),
          lastError: result.error,
          responseCode: result.responseCode,
        },
      });

      return delivery;
    } catch (error: any) {
      await this.prisma.alertDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          attempts: 1,
          lastAttemptAt: new Date(),
          lastError: error.message,
        },
      });
      return delivery;
    }
  }

  async listDeliveries(workspaceId: string, filters?: { policyId?: string; channelId?: string; status?: string }) {
    return this.prisma.alertDelivery.findMany({
      where: {
        alertPolicy: { workspaceId },
        ...(filters?.policyId && { alertPolicyId: filters.policyId }),
        ...(filters?.channelId && { alertChannelId: filters.channelId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: { alertPolicy: true, alertChannel: true, incident: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async sendSlack(config: Record<string, any>, data: { title: string; message: string; severity?: string; incidentUrl?: string }) {
    try {
      const payload = {
        text: `*${data.title}*`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${data.title}*\n${data.message}` },
          },
          ...(data.incidentUrl ? [{
            type: 'actions',
            elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Incident' }, url: data.incidentUrl }],
          }] : []),
        ],
      };

      const response = await axios.post(config.webhookUrl, payload);
      return { success: true, responseCode: response.status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendEmail(config: Record<string, any>, data: { title: string; message: string; severity?: string }) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || config.host,
        port: parseInt(process.env.SMTP_PORT || config.port || '587'),
        secure: config.port === '465',
        auth: {
          user: process.env.SMTP_USER || config.user,
          pass: process.env.SMTP_PASS || config.pass,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || config.from || 'PulseBoard <noreply@pulseboard.dev>',
        to: config.to,
        subject: `[${data.severity?.toUpperCase() || 'ALERT'}] ${data.title}`,
        text: data.message,
        html: `<h2>${data.title}</h2><p>${data.message}</p>`,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendWebhook(config: Record<string, any>, data: any) {
    try {
      const response = await axios.post(config.url, {
        ...data,
        timestamp: new Date().toISOString(),
      }, {
        headers: config.headers || {},
      });
      return { success: true, responseCode: response.status };
    } catch (error: any) {
      return { success: false, error: error.message, responseCode: error.response?.status };
    }
  }

  async triggerAlertsForIncident(workspaceId: string, incidentId: string, eventType: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, workspaceId },
      include: { serviceLinks: { include: { service: true } } },
    });
    if (!incident) return;

    const policies = await this.prisma.alertPolicy.findMany({
      where: {
        workspaceId,
        enabled: true,
        event: eventType,
        OR: [
          { severity: null },
          { severity: incident.severity },
        ],
      },
    });

    for (const policy of policies) {
      const serviceTags = incident.serviceLinks.map(l => {
        if (!l.service?.tags) return [];
        try {
          return JSON.parse(l.service.tags);
        } catch {
          return [];
        }
      }).flat();
      const policyTags: string[] = policy.serviceTags ? JSON.parse(policy.serviceTags) : [];
      const hasMatchingTag = policyTags.length === 0 ||
        policyTags.some(tag => serviceTags.includes(tag));

      if (hasMatchingTag) {
        const channelIds: string[] = policy.alertChannelIds ? JSON.parse(policy.alertChannelIds) : [];
        for (const channelId of channelIds) {
          await this.sendAlert(policy.id, channelId, incidentId, {
            title: incident.title,
            message: `${incident.severity.toUpperCase()} incident: ${incident.impactSummary || incident.title}`,
            severity: incident.severity,
            incidentUrl: `${process.env.APP_URL || 'http://localhost:5173'}/incidents/${incident.id}`,
          });
        }
      }
    }
  }
}