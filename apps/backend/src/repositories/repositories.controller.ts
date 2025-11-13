import { Controller, Get, Post, UseGuards, Request, Query, Param, Body } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeploymentsService } from '../deployments/deployments.service';

@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly deploymentsService: DeploymentsService
  ) {}

  @Get()
  async getRepositories(@Request() req: any, @Query('page') page?: number) {
    return this.repositoriesService.getGitHubRepositoriesForUser(req.user.id, page);
  }

  @Get(':owner/:repo/analyze')
  async analyzeRepository(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Request() req: any,
  ) {
    const repoFullName = `${owner}/${repo}`;
    return this.repositoriesService.analyzeRepositoryWithAI(req.user.id, repoFullName);
  }

  @Post(':owner/:repo/deploy')
  async deployRepository(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Request() req: any,
    @Body() deploymentOptions: any,
  ) {
    const repoFullName = `${owner}/${repo}`;
    
    try {
      // First analyze the repository to get deployment settings
      const analysis = await this.repositoriesService.analyzeRepositoryWithAI(req.user.id, repoFullName);
      
      // Create deployment payload
      const deploymentData = {
        userId: req.user.id,
        projectId: deploymentOptions.projectId || `${owner}-${repo}`,
        repositoryUrl: `https://github.com/${repoFullName}`,
        branch: deploymentOptions.branch || 'main',
        buildSettings: analysis.buildSettings,
        githubToken: 'github-token', // We'll get this from the user's stored tokens
      };

      // Determine provider and deploy
      const provider = deploymentOptions.provider || analysis.deployment.recommendedProvider;
      let deploymentResult;

      if (provider === 'vercel') {
        deploymentResult = await this.deploymentsService.deployToVercel(deploymentData);
      } else {
        // Default to Netlify simulation
        deploymentResult = await this.deploymentsService.deployToNetlify(deploymentData);
      }

      return {
        success: true,
        deployment: deploymentResult,
        analysis: analysis.deployment,
        message: `Deployment initiated to ${provider}`,
        deploymentId: deploymentResult.id,
      };

    } catch (error) {
      console.error('Deployment error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Deployment failed. Please check your provider connections.',
      };
    }
  }
}
