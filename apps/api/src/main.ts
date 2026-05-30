import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as compression from 'compression';
import * as morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(compression());
  app.use(morgan('combined'));

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('PulseBoard API')
    .setDescription('Real-Time API Health & Incident Command Center')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('workspaces', 'Workspace management')
    .addTag('services', 'Service management')
    .addTag('monitors', 'Monitor management')
    .addTag('checks', 'Check run history')
    .addTag('incidents', 'Incident management')
    .addTag('alerts', 'Alert channels and policies')
    .addTag('status-pages', 'Public status pages')
    .addTag('scanner', 'WebSocket security scanner')
    .addTag('audit', 'Audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  class WebSocketAdapter extends IoAdapter {
    createIOServer(port: number, options: any) {
      const server = super.createIOServer(port, {
        ...options,
        cors: {
          origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
          credentials: true,
        },
      });
      return server;
    }
  }

  app.useWebSocketAdapter(new WebSocketAdapter(app));

  const port = process.env.PORT || process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`🚀 PulseBoard API running on http://localhost:${port}`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();