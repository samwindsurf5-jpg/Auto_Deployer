'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Github, Rocket, Zap, Shield, Globe, Database } from 'lucide-react'

export default function HomePage() {
  const [email, setEmail] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/github')
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error initiating GitHub auth:', error)
      // Fallback: direct to GitHub OAuth
      const clientId = 'Ov23lig6TBXJE57ARFIf'
      const redirectUri = encodeURIComponent('http://localhost:3001/api/v1/auth/github/callback')
      const scope = encodeURIComponent('user:email read:user')
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="px-4 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Rocket className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">AutoDeploy</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <button
              onClick={handleSignUp}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Deploy from GitHub to Production
            <br />
            <span className="text-blue-600">in 3 Clicks</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Automatically detect your framework, provision infrastructure, and deploy with zero configuration. 
            From repository to production in minutes, not hours.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={handleSignUp}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Github className="h-5 w-5" />
              Deploy Your First App - Free
            </button>
            <Link 
              href="/demo" 
              className="text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Watch Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">10,000+</div>
              <div className="text-gray-600">Apps Deployed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">&lt; 2min</div>
              <div className="text-gray-600">Average Deploy Time</div>
            </div>
          </div>
        </div>

        {/* Provider Logos */}
        <div className="text-center mb-20">
          <p className="text-gray-500 mb-8">Trusted by developers, powered by industry leaders</p>
          <div className="flex justify-center items-center space-x-12 opacity-60">
            <div className="flex items-center space-x-2">
              <Github className="h-8 w-8" />
              <span className="font-semibold">GitHub</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-black rounded text-white flex items-center justify-center">▲</div>
              <span className="font-semibold">Vercel</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-purple-600 rounded text-white flex items-center justify-center">🚄</div>
              <span className="font-semibold">Railway</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-green-600 rounded text-white flex items-center justify-center">S</div>
              <span className="font-semibold">Supabase</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Instant Detection</h3>
            <p className="text-gray-600">
              Automatically detects your framework, dependencies, and infrastructure needs from your repository.
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <Database className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Database Provisioning</h3>
            <p className="text-gray-600">
              One-click database setup with PostgreSQL, MongoDB, Redis, and more. No configuration required.
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-xl shadow-sm">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Enterprise Security</h3>
            <p className="text-gray-600">
              Bank-grade encryption, audit logging, and compliance features built for enterprise teams.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-gray-900 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Connect GitHub</h3>
              <p className="text-gray-600">Connect your GitHub account and select a repository to deploy.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Auto-Configure</h3>
              <p className="text-gray-600">We analyze your code and configure the optimal hosting and database setup.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Deploy & Monitor</h3>
              <p className="text-gray-600">Your app goes live with real-time monitoring and automatic scaling.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Deploy?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers who deploy with confidence using AutoDeploy.
          </p>
          <button
            onClick={handleSignUp}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Deploying Now
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Rocket className="h-6 w-6" />
                <span className="text-xl font-bold">AutoDeploy</span>
              </div>
              <p className="text-gray-400">
                The fastest way to deploy from GitHub to production.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/docs">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/status">Status</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AutoDeploy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
