import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  @Get()
  @ApiOperation({ summary: 'Get public settings' })
  getSettings() {
    return {
      appName: 'PulseBoard',
      version: '1.0.0',
      features: {
        httpMonitoring: true,
        websocketMonitoring: true,
        websocketScanning: true,
        incidents: true,
        alerts: true,
        statusPages: true,
        multiWorkspace: true,
      },
    };
  }
}