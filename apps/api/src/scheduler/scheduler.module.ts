import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CheckExecutor } from './check-executor.service';
import { MonitorsModule } from '../monitors/monitors.module';
import { ChecksModule } from '../checks/checks.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { AlertsModule } from '../alerts/alerts.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [MonitorsModule, ChecksModule, IncidentsModule, AlertsModule, RealtimeModule],
  providers: [SchedulerService, CheckExecutor],
  exports: [SchedulerService, CheckExecutor],
})
export class SchedulerModule {}