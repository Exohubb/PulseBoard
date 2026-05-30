import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@pulseboard.dev' },
    update: {},
    create: {
      email: 'demo@pulseboard.dev',
      name: 'Demo User',
      passwordHash,
    },
  });

  console.log('✅ Created demo user: demo@pulseboard.dev (password: demo1234)');

  // Create demo workspace
  const demoWorkspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo',
      description: 'Demo workspace for testing PulseBoard features',
      accentColor: '#6366f1',
    },
  });

  // Add user to workspace
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: demoWorkspace.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: demoWorkspace.id,
      userId: demoUser.id,
      role: 'owner',
    },
  });

  console.log('✅ Created demo workspace');

  // Create demo services
  const apiService = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: demoWorkspace.id, slug: 'api-backend' } },
    update: {},
    create: {
      workspaceId: demoWorkspace.id,
      name: 'API Backend',
      slug: 'api-backend',
      description: 'Main API service',
      environment: 'production',
      status: 'up',
      tags: '["api", "critical"]',
    },
  });

  const websocketService = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: demoWorkspace.id, slug: 'websocket-service' } },
    update: {},
    create: {
      workspaceId: demoWorkspace.id,
      name: 'WebSocket Service',
      slug: 'websocket-service',
      description: 'Real-time messaging service',
      environment: 'production',
      status: 'up',
      tags: '["websocket", "realtime"]',
    },
  });

  const frontendService = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: demoWorkspace.id, slug: 'frontend' } },
    update: {},
    create: {
      workspaceId: demoWorkspace.id,
      name: 'Frontend App',
      slug: 'frontend',
      description: 'Main web application',
      environment: 'staging',
      status: 'up',
      tags: '["web", "ui"]',
    },
  });

  console.log('✅ Created demo services');

  // Create HTTP monitor
  const httpMonitor = await prisma.monitor.upsert({
    where: { id: 'demo-http-monitor' },
    update: {},
    create: {
      id: 'demo-http-monitor',
      workspaceId: demoWorkspace.id,
      serviceId: apiService.id,
      type: 'http',
      name: 'Health Check',
      active: true,
      intervalSeconds: 60,
      timeoutMs: 5000,
      retryCount: 2,
      failureThreshold: 3,
      recoveryThreshold: 3,
      incidentAutoCreate: true,
      lastRunAt: new Date(),
      lastStatus: 'up',
      consecutiveFailures: 0,
      consecutiveSuccesses: 10,
    },
  });

  // Create HTTP config
  await prisma.monitorHttpConfig.upsert({
    where: { monitorId: httpMonitor.id },
    update: {},
    create: {
      monitorId: httpMonitor.id,
      url: 'https://httpbin.org/get',
      method: 'GET',
      headers: '{}',
      expectedStatus: 200,
      authType: 'none',
      authConfig: '{}',
      followRedirects: true,
      sslStrict: false,
    },
  });

  // Create WebSocket monitor
  const wsMonitor = await prisma.monitor.upsert({
    where: { id: 'demo-ws-monitor' },
    update: {},
    create: {
      id: 'demo-ws-monitor',
      workspaceId: demoWorkspace.id,
      serviceId: websocketService.id,
      type: 'websocket',
      name: 'Connection Test',
      active: true,
      intervalSeconds: 120,
      timeoutMs: 10000,
      retryCount: 2,
      failureThreshold: 3,
      recoveryThreshold: 3,
      incidentAutoCreate: true,
      lastRunAt: new Date(),
      lastStatus: 'up',
      consecutiveFailures: 0,
      consecutiveSuccesses: 5,
    },
  });

  // Create WebSocket config
  await prisma.monitorWsConfig.upsert({
    where: { monitorId: wsMonitor.id },
    update: {},
    create: {
      monitorId: wsMonitor.id,
      url: 'wss://echo.websocket.org',
      headers: '{}',
      authType: 'none',
      authConfig: '{}',
      connectTimeoutMs: 5000,
      expectWelcomeMessage: false,
      heartbeatTimeoutMs: 30000,
    },
  });

  console.log('✅ Created demo monitors');

  // Create demo incident
  const demoIncident = await prisma.incident.upsert({
    where: { id: 'demo-incident-1' },
    update: {},
    create: {
      id: 'demo-incident-1',
      workspaceId: demoWorkspace.id,
      title: 'High latency on API endpoints',
      slug: 'high-latency-api-' + Date.now().toString(36),
      severity: 'medium',
      status: 'resolved',
      source: 'manual',
      createdByUserId: demoUser.id,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      impactSummary: 'API response times increased to 2-3 seconds',
      publicSummary: 'Experienced degraded performance for approximately 1 hour. Issue has been resolved.',
    },
  });

  // Create incident updates
  await prisma.incidentUpdate.createMany({
    data: [
      {
        incidentId: demoIncident.id,
        type: 'created',
        message: 'Incident created and team notified',
        internalOnly: false,
        createdByUserId: demoUser.id,
      },
      {
        incidentId: demoIncident.id,
        type: 'status_changed',
        message: 'Status changed to investigating',
        internalOnly: false,
        createdByUserId: demoUser.id,
      },
      {
        incidentId: demoIncident.id,
        type: 'resolved',
        message: 'Database connection pool expanded. Latency returned to normal.',
        internalOnly: false,
        createdByUserId: demoUser.id,
      },
    ],
  });

  // Link incident to service
  await prisma.incidentServiceLink.create({
    data: {
      incidentId: demoIncident.id,
      serviceId: apiService.id,
    },
  });

  console.log('✅ Created demo incident');

  // Create alert channel
  await prisma.alertChannel.upsert({
    where: { id: 'demo-slack-channel' },
    update: {},
    create: {
      id: 'demo-slack-channel',
      workspaceId: demoWorkspace.id,
      type: 'slack',
      name: 'Engineering Team',
      enabled: true,
      config: JSON.stringify({ webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL' }),
    },
  });

  console.log('✅ Created demo alert channel');

  // Create status page
  const statusPage = await prisma.statusPage.upsert({
    where: { slug: 'demo-status' },
    update: {},
    create: {
      workspaceId: demoWorkspace.id,
      name: 'Demo Status Page',
      slug: 'demo-status',
      accentColor: '#6366f1',
      introText: 'Real-time status updates for our services.',
      published: true,
    },
  });

  // Create status page components
  await prisma.statusPageComponent.createMany({
    data: [
      { statusPageId: statusPage.id, serviceId: apiService.id, name: 'API Backend', sortOrder: 0 },
      { statusPageId: statusPage.id, serviceId: websocketService.id, name: 'WebSocket Service', sortOrder: 1 },
      { statusPageId: statusPage.id, serviceId: frontendService.id, name: 'Frontend App', sortOrder: 2 },
    ],
  });

  console.log('✅ Created demo status page');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\nDemo credentials:');
  console.log('  Email: demo@pulseboard.dev');
  console.log('  Password: demo1234');
  console.log('\nDemo status page:');
  console.log('  URL: http://localhost:4000/public/status/demo-status');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });