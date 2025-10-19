import "dotenv/config";
import path from "path";
import electron from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { authService } from "./services/auth";
import { issueService } from "./services/issues";
import { captureService } from "./services/capture";
import { connectorService } from "./services/connectors";
import { storageManager } from "./utils/storage";
import { sessionManager } from "./utils/session";
import fs from "fs";

const { app, ipcMain, Tray, Menu, nativeImage, BrowserWindow, protocol } = electron;

const isProd = process.env.NODE_ENV === "production";

// Register custom protocol scheme before app is ready (if available)
if (protocol && protocol.registerSchemesAsPrivileged) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "snapflow",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: false,
        bypassCSP: false,
      },
    },
  ]);
}

// Global state
let mainWindow: typeof BrowserWindow.prototype | null = null;
let windowCaptureOverlay: typeof BrowserWindow.prototype | null = null;
let tray: typeof Tray.prototype | null = null;
let isQuitting = false;
let pendingScreenshot: { dataUrl: string; mode: string } | null = null;

if (isProd) {
  serve({ directory: "app" });
} else {
  if (app && app.setPath) {
    app.setPath("userData", `${app.getPath("userData")} (development)`);
  }

  // In development, quit app when terminal process is killed
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, quitting app...");
    isQuitting = true;
    if (app) app.quit();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, quitting app...");
    isQuitting = true;
    if (app) app.quit();
  });

  // Also handle parent process exit (when npm run dev is killed)
  process.on("disconnect", () => {
    console.log("Parent process disconnected, quitting app...");
    isQuitting = true;
    if (app) app.quit();
  });
}

async function createMainWindow() {
  // Set app icon
  const iconPath = isProd
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "../resources/icon.png");

  mainWindow = createWindow("main", {
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Check if user is already logged in (session exists)
  const currentUser = sessionManager.getUser();
  let hasUser = false;

  try {
    hasUser = await authService.hasAnyUser();
  } catch (error) {
    console.error("Database connection error:", error);
    // Will show database setup screen
  }

  // Route logic:
  // - If session exists and is valid, go to home
  // - Otherwise, go to auth
  const route = currentUser && hasUser ? "/home" : "/auth";

  if (isProd) {
    await mainWindow.loadURL(`app://.${route}`);
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}${route}`);
    mainWindow.webContents.openDevTools();
  }

  // Prevent window from closing, just hide it
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  return mainWindow;
}

function createSystemTray() {
  const image = nativeImage.createFromPath(
    path.join(__dirname, "../resources/tray-icon.png")
  );

  // Resize for tray
  const trayIcon = image.resize({ width: 16, height: 16 });
  trayIcon.setTemplateImage(true); // Makes it adapt to light/dark themes on macOS

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Capture Full Screen",
      click: () => {
        handleScreenshotCapture("fullscreen");
      },
    },
    {
      label: "Capture Area",
      click: () => {
        handleScreenshotCapture("region");
      },
    },
    { type: "separator" },
    {
      label: "View My Snaps",
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send("navigate", "/home");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("SnapFlow");
  tray.setContextMenu(contextMenu);
}

async function createWindowCaptureOverlay() {
  const { screen } = electron;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;

  // Capture screenshot first to use as background
  const { dataUrl } = await captureService.captureScreenshot({ mode: "fullscreen" });

  // Get all available windows before creating overlay
  const availableWindows = await captureService.getAvailableWindows();

  windowCaptureOverlay = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000', // Fully transparent background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Set always on top but don't use fullscreen mode (which can break transparency on macOS)
  windowCaptureOverlay.setAlwaysOnTop(true, "screen-saver", 1);
  windowCaptureOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Ensure dock icon stays visible on macOS
  if (process.platform === 'darwin') {
    app.dock?.show();
  }

  // Load the window capture page
  if (isProd) {
    await windowCaptureOverlay.loadURL("app://./window-capture");
  } else {
    const port = process.argv[2];
    await windowCaptureOverlay.loadURL(`http://localhost:${port}/window-capture`);
  }

  // Send background screenshot and available windows to the renderer
  windowCaptureOverlay.webContents.once("did-finish-load", () => {
    windowCaptureOverlay?.webContents.send("background-screenshot", { dataUrl });
    windowCaptureOverlay?.webContents.send("available-windows", availableWindows);
  });

  // Handle window close
  windowCaptureOverlay.on("closed", () => {
    windowCaptureOverlay = null;
  });
}

async function createAreaCaptureOverlay() {
  const { screen } = electron;

  // Ensure dock icon stays visible on macOS
  if (process.platform === 'darwin') {
    app.dock?.show();
  }

  // For now, use primary display - in future, could show overlay on all displays
  const primaryDisplay = screen.getPrimaryDisplay();

  // Use bounds (includes menu bar and dock) not workArea (excludes them)
  const { width, height, x, y } = primaryDisplay.bounds;
  const scaleFactor = primaryDisplay.scaleFactor || 1;

  // Create the overlay window (no need to capture screenshot beforehand)
  windowCaptureOverlay = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000', // Fully transparent background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Set always on top but don't use fullscreen mode (which can break transparency on macOS)
  windowCaptureOverlay.setAlwaysOnTop(true, "screen-saver", 1);
  windowCaptureOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Load the area capture page
  if (isProd) {
    await windowCaptureOverlay.loadURL("app://./area-capture");
  } else {
    const port = process.argv[2];
    await windowCaptureOverlay.loadURL(`http://localhost:${port}/area-capture`);
  }

  // Send display info once page is loaded
  windowCaptureOverlay.webContents.once("did-finish-load", async () => {
    const overlayBounds = windowCaptureOverlay?.getBounds() || primaryDisplay.bounds;

    windowCaptureOverlay?.webContents.send("area-capture-ready", {
      scaleFactor,
      displayBounds: primaryDisplay.bounds,
      overlayBounds
    });
  });

  // Handle window close
  windowCaptureOverlay.on("closed", () => {
    windowCaptureOverlay = null;
  });
}

async function handleScreenshotCapture(
  mode: "fullscreen" | "window" | "region"
) {
  try {
    // For window mode, create a transparent overlay for window selection
    if (mode === "window") {
      // Keep app in dock even when hiding main window
      if (process.platform === 'darwin') {
        app.dock?.show();
      }

      mainWindow?.hide();

      // Wait a bit for window to hide
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Create transparent overlay window for window selection
      await createWindowCaptureOverlay();
      return;
    }

    if (mode === "region") {
      // Keep app in dock even when hiding main window
      if (process.platform === 'darwin') {
        app.dock?.show();
      }

      mainWindow?.hide();

      // Wait a bit for window to hide (reduced delay for smoother UX)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create transparent overlay window for area selection
      await createAreaCaptureOverlay();
      return;
    }

    // For fullscreen, capture immediately
    console.log("[Tray] Starting fullscreen capture...");

    // Keep app in dock even when hiding main window
    if (process.platform === 'darwin') {
      app.dock?.show();
    }

    mainWindow?.hide();
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("[Tray] Capturing screenshot...");
    const { dataUrl } = await captureService.captureScreenshot({ mode });
    console.log("[Tray] Screenshot captured, dataUrl length:", dataUrl?.length || 0);

    // Store screenshot data globally so annotate page can retrieve it
    pendingScreenshot = { dataUrl, mode };
    console.log("[Tray] Screenshot stored in pendingScreenshot");

    mainWindow?.show();
    // Navigate to annotate page
    console.log("[Tray] Navigating to annotate page...");
    if (isProd) {
      await mainWindow?.loadURL("app://./annotate");
    } else {
      const port = process.argv[2];
      await mainWindow?.loadURL(`http://localhost:${port}/annotate`);
    }
    console.log("[Tray] Navigation complete");
  } catch (error) {
    console.error("[Tray] Failed to capture screenshot:", error);
  }
}

// Request single instance lock
if (app && app.requestSingleInstanceLock) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    // Another instance is already running, quit this one
    app.quit();
  } else {
    // Handle second instance attempt - focus the existing window
    app.on("second-instance", () => {
      // Someone tried to run a second instance, we should focus our window
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
      }
    });

    (async () => {
      await app.whenReady();

    // Set application icon for dock (macOS) and taskbar
    const iconPath = isProd
      ? path.join(process.resourcesPath, "icon.png")
      : path.join(__dirname, "../resources/icon.png");

    const appIcon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin') {
      app.dock?.setIcon(appIcon);
      // Keep app in dock permanently - never hide
      // This prevents the dock icon from disappearing during overlay/capture
      app.dock?.show();
    }

    // Prevent app from hiding from dock when all windows are closed
    // This ensures the dock icon is always visible
    if (process.platform === 'darwin') {
      // Force the app to always show in dock, even with no windows
      app.dock?.show();
    }

    // Register custom protocol for local file access
    protocol.registerFileProtocol("snapflow", (request, callback) => {
      const url = request.url.replace("snapflow://", "");
      try {
        const decodedPath = decodeURIComponent(url);
        console.log("Loading file:", decodedPath);

        // Check if file exists
        if (fs.existsSync(decodedPath)) {
          callback({ path: decodedPath });
        } else {
          console.error("File not found:", decodedPath);
          callback({ error: -6 }); // FILE_NOT_FOUND
        }
      } catch (error) {
        console.error("Error loading file:", error);
        callback({ error: -2 }); // FAILED
      }
    });

    // Initialize session from persistent storage
    await sessionManager.initialize();

    // Initialize storage
    await storageManager.ensureDirectories();

    // Create main window
    await createMainWindow();

      // Setup IPC handlers
      setupIPCHandlers();

      // Create system tray
      createSystemTray();
    })();
  }
}

// Prevent app from quitting when all windows are closed
if (app && app.on) {
  app.on("window-all-closed", () => {
    // Do nothing, keep app running in tray
  });
}

// Setup IPC Handlers function
function setupIPCHandlers() {
  if (!ipcMain) return;

  // Auth handlers
  ipcMain.handle("user:create", async (_event, { name, email, password }) => {
  try {
    const user = await authService.createUser(name, email, password);
    // Store user in session (same as login)
    await sessionManager.setUser(user);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("user:login", async (_event, { email, password }) => {
  try {
    const user = await authService.login(email, password);
    // Store user in session
    await sessionManager.setUser(user);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("user:get", async (_event, userId?: string) => {
  try {
    // If userId provided, fetch from database
    if (userId) {
      const user = await authService.getUserById(userId);
      return { success: true, data: user };
    }
    // Otherwise return current session user
    const user = sessionManager.getUser();
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("user:logout", async () => {
  try {
    await sessionManager.clearUser();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Issue handlers
ipcMain.handle(
  "issue:create",
  async (
    _event,
    { userId, title, type, filePath, description, thumbnailPath }
  ) => {
    try {
      const issue = await issueService.createIssue(
        userId,
        title,
        type,
        filePath,
        description,
        thumbnailPath
      );
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("issue:list", async (_event, { userId }) => {
  try {
    const issues = issueService.getIssues(userId);
    return { success: true, data: issues };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("issue:update", async (_event, { issueId, updates }) => {
  try {
    const issue = await issueService.updateIssue(issueId, updates);
    return { success: true, data: issue };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("issue:delete", async (_event, { issueId }) => {
  try {
    await issueService.deleteIssue(issueId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Capture handlers - Core functions
ipcMain.handle("capture:full-screen", async () => {
  try {
    const buffer = await captureService.captureFullScreen();
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    return { success: true, data: { buffer: Array.from(buffer), dataUrl } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("capture:active-window", async () => {
  try {
    const buffer = await captureService.captureActiveWindow();
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    return { success: true, data: { buffer: Array.from(buffer), dataUrl } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("capture:selected-region", async (_event, { bounds }) => {
  try {
    const buffer = await captureService.captureSelectedRegion(bounds);
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    return { success: true, data: { buffer: Array.from(buffer), dataUrl } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Legacy capture handler (kept for backward compatibility)
ipcMain.handle(
  "capture:screenshot",
  async (_event, { mode, windowId, bounds }) => {
    try {
      // Close overlay window if it exists (for region and window capture)
      if (windowCaptureOverlay) {
        windowCaptureOverlay.close();
        windowCaptureOverlay = null;
      }

      const result = await captureService.captureScreenshot({
        mode,
        windowId,
        bounds,
      });

      // Store screenshot data globally
      pendingScreenshot = { dataUrl: result.dataUrl, mode };
      console.log("[IPC Capture] Screenshot stored in pendingScreenshot");

      // Navigate to annotate page
      mainWindow?.show();
      if (isProd) {
        await mainWindow?.loadURL("app://./annotate");
      } else {
        const port = process.argv[2];
        await mainWindow?.loadURL(`http://localhost:${port}/annotate`);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error("[IPC Capture] Error:", error);
      // Close overlay and show main window even on error
      if (windowCaptureOverlay) {
        windowCaptureOverlay.close();
        windowCaptureOverlay = null;
      }
      mainWindow?.show();
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("capture:check-permission", async () => {
  try {
    const hasPermission = await captureService.checkScreenRecordingPermission();
    return { success: true, data: hasPermission };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("capture:get-windows", async () => {
  try {
    const windows = await captureService.getAvailableWindows();
    return { success: true, data: windows };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle window selection from overlay
ipcMain.handle("capture:select-window", async (_event, { windowId }) => {
  try {
    console.log("[Window Capture] Selected window ID:", windowId);

    // Close the overlay
    if (windowCaptureOverlay) {
      windowCaptureOverlay.close();
      windowCaptureOverlay = null;
    }

    // Wait a bit for overlay to close
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("[Window Capture] Capturing window screenshot...");
    // Capture the selected window
    const result = await captureService.captureScreenshot({
      mode: "window",
      windowId,
    });

    console.log("[Window Capture] Screenshot captured, dataUrl length:", result.dataUrl?.length || 0);

    // Store screenshot data globally
    pendingScreenshot = { dataUrl: result.dataUrl, mode: "window" };
    console.log("[Window Capture] Stored pending screenshot");

    // Navigate to annotate page
    console.log("[Window Capture] Showing main window and navigating to annotate page...");
    mainWindow?.show();
    if (isProd) {
      await mainWindow?.loadURL("app://./annotate");
    } else {
      const port = process.argv[2];
      await mainWindow?.loadURL(`http://localhost:${port}/annotate`);
    }
    console.log("[Window Capture] Navigation complete");

    return { success: true, data: result };
  } catch (error) {
    console.error("[Window Capture] Error:", error);
    // Show main window even on error
    mainWindow?.show();
    return { success: false, error: error.message };
  }
});

// Handle cancel from window capture overlay
ipcMain.handle("capture:cancel-window-select", () => {
  if (windowCaptureOverlay) {
    windowCaptureOverlay.close();
    windowCaptureOverlay = null;
  }
  mainWindow?.show();
  return { success: true };
});

ipcMain.handle("capture:save", async (_event, { issueId, buffer }) => {
  try {
    const filePath = await captureService.saveScreenshot(
      issueId,
      Buffer.from(buffer)
    );
    const thumbnailPath = await captureService.createThumbnail(
      Buffer.from(buffer),
      issueId
    );
    return { success: true, data: { filePath, thumbnailPath } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("capture:get-pending", async () => {
  console.log("[IPC] Getting pending screenshot, exists:", !!pendingScreenshot);
  if (pendingScreenshot) {
    const data = pendingScreenshot;
    pendingScreenshot = null; // Clear after retrieval
    console.log("[IPC] Returning pending screenshot, length:", data.dataUrl?.length || 0);
    return { success: true, data };
  }
  return { success: false, error: "No pending screenshot" };
});

// Connector handlers
ipcMain.handle("connector:list", async () => {
  try {
    const connectors = connectorService.getConnectors();
    return { success: true, data: connectors };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("connector:add", async (_event, connector) => {
  try {
    const newConnector = connectorService.addConnector(connector);
    return { success: true, data: newConnector };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("connector:update", async (_event, { id, updates }) => {
  try {
    const connector = connectorService.updateConnector(id, updates);
    return { success: true, data: connector };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("connector:delete", async (_event, { id }) => {
  try {
    connectorService.deleteConnector(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Sync handler
ipcMain.handle("sync:issue", async (_event, { issueId, connectorType }) => {
  try {
    const issue = issueService.getIssueById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    const connector = connectorService.getConnectorByType(connectorType);
    if (!connector || !connector.enabled) {
      throw new Error(`${connectorType} connector not configured`);
    }

    await issueService.updateSyncStatus(issueId, "syncing");

    let result: any;
    if (connectorType === "github") {
      result = await connectorService.syncToGitHub(connector, {
        title: issue.title,
        description: issue.description,
        filePath: issue.filePath,
      });
      await issueService.updateSyncStatus(issueId, "synced", {
        platform: "github",
        externalId: result.issueNumber.toString(),
        url: result.url,
      });
    } else if (connectorType === "zoho") {
      result = await connectorService.syncToZoho(connector, {
        title: issue.title,
        description: issue.description,
        filePath: issue.filePath,
      });
      await issueService.updateSyncStatus(issueId, "synced", {
        platform: "zoho",
        externalId: result.bugId,
        url: result.url,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    await issueService.updateSyncStatus(issueId, "failed");
    return { success: false, error: error.message };
  }
});

// Note: Database configuration handlers removed - Supabase config is now via environment variables

// File access handler
ipcMain.handle("file:read-image", async (_event, { filePath }) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return { success: true, data: dataUrl };
  } catch (error) {
    console.error("Error reading image:", error);
    return { success: false, error: error.message };
  }
});

// App control handlers
ipcMain.handle("app:quit", () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle("app:show-window", () => {
  mainWindow?.show();
});

  ipcMain.handle("app:hide-window", () => {
    mainWindow?.hide();
  });
}

// Cleanup on app quit
if (app && app.on) {
  app.on("before-quit", async () => {
    // Don't clear the session - we want to persist it across app restarts
    // Session will only be cleared when user explicitly logs out
    console.log("[App] Quitting app, session will be preserved for next launch");
  });
}
