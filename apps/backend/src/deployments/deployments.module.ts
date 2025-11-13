import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { VercelService } from '../integrations/vercel.service';
import { NetlifyService } from '../integrations/netlify.service';

@Module({
  controllers: [DeploymentsController],
  providers: [DeploymentsService, VercelService, NetlifyService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
