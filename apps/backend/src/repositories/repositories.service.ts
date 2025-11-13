import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';

@Injectable()
export class RepositoriesService {
  constructor(
    private prisma: PrismaService,
    private analysisService: AnalysisService
  ) {}

  async getGitHubRepositoriesForUser(userId: string, page = 1, per_page = 100) {
    // Get user's GitHub access token
    const integration = await this.prisma.providerIntegration.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'github',
        },
      },
    });

    if (!integration) {
      throw new Error('GitHub integration not found. Please reconnect your GitHub account.');
    }

    const tokenData = JSON.parse(integration.encryptedToken as string);
    const accessToken = tokenData.access_token;

    return this.getGitHubRepositories(accessToken, page, per_page);
  }

  async getGitHubRepositories(accessToken: string, page = 1, per_page = 100) {
    try {
      const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=${per_page}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repositories = await response.json();
      
      // Store repositories in database
      for (const repo of repositories) {
        await this.prisma.repository.upsert({
          where: { githubId: repo.id },
          update: {
            fullName: repo.full_name,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
            private: repo.private,
            language: repo.language,
            description: repo.description,
            updatedAt: new Date(),
          },
          create: {
            githubId: repo.id,
            fullName: repo.full_name,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
            private: repo.private,
            language: repo.language,
            description: repo.description,
          },
        });
      }

      return repositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  async analyzeRepositoryWithAI(userId: string, repoFullName: string) {
    try {
      // Get user's GitHub token
      const integration = await this.prisma.providerIntegration.findUnique({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'github',
          },
        },
      });

      if (!integration) {
        throw new Error('GitHub integration not found');
      }

      const tokenData = JSON.parse(integration.encryptedToken as string);
      const accessToken = tokenData.access_token;

      // Get repository contents for analysis
      const repoData = await this.fetchRepositoryData(repoFullName, accessToken);
      
      // Use AI to analyze the repository
      const aiAnalysis = await this.analysisService.analyzeRepositoryWithAI(repoData);
      
      // Store analysis in database
      const repository = await this.prisma.repository.findFirst({
        where: { fullName: repoFullName },
      });

      if (repository) {
        await this.prisma.repositoryAnalysis.create({
          data: {
            repositoryId: repository.id,
            branch: 'main',
            commitSha: 'latest',
            frameworkName: aiAnalysis.framework.name,
            frameworkVersion: aiAnalysis.framework.version,
            confidenceScore: aiAnalysis.framework.confidence,
            buildConfig: aiAnalysis.buildSettings,
            recommendations: aiAnalysis,
          },
        });
      }

      return aiAnalysis;
    } catch (error) {
      console.error('Error analyzing repository with AI:', error);
      throw new Error('Failed to analyze repository');
    }
  }

  private async fetchRepositoryData(repoFullName: string, accessToken: string) {
    const [owner, repo] = repoFullName.split('/');
    
    // Get basic repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    const repoInfo = await repoResponse.json();
    
    // Get repository contents
    const contentsResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const contents = await contentsResponse.json();
    
    // Fetch multiple important files for analysis
    const filesToAnalyze = [
      'package.json', 'requirements.txt', 'Pipfile', 'go.mod', 'Cargo.toml',
      'next.config.js', 'nuxt.config.js', 'vite.config.js', 'webpack.config.js',
      'tsconfig.json', '.env.example', 'vercel.json', 'netlify.toml',
      'app.js', 'index.js', 'main.js', 'server.js', 'app.py', 'main.py',
      'index.html', 'index.tsx', 'index.ts', 'App.tsx', 'App.js',
      'Dockerfile', 'docker-compose.yml', '.dockerignore',
      'README.md', 'readme.md', 'README.txt'
    ];

    const fileContents: any = {};
    
    // Fetch each file if it exists
    for (const fileName of filesToAnalyze) {
      const file = contents.find((f: any) => f.name.toLowerCase() === fileName.toLowerCase());
      if (file && file.type === 'file') {
        try {
          const response = await fetch(file.download_url);
          const content = await response.text();
          
          // Parse JSON files
          if (fileName.endsWith('.json')) {
            try {
              fileContents[fileName] = JSON.parse(content);
            } catch {
              fileContents[fileName] = content; // Keep as text if JSON parsing fails
            }
          } else {
            fileContents[fileName] = content;
          }
        } catch (error) {
          console.log(`Could not fetch ${fileName}`);
        }
      }
    }

    // Get source code structure
    const sourceStructure = await this.analyzeSourceStructure(repoFullName, accessToken, contents);

    return {
      name: repoInfo.name,
      description: repoInfo.description,
      language: repoInfo.language,
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      files: fileContents,
      fileStructure: contents.map((file: any) => file.name),
      sourceStructure,
      topics: repoInfo.topics || [],
      // Legacy fields for backward compatibility
      packageJson: fileContents['package.json'],
      dockerFile: fileContents['Dockerfile'],
      readmeContent: fileContents['README.md'] || fileContents['readme.md'] || fileContents['README.txt'],
    };
  }

  private async analyzeSourceStructure(repoFullName: string, accessToken: string, rootContents: any[]) {
    const structure: any = {
      hasSource: false,
      directories: [],
      mainFiles: [],
      testFiles: [],
      configFiles: []
    };

    // Check common source directories
    const sourceDirs = ['src', 'lib', 'app', 'pages', 'components', 'utils', 'services'];
    
    for (const dir of rootContents) {
      if (dir.type === 'dir') {
        structure.directories.push(dir.name);
        
        if (sourceDirs.includes(dir.name.toLowerCase())) {
          structure.hasSource = true;
          
          // Fetch a few files from source directories
          try {
            const dirResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${dir.name}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            });
            
            const dirContents = await dirResponse.json();
            if (Array.isArray(dirContents)) {
              dirContents.slice(0, 5).forEach((file: any) => {
                if (file.type === 'file') {
                  if (file.name.includes('test') || file.name.includes('spec')) {
                    structure.testFiles.push(`${dir.name}/${file.name}`);
                  } else if (file.name.includes('config')) {
                    structure.configFiles.push(`${dir.name}/${file.name}`);
                  } else {
                    structure.mainFiles.push(`${dir.name}/${file.name}`);
                  }
                }
              });
            }
          } catch (error) {
            console.log(`Could not fetch directory ${dir.name}`);
          }
        }
      }
    }

    return structure;
  }

  private detectFramework(packageJson: any) {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.next) {
      return {
        name: 'Next.js',
        version: dependencies.next,
        confidence: 0.95,
        provider: 'vercel',
        buildCommand: 'npm run build',
        startCommand: 'npm run start',
      };
    }
    
    if (dependencies.react && !dependencies.next) {
      return {
        name: 'React',
        version: dependencies.react,
        confidence: 0.85,
        provider: 'netlify',
        buildCommand: 'npm run build',
        startCommand: 'npm run start',
      };
    }
    
    if (dependencies.express) {
      return {
        name: 'Express.js',
        version: dependencies.express,
        confidence: 0.90,
        provider: 'render',
        buildCommand: 'npm install',
        startCommand: 'npm run start',
      };
    }
    
    return {
      name: 'Node.js',
      confidence: 0.60,
      provider: 'render',
      buildCommand: 'npm install',
      startCommand: 'npm run start',
    };
  }
}
