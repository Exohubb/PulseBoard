import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { ScannerEngine } from './scanner.engine';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerEngine],
  exports: [ScannerService],
})
export class ScannerModule {}