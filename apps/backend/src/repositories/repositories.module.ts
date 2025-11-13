import { Module } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { AnalysisService } from '../analysis/analysis.service';
import { DeploymentsService } from '../deployments/deployments.service';
import { VercelService } from '../integrations/vercel.service';
import { NetlifyService } from '../integrations/netlify.service';

@Module({
  controllers: [RepositoriesController],
  providers: [RepositoriesService, AnalysisService, DeploymentsService, VercelService, NetlifyService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
