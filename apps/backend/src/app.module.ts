import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Common modules
import { PrismaModule } from './common/prisma.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { IntegrationsModule } from './integrations/integrations.module';

// Configuration
import { AuthConfig } from './config/auth.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AuthConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // JWT Module
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'fallback-secret',
        signOptions: {
          expiresIn: config.get('JWT_EXPIRATION', '15m'),
        },
      }),
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Common modules
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    RepositoriesModule,
    DeploymentsModule,
    IntegrationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
