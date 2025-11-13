import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(payload: any): Promise<any> {
    return this.usersService.findById(payload.sub);
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async githubLogin(githubUser: any, accessToken: string) {
    let user = await this.usersService.findByGithubId(githubUser.id);
    
    if (!user) {
      user = await this.usersService.create({
        email: githubUser.email || `${githubUser.login}@github.local`,
        name: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
        githubId: githubUser.id,
      });
    }

    // Store or update GitHub access token
    await this.prisma.providerIntegration.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'github',
        },
      },
      update: {
        encryptedToken: JSON.stringify({ access_token: accessToken }),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        provider: 'github',
        externalId: githubUser.id.toString(),
        encryptedToken: JSON.stringify({ access_token: accessToken }),
        scopes: ['user:email', 'read:user'],
      },
    });

    return this.login(user);
  }
}
