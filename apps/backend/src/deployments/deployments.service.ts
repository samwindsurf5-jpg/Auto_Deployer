import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { VercelService } from '../integrations/vercel.service';
import { NetlifyService } from '../integrations/netlify.service';

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    private prisma: PrismaService,
    private vercelService: VercelService,
    private netlifyService: NetlifyService
  ) {}

  async deployToVercel(deployment: {
    userId: string;
    projectId: string;
    repositoryUrl: string;
    branch: string;
    buildSettings: any;
    githubToken: string;
  }) {
    try {
      // Check if user has connected Vercel
      const vercelIntegration = await this.prisma.providerIntegration.findUnique({
        where: {
          userId_provider: {
            userId: deployment.userId,
            provider: 'vercel',
          },
        },
      });

      if (!vercelIntegration) {
        this.logger.log(`No Vercel integration found for user ${deployment.userId}`);
        // First create or find a project for this deployment
        let project = await this.prisma.project.findFirst({
          where: {
            name: deployment.projectId,
          },
        });

        if (!project) {
          // Create a default organization for the user if it doesn't exist
          let organization = await this.prisma.organization.findFirst({
            where: {
              members: {
                some: {
                  userId: deployment.userId,
                },
              },
            },
          });

          if (!organization) {
            organization = await this.prisma.organization.create({
              data: {
                name: 'Personal',
                slug: `personal-${deployment.userId}`,
                members: {
                  create: {
                    userId: deployment.userId,
                    role: 'owner',
                    joinedAt: new Date(),
                  },
                },
              },
            });
          }

          // Create the project
          project = await this.prisma.project.create({
            data: {
              name: deployment.projectId,
              slug: deployment.projectId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              description: `Deployment for ${deployment.repositoryUrl}`,
              organizationId: organization.id,
            },
          });
        }

        // Create a deployment record showing it needs Vercel connection
        const deploymentRecord = await this.prisma.deployment.create({
          data: {
            projectId: project.id,
            branch: deployment.branch,
            commitSha: 'latest',
            status: 'requires_setup',
            provider: 'vercel',
            environment: 'production',
            configuration: deployment.buildSettings,
            createdBy: deployment.userId,
            logs: [
              {
                timestamp: new Date(),
                message: 'Deployment requires Vercel account connection',
                level: 'warning'
              }
            ],
          },
        });

        return {
          success: false,
          error: 'No Vercel integration found',
          message: 'Please connect your Vercel account in Settings first',
          deployment: {
            id: deploymentRecord.id,
            status: 'requires_setup',
            provider: 'vercel',
            url: null,
            setupUrl: 'https://vercel.com/integrations/github'
          }
        };
      }

      // Get or create project for Vercel deployment too
      let project = await this.prisma.project.findFirst({
        where: {
          name: deployment.projectId,
        },
      });

      if (!project) {
        // Create a default organization for the user if it doesn't exist
        let organization = await this.prisma.organization.findFirst({
          where: {
            members: {
              some: {
                userId: deployment.userId,
              },
            },
          },
        });

        if (!organization) {
          organization = await this.prisma.organization.create({
            data: {
              name: 'Personal',
              slug: `personal-${deployment.userId}`,
              members: {
                create: {
                  userId: deployment.userId,
                  role: 'owner',
                  joinedAt: new Date(),
                },
              },
            },
          });
        }

        // Create the project
        project = await this.prisma.project.create({
          data: {
            name: deployment.projectId,
            slug: deployment.projectId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            description: `Deployment for ${deployment.repositoryUrl}`,
            organizationId: organization.id,
          },
        });
      }

      // Create deployment record
      const deploymentRecord = await this.prisma.deployment.create({
        data: {
          projectId: project.id,
          branch: deployment.branch,
          commitSha: 'latest',
          status: 'deploying',
          provider: 'vercel',
          environment: 'production',
          configuration: deployment.buildSettings,
          createdBy: deployment.userId,
          logs: [
            {
              timestamp: new Date(),
              message: 'Deployment started - connecting to Vercel...',
              level: 'info'
            }
          ],
        },
      });

      // Use real Vercel API or simulate
      const vercelTokenData = JSON.parse(vercelIntegration.encryptedToken as string);
      const isRealVercelDeployment = !vercelTokenData.demo && vercelTokenData.access_token !== 'demo-vercel-token';
      
      // Smart build settings detection for Vercel
      const smartBuildSettings = this.detectBuildSettings(deployment.buildSettings);

      if (isRealVercelDeployment) {
        this.logger.log('Creating real Vercel deployment with API');
        
        // Use actual Vercel API
        try {
          const vercelResult = await this.vercelService.createDeployment({
            token: vercelTokenData.access_token,
            repositoryUrl: deployment.repositoryUrl,
            projectName: deployment.projectId,
            buildCommand: smartBuildSettings.buildCommand,
            outputDirectory: smartBuildSettings.outputDirectory,
            installCommand: smartBuildSettings.installCommand,
          });

          // Update deployment with real Vercel result
          await this.prisma.deployment.update({
            where: { id: deploymentRecord.id },
            data: {
              status: 'deployed',
              url: vercelResult.url,
              completedAt: new Date(),
              metadata: vercelResult,
              logs: [
                {
                  timestamp: new Date(),
                  message: '🚀 Real Vercel project created successfully!',
                  level: 'success'
                },
                {
                  timestamp: new Date(),
                  message: `🎉 Live deployment: ${vercelResult.url}`,
                  level: 'success'
                },
                {
                  timestamp: new Date(),
                  message: `📊 Dashboard: ${'dashboardUrl' in vercelResult ? vercelResult.dashboardUrl : 'https://vercel.com/dashboard'}`,
                  level: 'info'
                }
              ],
            },
          });

        } catch (vercelError) {
          this.logger.error('Real Vercel deployment failed:', vercelError);
          
          await this.prisma.deployment.update({
            where: { id: deploymentRecord.id },
            data: {
              status: 'failed',
              logs: [
                {
                  timestamp: new Date(),
                  message: `❌ Vercel deployment failed: ${vercelError.message}`,
                  level: 'error'
                }
              ],
            },
          });
        }
      } else {
        // Simulate deployment process for demo
        setTimeout(async () => {
          try {
            await this.prisma.deployment.update({
              where: { id: deploymentRecord.id },
              data: {
                status: 'demo_complete',
                url: `https://${deployment.projectId}-demo.vercel.app`,
                completedAt: new Date(),
                logs: [
                  {
                    timestamp: new Date(),
                    message: '✅ Demo deployment completed',
                    level: 'info'
                  },
                  {
                    timestamp: new Date(),
                    message: '🔗 Demo URL generated (connect Vercel for real deployments)',
                    level: 'info'
                  }
                ],
              },
            });
          } catch (error) {
            this.logger.error('Failed to update deployment status:', error);
          }
        }, 3000);
      }

      return {
        success: true,
        message: isRealVercelDeployment 
          ? 'Real Vercel deployment started successfully!' 
          : 'Demo Vercel deployment started!',
        deployment: {
          id: deploymentRecord.id,
          status: isRealVercelDeployment ? 'deploying' : 'demo_deployment',
          provider: 'vercel',
          isDemo: !isRealVercelDeployment,
          url: `https://${deployment.projectId}${isRealVercelDeployment ? '' : '-demo'}.vercel.app`,
        }
      };

    } catch (error) {
      this.logger.error('Vercel deployment failed:', error);
      throw error;
    }
  }

  async deployToNetlify(deployment: {
    userId: string;
    projectId: string;
    repositoryUrl: string;
    branch: string;
    buildSettings: any;
    githubToken: string;
  }) {
    try {
      // First create or find a project for this deployment
      let project = await this.prisma.project.findFirst({
        where: {
          name: deployment.projectId,
        },
      });

      if (!project) {
        // Create a default organization for the user if it doesn't exist
        let organization = await this.prisma.organization.findFirst({
          where: {
            members: {
              some: {
                userId: deployment.userId,
              },
            },
          },
        });

        if (!organization) {
          organization = await this.prisma.organization.create({
            data: {
              name: 'Personal',
              slug: `personal-${deployment.userId}`,
              members: {
                create: {
                  userId: deployment.userId,
                  role: 'owner',
                  joinedAt: new Date(),
                },
              },
            },
          });
        }

        // Create the project
        project = await this.prisma.project.create({
          data: {
            name: deployment.projectId,
            slug: deployment.projectId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            description: `Deployment for ${deployment.repositoryUrl}`,
            organizationId: organization.id,
          },
        });
      }

      // Create deployment record with realistic status
      const deploymentRecord = await this.prisma.deployment.create({
        data: {
          projectId: project.id,
          branch: deployment.branch,
          commitSha: 'latest',
          status: 'demo_deployment',
          provider: 'netlify',
          environment: 'production',
          configuration: deployment.buildSettings,
          createdBy: deployment.userId,
          logs: [
            {
              timestamp: new Date(),
              message: '🎯 DEMO: This is a simulated deployment for demonstration purposes',
              level: 'info'
            },
            {
              timestamp: new Date(),
              message: 'Real deployments require connecting your Netlify account',
              level: 'warning'
            }
          ],
        },
      });

      // Get user's Netlify token if they have one
      const netlifyIntegration = await this.prisma.providerIntegration.findUnique({
        where: {
          userId_provider: {
            userId: deployment.userId,
            provider: 'netlify',
          },
        },
      });

      let netlifyToken = 'demo-token';
      let isRealDeployment = false;

      if (netlifyIntegration) {
        const tokenData = JSON.parse(netlifyIntegration.encryptedToken as string);
        if (!tokenData.demo && tokenData.access_token !== 'demo-netlify-token') {
          netlifyToken = tokenData.access_token;
          isRealDeployment = true;
          this.logger.log('Using real Netlify token for deployment');
        }
      }

      // Try real deployment with demo fallback
      try {

        // Smart build settings detection
        const smartBuildSettings = this.detectBuildSettings(deployment.buildSettings);
        
        // Create the site using Netlify service with exact working settings
        const netlifyResult = await this.netlifyService.createSiteFromRepo({
          token: netlifyToken,
          repositoryUrl: deployment.repositoryUrl,
          siteName: deployment.projectId,
          buildCommand: 'npm run build',  // Use exact command that works
          publishDirectory: 'build',      // Use exact directory that works
        });

        // Handle different Netlify deployment outcomes
        if (isRealDeployment) {
          // Real Netlify deployment - site created successfully
          await this.prisma.deployment.update({
            where: { id: deploymentRecord.id },
            data: {
              status: netlifyResult.status === 'ready_for_setup' ? 'setup_required' : 'deployed',
              url: netlifyResult.url,
              completedAt: new Date(),
              metadata: { ...netlifyResult, isRealDeployment: true },
              logs: [
                {
                  timestamp: new Date(),
                  message: '🎉 Netlify site created successfully!',
                  level: 'success'
                },
                {
                  timestamp: new Date(), 
                  message: `🔗 Site URL: ${netlifyResult.url}`,
                  level: 'info'
                },
                {
                  timestamp: new Date(),
                  message: netlifyResult.automated 
                    ? (netlifyResult.gitConnected 
                        ? '🔗 Git repository connected - continuous deployment enabled!'
                        : '⚠️ Manual deployment created (Git connection failed)')
                    : '📋 Connect your GitHub repo in Netlify dashboard to enable auto-deployments',
                  level: netlifyResult.gitConnected ? 'success' : 'warning'
                },
                ...(netlifyResult.buildLogs ? netlifyResult.buildLogs.map(log => ({
                  timestamp: new Date(),
                  message: `📋 ${log}`,
                  level: 'info'
                })) : [])
              ],
            },
          });
        } else {
          // Demo deployment
          setTimeout(async () => {
            try {
              await this.prisma.deployment.update({
                where: { id: deploymentRecord.id },
                data: {
                  status: 'demo_complete',
                  url: netlifyResult.url,
                  completedAt: new Date(),
                  metadata: { ...netlifyResult, isRealDeployment: false },
                  logs: [
                    {
                      timestamp: new Date(),
                      message: '✅ Demo deployment completed',
                      level: 'success'
                    },
                    {
                      timestamp: new Date(),
                      message: '🔗 Demo URL generated (connect Netlify for real deployments)',
                      level: 'info'
                    }
                  ],
                },
              });
            } catch (error) {
              this.logger.error('Failed to update deployment:', error);
            }
          }, 2000);
        }

      } catch (error) {
        this.logger.error('Deployment process failed:', error);
        
        // Update deployment with error status
        await this.prisma.deployment.update({
          where: { id: deploymentRecord.id },
          data: {
            status: 'failed',
            logs: [
              {
                timestamp: new Date(),
                message: `❌ Deployment failed: ${error.message}`,
                level: 'error'
              }
            ],
          },
        });
      }

      return {
        id: deploymentRecord.id,
        status: isRealDeployment ? 'deploying' : 'demo_deployment',
        message: isRealDeployment 
          ? 'Real Netlify deployment in progress...' 
          : 'Demo deployment in progress (not a real deployment)',
        provider: 'netlify',
        isDemo: !isRealDeployment,
      };

    } catch (error) {
      this.logger.error('Demo deployment failed:', error);
      throw error;
    }
  }

  private detectBuildSettings(buildSettings: any) {
    // Smart detection of correct build settings based on common patterns
    const detectedSettings = {
      buildCommand: buildSettings?.buildCommand || 'npm run build',
      outputDirectory: buildSettings?.outputDirectory || 'dist',
      installCommand: buildSettings?.installCommand || 'npm install'
    };

    // Fix common build directory issues for different frameworks
    const framework = buildSettings?.framework?.name || 
                     buildSettings?.name || 
                     (buildSettings?.buildCommand?.includes('next') ? 'next.js' : 
                      buildSettings?.buildCommand?.includes('gatsby') ? 'gatsby' : 
                      'react'); // Default assumption
    
    if (framework) {
      const frameworkLower = framework.toLowerCase();
      
      switch (frameworkLower) {
        case 'react':
        case 'create-react-app':
          detectedSettings.outputDirectory = 'build';
          break;
        case 'next.js':
        case 'nextjs':
          detectedSettings.outputDirectory = '.next';
          detectedSettings.buildCommand = 'npm run build';
          break;
        case 'vite':
          detectedSettings.outputDirectory = 'dist';
          break;
        case 'gatsby':
          detectedSettings.outputDirectory = 'public';
          break;
        case 'nuxt':
          detectedSettings.outputDirectory = 'dist';
          break;
        default:
          // Try to detect from build command
          if (detectedSettings.buildCommand.includes('next')) {
            detectedSettings.outputDirectory = '.next';
          } else if (detectedSettings.buildCommand.includes('gatsby')) {
            detectedSettings.outputDirectory = 'public';
          } else {
            // Default fallback - check common directories
            detectedSettings.outputDirectory = 'build'; // Most React apps use 'build'
          }
      }
    } else {
      // No framework detected, check if it's a static site
      const hasPackageJson = buildSettings?.hasPackageJson !== false;
      
      if (!hasPackageJson) {
        // Likely a static HTML site
        detectedSettings.buildCommand = '# No build required';
        detectedSettings.outputDirectory = './'; // Serve from root
      } else {
        // Has package.json but no framework detected, use React default
        detectedSettings.outputDirectory = 'build';
      }
    }

    this.logger.log('Input build settings:', buildSettings);
    this.logger.log('Detected framework:', framework);
    this.logger.log('Final detected build settings:', detectedSettings);
    return detectedSettings;
  }

  private async createVercelDeployment(params: {
    token: string;
    repositoryUrl: string;
    buildSettings: any;
    deploymentId: string;
  }) {
    // In production, this would make actual API calls to Vercel
    // For demo, we'll simulate the deployment
    
    const deploymentUrl = `https://autodeploy-${params.deploymentId}.vercel.app`;
    
    return {
      url: deploymentUrl,
      previewUrl: deploymentUrl,
      id: `vercel_${params.deploymentId}`,
      status: 'deployed',
      createdAt: new Date(),
    };
  }

  private async simulateNetlifyDeployment(deployment: any) {
    // Simulate deployment process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const siteName = deployment.repositoryUrl.split('/').pop()?.replace('.git', '');
    return {
      url: `https://${siteName}-autodeploy.netlify.app`,
      id: `netlify_${Date.now()}`,
      status: 'deployed',
    };
  }

  async getDeploymentStatus(deploymentId: string, userId: string) {
    const deployment = await this.prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        createdBy: userId,
      },
      include: {
        project: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    return deployment;
  }

  async getUserDeployments(userId: string, limit = 10) {
    return this.prisma.deployment.findMany({
      where: { createdBy: userId },
      include: {
        project: {
          include: {
            repository: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async rollbackDeployment(deploymentId: string, userId: string) {
    // Find the deployment
    const deployment = await this.prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        createdBy: userId,
      },
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Find the previous successful deployment
    const previousDeployment = await this.prisma.deployment.findFirst({
      where: {
        projectId: deployment.projectId,
        status: 'deployed',
        startedAt: { lt: deployment.startedAt },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!previousDeployment) {
      throw new Error('No previous deployment found for rollback');
    }

    // Create a rollback deployment
    const rollbackDeployment = await this.prisma.deployment.create({
      data: {
        projectId: deployment.projectId,
        branch: previousDeployment.branch,
        commitSha: previousDeployment.commitSha,
        status: 'deployed',
        provider: deployment.provider,
        environment: deployment.environment,
        configuration: previousDeployment.configuration,
        createdBy: userId,
        url: previousDeployment.url,
        logs: [{ timestamp: new Date(), message: `Rolled back to deployment ${previousDeployment.id}`, level: 'info' }],
      },
    });

    return rollbackDeployment;
  }
}
