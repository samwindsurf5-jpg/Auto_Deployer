import { Controller, Get, Post, UseGuards, Request, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/services/prisma.service';
import { VercelService } from './vercel.service';
import { NetlifyService } from './netlify.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vercelService: VercelService,
    private readonly netlifyService: NetlifyService
  ) {}

  @Get()
  async getUserIntegrations(@Request() req: any) {
    const integrations = await this.prisma.providerIntegration.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        provider: true,
        externalId: true,
        scopes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return integrations;
  }

  @Post(':provider/connect')
  async connectProvider(
    @Param('provider') provider: string,
    @Body() connectionData: any,
    @Request() req: any
  ) {
    if (provider === 'netlify' || provider === 'vercel') {
      try {
        let validationResult = null;
        let externalUserId = connectionData.externalId || `demo-user-${Date.now()}`;

        // Validate token if provided (not demo mode)
        if (connectionData.token && !connectionData.demo) {
          if (provider === 'vercel') {
            validationResult = await this.vercelService.validateToken(connectionData.token);
          } else if (provider === 'netlify') {
            validationResult = await this.netlifyService.validateToken(connectionData.token);
          }

          if (!validationResult.valid) {
            return {
              success: false,
              error: validationResult.error,
              message: 'Token validation failed',
            };
          }

          externalUserId = validationResult.user.id;
        }

        const integration = await this.prisma.providerIntegration.upsert({
          where: {
            userId_provider: {
              userId: req.user.id,
              provider: provider,
            },
          },
          update: {
            encryptedToken: JSON.stringify({ 
              access_token: connectionData.token || `demo-${provider}-token`,
              demo: connectionData.demo || !connectionData.token,
              ...(validationResult?.user && { userInfo: validationResult.user })
            }),
            externalId: externalUserId,
            updatedAt: new Date(),
          },
          create: {
            userId: req.user.id,
            provider: provider,
            externalId: externalUserId,
            encryptedToken: JSON.stringify({ 
              access_token: connectionData.token || `demo-${provider}-token`,
              demo: connectionData.demo || !connectionData.token,
              ...(validationResult?.user && { userInfo: validationResult.user })
            }),
            scopes: connectionData.scopes || ['read', 'write'],
          },
        });

        return {
          success: true,
          message: connectionData.token && !connectionData.demo
            ? `✅ ${provider} connected successfully!`
            : `🎯 ${provider} demo mode enabled`,
          integration: {
            id: integration.id,
            provider: integration.provider,
            isDemo: connectionData.demo || !connectionData.token,
            externalUserId,
            ...(validationResult?.user && { connectedUser: validationResult.user })
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to save integration',
        };
      }
    }

    return {
      success: false,
      error: 'Unsupported provider',
    };
  }

  @Get(':provider/status')
  async getProviderStatus(@Param('provider') provider: string, @Request() req: any) {
    const integration = await this.prisma.providerIntegration.findUnique({
      where: {
        userId_provider: {
          userId: req.user.id,
          provider: provider,
        },
      },
    });

    if (!integration) {
      return {
        connected: false,
        provider: provider,
      };
    }

    const tokenData = JSON.parse(integration.encryptedToken as string);
    
    return {
      connected: true,
      provider: provider,
      isDemo: tokenData.demo || false,
      externalId: integration.externalId,
      connectedAt: integration.createdAt,
    };
  }
}
