import { Controller, Get, Post, UseGuards, Request, Redirect, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('github')
  githubAuth() {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/github/callback';
    const scope = 'user:email read:user';
    const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    return { authUrl };
  }

  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error_description });
      }

      // Get user data from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const githubUser = await userResponse.json();

      // Get user emails
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const emails = await emailResponse.json();
      const primaryEmail = emails.find((e: any) => e.primary)?.email || githubUser.email;

      // Create or update user and generate JWT
      const result = await this.authService.githubLogin({
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: primaryEmail,
        avatar_url: githubUser.avatar_url,
      }, tokenData.access_token);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/success?token=${result.access_token}`);
    } catch (error) {
      console.error('GitHub OAuth Error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: any) {
    return req.user;
  }
}
