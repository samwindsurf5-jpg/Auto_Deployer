import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByGithubId(githubId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { githubId },
    });
  }

  async create(data: {
    email: string;
    name: string;
    avatarUrl?: string;
    githubId?: number;
  }): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
