import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const handler = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args)
  },
}

// Expose API methods
const api = {
  // User methods
  createUser: (name: string, email: string, password: string) =>
    ipcRenderer.invoke('user:create', { name, email, password }),
  loginUser: (email: string, password: string) =>
    ipcRenderer.invoke('user:login', { email, password }),
  getUser: () => ipcRenderer.invoke('user:get'),
  logout: () => ipcRenderer.invoke('user:logout'),

  // Issue methods
  createIssue: (userId: string, title: string, type: 'screenshot' | 'recording', filePath: string, description?: string, thumbnailPath?: string) =>
    ipcRenderer.invoke('issue:create', { userId, title, type, filePath, description, thumbnailPath }),
  listIssues: (userId: string) =>
    ipcRenderer.invoke('issue:list', { userId }),
  updateIssue: (issueId: string, updates: any) =>
    ipcRenderer.invoke('issue:update', { issueId, updates }),
  deleteIssue: (issueId: string) =>
    ipcRenderer.invoke('issue:delete', { issueId }),

  // Capture methods
  captureScreenshot: (mode: 'fullscreen' | 'window' | 'region', windowId?: string, bounds?: any) =>
    ipcRenderer.invoke('capture:screenshot', { mode, windowId, bounds }),
  getAvailableWindows: () =>
    ipcRenderer.invoke('capture:get-windows'),
  saveCapture: (issueId: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('capture:save', { issueId, buffer }),

  // Connector methods
  listConnectors: () =>
    ipcRenderer.invoke('connector:list'),
  addConnector: (connector: any) =>
    ipcRenderer.invoke('connector:add', connector),
  updateConnector: (id: string, updates: any) =>
    ipcRenderer.invoke('connector:update', { id, updates }),
  deleteConnector: (id: string) =>
    ipcRenderer.invoke('connector:delete', { id }),

  // Sync method
  syncIssue: (issueId: string, connectorType: 'github' | 'zoho') =>
    ipcRenderer.invoke('sync:issue', { issueId, connectorType }),

  // App control
  quitApp: () => ipcRenderer.invoke('app:quit'),
  showWindow: () => ipcRenderer.invoke('app:show-window'),
  hideWindow: () => ipcRenderer.invoke('app:hide-window'),

  // Event listeners
  onScreenshotCaptured: (callback: (data: any) => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('screenshot-captured', subscription)
    return () => ipcRenderer.removeListener('screenshot-captured', subscription)
  },
  onNavigate: (callback: (route: string) => void) => {
    const subscription = (_event: IpcRendererEvent, route: string) => callback(route)
    ipcRenderer.on('navigate', subscription)
    return () => ipcRenderer.removeListener('navigate', subscription)
  },
}

contextBridge.exposeInMainWorld('ipc', handler)
contextBridge.exposeInMainWorld('api', api)

export type IpcHandler = typeof handler
export type API = typeof api
