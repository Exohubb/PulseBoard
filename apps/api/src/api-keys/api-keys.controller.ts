import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeys: ApiKeysService) {}

  @Get()
  list(@Request() req: any) {
    return this.apiKeys.list(req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() body: { name: string; scopes?: 'read' | 'write' }) {
    return this.apiKeys.create(req.user.id, body.name, body.scopes ?? 'read');
  }

  @Delete(':id')
  revoke(@Request() req: any, @Param('id') id: string) {
    return this.apiKeys.revoke(req.user.id, id);
  }
}
