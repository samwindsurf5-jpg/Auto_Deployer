'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Github, Rocket, Plus, GitBranch, Clock, CheckCircle, Settings, Globe, Shield } from 'lucide-react'
import AnalysisModal from '../../components/AnalysisModal'

interface Repository {
  id: number
  name: string
  fullName: string
  description?: string
  language?: string
  stargazersCount: number
  private: boolean
  updatedAt: string
  defaultBranch?: string
}

interface Deployment {
  id: string
  projectId: string
  status: string
  provider: string
  startedAt: string
  url?: string
  completedAt?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllRepos, setShowAllRepos] = useState(false)
  const [analysisModal, setAnalysisModal] = useState({
    isOpen: false,
    analysis: null,
    repositoryName: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      router.push('/')
      return
    }

    // Fetch user profile
    fetchUserProfile(token)
  }, [router])

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        // Fetch repositories and deployments after getting user profile
        fetchRepositories(token)
        fetchDeployments(token)
      } else {
        // Token is invalid, redirect to home
        localStorage.removeItem('auth_token')
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      localStorage.removeItem('auth_token')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchRepositories = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/repositories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const repos = await response.json()
        setRepositories(repos)
      } else {
        console.error('Error fetching repositories:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching repositories:', error)
    }
  }

  const fetchDeployments = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/deployments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const deploymentsData = await response.json()
        setDeployments(deploymentsData)
      } else {
        console.error('Error fetching deployments:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching deployments:', error)
    }
  }

  const handleGitHubAuth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/github')
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error initiating GitHub auth:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/')
  }

  const handleAnalyze = async (repo: Repository) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const [owner, repoName] = repo.fullName.split('/')
      const response = await fetch(`http://localhost:3001/api/v1/repositories/${owner}/${repoName}/analyze`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const analysis = await response.json()
        setAnalysisModal({
          isOpen: true,
          analysis,
          repositoryName: repo.fullName,
        })
      } else {
        alert('Analysis failed. Please try again.')
      }
    } catch (error) {
      console.error('Error analyzing repository:', error)
      alert('Analysis failed. Please try again.')
    }
  }

  const handleDeploy = async (repo: Repository, provider: 'netlify' | 'vercel' = 'netlify') => {
    console.log('Deploy button clicked:', { repo: repo.name, provider });
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        alert('❌ No authentication token found. Please login again.');
        return;
      }

      console.log('Starting deployment for:', repo.fullName, 'to', provider);
      
      const [owner, repoName] = repo.fullName.split('/')
      const deployUrl = `http://localhost:3001/api/v1/repositories/${owner}/${repoName}/deploy`;
      console.log('Deploy URL:', deployUrl);

      const response = await fetch(deployUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider,
          branch: repo.defaultBranch || 'main'
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json()
        console.log('Deployment response:', result);

        if (result.success) {
          if (result.deployment.status === 'setup_required' && result.deployment.provider === 'netlify') {
            // Show GitHub Actions setup instructions for Netlify
            const workflowYaml = result.deployment.workflowYaml || `name: Deploy to Netlify

on:
  push:
    branches: [ ${result.deployment.branch || 'main'} ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - name: Deploy to Netlify
      run: |
        curl -X POST "${result.deployment.deployHookUrl}"`;

            const setupInstructions = `# GitHub Actions Setup for Netlify

1. Create a new file in your repository at:
   \`\`\`bash
   mkdir -p .github/workflows
   touch .github/workflows/netlify-deploy.yml
   \`\`\`

2. Copy the following YAML into that file:
   \`\`\`yaml
   ${workflowYaml}
   \`\`\`

3. Commit and push the file to your repository:
   \`\`\`bash
   git add .github/workflows/netlify-deploy.yml
   git commit -m "Add Netlify deployment workflow"
   git push
   \`\`\`

4. After pushing, check the Actions tab in your GitHub repository to monitor the deployment.

Your site will be available at: ${result.deployment.url || 'https://your-site-name.netlify.app'}`;

            // Show the instructions in an alert (replace with a modal later)
            alert(setupInstructions);
          } else if (result.deployment.status === 'deploying') {
            // Show deploying message with link to the deployment
            alert(`🚀 Deployment started!\n\nStatus: ${result.deployment.status}\n\nSite URL: ${result.deployment.url || 'Will be available after deployment completes'}`);
          } else if (result.deployment.automated) {
            // Handle other automated deployment statuses
            const setupInstructions = result.deployment.buildLogs ? 
              result.deployment.buildLogs.join('\n') : '';
            
            alert(`🎉 Deployment ${result.deployment.status === 'deployed' ? 'Successful' : 'In Progress'}!\n\n${result.deployment.url ? `🔗 Site URL: ${result.deployment.url}\n` : ''}${setupInstructions ? `\n${setupInstructions}` : ''}`);
          } else {
            // Generic success message for other cases
            alert(`✅ Deployment ${result.deployment.status}!\n\n${result.deployment.url ? `🔗 ${result.deployment.url}` : ''}`);
          }
        } else {
          // Handle deployment failure
          console.error('Deployment failed:', result);
          alert(`❌ Deployment Failed!\n\nError: ${result.message || 'Unknown error'}\n\n${result.error || 'Please try again or check your provider connections.'}`);
        }
      } else {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        
        // Special handling for 401/403 which might indicate token issues
        if (response.status === 401 || response.status === 403) {
          alert(`🔑 Authentication Error (${response.status})\n\nPlease check if your ${provider} token is valid and has the correct permissions.\n\nGo to Settings to update your credentials.`);
        } else {
          alert(`❌ Deployment request failed (${response.status})!\n\n${errorText || 'Please try again.'}`);
        }
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`❌ An error occurred during deployment!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck the browser console for more details.`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Rocket className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">AutoDeploy</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Welcome back!</span>
                  <button
                    onClick={() => router.push('/settings')}
                    className="text-sm text-gray-600 hover:text-gray-700 flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {user ? (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to your dashboard!</h2>
              <p className="text-gray-600">
                Your GitHub account is connected. You can now deploy your repositories with one click.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center mb-4">
                  <Github className="h-8 w-8 text-gray-700 mr-3" />
                  <h3 className="text-lg font-semibold">GitHub Connected</h3>
                </div>
                <p className="text-gray-600 mb-4">Your GitHub account is connected and ready to deploy.</p>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center mb-4">
                  <Rocket className="h-8 w-8 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold">Deploy Repository</h3>
                </div>
                <p className="text-gray-600 mb-4">Select a repository from your GitHub account to deploy.</p>
                <button 
                  onClick={() => {
                    const token = localStorage.getItem('auth_token')
                    if (token) fetchRepositories(token)
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Repositories
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center mb-4">
                  <Clock className="h-8 w-8 text-purple-600 mr-3" />
                  <h3 className="text-lg font-semibold">Recent Deployments</h3>
                </div>
                {deployments.length > 0 ? (
                  <div className="space-y-3">
                    {deployments.slice(0, 3).map((deployment) => (
                      <div key={deployment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{deployment.projectId}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              deployment.status === 'deployed' || deployment.status === 'demo_complete' 
                                ? 'bg-green-100 text-green-800' 
                                : deployment.status === 'deploying' || deployment.status === 'demo_deployment'
                                ? 'bg-blue-100 text-blue-800'
                                : deployment.status === 'requires_setup'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {deployment.status === 'demo_complete' ? 'Demo Complete' :
                               deployment.status === 'demo_deployment' ? 'Demo Running' :
                               deployment.status === 'requires_setup' ? 'Needs Setup' :
                               deployment.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {deployment.provider} • {new Date(deployment.startedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {deployment.url && (
                          <a 
                            href={deployment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View {deployment.status.includes('demo') ? 'Demo' : 'Site'}
                          </a>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const token = localStorage.getItem('auth_token')
                        if (token) fetchDeployments(token)
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Refresh History
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No deployments yet. Deploy a repository to see it here!</p>
                    <button 
                      onClick={() => {
                        const token = localStorage.getItem('auth_token')
                        if (token) fetchDeployments(token)
                      }}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Check for Updates
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Repository List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Your Repositories</h3>
                <p className="text-gray-600 mt-1">Select a repository to deploy</p>
              </div>
              <div className="p-6">
                {repositories.length > 0 ? (
                  <div className="grid gap-4">
                    {(showAllRepos ? repositories : repositories.slice(0, 6)).map((repo) => (
                      <div key={repo.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{repo.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{repo.description || 'No description'}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {repo.language && (
                                <span className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                                  {repo.language}
                                </span>
                              )}
                              <span>⭐ {repo.stargazersCount}</span>
                              {repo.private && <span className="text-yellow-600">🔒 Private</span>}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => handleDeploy(repo, 'netlify')}
                                className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700 transition-colors flex items-center"
                              >
                                <Globe className="h-3 w-3 mr-1" />
                                Netlify
                              </button>
                              <button 
                                onClick={() => handleDeploy(repo, 'vercel')}
                                className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors flex items-center"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Vercel
                              </button>
                            </div>
                            <button 
                              onClick={() => handleAnalyze(repo)}
                              className="border border-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors"
                            >
                              Analyze
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {repositories.length > 6 && (
                      <div className="text-center py-4">
                        <button 
                          onClick={() => setShowAllRepos(!showAllRepos)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {showAllRepos ? 'Show less' : `View all ${repositories.length} repositories`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Loading repositories...</h4>
                    <p className="text-gray-600 mb-6">
                      Fetching your GitHub repositories. This may take a moment.
                    </p>
                    <button 
                      onClick={() => {
                        const token = localStorage.getItem('auth_token')
                        if (token) fetchRepositories(token)
                      }}
                      className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center mx-auto"
                    >
                      <Github className="h-5 w-5 mr-2" />
                      Refresh Repositories
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Rocket className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Started with AutoDeploy</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Connect your GitHub account to start deploying your repositories with one click.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/settings')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
            <button
              onClick={handleGitHubAuth}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <Github className="h-5 w-5 mr-2" />
              Connect GitHub Account
            </button>
          </div>
        )}
      </main>

      {/* Analysis Modal */}
      <AnalysisModal
        isOpen={analysisModal.isOpen}
        onClose={() => setAnalysisModal({ isOpen: false, analysis: null, repositoryName: '' })}
        analysis={analysisModal.analysis}
        repositoryName={analysisModal.repositoryName}
      />
    </div>
  )
}
