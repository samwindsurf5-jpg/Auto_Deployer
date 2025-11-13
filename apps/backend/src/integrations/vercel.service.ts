import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VercelService {
  private readonly logger = new Logger(VercelService.name);

  async validateToken(token: string) {
    try {
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid token or insufficient permissions' };
      }

      const user = await response.json();
      return { 
        valid: true, 
        user: {
          id: user.uid,
          username: user.username,
          email: user.email,
          name: user.name,
        }
      };
    } catch (error) {
      return { valid: false, error: 'Failed to validate token' };
    }
  }

  async createDeployment(params: {
    token: string;
    repositoryUrl: string;
    projectName: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
  }) {
    try {
      // Extract repo info from GitHub URL
      const repoMatch = params.repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = repoMatch;
      const repoName = repo.replace('.git', '');

      // First check if project already exists
      const existingProjectsResponse = await fetch('https://api.vercel.com/v9/projects', {
        headers: {
          'Authorization': `Bearer ${params.token}`,
        },
      });

      if (existingProjectsResponse.ok) {
        const existingProjects = await existingProjectsResponse.json();
        const existingProject = existingProjects.projects?.find(
          (p: any) => p.name === params.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        );

        if (existingProject) {
          this.logger.log('Using existing Vercel project:', existingProject.id);
          return await this.deployExistingProject(params.token, existingProject.id, owner, repoName);
        }
      }

      // Create new Vercel project with GitHub integration
      const projectPayload = {
        name: params.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        gitRepository: {
          type: 'github',
          repo: `${owner}/${repoName}`,
        },
        buildCommand: params.buildCommand || 'npm run build',
        outputDirectory: params.outputDirectory || 'build',
        installCommand: params.installCommand || 'npm install',
        framework: this.detectFramework(params.buildCommand, params.outputDirectory),
      };

      this.logger.log('Creating new Vercel project:', projectPayload);

      const response = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('Vercel project creation failed:', errorData);
        throw new Error(`Vercel API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const project = await response.json();
      this.logger.log('Vercel project created successfully:', project.id);

      // The project creation automatically triggers a deployment
      return {
        projectId: project.id,
        url: `https://${project.name}.vercel.app`,
        status: 'building',
        createdAt: new Date().toISOString(),
        dashboardUrl: `https://vercel.com/${project.accountId}/${project.name}`,
      };

    } catch (error) {
      this.logger.error('Vercel deployment failed:', error);
      throw error;
    }
  }

  private async deployExistingProject(token: string, projectId: string, owner: string, repoName: string) {
    // Trigger new deployment for existing project
    const deploymentPayload = {
      gitSource: {
        type: 'github',
        repo: `${owner}/${repoName}`,
        ref: 'main',
      },
    };

    const response = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Vercel deployment error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const deployment = await response.json();
    
    return {
      projectId: projectId,
      deploymentId: deployment.id,
      url: deployment.url,
      status: deployment.readyState,
      createdAt: deployment.createdAt,
    };
  }

  private detectFramework(buildCommand?: string, outputDirectory?: string): string {
    if (buildCommand?.includes('next') || outputDirectory === '.next') return 'nextjs';
    if (buildCommand?.includes('gatsby') || outputDirectory === 'public') return 'gatsby';
    if (outputDirectory === 'dist') return 'vite';
    return 'other'; // Let Vercel auto-detect
  }

  async getDeployment(deploymentId: string, token: string) {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Vercel API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to get Vercel deployment status:', error);
      throw error;
    }
  }

  async createProject(params: {
    token: string;
    name: string;
    repositoryUrl: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
  }) {
    try {
      const repoMatch = params.repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = repoMatch;
      const repoName = repo.replace('.git', '');

      const projectPayload = {
        name: params.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        gitRepository: {
          type: 'github',
          repo: `${owner}/${repoName}`,
        },
        framework: 'nextjs', // Default framework
        ...(params.buildCommand && {
          buildCommand: params.buildCommand,
        }),
        ...(params.outputDirectory && {
          outputDirectory: params.outputDirectory,
        }),
        ...(params.installCommand && {
          installCommand: params.installCommand,
        }),
      };

      const response = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Vercel API error: ${error.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Failed to create Vercel project:', error);
      throw error;
    }
  }
}
