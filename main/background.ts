import path from 'path'
import { app, ipcMain, Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { authService } from './services/auth'
import { issueService } from './services/issues'
import { captureService } from './services/capture'
import { connectorService } from './services/connectors'
import { storageManager } from './utils/storage'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

async function createMainWindow() {
  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Check if user exists
  const hasUser = authService.hasUser()
  const route = hasUser ? '/home' : '/auth'

  if (isProd) {
    await mainWindow.loadURL(`app://.${route}`)
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}${route}`)
    mainWindow.webContents.openDevTools()
  }

  // Prevent window from closing, just hide it
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  return mainWindow
}

function createSystemTray() {
  const image = nativeImage.createFromPath(path.join(__dirname, '../resources/tray-icon.png'));

  // Resize for tray
  const trayIcon = image.resize({ width: 16, height: 16 })
  trayIcon.setTemplateImage(true) // Makes it adapt to light/dark themes on macOS

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SnapFlow',
      click: () => {
        mainWindow?.show()
      },
    },
    { type: 'separator' },
    {
      label: 'Capture Screenshot',
      submenu: [
        {
          label: 'Full Screen',
          click: () => {
            handleScreenshotCapture('fullscreen')
          },
        },
        {
          label: 'Select Window',
          click: () => {
            handleScreenshotCapture('window')
          },
        },
        {
          label: 'Select Region',
          click: () => {
            handleScreenshotCapture('region')
          },
        },
      ],
    },
    {
      label: 'Record Screen',
      click: () => {
        // TODO: Implement recording
        console.log('Recording not yet implemented')
      },
    },
    {
      label: 'View My Issues',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('navigate', '/home')
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('SnapFlow')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
  })
}

async function handleScreenshotCapture(mode: 'fullscreen' | 'window' | 'region') {
  try {
    const { dataUrl } = await captureService.captureScreenshot({ mode })

    // Create or show annotation window
    mainWindow?.show()
    if (isProd) {
      await mainWindow?.loadURL('app://./annotate')
    } else {
      const port = process.argv[2]
      await mainWindow?.loadURL(`http://localhost:${port}/annotate`)
    }

    // Send the captured image to the renderer
    mainWindow?.webContents.send('screenshot-captured', { dataUrl, mode })
  } catch (error) {
    console.error('Failed to capture screenshot:', error)
  }
}

;(async () => {
  await app.whenReady()

  // Initialize storage
  await storageManager.ensureDirectories()

  // Create main window
  await createMainWindow()

  // Create system tray
  createSystemTray()
})()

// Prevent app from quitting when all windows are closed
app.on('window-all-closed', () => {
  // Do nothing, keep app running in tray
})

// IPC Handlers

// Auth handlers
ipcMain.handle('user:create', async (_event, { name, email, password }) => {
  try {
    const user = await authService.createUser(name, email, password)
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('user:login', async (_event, { email, password }) => {
  try {
    const user = await authService.login(email, password)
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('user:get', async () => {
  try {
    const user = authService.getUser()
    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('user:logout', async () => {
  try {
    authService.logout()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Issue handlers
ipcMain.handle('issue:create', async (_event, { userId, title, type, filePath, description, thumbnailPath }) => {
  try {
    const issue = await issueService.createIssue(userId, title, type, filePath, description, thumbnailPath)
    return { success: true, data: issue }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('issue:list', async (_event, { userId }) => {
  try {
    const issues = issueService.getIssues(userId)
    return { success: true, data: issues }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('issue:update', async (_event, { issueId, updates }) => {
  try {
    const issue = await issueService.updateIssue(issueId, updates)
    return { success: true, data: issue }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('issue:delete', async (_event, { issueId }) => {
  try {
    await issueService.deleteIssue(issueId)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Capture handlers
ipcMain.handle('capture:screenshot', async (_event, { mode, windowId, bounds }) => {
  try {
    const result = await captureService.captureScreenshot({ mode, windowId, bounds })
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('capture:get-windows', async () => {
  try {
    const windows = await captureService.getAvailableWindows()
    return { success: true, data: windows }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('capture:save', async (_event, { issueId, buffer }) => {
  try {
    const filePath = await captureService.saveScreenshot(issueId, Buffer.from(buffer))
    const thumbnailPath = await captureService.createThumbnail(Buffer.from(buffer), issueId)
    return { success: true, data: { filePath, thumbnailPath } }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Connector handlers
ipcMain.handle('connector:list', async () => {
  try {
    const connectors = connectorService.getConnectors()
    return { success: true, data: connectors }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('connector:add', async (_event, connector) => {
  try {
    const newConnector = connectorService.addConnector(connector)
    return { success: true, data: newConnector }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('connector:update', async (_event, { id, updates }) => {
  try {
    const connector = connectorService.updateConnector(id, updates)
    return { success: true, data: connector }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('connector:delete', async (_event, { id }) => {
  try {
    connectorService.deleteConnector(id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Sync handler
ipcMain.handle('sync:issue', async (_event, { issueId, connectorType }) => {
  try {
    const issue = issueService.getIssueById(issueId)
    if (!issue) {
      throw new Error('Issue not found')
    }

    const connector = connectorService.getConnectorByType(connectorType)
    if (!connector || !connector.enabled) {
      throw new Error(`${connectorType} connector not configured`)
    }

    await issueService.updateSyncStatus(issueId, 'syncing')

    let result: any
    if (connectorType === 'github') {
      result = await connectorService.syncToGitHub(connector, {
        title: issue.title,
        description: issue.description,
        filePath: issue.filePath,
      })
      await issueService.updateSyncStatus(issueId, 'synced', {
        platform: 'github',
        externalId: result.issueNumber.toString(),
        url: result.url,
      })
    } else if (connectorType === 'zoho') {
      result = await connectorService.syncToZoho(connector, {
        title: issue.title,
        description: issue.description,
        filePath: issue.filePath,
      })
      await issueService.updateSyncStatus(issueId, 'synced', {
        platform: 'zoho',
        externalId: result.bugId,
        url: result.url,
      })
    }

    return { success: true, data: result }
  } catch (error) {
    await issueService.updateSyncStatus(issueId, 'failed')
    return { success: false, error: error.message }
  }
})

// App control handlers
ipcMain.handle('app:quit', () => {
  isQuitting = true
  app.quit()
})

ipcMain.handle('app:show-window', () => {
  mainWindow?.show()
})

ipcMain.handle('app:hide-window', () => {
  mainWindow?.hide()
})
