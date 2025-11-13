'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Github, Globe, Shield, CheckCircle, AlertCircle } from 'lucide-react'

interface Integration {
  id: string
  provider: string
  connected: boolean
  isDemo?: boolean
  externalId?: string
  connectedAt?: string
}

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [tokenInputs, setTokenInputs] = useState({
    vercel: '',
    netlify: ''
  })
  const [showInstructions, setShowInstructions] = useState({
    vercel: false,
    netlify: false
  })

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      router.push('/')
      return
    }

    fetchUserProfile(token)
    fetchIntegrations(token)
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
      } else {
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

  const fetchIntegrations = async (token: string) => {
    try {
      // Check status for each provider
      const providers = ['netlify', 'vercel']
      const integrationPromises = providers.map(async (provider) => {
        const response = await fetch(`http://localhost:3001/api/v1/integrations/${provider}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        return response.ok ? await response.json() : { provider, connected: false }
      })

      const integrationResults = await Promise.all(integrationPromises)
      setIntegrations(integrationResults)
    } catch (error) {
      console.error('Error fetching integrations:', error)
    }
  }

  const connectProvider = async (provider: string, isDemo: boolean = true, apiToken?: string) => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      // Validate token if not demo mode
      if (!isDemo && !apiToken?.trim()) {
        alert(`❌ Please enter a valid ${provider} API token`)
        return
      }

      const response = await fetch(`http://localhost:3001/api/v1/integrations/${provider}/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: isDemo ? null : apiToken,
          demo: isDemo,
          externalId: isDemo ? null : 'user-account',
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          if (isDemo) {
            alert(`✅ ${provider} demo mode enabled! You can now test deployments.\n\n🎯 Demo deployments simulate the process without creating real sites.`)
          } else {
            alert(`✅ ${provider} connected successfully!\n\n🚀 You can now create real live deployments.`)
            // Clear the token input
            setTokenInputs(prev => ({ ...prev, [provider]: '' }))
          }
          fetchIntegrations(authToken) // Refresh integrations
        } else {
          alert(`❌ Failed to connect ${provider}: ${result.error}`)
        }
      } else {
        alert(`❌ Connection failed. Please check your ${provider} token and try again.`)
      }
    } catch (error) {
      console.error(`Error connecting ${provider}:`, error)
      alert(`❌ Failed to connect ${provider}`)
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account and integrations</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            {user && (
              <div className="flex items-center space-x-4">
                <img
                  src={user.avatarUrl || '/default-avatar.png'}
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex items-center mt-2">
                    <Github className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-600">GitHub connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Provider Integrations */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Deployment Providers</h2>
            <p className="text-gray-600 mb-6">
              Connect your deployment providers to enable real deployments. Demo mode is available for testing.
            </p>
            
            <div className="grid gap-6">
              {/* Netlify */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Globe className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Netlify</h3>
                      <p className="text-sm text-gray-600">Deploy static sites and serverless functions</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {integrations.find(i => i.provider === 'netlify')?.connected ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {integrations.find(i => i.provider === 'netlify')?.isDemo ? 'Demo Mode' : 'Connected'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Not connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Token Input Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      placeholder="Enter your Netlify Personal Access Token"
                      value={tokenInputs.netlify}
                      onChange={(e) => setTokenInputs(prev => ({ ...prev, netlify: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => connectProvider('netlify', false, tokenInputs.netlify)}
                      disabled={!tokenInputs.netlify.trim()}
                      className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => connectProvider('netlify', true)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                    >
                      Demo Mode
                    </button>
                    <button
                      onClick={() => setShowInstructions(prev => ({ ...prev, netlify: !prev.netlify }))}
                      className="border border-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors"
                    >
                      How to get API key?
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                {showInstructions.netlify && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">How to get your Netlify Personal Access Token:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Go to <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Netlify Personal Access Tokens</a></li>
                      <li>Click "New access token" button</li>
                      <li>Give your token a description (e.g., "AutoDeploy Integration")</li>
                      <li>Set an expiration date (optional, but recommended)</li>
                      <li>Click "Generate token"</li>
                      <li><strong>Important:</strong> Copy the token immediately (you won't see it again!)</li>
                      <li>Paste the token in the field above and click "Connect"</li>
                    </ol>
                    <div className="mt-3 p-3 bg-teal-50 rounded border-l-4 border-teal-400">
                      <div className="flex">
                        <AlertCircle className="h-4 w-4 text-teal-600 mt-0.5 mr-2" />
                        <div className="text-sm">
                          <strong className="text-teal-800">Important:</strong>
                          <p className="text-teal-700">Netlify tokens are only shown once. Make sure to copy and paste it immediately. The token allows full access to your Netlify account.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vercel */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Vercel</h3>
                      <p className="text-sm text-gray-600">Deploy Next.js, React, and modern web apps</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {integrations.find(i => i.provider === 'vercel')?.connected ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {integrations.find(i => i.provider === 'vercel')?.isDemo ? 'Demo Mode' : 'Connected'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Not connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Token Input Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      placeholder="Enter your Vercel API token"
                      value={tokenInputs.vercel}
                      onChange={(e) => setTokenInputs(prev => ({ ...prev, vercel: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      onClick={() => connectProvider('vercel', false, tokenInputs.vercel)}
                      disabled={!tokenInputs.vercel.trim()}
                      className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => connectProvider('vercel', true)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                    >
                      Demo Mode
                    </button>
                    <button
                      onClick={() => setShowInstructions(prev => ({ ...prev, vercel: !prev.vercel }))}
                      className="border border-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors"
                    >
                      How to get API key?
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                {showInstructions.vercel && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">How to get your Vercel API Token:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Go to <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">vercel.com/account/tokens</a></li>
                      <li>Click "Create Token" button</li>
                      <li>Give your token a name (e.g., "AutoDeploy Integration")</li>
                      <li>Select the scope: <strong>Full Access</strong> (recommended) or specific projects</li>
                      <li>Set expiration (optional, but recommended for security)</li>
                      <li>Click "Create" and copy the generated token</li>
                      <li>Paste the token in the field above and click "Connect"</li>
                    </ol>
                    <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                      <div className="flex">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2" />
                        <div className="text-sm">
                          <strong className="text-blue-800">Security Note:</strong>
                          <p className="text-blue-700">Keep your API token secure. It gives access to your Vercel account. You can revoke it anytime from Vercel dashboard.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Demo Mode vs Real Deployments</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Demo Mode:</strong> Creates simulated deployments for testing the platform without connecting real provider accounts.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Real Deployments:</strong> Get API tokens from provider websites to enable actual live deployments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
