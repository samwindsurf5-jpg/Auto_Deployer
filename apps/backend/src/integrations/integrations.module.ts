import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { VercelService } from './vercel.service';
import { NetlifyService } from './netlify.service';

@Module({
  controllers: [IntegrationsController],
  providers: [VercelService, NetlifyService],
  exports: [VercelService, NetlifyService],
})
export class IntegrationsModule {}
