# AutoDeploy Backend Architecture & API Specifications

## System Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │◄──►│  API Gateway    │◄──►│  Load Balancer  │
│   (Next.js)     │    │  (Kong/Nginx)   │    │  (ALB/HAProxy)  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────────┐
        │              Microservices Layer                  │
        ├─────────────┬─────────────┬─────────────┬─────────┤
        │   Auth      │  Analyzer   │  Deployer   │ Monitor │
        │  Service    │  Service    │  Service    │ Service │
        └─────────────┴─────────────┴─────────────┴─────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────────┐
        │                Data Layer                         │
        ├─────────────┬─────────────┬─────────────┬─────────┤
        │ PostgreSQL  │    Redis    │   Vault     │   S3    │
        │ (Primary)   │  (Cache)    │ (Secrets)   │ (Files) │
        └─────────────┴─────────────┴─────────────┴─────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────────┐
        │              External Integrations                │
        ├─────────────┬─────────────┬─────────────┬─────────┤
        │   GitHub    │   Vercel    │   Render    │ Supabase│
        │     API     │     API     │     API     │   API   │
        └─────────────┴─────────────┴─────────────┴─────────┘
```

### Core Services

#### 1. Authentication Service
- User management and authentication
- OAuth integration with providers
- JWT token management
- Role-based access control (RBAC)
- Team and organization management

#### 2. Repository Analyzer Service
- GitHub integration and repository analysis
- Framework detection algorithms
- Dependency parsing and analysis
- Environment variable extraction
- Build configuration generation

#### 3. Deployment Orchestrator Service
- Provider-specific deployment workflows
- Database provisioning coordination
- Environment variable management
- Build and deploy job queuing
- Rollback and recovery operations

#### 4. Monitoring & Observability Service
- Real-time metrics collection
- Log aggregation and analysis
- Health checks and alerting
- Performance monitoring
- Cost tracking and optimization

## API Design

### REST API Endpoints

#### Authentication & Users
```typescript
// User registration and authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

// OAuth integrations
GET    /api/v1/auth/github/url
POST   /api/v1/auth/github/callback
GET    /api/v1/auth/vercel/url
POST   /api/v1/auth/vercel/callback

// User management
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/:id/connections
```

#### Organizations & Teams
```typescript
// Organizations
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:id
PUT    /api/v1/organizations/:id
DELETE /api/v1/organizations/:id

// Team management
GET    /api/v1/organizations/:id/members
POST   /api/v1/organizations/:id/members
PUT    /api/v1/organizations/:id/members/:userId
DELETE /api/v1/organizations/:id/members/:userId
GET    /api/v1/organizations/:id/invitations
POST   /api/v1/organizations/:id/invitations
```

#### Repositories & Projects
```typescript
// Repository discovery
GET    /api/v1/repositories
GET    /api/v1/repositories/:id
POST   /api/v1/repositories/:id/analyze
GET    /api/v1/repositories/:id/analysis

// Project management
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id

// Environment variables
GET    /api/v1/projects/:id/env
POST   /api/v1/projects/:id/env
PUT    /api/v1/projects/:id/env/:key
DELETE /api/v1/projects/:id/env/:key
```

#### Deployments
```typescript
// Deployment operations
GET    /api/v1/projects/:id/deployments
POST   /api/v1/projects/:id/deployments
GET    /api/v1/deployments/:id
POST   /api/v1/deployments/:id/rollback
POST   /api/v1/deployments/:id/cancel

// Deployment logs and monitoring
GET    /api/v1/deployments/:id/logs
GET    /api/v1/deployments/:id/status
WS     /api/v1/deployments/:id/logs/stream
WS     /api/v1/deployments/:id/status/stream
```

#### Providers & Integrations
```typescript
// Provider management
GET    /api/v1/providers
GET    /api/v1/providers/:name/capabilities
GET    /api/v1/providers/:name/regions
GET    /api/v1/providers/:name/pricing

// Database provisioning
POST   /api/v1/databases
GET    /api/v1/databases/:id
DELETE /api/v1/databases/:id
GET    /api/v1/databases/:id/metrics
```

### GraphQL Schema

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  organizations: [Organization!]!
  projects: [Project!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Organization {
  id: ID!
  name: String!
  slug: String!
  members: [Member!]!
  projects: [Project!]!
  billing: Billing
  createdAt: DateTime!
}

type Project {
  id: ID!
  name: String!
  description: String
  repository: Repository!
  deployments: [Deployment!]!
  environments: [Environment!]!
  status: ProjectStatus!
  createdAt: DateTime!
}

type Repository {
  id: ID!
  fullName: String!
  url: String!
  defaultBranch: String!
  framework: Framework
  language: String
  analysis: RepositoryAnalysis
}

type Deployment {
  id: ID!
  project: Project!
  branch: String!
  commit: String!
  status: DeploymentStatus!
  url: String
  previewUrl: String
  logs: [LogEntry!]!
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int
}

type Environment {
  id: ID!
  name: String!
  variables: [EnvironmentVariable!]!
  database: Database
  provider: Provider!
}

enum DeploymentStatus {
  QUEUED
  BUILDING
  DEPLOYING
  READY
  ERROR
  CANCELLED
}

enum ProjectStatus {
  ACTIVE
  PAUSED
  ARCHIVED
}
```

### Request/Response Examples

#### Repository Analysis
```typescript
// POST /api/v1/repositories/123/analyze
{
  "branch": "main",
  "force": false
}

// Response
{
  "id": "analysis_456",
  "repository": {
    "id": "123",
    "fullName": "user/my-nextjs-app",
    "defaultBranch": "main"
  },
  "framework": {
    "name": "Next.js",
    "version": "14.0.0",
    "confidence": 0.95
  },
  "language": "TypeScript",
  "buildConfiguration": {
    "buildCommand": "npm run build",
    "startCommand": "npm run start",
    "installCommand": "npm install",
    "nodeVersion": "18.x"
  },
  "environmentVariables": [
    {
      "key": "DATABASE_URL",
      "required": true,
      "type": "database_connection",
      "description": "PostgreSQL connection string"
    }
  ],
  "dependencies": {
    "production": ["next", "react", "prisma"],
    "development": ["typescript", "@types/node"]
  },
  "recommendations": {
    "provider": "vercel",
    "database": "supabase",
    "estimatedCost": {
      "monthly": 0,
      "currency": "USD"
    }
  }
}
```

#### Deployment Creation
```typescript
// POST /api/v1/projects/123/deployments
{
  "branch": "main",
  "environment": "production",
  "provider": "vercel",
  "configuration": {
    "environmentVariables": {
      "DATABASE_URL": "provision_new",
      "NEXT_PUBLIC_API_URL": "https://api.example.com"
    },
    "database": {
      "provider": "supabase",
      "plan": "free"
    }
  }
}

// Response
{
  "id": "deploy_789",
  "status": "queued",
  "project": {
    "id": "123",
    "name": "my-nextjs-app"
  },
  "branch": "main",
  "commit": "a1b2c3d4e5f6",
  "estimatedDuration": 300,
  "steps": [
    {
      "name": "analyze_repository",
      "status": "pending",
      "estimatedDuration": 30
    },
    {
      "name": "provision_database",
      "status": "pending",
      "estimatedDuration": 90
    },
    {
      "name": "build_application",
      "status": "pending",
      "estimatedDuration": 120
    },
    {
      "name": "deploy_to_provider",
      "status": "pending",
      "estimatedDuration": 60
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Database Schema

### Core Tables
```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  github_id INTEGER UNIQUE,
  encrypted_password TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organizations and Teams
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  billing_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- Projects and Repositories
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  default_branch VARCHAR(100) DEFAULT 'main',
  private BOOLEAN DEFAULT false,
  language VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Repository Analysis
CREATE TABLE repository_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  branch VARCHAR(100) NOT NULL,
  commit_sha VARCHAR(40) NOT NULL,
  framework_name VARCHAR(100),
  framework_version VARCHAR(50),
  confidence_score DECIMAL(3,2),
  language VARCHAR(100),
  build_config JSONB,
  dependencies JSONB,
  environment_variables JSONB,
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deployments
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  branch VARCHAR(100) NOT NULL,
  commit_sha VARCHAR(40) NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  provider VARCHAR(100) NOT NULL,
  environment VARCHAR(100) DEFAULT 'production',
  url TEXT,
  preview_url TEXT,
  configuration JSONB,
  metadata JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Environment Variables
CREATE TABLE environment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  environment VARCHAR(100) NOT NULL,
  key VARCHAR(255) NOT NULL,
  encrypted_value TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, environment, key)
);

-- Provider Integrations
CREATE TABLE provider_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL,
  external_id VARCHAR(255),
  encrypted_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  scopes TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

### Indexes and Performance
```sql
-- Performance indexes
CREATE INDEX idx_deployments_project_status ON deployments(project_id, status);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_env_vars_project_env ON environment_variables(project_id, environment);

-- Full-text search
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_repositories_search ON repositories USING gin(to_tsvector('english', full_name));
```

## Message Queue & Job Processing

### Job Types
```typescript
interface DeploymentJob {
  type: 'deployment';
  payload: {
    deploymentId: string;
    projectId: string;
    repositoryId: string;
    branch: string;
    commit: string;
    provider: string;
    configuration: DeploymentConfiguration;
  };
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  delay?: number;
}

interface AnalysisJob {
  type: 'repository_analysis';
  payload: {
    repositoryId: string;
    branch: string;
    force: boolean;
  };
  priority: 'normal';
}

interface DatabaseProvisioningJob {
  type: 'database_provisioning';
  payload: {
    projectId: string;
    provider: string;
    configuration: DatabaseConfiguration;
  };
  priority: 'high';
}
```

### Queue Configuration
```typescript
// BullMQ configuration
const queueConfig = {
  deployment: {
    concurrency: 10,
    attempts: 3,
    backoff: 'exponential',
    removeOnComplete: 50,
    removeOnFail: 20
  },
  analysis: {
    concurrency: 20,
    attempts: 2,
    removeOnComplete: 100
  },
  provisioning: {
    concurrency: 5,
    attempts: 3,
    backoff: 'exponential'
  }
};
```

## Real-time Communication

### WebSocket Events
```typescript
// Deployment status updates
interface DeploymentStatusUpdate {
  type: 'deployment.status';
  deploymentId: string;
  status: DeploymentStatus;
  step?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

// Log streaming
interface LogEntry {
  type: 'deployment.log';
  deploymentId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

// Build progress
interface BuildProgress {
  type: 'deployment.build';
  deploymentId: string;
  stage: string;
  progress: number;
  eta?: number;
}
```

## Security Implementation

### Token Management
```typescript
interface TokenEncryption {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  iterations: 100000;
  saltLength: 32;
  ivLength: 16;
}

class TokenVault {
  async encrypt(token: string, userId: string): Promise<string>;
  async decrypt(encryptedToken: string, userId: string): Promise<string>;
  async rotate(userId: string, provider: string): Promise<void>;
}
```

### API Security
```typescript
// Rate limiting configuration
const rateLimits = {
  '/api/v1/auth/*': '10 requests per minute',
  '/api/v1/deployments': '30 requests per hour',
  '/api/v1/repositories/*/analyze': '60 requests per hour',
  '/api/v1/*': '1000 requests per hour'
};

// CORS configuration
const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

This architecture provides a scalable, secure foundation for the AutoDeploy platform with comprehensive API coverage and robust data management.
