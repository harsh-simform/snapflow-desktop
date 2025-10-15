export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Issue {
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

export interface Connector {
  id: string
  name: string
  type: 'github' | 'zoho'
  enabled: boolean
  config: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: string
    // GitHub specific
    owner?: string
    repo?: string
    // Zoho specific
    portalId?: string
    projectId?: string
  }
}

export interface CaptureOptions {
  mode: 'fullscreen' | 'window' | 'region'
  windowId?: string
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface RecordingOptions {
  mode: 'fullscreen' | 'region'
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  audioEnabled?: boolean
}

export interface AppSettings {
  storagePath: string
  defaultCaptureMode: 'fullscreen' | 'window' | 'region'
  defaultRecordingMode: 'fullscreen' | 'region'
  shortcuts: {
    captureScreenshot: string
    recordScreen: string
    openApp: string
  }
}

export type IPCChannel =
  | 'user:create'
  | 'user:get'
  | 'user:login'
  | 'issue:create'
  | 'issue:list'
  | 'issue:update'
  | 'issue:delete'
  | 'capture:screenshot'
  | 'capture:start-recording'
  | 'capture:stop-recording'
  | 'connector:list'
  | 'connector:add'
  | 'connector:update'
  | 'connector:delete'
  | 'sync:issue'
  | 'settings:get'
  | 'settings:update'
  | 'app:quit'
  | 'app:show-window'
  | 'app:hide-window'
