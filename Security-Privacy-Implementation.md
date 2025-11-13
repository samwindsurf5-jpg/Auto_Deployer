# Security & Privacy Implementation

## Security Architecture Overview

### Zero-Trust Security Model
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │───►│   API Gateway   │───►│  Auth Service   │
│                 │    │  (Rate Limit,   │    │  (JWT, RBAC)    │
│                 │    │   WAF, CORS)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │  Service Mesh   │
                    │  (mTLS, Policy  │
                    │   Enforcement)  │
                    └─────────────────┘
                                │
                ┌───────────────────────────────────┐
                │          Core Services            │
                ├─────────┬─────────┬─────────────┤
                │Analyzer │Deployer │   Monitor   │
                └─────────┴─────────┴─────────────┘
                                │
                    ┌─────────────────┐
                    │   Data Layer    │
                    │  (Encrypted at  │
                    │   Rest & Transit│
                    └─────────────────┘
```

## Authentication & Authorization

### JWT Implementation
```typescript
interface JWTPayload {
  sub: string; // User ID
  email: string;
  org?: string; // Organization ID
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
}

class JWTManager {
  private readonly secretKey: string;
  private readonly issuer = 'autodeploy.app';
  private readonly audience = 'autodeploy-api';

  async generateToken(user: User, organization?: Organization): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      org: organization?.id,
      roles: await this.getUserRoles(user.id, organization?.id),
      permissions: await this.getUserPermissions(user.id, organization?.id),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.secretKey, {
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256'
    });
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.secretKey, {
        issuer: this.issuer,
        audience: this.audience
      }) as JWTPayload;

      // Check if token is revoked
      const isRevoked = await this.redis.exists(`revoked_token:${payload.jti}`);
      if (isRevoked) throw new Error('Token revoked');

      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async revokeToken(jti: string): Promise<void> {
    // Store revoked token ID with expiration matching token expiry
    await this.redis.setex(`revoked_token:${jti}`, 900, '1');
  }
}
```

### Role-Based Access Control (RBAC)
```typescript
enum Permission {
  // Project permissions
  PROJECT_READ = 'project:read',
  PROJECT_WRITE = 'project:write',
  PROJECT_DELETE = 'project:delete',
  PROJECT_DEPLOY = 'project:deploy',
  
  // Environment permissions
  ENV_READ = 'env:read',
  ENV_WRITE = 'env:write',
  
  // Organization permissions
  ORG_READ = 'org:read',
  ORG_WRITE = 'org:write',
  ORG_MANAGE_MEMBERS = 'org:manage_members',
  ORG_BILLING = 'org:billing',
  
  // System permissions
  SYSTEM_ADMIN = 'system:admin'
}

enum Role {
  SYSTEM_ADMIN = 'system_admin',
  ORG_OWNER = 'org_owner',
  ORG_ADMIN = 'org_admin',
  ORG_MEMBER = 'org_member',
  PROJECT_ADMIN = 'project_admin',
  PROJECT_DEVELOPER = 'project_developer',
  PROJECT_VIEWER = 'project_viewer'
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.SYSTEM_ADMIN]: [Permission.SYSTEM_ADMIN],
  [Role.ORG_OWNER]: [
    Permission.ORG_READ, Permission.ORG_WRITE, Permission.ORG_MANAGE_MEMBERS,
    Permission.ORG_BILLING, Permission.PROJECT_READ, Permission.PROJECT_WRITE,
    Permission.PROJECT_DELETE, Permission.PROJECT_DEPLOY, Permission.ENV_READ,
    Permission.ENV_WRITE
  ],
  [Role.ORG_ADMIN]: [
    Permission.ORG_READ, Permission.ORG_MANAGE_MEMBERS,
    Permission.PROJECT_READ, Permission.PROJECT_WRITE, Permission.PROJECT_DEPLOY,
    Permission.ENV_READ, Permission.ENV_WRITE
  ],
  [Role.PROJECT_DEVELOPER]: [
    Permission.PROJECT_READ, Permission.PROJECT_DEPLOY,
    Permission.ENV_READ, Permission.ENV_WRITE
  ],
  [Role.PROJECT_VIEWER]: [Permission.PROJECT_READ, Permission.ENV_READ]
};

class RBACManager {
  async checkPermission(
    userId: string,
    permission: Permission,
    resourceId?: string
  ): Promise<boolean> {
    const user = await this.getUserWithRoles(userId);
    const userPermissions = await this.getUserPermissions(userId, resourceId);
    
    return userPermissions.includes(permission) || 
           userPermissions.includes(Permission.SYSTEM_ADMIN);
  }

  async getUserPermissions(userId: string, resourceId?: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(userId, resourceId);
    const permissions = new Set<Permission>();
    
    for (const role of roles) {
      const rolePerms = rolePermissions[role] || [];
      rolePerms.forEach(perm => permissions.add(perm));
    }
    
    return Array.from(permissions);
  }
}
```

## Encryption & Secrets Management

### Token Encryption
```typescript
class TokenVault {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationIterations = 100000;
  
  async encryptToken(token: string, userId: string): Promise<EncryptedToken> {
    // Generate unique salt for this user
    const salt = crypto.randomBytes(32);
    
    // Derive encryption key from master key + user salt
    const key = crypto.pbkdf2Sync(
      process.env.MASTER_ENCRYPTION_KEY!,
      salt,
      this.keyDerivationIterations,
      32,
      'sha256'
    );
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Encrypt token
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from(userId)); // Additional authenticated data
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm,
      keyDerivationIterations: this.keyDerivationIterations
    };
  }
  
  async decryptToken(encryptedToken: EncryptedToken, userId: string): Promise<string> {
    // Derive the same key used for encryption
    const key = crypto.pbkdf2Sync(
      process.env.MASTER_ENCRYPTION_KEY!,
      Buffer.from(encryptedToken.salt, 'hex'),
      encryptedToken.keyDerivationIterations,
      32,
      'sha256'
    );
    
    // Create decipher
    const decipher = crypto.createDecipher(encryptedToken.algorithm, key);
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(Buffer.from(encryptedToken.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedToken.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  async rotateUserTokens(userId: string): Promise<void> {
    const userTokens = await this.db.providerIntegrations.findMany({
      where: { userId }
    });
    
    for (const integration of userTokens) {
      try {
        // Decrypt current token
        const currentToken = await this.decryptToken(integration.encryptedToken, userId);
        
        // Refresh token with provider
        const newToken = await this.refreshProviderToken(integration.provider, currentToken);
        
        // Re-encrypt with new salt/key
        const encrypted = await this.encryptToken(newToken.accessToken, userId);
        
        // Update in database
        await this.db.providerIntegrations.update({
          where: { id: integration.id },
          data: {
            encryptedToken: encrypted,
            expiresAt: newToken.expiresAt,
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error(`Failed to rotate token for ${integration.provider}:`, error);
        // Log but don't throw - continue with other tokens
      }
    }
  }
}
```

### Environment Variable Security
```typescript
class SecureEnvironmentManager {
  async setEnvironmentVariable(
    projectId: string,
    environment: string,
    key: string,
    value: string,
    isSecret: boolean = false
  ): Promise<void> {
    // Classify variable type
    const classification = this.classifyVariable(key, value);
    
    let storedValue = value;
    if (classification.isSecret || isSecret) {
      // Encrypt sensitive values
      storedValue = await this.encryptValue(value, projectId);
    }
    
    await this.db.environmentVariables.upsert({
      where: {
        projectId_environment_key: {
          projectId,
          environment,
          key
        }
      },
      create: {
        projectId,
        environment,
        key,
        encryptedValue: storedValue,
        isSecret: classification.isSecret || isSecret,
        classification: classification.type
      },
      update: {
        encryptedValue: storedValue,
        updatedAt: new Date()
      }
    });
    
    // Audit log
    await this.auditLogger.log({
      action: 'env_var_updated',
      projectId,
      environment,
      key,
      isSecret: classification.isSecret || isSecret,
      userId: this.getCurrentUserId()
    });
  }
  
  private classifyVariable(key: string, value: string): VariableClassification {
    const secretPatterns = [
      /.*password.*/i,
      /.*secret.*/i,
      /.*key.*/i,
      /.*token.*/i,
      /.*auth.*/i,
      /.*api_key.*/i
    ];
    
    const databasePatterns = [
      /.*database_url.*/i,
      /.*db_url.*/i,
      /.*connection_string.*/i,
      /.*mongo.*/i,
      /.*redis.*/i
    ];
    
    if (secretPatterns.some(pattern => pattern.test(key))) {
      return { type: 'secret', isSecret: true };
    }
    
    if (databasePatterns.some(pattern => pattern.test(key))) {
      return { type: 'database', isSecret: true };
    }
    
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return { type: 'url', isSecret: false };
    }
    
    return { type: 'general', isSecret: false };
  }
}
```

## API Security

### Rate Limiting
```typescript
class AdvancedRateLimiter {
  private readonly redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    userId?: string
  ): Promise<RateLimitResult> {
    const limits = this.getEndpointLimits(endpoint);
    const now = Date.now();
    const windowStart = now - limits.windowMs;
    
    // Sliding window rate limiting
    const key = `rate_limit:${identifier}:${endpoint}`;
    
    // Clean old entries and count current requests
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const currentRequests = await this.redis.zcard(key);
    
    if (currentRequests >= limits.max) {
      const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldestRequest.length > 0 ? 
        parseInt(oldestRequest[1]) + limits.windowMs : 
        now + limits.windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }
    
    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, Math.ceil(limits.windowMs / 1000));
    
    return {
      allowed: true,
      remaining: limits.max - currentRequests - 1,
      resetTime: now + limits.windowMs
    };
  }
  
  private getEndpointLimits(endpoint: string): RateLimit {
    const rateLimits: Record<string, RateLimit> = {
      '/api/v1/auth/login': { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
      '/api/v1/deployments': { max: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
      '/api/v1/repositories/*/analyze': { max: 30, windowMs: 60 * 60 * 1000 },
      'default': { max: 1000, windowMs: 60 * 60 * 1000 } // 1000 per hour default
    };
    
    return rateLimits[endpoint] || rateLimits['default'];
  }
}
```

### Input Validation & Sanitization
```typescript
import Joi from 'joi';

const validationSchemas = {
  createProject: Joi.object({
    name: Joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9-_]+$/).required(),
    description: Joi.string().max(500).optional(),
    repositoryId: Joi.string().uuid().required(),
    framework: Joi.string().valid(...SUPPORTED_FRAMEWORKS).optional(),
    environmentVariables: Joi.object().pattern(
      Joi.string().pattern(/^[A-Z0-9_]+$/),
      Joi.string().max(1000)
    ).optional()
  }),
  
  deployment: Joi.object({
    branch: Joi.string().min(1).max(100).required(),
    environment: Joi.string().valid('development', 'staging', 'production').required(),
    provider: Joi.string().valid(...SUPPORTED_PROVIDERS).required(),
    configuration: Joi.object({
      buildCommand: Joi.string().max(200).optional(),
      startCommand: Joi.string().max(200).optional(),
      environmentVariables: Joi.object().pattern(
        Joi.string().pattern(/^[A-Z0-9_]+$/),
        Joi.string().max(1000)
      ).optional()
    }).optional()
  })
};

class InputValidator {
  static validate<T>(data: unknown, schema: Joi.Schema): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      throw new ValidationError(
        'Input validation failed',
        error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      );
    }
    
    return value as T;
  }
  
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }
  
  static sanitizeShellCommand(command: string): string {
    // Remove potentially dangerous characters
    const dangerous = /[;&|`$(){}[\]\\]/g;
    return command.replace(dangerous, '');
  }
}
```

## Audit Logging & Compliance

### Audit Logger
```typescript
interface AuditEvent {
  eventId: string;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  async log(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };
    
    // Store in database
    await this.db.auditLogs.create({
      data: auditEvent
    });
    
    // Send to log aggregation service (ELK, Splunk, etc.)
    await this.logAggregator.send(auditEvent);
    
    // Alert on critical events
    if (this.isCriticalEvent(event.action)) {
      await this.alertManager.sendAlert({
        type: 'security',
        severity: 'high',
        message: `Critical action performed: ${event.action}`,
        details: auditEvent
      });
    }
  }
  
  async queryAuditLogs(filters: AuditLogFilters): Promise<AuditEvent[]> {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }
    
    return this.db.auditLogs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0
    });
  }
  
  private isCriticalEvent(action: string): boolean {
    const criticalActions = [
      'user_deleted',
      'organization_deleted',
      'project_deleted',
      'mass_env_var_update',
      'admin_access_granted',
      'security_settings_changed'
    ];
    
    return criticalActions.includes(action);
  }
}
```

### GDPR Compliance
```typescript
class GDPRCompliance {
  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await this.db.users.findUnique({
      where: { id: userId },
      include: {
        organizations: true,
        projects: true,
        deployments: true,
        auditLogs: true,
        providerIntegrations: {
          select: {
            provider: true,
            createdAt: true,
            scopes: true
            // Don't include encrypted tokens
          }
        }
      }
    });
    
    if (!user) throw new Error('User not found');
    
    return {
      personalInformation: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      organizations: user.organizations,
      projects: user.projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt
      })),
      deployments: user.deployments.map(d => ({
        id: d.id,
        status: d.status,
        branch: d.branch,
        createdAt: d.createdAt
      })),
      auditLogs: user.auditLogs,
      connectedServices: user.providerIntegrations,
      exportDate: new Date()
    };
  }
  
  async deleteUserData(userId: string, retainAuditLogs = true): Promise<void> {
    await this.db.$transaction(async (tx) => {
      // Delete user's projects and related data
      await tx.deployments.deleteMany({ where: { createdBy: userId } });
      await tx.environmentVariables.deleteMany({
        where: { project: { organizationId: { in: await this.getUserOrganizations(userId) } } }
      });
      
      // Delete provider integrations (tokens)
      await tx.providerIntegrations.deleteMany({ where: { userId } });
      
      // Anonymize audit logs if required to retain them
      if (retainAuditLogs) {
        await tx.auditLogs.updateMany({
          where: { userId },
          data: {
            userId: null,
            details: { anonymized: true }
          }
        });
      } else {
        await tx.auditLogs.deleteMany({ where: { userId } });
      }
      
      // Delete user account
      await tx.users.delete({ where: { id: userId } });
    });
    
    // Clear any cached data
    await this.redis.del(`user:${userId}:*`);
    
    // Log the deletion
    await this.auditLogger.log({
      action: 'user_data_deleted',
      resource: 'user',
      resourceId: userId,
      details: { retainAuditLogs },
      success: true,
      ipAddress: '',
      userAgent: 'system'
    });
  }
}
```

## Infrastructure Security

### Container Security
```dockerfile
# Multi-stage build for minimal attack surface
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Install security updates
RUN apk --no-cache add dumb-init && apk upgrade

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

# Remove unnecessary packages
RUN apk del apk-tools

USER nextjs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

### Network Security
```yaml
# Kubernetes Network Policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: autodeploy-network-policy
spec:
  podSelector:
    matchLabels:
      app: autodeploy
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS to external APIs only
```

This comprehensive security implementation ensures data protection, proper authentication/authorization, audit compliance, and infrastructure security throughout the AutoDeploy platform.
