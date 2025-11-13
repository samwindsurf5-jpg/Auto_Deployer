# Provider Integrations & OAuth Flows

## Provider Integration Architecture

### Integration Strategy
```typescript
interface ProviderAdapter {
  name: string;
  authenticate(credentials: OAuthCredentials): Promise<AuthResult>;
  createProject(config: ProjectConfig): Promise<Project>;
  deploy(deployment: DeploymentConfig): Promise<DeploymentResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  getLogs(deploymentId: string): Promise<LogStream>;
  rollback(deploymentId: string, targetVersion?: string): Promise<RollbackResult>;
}
```

## GitHub Integration

### OAuth Configuration
```typescript
const githubOAuth = {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  scopes: [
    'read:user',
    'user:email',
    'repo',
    'read:org',
    'admin:repo_hook'
  ],
  redirectUri: `${process.env.APP_URL}/auth/github/callback`
};

// GitHub App configuration (preferred)
const githubApp = {
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  permissions: {
    contents: 'read',
    metadata: 'read',
    pull_requests: 'read',
    checks: 'write',
    actions: 'read'
  }
};
```

### API Integration
```typescript
class GitHubProvider implements ProviderAdapter {
  async authenticate(code: string): Promise<AuthResult> {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new URLSearchParams({
        client_id: githubOAuth.clientId,
        client_secret: githubOAuth.clientSecret,
        code
      })
    });
    
    const { access_token } = await tokenResponse.json();
    const user = await this.getUser(access_token);
    
    return {
      token: access_token,
      user,
      expiresAt: null // GitHub tokens don't expire
    };
  }

  async listRepositories(token: string, page = 1): Promise<Repository[]> {
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    return response.json();
  }

  async analyzeRepository(token: string, repo: string, branch = 'main'): Promise<RepoAnalysis> {
    const files = await this.getRepositoryContents(token, repo, branch);
    return this.analyzeFiles(files);
  }

  async createWebhook(token: string, repo: string): Promise<WebhookResult> {
    return fetch(`https://api.github.com/repos/${repo}/hooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request'],
        config: {
          url: `${process.env.APP_URL}/webhooks/github`,
          content_type: 'json',
          secret: process.env.GITHUB_WEBHOOK_SECRET
        }
      })
    }).then(r => r.json());
  }
}
```

## Vercel Integration

### OAuth & API Setup
```typescript
const vercelOAuth = {
  clientId: process.env.VERCEL_CLIENT_ID,
  clientSecret: process.env.VERCEL_CLIENT_SECRET,
  scopes: [
    'read:project',
    'write:project',
    'read:deployment',
    'write:deployment',
    'read:env',
    'write:env'
  ],
  redirectUri: `${process.env.APP_URL}/auth/vercel/callback`
};

class VercelProvider implements ProviderAdapter {
  async authenticate(code: string): Promise<AuthResult> {
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: vercelOAuth.clientId,
        client_secret: vercelOAuth.clientSecret,
        code,
        redirect_uri: vercelOAuth.redirectUri
      })
    });
    
    const { access_token, team_id } = await tokenResponse.json();
    return { token: access_token, teamId: team_id };
  }

  async createProject(config: ProjectConfig): Promise<Project> {
    const projectData = {
      name: config.name,
      gitRepository: {
        type: 'github',
        repo: config.repository
      },
      framework: config.framework,
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      installCommand: config.installCommand,
      devCommand: config.devCommand
    };

    const response = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectData)
    });

    return response.json();
  }

  async deploy(deployment: DeploymentConfig): Promise<DeploymentResult> {
    // Set environment variables first
    if (deployment.environmentVariables) {
      await this.updateEnvironmentVariables(deployment);
    }

    // Trigger deployment
    const deployResponse = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deployment.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: deployment.projectId,
          gitSource: {
            type: 'github',
            repo: deployment.repository,
            ref: deployment.branch
          },
          target: deployment.environment === 'production' ? 'production' : 'preview'
        })
      }
    );

    const result = await deployResponse.json();
    return {
      deploymentId: result.uid,
      url: result.url,
      status: 'building'
    };
  }

  async updateEnvironmentVariables(deployment: DeploymentConfig): Promise<void> {
    const envVars = Object.entries(deployment.environmentVariables).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted',
      target: [deployment.environment]
    }));

    await fetch(`https://api.vercel.com/v10/projects/${deployment.projectId}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deployment.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envVars)
    });
  }

  async getDeploymentStatus(token: string, deploymentId: string): Promise<DeploymentStatus> {
    const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const deployment = await response.json();
    return {
      status: deployment.readyState,
      url: deployment.url,
      createdAt: deployment.createdAt,
      buildingAt: deployment.buildingAt,
      readyAt: deployment.readyAt
    };
  }
}
```

## Render Integration

### OAuth & Deployment
```typescript
const renderOAuth = {
  clientId: process.env.RENDER_CLIENT_ID,
  clientSecret: process.env.RENDER_CLIENT_SECRET,
  scopes: ['read', 'write'],
  redirectUri: `${process.env.APP_URL}/auth/render/callback`
};

class RenderProvider implements ProviderAdapter {
  async authenticate(code: string): Promise<AuthResult> {
    const tokenResponse = await fetch('https://api.render.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: renderOAuth.clientId,
        client_secret: renderOAuth.clientSecret,
        code,
        redirect_uri: renderOAuth.redirectUri
      })
    });
    
    const { access_token, expires_in } = await tokenResponse.json();
    return {
      token: access_token,
      expiresAt: new Date(Date.now() + expires_in * 1000)
    };
  }

  async createWebService(config: ProjectConfig): Promise<Project> {
    const serviceData = {
      type: 'web_service',
      name: config.name,
      repo: config.repository,
      branch: config.branch,
      rootDir: config.rootDir || '.',
      buildCommand: config.buildCommand,
      startCommand: config.startCommand,
      envVars: Object.entries(config.environmentVariables || {}).map(([key, value]) => ({
        key,
        value
      })),
      serviceDetails: {
        publishPath: config.outputDirectory || './build',
        pullRequestPreviewsEnabled: 'yes'
      }
    };

    const response = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serviceData)
    });

    return response.json();
  }

  async triggerDeploy(token: string, serviceId: string): Promise<DeploymentResult> {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const deploy = await response.json();
    return {
      deploymentId: deploy.id,
      status: deploy.status,
      createdAt: deploy.createdAt
    };
  }

  async getDeployLogs(token: string, serviceId: string, deployId: string): Promise<string[]> {
    const response = await fetch(
      `https://api.render.com/v1/services/${serviceId}/deploys/${deployId}/logs`,
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    const logs = await response.json();
    return logs.map((log: any) => `[${log.timestamp}] ${log.message}`);
  }
}
```

## Railway Integration

### API Integration
```typescript
class RailwayProvider implements ProviderAdapter {
  async authenticate(token: string): Promise<AuthResult> {
    // Railway uses personal access tokens
    const response = await fetch('https://backboard.railway.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              id
              name
              email
            }
          }
        `
      })
    });

    const { data } = await response.json();
    return {
      token,
      user: data.me,
      expiresAt: null
    };
  }

  async createProject(config: ProjectConfig): Promise<Project> {
    const mutation = `
      mutation projectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id
          name
          description
        }
      }
    `;

    const response = await fetch('https://backboard.railway.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            name: config.name,
            description: config.description,
            prDeploys: true,
            teamId: config.teamId
          }
        }
      })
    });

    const { data } = await response.json();
    return data.projectCreate;
  }

  async deployFromGitHub(config: DeploymentConfig): Promise<DeploymentResult> {
    const mutation = `
      mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
        }
      }
    `;

    const response = await fetch('https://backboard.railway.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            projectId: config.projectId,
            source: {
              repo: config.repository,
              branch: config.branch
            },
            variables: config.environmentVariables
          }
        }
      })
    });

    const { data } = await response.json();
    return {
      serviceId: data.serviceCreate.id,
      status: 'deploying'
    };
  }
}
```

## Database Provider Integrations

### Supabase Integration
```typescript
class SupabaseProvider {
  async createProject(config: DatabaseConfig): Promise<DatabaseResult> {
    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: config.name,
        organization_id: config.organizationId,
        plan: config.plan || 'free',
        region: config.region || 'us-east-1',
        db_pass: this.generateSecurePassword()
      })
    });

    const project = await response.json();
    
    // Wait for project to be ready
    await this.waitForProjectReady(config.token, project.id);
    
    return {
      projectId: project.id,
      connectionString: `postgresql://postgres:${project.db_pass}@${project.host}:5432/postgres`,
      apiUrl: `https://${project.ref}.supabase.co`,
      anonKey: project.anon_key,
      serviceRoleKey: project.service_role_key
    };
  }

  async waitForProjectReady(token: string, projectId: string, maxWait = 300): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait * 1000) {
      const status = await this.getProjectStatus(token, projectId);
      if (status === 'ACTIVE_HEALTHY') return;
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Project creation timed out');
  }
}
```

### MongoDB Atlas Integration
```typescript
class MongoDBAtlasProvider {
  async createCluster(config: DatabaseConfig): Promise<DatabaseResult> {
    const clusterConfig = {
      name: config.name,
      mongoDBMajorVersion: '7.0',
      clusterType: 'REPLICASET',
      replicationSpecs: [{
        regionConfigs: [{
          regionName: config.region || 'US_EAST_1',
          electableSpecs: {
            instanceSize: config.tier || 'M0',
            nodeCount: 3
          }
        }]
      }]
    };

    const response = await fetch(
      `https://cloud.mongodb.com/api/atlas/v1.0/groups/${config.projectId}/clusters`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Digest ${config.apiKey}`
        },
        body: JSON.stringify(clusterConfig)
      }
    );

    const cluster = await response.json();
    
    // Create database user
    const user = await this.createDatabaseUser(config, cluster.name);
    
    return {
      clusterId: cluster.id,
      connectionString: `mongodb+srv://${user.username}:${user.password}@${cluster.srvAddress}/${config.databaseName}`,
      status: cluster.stateName
    };
  }

  async createDatabaseUser(config: DatabaseConfig, clusterName: string) {
    const userData = {
      username: config.username || 'autodeploy',
      password: this.generateSecurePassword(),
      roles: [{ roleName: 'readWrite', databaseName: config.databaseName || 'main' }]
    };

    await fetch(
      `https://cloud.mongodb.com/api/atlas/v1.0/groups/${config.projectId}/databaseUsers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Digest ${config.apiKey}`
        },
        body: JSON.stringify(userData)
      }
    );

    return userData;
  }
}
```

## OAuth Flow Implementation

### Generic OAuth Handler
```typescript
class OAuthManager {
  async initiateOAuth(provider: string, userId: string): Promise<string> {
    const state = await this.generateSecureState(userId, provider);
    const config = this.getProviderConfig(provider);
    
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('scope', config.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    
    return authUrl.toString();
  }

  async handleCallback(provider: string, code: string, state: string): Promise<AuthResult> {
    // Verify state parameter
    const stateData = await this.verifyState(state);
    if (!stateData) throw new Error('Invalid state parameter');
    
    // Exchange code for token
    return this.getProviderAdapter(provider).authenticate(code);
  }

  async refreshToken(provider: string, refreshToken: string): Promise<AuthResult> {
    const config = this.getProviderConfig(provider);
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken
      })
    });
    
    return response.json();
  }

  private async generateSecureState(userId: string, provider: string): Promise<string> {
    const stateData = {
      userId,
      provider,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Store state in Redis with expiration
    await this.redis.setex(`oauth_state:${state}`, 600, JSON.stringify(stateData));
    
    return state;
  }
}
```

### Provider Factory
```typescript
class ProviderFactory {
  private providers = new Map<string, ProviderAdapter>();

  constructor() {
    this.providers.set('github', new GitHubProvider());
    this.providers.set('vercel', new VercelProvider());
    this.providers.set('render', new RenderProvider());
    this.providers.set('railway', new RailwayProvider());
  }

  getProvider(name: string): ProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider ${name} not found`);
    return provider;
  }

  async deployToProvider(
    providerName: string,
    config: DeploymentConfig
  ): Promise<DeploymentResult> {
    const provider = this.getProvider(providerName);
    return provider.deploy(config);
  }
}
```

This comprehensive provider integration system enables seamless connection to all major hosting and database providers while maintaining security and reliability through proper OAuth flows and token management.
