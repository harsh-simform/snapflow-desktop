import Store from 'electron-store'
import { generateIssueId } from '../utils/id-generator'
import { storageManager } from '../utils/storage'

interface Issue {
  id: string
  title: string
  description?: string
  type: 'screenshot' | 'recording'
  timestamp: string
  filePath: string
  thumbnailPath?: string
  syncStatus: 'local' | 'synced' | 'syncing' | 'failed'
  syncedTo?: {
    platform: string
    externalId: string
    url?: string
  }[]
  userId: string
}

const store = new Store<{ issues: Issue[] }>({
  name: 'snapflow-issues',
  defaults: {
    issues: [],
  },
})

export class IssueService {
  async createIssue(
    userId: string,
    title: string,
    type: 'screenshot' | 'recording',
    filePath: string,
    description?: string,
    thumbnailPath?: string
  ): Promise<Issue> {
    const issue: Issue = {
      id: generateIssueId(),
      title,
      description,
      type,
      timestamp: new Date().toISOString(),
      filePath,
      thumbnailPath,
      syncStatus: 'local',
      syncedTo: [],
      userId,
    }

    const issues = store.get('issues')
    issues.push(issue)
    store.set('issues', issues)

    // Save metadata to file system
    await storageManager.saveMetadata(issue.id, issue)

    return issue
  }

  getIssues(userId?: string): Issue[] {
    const issues = store.get('issues')
    if (userId) {
      return issues.filter((issue) => issue.userId === userId)
    }
    return issues
  }

  getIssueById(issueId: string): Issue | undefined {
    const issues = store.get('issues')
    return issues.find((issue) => issue.id === issueId)
  }

  async updateIssue(issueId: string, updates: Partial<Issue>): Promise<Issue> {
    const issues = store.get('issues')
    const index = issues.findIndex((issue) => issue.id === issueId)

    if (index === -1) {
      throw new Error('Issue not found')
    }

    const updatedIssue = {
      ...issues[index],
      ...updates,
      id: issueId, // Ensure ID doesn't change
    }

    issues[index] = updatedIssue
    store.set('issues', issues)

    // Update metadata in file system
    await storageManager.saveMetadata(issueId, updatedIssue)

    return updatedIssue
  }

  async deleteIssue(issueId: string): Promise<void> {
    const issues = store.get('issues')
    const filteredIssues = issues.filter((issue) => issue.id !== issueId)
    store.set('issues', filteredIssues)

    // Delete from file system
    await storageManager.deleteIssue(issueId)
  }

  async updateSyncStatus(
    issueId: string,
    status: 'local' | 'synced' | 'syncing' | 'failed',
    syncInfo?: { platform: string; externalId: string; url?: string }
  ): Promise<Issue> {
    const issues = store.get('issues')
    const index = issues.findIndex((issue) => issue.id === issueId)

    if (index === -1) {
      throw new Error('Issue not found')
    }

    issues[index].syncStatus = status

    if (syncInfo) {
      if (!issues[index].syncedTo) {
        issues[index].syncedTo = []
      }
      // Check if platform already exists
      const existingIndex = issues[index].syncedTo!.findIndex(
        (sync) => sync.platform === syncInfo.platform
      )
      if (existingIndex !== -1) {
        issues[index].syncedTo![existingIndex] = syncInfo
      } else {
        issues[index].syncedTo!.push(syncInfo)
      }
    }

    store.set('issues', issues)

    // Update metadata in file system
    await storageManager.saveMetadata(issueId, issues[index])

    return issues[index]
  }

  getIssuesByDateRange(startDate: Date, endDate: Date, userId?: string): Issue[] {
    const issues = this.getIssues(userId)
    return issues.filter((issue) => {
      const issueDate = new Date(issue.timestamp)
      return issueDate >= startDate && issueDate <= endDate
    })
  }

  searchIssues(query: string, userId?: string): Issue[] {
    const issues = this.getIssues(userId)
    const lowerQuery = query.toLowerCase()

    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(lowerQuery) ||
        issue.description?.toLowerCase().includes(lowerQuery) ||
        issue.id.toLowerCase().includes(lowerQuery)
    )
  }
}

export const issueService = new IssueService()
