import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/Dialog'
import { useStore } from '../store/useStore'
import type { Issue } from '../types'

export default function HomePage() {
  const router = useRouter()
  const { user, setUser, issues, setIssues, deleteIssue, updateIssue } = useStore()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'screenshot' | 'recording'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const userResult = await window.api.getUser()
      if (userResult.success && userResult.data) {
        setUser(userResult.data)
        const issuesResult = await window.api.listIssues(userResult.data.id)
        if (issuesResult.success) {
          setIssues(issuesResult.data || [])
        }
      } else {
        router.push('/auth')
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data')
      router.push('/auth')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (issue: Issue, platform: 'github' | 'zoho') => {
    try {
      // Optimistic update
      updateIssue(issue.id, { syncStatus: 'syncing' })
      toast.loading(`Syncing to ${platform}...`, { id: `sync-${issue.id}` })

      const result = await window.api.syncIssue(issue.id, platform)

      if (result.success) {
        toast.success(`Successfully synced to ${platform}`, { id: `sync-${issue.id}` })
        loadData() // Reload to get updated sync status
      } else {
        toast.error(`Sync failed: ${result.error}`, { id: `sync-${issue.id}` })
        updateIssue(issue.id, { syncStatus: 'failed' })
      }
    } catch (error) {
      toast.error('An error occurred during sync', { id: `sync-${issue.id}` })
      updateIssue(issue.id, { syncStatus: 'failed' })
    }
  }

  const confirmDelete = (issueId: string) => {
    setIssueToDelete(issueId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteIssue = async () => {
    if (!issueToDelete) return

    try {
      const result = await window.api.deleteIssue(issueToDelete)
      if (result.success) {
        deleteIssue(issueToDelete)
        toast.success('Issue deleted successfully')
        setDeleteDialogOpen(false)
        setIssueToDelete(null)
      } else {
        toast.error(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('An error occurred while deleting')
    }
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesFilter = filter === 'all' || issue.type === filter
    const matchesSearch =
      searchQuery === '' ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="success">Synced</Badge>
      case 'syncing':
        return <Badge variant="warning">Syncing...</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      default:
        return <Badge variant="gray">Local</Badge>
    }
  }

  const handleLogout = async () => {
    try {
      await window.api.logout()
      setUser(null)
      setIssues([])
      router.push('/auth')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Failed to logout')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-400 font-medium">Loading your captures...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Home - SnapFlow</title>
      </Head>
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 backdrop-blur-sm bg-gray-900/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-100">
                  SnapFlow
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="ghost" onClick={() => router.push('/settings')}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Button>
                <div className="flex items-center space-x-3 pl-3 border-l border-gray-800">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-300">{user?.name}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout} title="Logout">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Search */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {issues.length}
                </span>
              </Button>
              <Button
                variant={filter === 'screenshot' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('screenshot')}
              >
                Screenshots
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {issues.filter((i) => i.type === 'screenshot').length}
                </span>
              </Button>
              <Button
                variant={filter === 'recording' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('recording')}
              >
                Recordings
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {issues.filter((i) => i.type === 'recording').length}
                </span>
              </Button>
            </div>

            <Input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80"
            />
          </div>

          {/* Issues Grid */}
          {filteredIssues.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-2">No captures yet</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first capture</p>
              <Button onClick={() => router.push('/capture')} size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Capture
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredIssues.map((issue, index) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="overflow-hidden h-full flex flex-col cursor-pointer">
                    {issue.thumbnailPath && (
                      <div className="h-48 bg-gray-800 overflow-hidden">
                        <img
                          src={`file://${issue.thumbnailPath}`}
                          alt={issue.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <CardContent className="flex-1 flex flex-col p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-100 line-clamp-2 flex-1 mr-2">
                          {issue.title}
                        </h3>
                        <Badge variant={issue.type === 'screenshot' ? 'primary' : 'secondary'}>
                          {issue.type === 'screenshot' ? '📸' : '🎥'}
                        </Badge>
                      </div>

                      {issue.description && (
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                          {issue.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span className="font-mono">{issue.id}</span>
                        <span>{format(new Date(issue.timestamp), 'MMM d, yyyy')}</span>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800">
                        <div>{getSyncStatusBadge(issue.syncStatus)}</div>

                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(issue, 'github')}
                            disabled={issue.syncStatus === 'syncing'}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(issue, 'zoho')}
                            disabled={issue.syncStatus === 'syncing'}
                          >
                            <span className="text-xs font-bold">ZH</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(issue.id)}
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Issue</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this issue? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteIssue}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
