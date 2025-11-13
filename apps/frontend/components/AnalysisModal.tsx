'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { CheckCircle, Zap, Shield, DollarSign, Settings, X } from 'lucide-react'

interface AnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: {
    framework: {
      name: string
      version: string
      confidence: number
    }
    buildSettings: {
      buildCommand: string
      startCommand: string
      outputDirectory: string
      installCommand: string
    }
    deployment: {
      options: Array<{
        provider: string
        suitability: string
        reason: string
        estimatedCost: string
        pros: string[]
        cons: string[]
      }>
      recommended: string
    }
    infrastructure: {
      needsDatabase: boolean
      databaseType: string | null
      environmentVariables: string[]
      specialRequirements: string[]
    }
    optimization: {
      suggestions: string[]
      security: string[]
      bestPractices: string[]
    }
  } | null
  repositoryName: string
}

export default function AnalysisModal({ isOpen, onClose, analysis, repositoryName }: AnalysisModalProps) {
  if (!analysis) return null

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900">
                      Repository Analysis Results
                    </Dialog.Title>
                    <p className="text-gray-600 mt-1">{repositoryName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Framework Detection */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-6 w-6 text-blue-600 mr-2" />
                      <h4 className="text-lg font-semibold text-gray-900">Framework Detected</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{analysis.framework.name}</span>
                        <span className="text-sm text-gray-600">{analysis.framework.version}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${analysis.framework.confidence * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">
                        {Math.round(analysis.framework.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>

                  {/* Build Settings */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Settings className="h-6 w-6 text-purple-600 mr-2" />
                      <h4 className="text-lg font-semibold text-gray-900">Build Configuration</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Install Command:</label>
                        <code className="block bg-gray-100 p-2 rounded text-sm mt-1">
                          {analysis.buildSettings.installCommand}
                        </code>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Build Command:</label>
                        <code className="block bg-gray-100 p-2 rounded text-sm mt-1">
                          {analysis.buildSettings.buildCommand}
                        </code>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Start Command:</label>
                        <code className="block bg-gray-100 p-2 rounded text-sm mt-1">
                          {analysis.buildSettings.startCommand}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployment Options - Full Width */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Zap className="h-6 w-6 text-green-600 mr-2" />
                    <h4 className="text-lg font-semibold text-gray-900">Deployment Options</h4>
                    <span className="ml-2 text-sm text-gray-600">Choose your preferred provider</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis.deployment.options?.map((option, index) => (
                      <div key={option.provider} className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        option.provider === analysis.deployment.recommended 
                          ? 'border-green-500 bg-white shadow-md ring-2 ring-green-200' 
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{option.provider}</span>
                          {option.provider === analysis.deployment.recommended && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            option.suitability === 'high' 
                              ? 'bg-green-100 text-green-800' 
                              : option.suitability === 'medium' 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {option.suitability} suitability
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{option.reason}</p>
                        <div className="flex items-center mb-2">
                          <DollarSign className="h-3 w-3 text-gray-500 mr-1" />
                          <span className="text-xs font-medium">{option.estimatedCost}</span>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs font-medium text-green-600">Pros:</p>
                            <ul className="text-xs text-gray-600">
                              {option.pros?.slice(0, 2).map((pro, i) => (
                                <li key={i} className="ml-2">• {pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-red-600">Cons:</p>
                            <ul className="text-xs text-gray-600">
                              {option.cons?.slice(0, 2).map((con, i) => (
                                <li key={i} className="ml-2">• {con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">

                  {/* Build Settings */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Settings className="h-6 w-6 text-purple-600 mr-2" />
                      <h4 className="text-lg font-semibold text-gray-900">Build Configuration</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Install Command:</label>
                        <code className="block bg-gray-100 p-2 rounded text-sm mt-1">
                          {analysis.buildSettings.installCommand}
                        </code>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Build Command:</label>
                        <code className="block bg-gray-100 p-2 rounded text-sm mt-1">
                          {analysis.buildSettings.buildCommand}
                        </code>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Start Command:</label>
                        <code className="block bg-gray-100 p-2 rounded text-sm mt-1">
                          {analysis.buildSettings.startCommand}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Infrastructure */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Shield className="h-6 w-6 text-orange-600 mr-2" />
                      <h4 className="text-lg font-semibold text-gray-900">Infrastructure Needs</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Database Required:</span>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          analysis.infrastructure.needsDatabase 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.infrastructure.needsDatabase ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {analysis.infrastructure.databaseType && (
                        <div className="flex items-center justify-between">
                          <span>Database Type:</span>
                          <span className="font-medium">{analysis.infrastructure.databaseType}</span>
                        </div>
                      )}
                      {analysis.infrastructure.environmentVariables.length > 0 && (
                        <div>
                          <span className="font-medium">Environment Variables:</span>
                          <ul className="mt-1 text-sm text-gray-600">
                            {analysis.infrastructure.environmentVariables.map((envVar, index) => (
                              <li key={index} className="ml-2">• {envVar}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Performance</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analysis.optimization.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 mr-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Security</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analysis.optimization.security.map((security, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 mr-1">•</span>
                          {security}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Best Practices</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analysis.optimization.bestPractices.map((practice, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-purple-600 mr-1">•</span>
                          {practice}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Deploy Now
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
