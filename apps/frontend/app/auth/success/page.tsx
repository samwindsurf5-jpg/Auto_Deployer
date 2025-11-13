'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const token = searchParams.get('token')
    
    if (token) {
      // Store the JWT token
      localStorage.setItem('auth_token', token)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } else {
      // If no token, redirect to home
      router.push('/')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          <div className="mb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Successful!
            </h1>
            <p className="text-gray-600">
              Welcome to AutoDeploy. You'll be redirected to your dashboard shortly.
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
