import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Connector } from '../types'

export default function SettingsPage() {
  const router = useRouter()
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'connectors' | 'general'>('connectors')

  // GitHub form state
  const [showGitHubForm, setShowGitHubForm] = useState(false)
  const [githubForm, setGithubForm] = useState({
    accessToken: '',
    owner: '',
    repo: '',
  })

  // Zoho form state
  const [showZohoForm, setShowZohoForm] = useState(false)
  const [zohoForm, setZohoForm] = useState({
    accessToken: '',
    portalId: '',
    projectId: '',
  })

  useEffect(() => {
    loadConnectors()
  }, [])

  const loadConnectors = async () => {
    try {
      const result = await window.api.listConnectors()
      if (result.success) {
        setConnectors(result.data || [])
      }
    } catch (error) {
      console.error('Failed to load connectors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGitHub = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await window.api.addConnector({
        name: 'GitHub',
        type: 'github',
        enabled: true,
        config: githubForm,
      })
      if (result.success) {
        setShowGitHubForm(false)
        setGithubForm({ accessToken: '', owner: '', repo: '' })
        loadConnectors()
      } else {
        alert(`Failed to add connector: ${result.error}`)
      }
    } catch (error) {
      alert('An error occurred while adding connector')
    }
  }

  const handleAddZoho = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await window.api.addConnector({
        name: 'Zoho Projects',
        type: 'zoho',
        enabled: true,
        config: zohoForm,
      })
      if (result.success) {
        setShowZohoForm(false)
        setZohoForm({ accessToken: '', portalId: '', projectId: '' })
        loadConnectors()
      } else {
        alert(`Failed to add connector: ${result.error}`)
      }
    } catch (error) {
      alert('An error occurred while adding connector')
    }
  }

  const handleToggleConnector = async (id: string, enabled: boolean) => {
    try {
      const result = await window.api.updateConnector(id, { enabled })
      if (result.success) {
        loadConnectors()
      }
    } catch (error) {
      alert('Failed to update connector')
    }
  }

  const handleDeleteConnector = async (id: string) => {
    if (confirm('Are you sure you want to delete this connector?')) {
      try {
        const result = await window.api.deleteConnector(id)
        if (result.success) {
          loadConnectors()
        }
      } catch (error) {
        alert('Failed to delete connector')
      }
    }
  }

  const githubConnector = connectors.find((c) => c.type === 'github')
  const zohoConnector = connectors.find((c) => c.type === 'zoho')

  return (
    <>
      <Head>
        <title>Settings - SnapFlow</title>
      </Head>
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 backdrop-blur-sm bg-gray-900/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/home')}
                  className="flex items-center space-x-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 px-3 py-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium">Back</span>
                </button>
                <div className="h-6 w-px bg-gray-800"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="col-span-3">
              <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 overflow-hidden">
                <button
                  onClick={() => setActiveTab('connectors')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition ${
                    activeTab === 'connectors' ? 'bg-gray-800 text-blue-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  Connectors
                </button>
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition ${
                    activeTab === 'general' ? 'bg-gray-800 text-blue-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  General
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="col-span-9">
              {activeTab === 'connectors' && (
                <div className="space-y-6">
                  <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 p-6">
                    <h2 className="text-xl font-semibold text-gray-100 mb-4">External Platform Connectors</h2>
                    <p className="text-gray-400 mb-6">
                      Connect SnapFlow to external platforms to sync your issues.
                    </p>

                    {/* GitHub Connector */}
                    <div className="mb-6 pb-6 border-b border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-100">GitHub</h3>
                          <p className="text-sm text-gray-400">Sync issues to GitHub repositories</p>
                        </div>
                        {githubConnector ? (
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-green-600 font-medium">Connected</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={githubConnector.enabled}
                                onChange={(e) => handleToggleConnector(githubConnector.id, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <button
                              onClick={() => handleDeleteConnector(githubConnector.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowGitHubForm(!showGitHubForm)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                          >
                            {showGitHubForm ? 'Cancel' : 'Connect'}
                          </button>
                        )}
                      </div>

                      {showGitHubForm && !githubConnector && (
                        <form onSubmit={handleAddGitHub} className="space-y-4 bg-gray-800 p-4 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">
                              Personal Access Token
                            </label>
                            <input
                              type="password"
                              required
                              value={githubForm.accessToken}
                              onChange={(e) => setGithubForm({ ...githubForm, accessToken: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="ghp_xxxxxxxxxxxx"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Generate at: Settings → Developer settings → Personal access tokens
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-100 mb-1">Owner</label>
                              <input
                                type="text"
                                required
                                value={githubForm.owner}
                                onChange={(e) => setGithubForm({ ...githubForm, owner: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="username or org"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-100 mb-1">Repository</label>
                              <input
                                type="text"
                                required
                                value={githubForm.repo}
                                onChange={(e) => setGithubForm({ ...githubForm, repo: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="repo-name"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                          >
                            Save GitHub Connector
                          </button>
                        </form>
                      )}

                      {githubConnector && (
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Owner:</span>
                              <span className="ml-2 font-medium text-gray-100">{githubConnector.config.owner}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Repository:</span>
                              <span className="ml-2 font-medium text-gray-100">{githubConnector.config.repo}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Zoho Connector */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-100">Zoho Projects</h3>
                          <p className="text-sm text-gray-400">Sync issues to Zoho Projects</p>
                        </div>
                        {zohoConnector ? (
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-green-600 font-medium">Connected</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={zohoConnector.enabled}
                                onChange={(e) => handleToggleConnector(zohoConnector.id, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <button
                              onClick={() => handleDeleteConnector(zohoConnector.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowZohoForm(!showZohoForm)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                          >
                            {showZohoForm ? 'Cancel' : 'Connect'}
                          </button>
                        )}
                      </div>

                      {showZohoForm && !zohoConnector && (
                        <form onSubmit={handleAddZoho} className="space-y-4 bg-gray-800 p-4 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-100 mb-1">
                              OAuth Token
                            </label>
                            <input
                              type="password"
                              required
                              value={zohoForm.accessToken}
                              onChange={(e) => setZohoForm({ ...zohoForm, accessToken: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="Zoho OAuth token"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-100 mb-1">Portal ID</label>
                              <input
                                type="text"
                                required
                                value={zohoForm.portalId}
                                onChange={(e) => setZohoForm({ ...zohoForm, portalId: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Portal ID"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-100 mb-1">Project ID</label>
                              <input
                                type="text"
                                required
                                value={zohoForm.projectId}
                                onChange={(e) => setZohoForm({ ...zohoForm, projectId: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Project ID"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                          >
                            Save Zoho Connector
                          </button>
                        </form>
                      )}

                      {zohoConnector && (
                        <div className="bg-gray-800 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Portal ID:</span>
                              <span className="ml-2 font-medium text-gray-100">{zohoConnector.config.portalId}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Project ID:</span>
                              <span className="ml-2 font-medium text-gray-100">{zohoConnector.config.projectId}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'general' && (
                <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 p-6">
                  <h2 className="text-xl font-semibold text-gray-100 mb-4">General Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-100 mb-2">Storage Location</h3>
                      <p className="text-sm text-gray-400 mb-2">
                        All captures are stored in: <code className="bg-gray-800 px-2 py-1 rounded text-gray-100">~/SnapFlow/Captures</code>
                      </p>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      <h3 className="text-sm font-medium text-gray-100 mb-2">About SnapFlow</h3>
                      <p className="text-sm text-gray-400">Version 1.0.0</p>
                      <p className="text-sm text-gray-400">A powerful screenshot and screen recording tool with issue tracking.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
