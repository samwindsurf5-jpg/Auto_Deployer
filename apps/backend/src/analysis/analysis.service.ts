import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: "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",
      defaultHeaders: {
        "HTTP-Referer": "https://autodeploy.app",
        "X-Title": "AutoDeploy - AI Deployment Platform",
      },
    });
  }

  async analyzeRepositoryWithAI(repoData: {
    name: string;
    description?: string;
    language?: string;
    stars?: number;
    forks?: number;
    files?: any;
    fileStructure?: string[];
    sourceStructure?: any;
    topics?: string[];
    // Legacy fields
    packageJson?: any;
    dockerFile?: string;
    readmeContent?: string;
  }) {
    try {
      const analysisPrompt = `
Analyze this repository based on ACTUAL CODE and provide deployment recommendations with MULTIPLE deployment options:

Repository Name: ${repoData.name}
Description: ${repoData.description || 'No description'}
Primary Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stars || 0}
Topics: ${repoData.topics?.join(', ') || 'None'}

FILES FOUND (for code analysis):
${Object.keys(repoData.files || {}).map(fileName => `- ${fileName}`).join('\n')}

ACTUAL CODE ANALYSIS:
${repoData.files ? Object.entries(repoData.files).map(([fileName, content]) => {
  if (typeof content === 'string' && content.length > 50) {
    return `${fileName} (${content.length} chars):
${content.substring(0, 300)}...`;
  } else if (typeof content === 'object') {
    return `${fileName}:
${JSON.stringify(content, null, 2)}`;
  }
  return `${fileName}: ${content}`;
}).join('\n\n') : 'No files found'}

SOURCE CODE STRUCTURE:
${repoData.sourceStructure ? `
- Has organized source code: ${repoData.sourceStructure.hasSource}
- Directories: ${repoData.sourceStructure.directories.join(', ')}
- Main files: ${repoData.sourceStructure.mainFiles.slice(0, 5).join(', ')}
- Test files: ${repoData.sourceStructure.testFiles.slice(0, 3).join(', ')}
` : 'Source structure analysis not available'}

IMPORTANT: Analyze the ACTUAL CODE above, not just README. Provide MULTIPLE deployment options for the user to choose from.

Please provide a JSON response with this exact structure:
{
  "framework": {
    "name": "detected framework name (e.g., Next.js, React, Express, FastAPI)",
    "version": "version if detectable",
    "confidence": "confidence score 0-1"
  },
  "buildSettings": {
    "buildCommand": "command to build the project",
    "startCommand": "command to start the project",
    "outputDirectory": "build output directory",
    "installCommand": "dependency installation command"
  },
  "deployment": {
    "options": [
      {
        "provider": "vercel",
        "suitability": "high/medium/low",
        "reason": "why this provider works for this app",
        "estimatedCost": "cost estimate",
        "pros": ["advantage 1", "advantage 2"],
        "cons": ["limitation 1", "limitation 2"]
      },
      {
        "provider": "netlify", 
        "suitability": "high/medium/low",
        "reason": "why this provider works for this app",
        "estimatedCost": "cost estimate",
        "pros": ["advantage 1", "advantage 2"],
        "cons": ["limitation 1", "limitation 2"]
      },
      {
        "provider": "render",
        "suitability": "high/medium/low", 
        "reason": "why this provider works for this app",
        "estimatedCost": "cost estimate",
        "pros": ["advantage 1", "advantage 2"],
        "cons": ["limitation 1", "limitation 2"]
      }
    ],
    "recommended": "vercel"
  },
  "infrastructure": {
    "needsDatabase": "boolean - whether database is needed",
    "databaseType": "type if database needed (postgresql, mongodb, etc)",
    "environmentVariables": ["list of detected env vars needed"],
    "specialRequirements": ["any special requirements"]
  },
  "optimization": {
    "suggestions": ["performance optimization suggestions"],
    "security": ["security recommendations"],
    "bestPractices": ["deployment best practices"]
  }
}

Respond ONLY with valid JSON, no other text.
`;

      const completion = await this.openai.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system",
            content: "You are an expert DevOps engineer specializing in repository analysis and deployment optimization. Analyze repositories and provide detailed deployment recommendations."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const analysisResult = completion.choices[0].message.content;
      
      try {
        return JSON.parse(analysisResult);
      } catch (parseError) {
        this.logger.error('Failed to parse AI response as JSON:', parseError);
        // Fallback analysis
        return this.getFallbackAnalysis(repoData);
      }

    } catch (error) {
      this.logger.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(repoData);
    }
  }

  private getFallbackAnalysis(repoData: any) {
    // Simple rule-based fallback when AI fails
    const packageJson = repoData.packageJson;
    let framework = 'Unknown';
    let provider = 'vercel';
    let buildCommand = 'npm run build';
    let startCommand = 'npm start';

    if (packageJson?.dependencies) {
      if (packageJson.dependencies.next) {
        framework = 'Next.js';
        provider = 'vercel';
      } else if (packageJson.dependencies.react && !packageJson.dependencies.next) {
        framework = 'React';
        provider = 'netlify';
      } else if (packageJson.dependencies.express) {
        framework = 'Express.js';
        provider = 'render';
        startCommand = 'npm run start';
      } else if (packageJson.dependencies.vue) {
        framework = 'Vue.js';
        provider = 'netlify';
      } else if (packageJson.dependencies.svelte) {
        framework = 'Svelte';
        provider = 'vercel';
      }
    }

    return {
      framework: {
        name: framework,
        version: packageJson?.dependencies?.[framework.toLowerCase()] || 'unknown',
        confidence: 0.7
      },
      buildSettings: {
        buildCommand,
        startCommand,
        outputDirectory: framework.includes('Next') ? '.next' : 'dist',
        installCommand: 'npm install'
      },
      deployment: {
        recommendedProvider: provider,
        reason: `${framework} works well with ${provider}`,
        estimatedCost: 'Free tier available'
      },
      infrastructure: {
        needsDatabase: false,
        databaseType: null,
        environmentVariables: [],
        specialRequirements: []
      },
      optimization: {
        suggestions: ['Enable compression', 'Use CDN for static assets'],
        security: ['Use HTTPS', 'Set security headers'],
        bestPractices: ['Use environment variables for secrets']
      }
    };
  }
}
