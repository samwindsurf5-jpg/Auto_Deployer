import { Controller, Get, Post, UseGuards, Request, Param, Body } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post()
  async createDeployment(@Request() req: any, @Body() deploymentData: any) {
    const { projectId, repositoryUrl, branch, provider, buildSettings } = deploymentData;
    
    // Get user's GitHub token
    // This would be fetched from the user's provider integrations
    const githubToken = 'user-github-token'; // Placeholder

    // Use provided build settings or smart defaults
    const finalBuildSettings = buildSettings || {
      buildCommand: 'npm run build',
      outputDirectory: 'build', // Safe default for React apps
      installCommand: 'npm install'
    };

    const deploymentParams = {
      userId: req.user.id,
      projectId,
      repositoryUrl,
      branch: branch || 'main',
      buildSettings: finalBuildSettings,
      githubToken,
    };

    console.log('Deploying to provider:', provider);
    
    switch (provider) {
      case 'vercel':
        console.log('Using Vercel deployment');
        return this.deploymentsService.deployToVercel(deploymentParams);
      case 'netlify':
        console.log('Using Netlify deployment');
        return this.deploymentsService.deployToNetlify(deploymentParams);
      default:
        console.log('Unknown provider, defaulting to Netlify:', provider);
        return this.deploymentsService.deployToNetlify(deploymentParams);
    }
  }

  @Get()
  async getUserDeployments(@Request() req: any) {
    return this.deploymentsService.getUserDeployments(req.user.id);
  }

  @Get(':id')
  async getDeploymentStatus(@Param('id') id: string, @Request() req: any) {
    return this.deploymentsService.getDeploymentStatus(id, req.user.id);
  }

  @Post(':id/rollback')
  async rollbackDeployment(@Param('id') id: string, @Request() req: any) {
    return this.deploymentsService.rollbackDeployment(id, req.user.id);
  }
}
