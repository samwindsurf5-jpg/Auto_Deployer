# Repository Detection Heuristics & Rules

## Detection Algorithm Overview

### Analysis Pipeline
```
Repository → File Analysis → Dependency Analysis → Framework Detection → Provider Matching → Recommendations
    ↓              ↓                ↓                    ↓                    ↓                    ↓
GitHub API     File Content     Package Parsers     Pattern Matching    Provider Mapping    Config Generation
```

## Framework Detection Rules

### Next.js Detection
```typescript
const nextJsDetection: DetectionRule = {
  framework: 'Next.js',
  confidence: {
    high: 0.95,
    medium: 0.80,
    low: 0.60
  },
  rules: [
    {
      type: 'package_json',
      conditions: [
        { path: 'dependencies.next', required: true, weight: 0.4 },
        { path: 'dependencies.react', required: true, weight: 0.2 },
        { path: 'scripts.build', contains: 'next build', weight: 0.2 },
        { path: 'scripts.start', contains: 'next start', weight: 0.1 }
      ],
      minimumScore: 0.6
    },
    {
      type: 'file_structure',
      conditions: [
        { path: 'pages/', exists: true, weight: 0.3 },
        { path: 'app/', exists: true, weight: 0.35 }, // App Router
        { path: 'next.config.js', exists: true, weight: 0.25 },
        { path: 'next.config.ts', exists: true, weight: 0.25 },
        { path: 'next.config.mjs', exists: true, weight: 0.25 }
      ],
      minimumScore: 0.3
    },
    {
      type: 'content_analysis',
      conditions: [
        { file: 'next.config.*', contains: 'module.exports', weight: 0.2 },
        { file: '**/*.tsx', contains: 'import.*from.*next/', weight: 0.15 },
        { file: 'app/layout.*', exists: true, weight: 0.3 }, // App Router layout
        { file: 'pages/_app.*', exists: true, weight: 0.25 } // Pages Router
      ],
      minimumScore: 0.2
    }
  ],
  recommendations: {
    provider: 'vercel',
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    outputDirectory: '.next',
    nodeVersion: '18.x'
  }
};
```

### React SPA Detection
```typescript
const reactSpaDetection: DetectionRule = {
  framework: 'React SPA',
  confidence: { high: 0.90, medium: 0.75, low: 0.55 },
  rules: [
    {
      type: 'package_json',
      conditions: [
        { path: 'dependencies.react', required: true, weight: 0.3 },
        { path: 'dependencies.react-dom', required: true, weight: 0.2 },
        { path: 'scripts.build', exists: true, weight: 0.15 },
        { path: 'dependencies.react-scripts', exists: true, weight: 0.25 }, // CRA
        { path: 'devDependencies.vite', exists: true, weight: 0.25 } // Vite
      ],
      minimumScore: 0.5,
      exclusions: [
        { path: 'dependencies.next', exists: true }, // Not Next.js
        { path: 'dependencies.gatsby', exists: true } // Not Gatsby
      ]
    },
    {
      type: 'file_structure',
      conditions: [
        { path: 'public/index.html', exists: true, weight: 0.4 },
        { path: 'src/index.js', exists: true, weight: 0.3 },
        { path: 'src/index.tsx', exists: true, weight: 0.3 },
        { path: 'src/App.js', exists: true, weight: 0.2 },
        { path: 'src/App.tsx', exists: true, weight: 0.2 }
      ],
      minimumScore: 0.4
    }
  ],
  recommendations: {
    provider: 'netlify',
    buildCommand: 'npm run build',
    outputDirectory: 'build', // CRA default
    staticSite: true
  }
};
```

### Express.js API Detection
```typescript
const expressDetection: DetectionRule = {
  framework: 'Express.js',
  confidence: { high: 0.85, medium: 0.70, low: 0.50 },
  rules: [
    {
      type: 'package_json',
      conditions: [
        { path: 'dependencies.express', required: true, weight: 0.5 },
        { path: 'scripts.start', contains: 'node', weight: 0.2 },
        { path: 'main', exists: true, weight: 0.1 }
      ],
      minimumScore: 0.5
    },
    {
      type: 'content_analysis',
      conditions: [
        { file: '**/*.js', contains: 'express()', weight: 0.3 },
        { file: '**/*.js', contains: 'app.listen', weight: 0.25 },
        { file: '**/*.js', contains: 'require(\'express\')', weight: 0.2 },
        { file: '**/*.ts', contains: 'import.*express', weight: 0.2 }
      ],
      minimumScore: 0.3
    },
    {
      type: 'file_structure',
      conditions: [
        { path: 'server.js', exists: true, weight: 0.3 },
        { path: 'app.js', exists: true, weight: 0.25 },
        { path: 'index.js', exists: true, weight: 0.2 },
        { path: 'routes/', exists: true, weight: 0.15 },
        { path: 'middleware/', exists: true, weight: 0.1 }
      ],
      minimumScore: 0.2
    }
  ],
  recommendations: {
    provider: 'render',
    startCommand: 'node server.js',
    serverSide: true,
    port: 3000
  }
};
```

### Python FastAPI Detection
```typescript
const fastApiDetection: DetectionRule = {
  framework: 'FastAPI',
  confidence: { high: 0.90, medium: 0.75, low: 0.60 },
  rules: [
    {
      type: 'requirements_txt',
      conditions: [
        { dependency: 'fastapi', required: true, weight: 0.4 },
        { dependency: 'uvicorn', exists: true, weight: 0.3 },
        { dependency: 'pydantic', exists: true, weight: 0.2 }
      ],
      minimumScore: 0.4
    },
    {
      type: 'pyproject_toml',
      conditions: [
        { path: 'dependencies', contains: 'fastapi', weight: 0.4 },
        { path: 'dependencies', contains: 'uvicorn', weight: 0.3 }
      ],
      minimumScore: 0.4
    },
    {
      type: 'content_analysis',
      conditions: [
        { file: '**/*.py', contains: 'from fastapi import', weight: 0.4 },
        { file: '**/*.py', contains: 'FastAPI()', weight: 0.3 },
        { file: '**/*.py', contains: '@app.get', weight: 0.2 },
        { file: '**/*.py', contains: '@app.post', weight: 0.1 }
      ],
      minimumScore: 0.4
    }
  ],
  recommendations: {
    provider: 'render',
    startCommand: 'uvicorn main:app --host 0.0.0.0 --port $PORT',
    buildCommand: 'pip install -r requirements.txt',
    pythonVersion: '3.11'
  }
};
```

### Docker Detection
```typescript
const dockerDetection: DetectionRule = {
  framework: 'Docker',
  confidence: { high: 1.0, medium: 0.85, low: 0.70 },
  rules: [
    {
      type: 'file_structure',
      conditions: [
        { path: 'Dockerfile', exists: true, weight: 0.8 },
        { path: 'docker-compose.yml', exists: true, weight: 0.4 },
        { path: 'docker-compose.yaml', exists: true, weight: 0.4 },
        { path: '.dockerignore', exists: true, weight: 0.1 }
      ],
      minimumScore: 0.8
    },
    {
      type: 'content_analysis',
      conditions: [
        { file: 'Dockerfile', contains: 'FROM', weight: 0.5 },
        { file: 'Dockerfile', contains: 'COPY', weight: 0.2 },
        { file: 'Dockerfile', contains: 'EXPOSE', weight: 0.2 },
        { file: 'Dockerfile', contains: 'CMD', weight: 0.1 }
      ],
      minimumScore: 0.5
    }
  ],
  recommendations: {
    provider: 'railway',
    containerized: true,
    buildFromDockerfile: true
  }
};
```

## Language Detection

### Programming Language Analysis
```typescript
class LanguageDetector {
  private languagePatterns = {
    javascript: ['.js', '.mjs', '.jsx'],
    typescript: ['.ts', '.tsx'],
    python: ['.py', '.pyw'],
    ruby: ['.rb', '.rake'],
    go: ['.go'],
    rust: ['.rs'],
    java: ['.java'],
    php: ['.php'],
    csharp: ['.cs'],
    cpp: ['.cpp', '.cc', '.cxx'],
    html: ['.html', '.htm'],
    css: ['.css', '.scss', '.sass', '.less']
  };

  async detectPrimaryLanguage(files: RepositoryFile[]): Promise<LanguageAnalysis> {
    const languageStats: Record<string, number> = {};
    let totalLines = 0;

    for (const file of files) {
      const extension = this.getFileExtension(file.path);
      const language = this.getLanguageByExtension(extension);
      
      if (language && file.content) {
        const lines = file.content.split('\n').length;
        languageStats[language] = (languageStats[language] || 0) + lines;
        totalLines += lines;
      }
    }

    const languages = Object.entries(languageStats)
      .map(([language, lines]) => ({
        language,
        lines,
        percentage: (lines / totalLines) * 100
      }))
      .sort((a, b) => b.lines - a.lines);

    return {
      primary: languages[0]?.language || 'unknown',
      distribution: languages,
      totalLines
    };
  }

  private getLanguageByExtension(extension: string): string | null {
    for (const [language, extensions] of Object.entries(this.languagePatterns)) {
      if (extensions.includes(extension)) {
        return language;
      }
    }
    return null;
  }
}
```

## Database Detection

### Database Requirement Analysis
```typescript
const databaseDetection: DatabaseDetectionRule[] = [
  {
    database: 'PostgreSQL',
    indicators: [
      { type: 'dependency', patterns: ['pg', 'postgres', 'postgresql', 'psycopg2'] },
      { type: 'env_var', patterns: ['DATABASE_URL', 'POSTGRES_URL', 'PG_*'] },
      { type: 'config_file', files: ['prisma/schema.prisma'], contains: 'provider = "postgresql"' },
      { type: 'config_file', files: ['knexfile.js'], contains: 'client: \'pg\'' },
      { type: 'import_statement', patterns: ['import.*pg', 'require.*pg', 'from.*psycopg2'] }
    ],
    recommendations: {
      provider: 'supabase',
      plan: 'free',
      features: ['auth', 'realtime', 'api']
    }
  },
  {
    database: 'MongoDB',
    indicators: [
      { type: 'dependency', patterns: ['mongoose', 'mongodb', 'pymongo'] },
      { type: 'env_var', patterns: ['MONGODB_URI', 'MONGO_URL', 'MONGODB_*'] },
      { type: 'config_file', files: ['prisma/schema.prisma'], contains: 'provider = "mongodb"' },
      { type: 'import_statement', patterns: ['import.*mongoose', 'require.*mongodb'] }
    ],
    recommendations: {
      provider: 'mongodb_atlas',
      plan: 'free',
      cluster: 'M0'
    }
  },
  {
    database: 'Redis',
    indicators: [
      { type: 'dependency', patterns: ['redis', 'ioredis', 'node_redis'] },
      { type: 'env_var', patterns: ['REDIS_URL', 'REDIS_HOST', 'REDIS_*'] },
      { type: 'import_statement', patterns: ['import.*redis', 'require.*redis'] }
    ],
    recommendations: {
      provider: 'redis_cloud',
      plan: 'free'
    }
  }
];

class DatabaseDetector {
  async analyzeDatabaseRequirements(
    packageJson: any,
    envExampleContent: string,
    configFiles: RepositoryFile[]
  ): Promise<DatabaseRequirement[]> {
    const requirements: DatabaseRequirement[] = [];

    for (const rule of databaseDetection) {
      let score = 0;
      const evidence: string[] = [];

      // Check dependencies
      for (const indicator of rule.indicators) {
        if (indicator.type === 'dependency') {
          for (const pattern of indicator.patterns) {
            if (this.hasDependency(packageJson, pattern)) {
              score += 0.3;
              evidence.push(`Dependency: ${pattern}`);
            }
          }
        }
        
        if (indicator.type === 'env_var') {
          for (const pattern of indicator.patterns) {
            if (this.hasEnvVar(envExampleContent, pattern)) {
              score += 0.4;
              evidence.push(`Environment variable: ${pattern}`);
            }
          }
        }
        
        if (indicator.type === 'config_file') {
          const configFile = configFiles.find(f => 
            indicator.files?.some(file => f.path.includes(file))
          );
          if (configFile && indicator.contains && 
              configFile.content?.includes(indicator.contains)) {
            score += 0.5;
            evidence.push(`Config file: ${configFile.path}`);
          }
        }
      }

      if (score >= 0.3) {
        requirements.push({
          database: rule.database,
          confidence: Math.min(score, 1.0),
          evidence,
          recommendations: rule.recommendations
        });
      }
    }

    return requirements.sort((a, b) => b.confidence - a.confidence);
  }

  private hasDependency(packageJson: any, pattern: string): boolean {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };
    
    return Object.keys(deps).some(dep => 
      dep.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private hasEnvVar(envContent: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'), 'i');
      return regex.test(envContent);
    }
    return envContent.toLowerCase().includes(pattern.toLowerCase());
  }
}
```

## Environment Variable Detection

### Smart Environment Variable Analysis
```typescript
class EnvironmentVariableDetector {
  private variablePatterns = {
    database: {
      patterns: ['*_DATABASE_URL', '*_DB_*', 'DATABASE_*', 'MONGO*', 'REDIS*', 'POSTGRES*'],
      classification: 'database',
      autoProvision: true,
      secret: true
    },
    api_keys: {
      patterns: ['*_API_KEY', '*_SECRET_KEY', '*_TOKEN', 'API_*', 'SECRET_*'],
      classification: 'api_key',
      secret: true,
      inputRequired: true
    },
    urls: {
      patterns: ['*_URL', '*_ENDPOINT', 'API_BASE*', 'WEBHOOK_*'],
      classification: 'url',
      validation: 'url'
    },
    features: {
      patterns: ['FEATURE_*', 'ENABLE_*', '*_ENABLED', 'DEBUG*'],
      classification: 'feature_flag',
      defaultValue: true
    },
    auth: {
      patterns: ['JWT_*', 'AUTH_*', 'SESSION_*', 'OAUTH_*'],
      classification: 'authentication',
      secret: true,
      generate: true
    }
  };

  async analyzeEnvironmentVariables(
    envExampleContent: string,
    readmeContent: string,
    sourceFiles: RepositoryFile[]
  ): Promise<EnvironmentVariable[]> {
    const variables: EnvironmentVariable[] = [];
    
    // Parse .env.example
    const envVars = this.parseEnvFile(envExampleContent);
    
    // Scan source code for process.env usage
    const codeVars = this.extractEnvVarsFromCode(sourceFiles);
    
    // Combine and deduplicate
    const allVars = new Set([...envVars, ...codeVars]);
    
    for (const varName of allVars) {
      const analysis = this.analyzeVariable(varName, envExampleContent, readmeContent);
      variables.push({
        key: varName,
        ...analysis
      });
    }
    
    return variables.sort((a, b) => {
      // Sort by importance: required first, then by classification
      if (a.required !== b.required) return a.required ? -1 : 1;
      if (a.secret !== b.secret) return a.secret ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
  }

  private analyzeVariable(
    varName: string,
    envContent: string,
    readmeContent: string
  ): EnvironmentVariableAnalysis {
    let classification = 'general';
    let secret = false;
    let required = false;
    let autoProvision = false;
    let generate = false;
    let defaultValue: string | undefined;
    let description: string | undefined;

    // Check against patterns
    for (const [category, config] of Object.entries(this.variablePatterns)) {
      for (const pattern of config.patterns) {
        if (this.matchesPattern(varName, pattern)) {
          classification = config.classification;
          secret = config.secret || false;
          autoProvision = config.autoProvision || false;
          generate = config.generate || false;
          break;
        }
      }
    }

    // Extract description from comments
    description = this.extractDescription(varName, envContent, readmeContent);
    
    // Detect if required (no default value in .env.example)
    const envLine = envContent.split('\n').find(line => 
      line.trim().startsWith(varName + '=')
    );
    
    if (envLine) {
      const value = envLine.split('=')[1]?.trim();
      if (!value || value === '""' || value === "''") {
        required = true;
      } else {
        defaultValue = value;
      }
    }

    return {
      classification,
      secret,
      required,
      autoProvision,
      generate,
      defaultValue,
      description
    };
  }

  private parseEnvFile(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('=')[0])
      .filter(Boolean);
  }

  private extractEnvVarsFromCode(files: RepositoryFile[]): string[] {
    const envVars = new Set<string>();
    const patterns = [
      /process\.env\.([A-Z_][A-Z0-9_]*)/g,
      /os\.environ\.get\(['"]([A-Z_][A-Z0-9_]*)['"]/g,
      /os\.getenv\(['"]([A-Z_][A-Z0-9_]*)['"]/g,
      /ENV\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g
    ];

    for (const file of files) {
      if (!file.content) continue;
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(file.content)) !== null) {
          envVars.add(match[1]);
        }
      }
    }

    return Array.from(envVars);
  }

  private matchesPattern(varName: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*') + '$',
        'i'
      );
      return regex.test(varName);
    }
    return varName.toLowerCase() === pattern.toLowerCase();
  }

  private extractDescription(
    varName: string,
    envContent: string,
    readmeContent: string
  ): string | undefined {
    // Look for comments above the variable in .env.example
    const lines = envContent.split('\n');
    const varLineIndex = lines.findIndex(line => 
      line.trim().startsWith(varName + '=')
    );
    
    if (varLineIndex > 0) {
      const prevLine = lines[varLineIndex - 1].trim();
      if (prevLine.startsWith('#')) {
        return prevLine.substring(1).trim();
      }
    }
    
    // Look for documentation in README
    const readmeLines = readmeContent.toLowerCase().split('\n');
    const varMentionIndex = readmeLines.findIndex(line => 
      line.includes(varName.toLowerCase())
    );
    
    if (varMentionIndex >= 0) {
      // Return the line that mentions the variable
      return readmeContent.split('\n')[varMentionIndex].trim();
    }
    
    return undefined;
  }
}
```

## Provider Matching Algorithm

### Intelligent Provider Selection
```typescript
class ProviderMatcher {
  private providerCapabilities = {
    vercel: {
      frameworks: ['Next.js', 'React SPA', 'Svelte', 'Vue.js'],
      features: ['serverless', 'edge_functions', 'static_hosting', 'cdn'],
      limitations: { serverSide: false, longRunning: false },
      cost: { free_tier: true, pricing_model: 'usage' },
      performance: { build_speed: 9, cold_start: 9, global_cdn: 10 }
    },
    render: {
      frameworks: ['Express.js', 'FastAPI', 'Django', 'Ruby on Rails', 'Docker'],
      features: ['server_hosting', 'databases', 'cron_jobs', 'docker'],
      limitations: { cold_start: true },
      cost: { free_tier: true, pricing_model: 'instance_hours' },
      performance: { build_speed: 7, cold_start: 6, reliability: 9 }
    },
    railway: {
      frameworks: ['Any', 'Docker', 'Node.js', 'Python', 'Go'],
      features: ['databases', 'docker', 'scale_to_zero', 'private_networking'],
      limitations: {},
      cost: { free_tier: true, pricing_model: 'usage' },
      performance: { build_speed: 8, cold_start: 7, developer_experience: 10 }
    },
    netlify: {
      frameworks: ['React SPA', 'Vue.js', 'Gatsby', 'Static Sites'],
      features: ['static_hosting', 'functions', 'forms', 'cdn'],
      limitations: { serverSide: false, databases: false },
      cost: { free_tier: true, pricing_model: 'bandwidth' },
      performance: { build_speed: 8, cold_start: 8, global_cdn: 9 }
    }
  };

  async selectOptimalProvider(
    analysis: RepositoryAnalysis,
    preferences: UserPreferences = {}
  ): Promise<ProviderRecommendation[]> {
    const recommendations: ProviderRecommendation[] = [];

    for (const [provider, capabilities] of Object.entries(this.providerCapabilities)) {
      const score = this.calculateProviderScore(analysis, capabilities, preferences);
      
      if (score.total > 0.3) {
        recommendations.push({
          provider,
          score: score.total,
          confidence: this.calculateConfidence(score),
          reasons: score.reasons,
          estimatedCost: this.estimateCost(provider, analysis),
          limitations: this.identifyLimitations(capabilities, analysis)
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private calculateProviderScore(
    analysis: RepositoryAnalysis,
    capabilities: ProviderCapabilities,
    preferences: UserPreferences
  ): ProviderScore {
    let score = 0;
    const reasons: string[] = [];

    // Framework compatibility (40% weight)
    if (analysis.framework && capabilities.frameworks.includes(analysis.framework)) {
      score += 0.4;
      reasons.push(`Native ${analysis.framework} support`);
    } else if (capabilities.frameworks.includes('Any') || capabilities.frameworks.includes('Docker')) {
      score += 0.2;
      reasons.push('Generic framework support');
    }

    // Feature requirements (30% weight)
    let featureScore = 0;
    let requiredFeatures = 0;

    if (analysis.requiresServer) {
      requiredFeatures++;
      if (capabilities.features.includes('server_hosting')) {
        featureScore += 0.1;
        reasons.push('Server-side rendering support');
      }
    }

    if (analysis.requiresDatabase) {
      requiredFeatures++;
      if (capabilities.features.includes('databases')) {
        featureScore += 0.1;
        reasons.push('Integrated database support');
      }
    }

    if (analysis.isStatic) {
      if (capabilities.features.includes('static_hosting')) {
        featureScore += 0.1;
        reasons.push('Optimized for static sites');
      }
    }

    score += (featureScore / Math.max(requiredFeatures, 1)) * 0.3;

    // Performance factors (20% weight)
    const perfScore = (
      capabilities.performance.build_speed +
      capabilities.performance.cold_start +
      (capabilities.performance.global_cdn || 5)
    ) / 30;
    score += perfScore * 0.2;

    // Cost considerations (10% weight)
    if (preferences.costPriority === 'low' && capabilities.cost.free_tier) {
      score += 0.1;
      reasons.push('Free tier available');
    }

    return {
      total: Math.min(score, 1.0),
      reasons
    };
  }

  private calculateConfidence(score: ProviderScore): number {
    // Confidence based on number of matching criteria
    const reasonCount = score.reasons.length;
    const baseConfidence = score.total;
    const reasonBonus = Math.min(reasonCount * 0.1, 0.3);
    
    return Math.min(baseConfidence + reasonBonus, 1.0);
  }

  private estimateCost(provider: string, analysis: RepositoryAnalysis): CostEstimate {
    // Simplified cost estimation based on usage patterns
    const baseEstimates = {
      vercel: { monthly: 0, usage: 'free tier sufficient for most projects' },
      render: { monthly: 0, usage: 'free tier: 750 hours/month' },
      railway: { monthly: 0, usage: 'free tier: $5 credit/month' },
      netlify: { monthly: 0, usage: 'free tier: 100GB bandwidth' }
    };

    return baseEstimates[provider as keyof typeof baseEstimates] || 
           { monthly: 0, usage: 'contact for pricing' };
  }
}
```

This comprehensive detection system provides intelligent analysis of repositories to automatically determine the best deployment strategy and provider configuration.
