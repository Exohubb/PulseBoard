import { Module } from '@nestjs/common';
import { StatusPagesController, PublicStatusController } from './status-pages.controller';
import { StatusPagesService } from './status-pages.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [StatusPagesController, PublicStatusController],
  providers: [StatusPagesService],
  exports: [StatusPagesService],
})
export class StatusPagesModule {}