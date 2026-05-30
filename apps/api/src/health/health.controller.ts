import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async health() {
    return this.healthService.getHealth();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get API statistics' })
  async stats() {
    return this.healthService.getStats();
  }
}