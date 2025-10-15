import Store from 'electron-store'
import axios from 'axios'
import fs from 'fs/promises'

interface Connector {
  id: string
  name: string
  type: 'github' | 'zoho'
  enabled: boolean
  config: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: string
    owner?: string
    repo?: string
    portalId?: string
    projectId?: string
  }
}

const store = new Store<{ connectors: Connector[] }>({
  name: 'snapflow-connectors',
  defaults: {
    connectors: [],
  },
})

export class ConnectorService {
  getConnectors(): Connector[] {
    return store.get('connectors')
  }

  getConnectorById(id: string): Connector | undefined {
    const connectors = store.get('connectors')
    return connectors.find((c) => c.id === id)
  }

  getConnectorByType(type: 'github' | 'zoho'): Connector | undefined {
    const connectors = store.get('connectors')
    return connectors.find((c) => c.type === type)
  }

  addConnector(connector: Omit<Connector, 'id'>): Connector {
    const connectors = store.get('connectors')
    const newConnector: Connector = {
      ...connector,
      id: `${connector.type}-${Date.now()}`,
    }
    connectors.push(newConnector)
    store.set('connectors', connectors)
    return newConnector
  }

  updateConnector(id: string, updates: Partial<Connector>): Connector {
    const connectors = store.get('connectors')
    const index = connectors.findIndex((c) => c.id === id)

    if (index === -1) {
      throw new Error('Connector not found')
    }

    connectors[index] = {
      ...connectors[index],
      ...updates,
      id, // Ensure ID doesn't change
    }

    store.set('connectors', connectors)
    return connectors[index]
  }

  deleteConnector(id: string): void {
    const connectors = store.get('connectors')
    const filteredConnectors = connectors.filter((c) => c.id !== id)
    store.set('connectors', filteredConnectors)
  }

  async syncToGitHub(
    connector: Connector,
    issue: {
      title: string
      description?: string
      filePath: string
    }
  ): Promise<{ issueNumber: number; url: string }> {
    if (!connector.config.accessToken || !connector.config.owner || !connector.config.repo) {
      throw new Error('GitHub connector not properly configured')
    }

    try {
      // Read the file
      const fileBuffer = await fs.readFile(issue.filePath)
      const base64Content = fileBuffer.toString('base64')

      // Create GitHub issue with image
      const body = `${issue.description || ''}\n\n![Screenshot](data:image/png;base64,${base64Content})`

      const response = await axios.post(
        `https://api.github.com/repos/${connector.config.owner}/${connector.config.repo}/issues`,
        {
          title: issue.title,
          body,
        },
        {
          headers: {
            Authorization: `Bearer ${connector.config.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      return {
        issueNumber: response.data.number,
        url: response.data.html_url,
      }
    } catch (error) {
      console.error('GitHub sync error:', error)
      throw new Error(`Failed to sync to GitHub: ${error.message}`)
    }
  }

  async syncToZoho(
    connector: Connector,
    issue: {
      title: string
      description?: string
      filePath: string
    }
  ): Promise<{ bugId: string; url: string }> {
    if (!connector.config.accessToken || !connector.config.portalId || !connector.config.projectId) {
      throw new Error('Zoho connector not properly configured')
    }

    try {
      // Create Zoho bug
      const response = await axios.post(
        `https://projectsapi.zoho.com/restapi/portal/${connector.config.portalId}/projects/${connector.config.projectId}/bugs/`,
        {
          title: issue.title,
          description: issue.description || '',
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${connector.config.accessToken}`,
          },
        }
      )

      const bugId = response.data.bugs[0].id

      // Upload attachment
      const fileBuffer = await fs.readFile(issue.filePath)
      const formData = new FormData()
      formData.append('file', new Blob([fileBuffer]), 'screenshot.png')

      await axios.post(
        `https://projectsapi.zoho.com/restapi/portal/${connector.config.portalId}/projects/${connector.config.projectId}/bugs/${bugId}/attachments/`,
        formData,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${connector.config.accessToken}`,
          },
        }
      )

      return {
        bugId,
        url: `https://projects.zoho.com/portal/${connector.config.portalId}#bugdetail/${bugId}`,
      }
    } catch (error) {
      console.error('Zoho sync error:', error)
      throw new Error(`Failed to sync to Zoho: ${error.message}`)
    }
  }
}

export const connectorService = new ConnectorService()
