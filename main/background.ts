import dotenv from "dotenv";
import path from "path";
import electron from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { authService } from "./services/auth";
import { issueService } from "./services/issues";
import { captureService } from "./services/capture";
import { connectorService } from "./services/connectors";
import { updaterService } from "./services/updater";
import { syncService } from "./services/sync";
import { storageManager } from "./utils/storage";
import { sessionManager } from "./utils/session";
import fs from "fs";

const {
  app,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  BrowserWindow,
  protocol,
  dialog,
  shell,
  screen,
} = electron;

// Determine if we're in production
const isProd = process.env.NODE_ENV === "production";

// Load environment variables
// In production, .env is in the app.asar or app directory
// In development, .env is in the project root
if (isProd) {
  // In production, try multiple possible locations
  const possibleEnvPaths = [
    path.join(process.resourcesPath, "..", ".env"), // app directory
    path.join(process.resourcesPath, ".env"), // resources directory
    path.join(__dirname, "..", ".env"), // app directory
  ];

  let envLoaded = false;
  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      console.log("[ENV] Loading .env from:", envPath);
      dotenv.config({ path: envPath });
      envLoaded = true;
      break;
    }
  }

  if (!envLoaded) {
    console.warn(
      "[ENV] No .env file found in production, using existing environment variables"
    );
  }
} else {
  // In development, load from project root
  dotenv.config();
}

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
  // Get tray icon path - different for dev vs production
  const trayIconPath = isProd
    ? path.join(process.resourcesPath, "tray-icon.png")
    : path.join(__dirname, "../resources/tray-icon.png");

  const image = nativeImage.createFromPath(trayIconPath);

  // Resize for tray
  const trayIcon = image.resize({ width: 16, height: 16 });
  trayIcon.setTemplateImage(true); // Makes it adapt to light/dark themes on macOS

  tray = new Tray(trayIcon);
  updateTrayMenu();

  tray.setToolTip("SnapFlow");
}

function updateTrayMenu() {
  if (!tray) return;

  // Get available displays
  const displays = captureService.getAvailableDisplays();
  const hasMultipleDisplays = displays.length > 1;

  // Build capture menu items
  const captureMenuItems: electron.MenuItemConstructorOptions[] = [
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
  ];

  // Add multi-screen options if multiple displays are available
  if (hasMultipleDisplays) {
    captureMenuItems.push({ type: "separator" });
    captureMenuItems.push({
      label: "Capture All Screens",
      click: () => {
        handleScreenshotCapture("all-screens");
      },
    });

    // Add individual screen capture options
    const screenSubmenu = displays.map((display) => ({
      label: display.label,
      click: () => {
        handleScreenshotCapture("specific-screen", display.id.toString());
      },
    }));

    captureMenuItems.push({
      label: "Capture Specific Screen",
      submenu: screenSubmenu,
    });
  }

  const contextMenu = Menu.buildFromTemplate([
    ...captureMenuItems,
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
      label: "Check for Updates",
      click: async () => {
        await handleCheckForUpdates();
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

  tray.setContextMenu(contextMenu);
}

async function createWindowCaptureOverlay() {
  const { screen } = electron;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;

  // Check permission before attempting capture
  const hasPermission = await captureService.checkScreenRecordingPermission();
  if (!hasPermission) {
    console.log("[Window Capture] No screen recording permission");
    mainWindow?.show();
    return;
  }

  // Capture screenshot first to use as background
  const { dataUrl } = await captureService.captureScreenshot({
    mode: "fullscreen",
  });

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
    backgroundColor: "#00000000", // Fully transparent background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Set always on top but don't use fullscreen mode (which can break transparency on macOS)
  windowCaptureOverlay.setAlwaysOnTop(true, "screen-saver", 1);
  windowCaptureOverlay.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  // Ensure dock icon stays visible on macOS
  if (process.platform === "darwin") {
    app.dock?.show();
  }

  // Load the window capture page
  if (isProd) {
    await windowCaptureOverlay.loadURL("app://./window-capture");
  } else {
    const port = process.argv[2];
    await windowCaptureOverlay.loadURL(
      `http://localhost:${port}/window-capture`
    );
  }

  // Send background screenshot and available windows to the renderer
  windowCaptureOverlay.webContents.once("did-finish-load", () => {
    windowCaptureOverlay?.webContents.send("background-screenshot", {
      dataUrl,
    });
    windowCaptureOverlay?.webContents.send(
      "available-windows",
      availableWindows
    );
  });

  // Handle window close
  windowCaptureOverlay.on("closed", () => {
    windowCaptureOverlay = null;
  });
}

async function createAreaCaptureOverlay() {
  const { screen } = electron;

  // Check permission before attempting capture
  const hasPermission = await captureService.checkScreenRecordingPermission();
  if (!hasPermission) {
    console.log("[Area Capture] No screen recording permission");
    mainWindow?.show();
    return;
  }

  // Ensure dock icon stays visible on macOS
  if (process.platform === "darwin") {
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
    backgroundColor: "#00000000", // Fully transparent background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Set always on top but don't use fullscreen mode (which can break transparency on macOS)
  windowCaptureOverlay.setAlwaysOnTop(true, "screen-saver", 1);
  windowCaptureOverlay.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });

  // Load the area capture page
  if (isProd) {
    await windowCaptureOverlay.loadURL("app://./area-capture");
  } else {
    const port = process.argv[2];
    await windowCaptureOverlay.loadURL(`http://localhost:${port}/area-capture`);
  }

  // Send display info once page is loaded
  windowCaptureOverlay.webContents.once("did-finish-load", async () => {
    const overlayBounds =
      windowCaptureOverlay?.getBounds() || primaryDisplay.bounds;

    windowCaptureOverlay?.webContents.send("area-capture-ready", {
      scaleFactor,
      displayBounds: primaryDisplay.bounds,
      overlayBounds,
    });
  });

  // Handle window close
  windowCaptureOverlay.on("closed", () => {
    windowCaptureOverlay = null;
  });
}

async function handleScreenshotCapture(
  mode: "fullscreen" | "window" | "region" | "all-screens" | "specific-screen",
  screenId?: string
) {
  try {
    // Check permission first to avoid getting stuck in a loop
    const hasPermission = await captureService.checkScreenRecordingPermission();
    if (!hasPermission) {
      console.log("[Screenshot] No screen recording permission detected");
      // Show dialog to user explaining they need to restart the app
      const result = await dialog.showMessageBox(mainWindow!, {
        type: "warning",
        title: "Screen Recording Permission Required",
        message: "SnapFlow needs Screen Recording permission",
        detail:
          "Please grant Screen Recording permission in System Settings > Privacy & Security > Screen Recording, then completely quit and restart SnapFlow.\n\nNote: Simply closing the window won't work - you must fully quit the app (Cmd+Q) and restart it.",
        buttons: ["Open System Settings", "OK"],
      });

      if (result.response === 0) {
        // Open System Settings to Screen Recording
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        );
      }
      return;
    }

    // For window mode, create a transparent overlay for window selection
    if (mode === "window") {
      // Keep app in dock even when hiding main window
      if (process.platform === "darwin") {
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
      if (process.platform === "darwin") {
        app.dock?.show();
      }

      mainWindow?.hide();

      // Wait a bit for window to hide (reduced delay for smoother UX)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create transparent overlay window for area selection
      await createAreaCaptureOverlay();
      return;
    }

    // For fullscreen, all-screens, or specific-screen, capture immediately
    console.log("[Tray] Starting", mode, "capture...");

    // Keep app in dock even when hiding main window
    if (process.platform === "darwin") {
      app.dock?.show();
    }

    mainWindow?.hide();
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("[Tray] Capturing screenshot...");
    const captureOptions: {
      mode:
        | "fullscreen"
        | "window"
        | "region"
        | "all-screens"
        | "specific-screen";
      screenId?: string;
    } = {
      mode: mode as
        | "fullscreen"
        | "window"
        | "region"
        | "all-screens"
        | "specific-screen",
    };
    if (mode === "specific-screen" && screenId) {
      captureOptions.screenId = screenId;
    }

    const { dataUrl } = await captureService.captureScreenshot(captureOptions);
    console.log(
      "[Tray] Screenshot captured, dataUrl length:",
      dataUrl?.length || 0
    );

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

async function handleCheckForUpdates() {
  try {
    console.log("[Tray] Checking for updates...");

    // Show a loading dialog while checking
    const checkingDialog = dialog.showMessageBox(mainWindow!, {
      type: "info",
      title: "Checking for Updates",
      message: "Checking for updates...",
      detail: "Please wait while we check for the latest version.",
      buttons: [],
    });

    // Check for updates
    const result = await updaterService.checkForUpdates();

    // Close the loading dialog
    checkingDialog.then((_dialogResult) => {
      // Dialog will be closed automatically when we show the next one
    });

    if (result && result.updateInfo) {
      // Update is available - the updater service will handle the download and prompt
      console.log("[Tray] Update available:", result.updateInfo.version);
    } else {
      // No update available - show a message to the user
      await dialog.showMessageBox(mainWindow!, {
        type: "info",
        title: "No Updates Available",
        message: "You're running the latest version!",
        detail: `SnapFlow is up to date (version ${app.getVersion()}).`,
        buttons: ["OK"],
      });
    }
  } catch (error) {
    console.error("[Tray] Failed to check for updates:", error);

    // Show error dialog
    await dialog.showMessageBox(mainWindow!, {
      type: "error",
      title: "Update Check Failed",
      message: "Failed to check for updates",
      detail: "Please check your internet connection and try again later.",
      buttons: ["OK"],
    });
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
      if (process.platform === "darwin") {
        app.dock?.setIcon(appIcon);
        // Keep app in dock permanently - never hide
        // This prevents the dock icon from disappearing during overlay/capture
        app.dock?.show();
      }

      // Prevent app from hiding from dock when all windows are closed
      // This ensures the dock icon is always visible
      if (process.platform === "darwin") {
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

      // Listen for display changes to update tray menu
      screen.on("display-added", () => {
        console.log("[Display] Display added, updating tray menu");
        updateTrayMenu();
      });

      screen.on("display-removed", () => {
        console.log("[Display] Display removed, updating tray menu");
        updateTrayMenu();
      });

      screen.on("display-metrics-changed", () => {
        console.log("[Display] Display metrics changed, updating tray menu");
        updateTrayMenu();
      });

      // Initialize auto-updater (only in production)
      if (isProd && mainWindow) {
        updaterService.init();
        updaterService.setMainWindow(mainWindow);
        // Check for updates 5 seconds after app starts
        setTimeout(() => {
          updaterService.checkForUpdates();
        }, 5000);
      }
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
      const result = await captureService.captureScreenshot({
        mode: "fullscreen",
      });
      return {
        success: true,
        data: { buffer: Array.from(result.buffer), dataUrl: result.dataUrl },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("capture:active-window", async () => {
    try {
      const result = await captureService.captureScreenshot({ mode: "window" });
      return {
        success: true,
        data: { buffer: Array.from(result.buffer), dataUrl: result.dataUrl },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("capture:selected-region", async (_event, { bounds }) => {
    try {
      const result = await captureService.captureScreenshot({
        mode: "region",
        bounds,
      });
      return {
        success: true,
        data: { buffer: Array.from(result.buffer), dataUrl: result.dataUrl },
      };
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
      // Clear cache to get fresh permission status
      captureService.clearPermissionCache();
      const hasPermission =
        await captureService.checkScreenRecordingPermission();
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

  ipcMain.handle("capture:get-displays", async () => {
    try {
      const displays = captureService.getAvailableDisplays();
      return { success: true, data: displays };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("capture:all-screens", async () => {
    try {
      const result = await captureService.captureAllScreens();
      return {
        success: true,
        data: { buffer: Array.from(result.buffer), dataUrl: result.dataUrl },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("capture:specific-screen", async (_event, { displayId }) => {
    try {
      const result = await captureService.captureSpecificScreen(displayId);
      return {
        success: true,
        data: { buffer: Array.from(result.buffer), dataUrl: result.dataUrl },
      };
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

      console.log(
        "[Window Capture] Screenshot captured, dataUrl length:",
        result.dataUrl?.length || 0
      );

      // Store screenshot data globally
      pendingScreenshot = { dataUrl: result.dataUrl, mode: "window" };
      console.log("[Window Capture] Stored pending screenshot");

      // Navigate to annotate page
      console.log(
        "[Window Capture] Showing main window and navigating to annotate page..."
      );
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
    console.log(
      "[IPC] Getting pending screenshot, exists:",
      !!pendingScreenshot
    );
    if (pendingScreenshot) {
      const data = pendingScreenshot;
      pendingScreenshot = null; // Clear after retrieval
      console.log(
        "[IPC] Returning pending screenshot, length:",
        data.dataUrl?.length || 0
      );
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

  // Sync handler - GitHub
  ipcMain.handle("sync:issue", async (_event, { issueId, connectorId }) => {
    try {
      const issue = issueService.getIssueById(issueId);
      if (!issue) {
        throw new Error("Issue not found");
      }

      const connector = connectorService.getConnectorById(connectorId);
      if (!connector || !connector.enabled) {
        throw new Error("GitHub connector not found or disabled");
      }

      await issueService.updateSyncStatus(issueId, "syncing");

      const result = await connectorService.syncToGitHub(connector, {
        title: issue.title,
        description: issue.description,
        filePath: issue.filePath,
        cloudFileUrl: issue.cloudFileUrl, // Pass the cloud URL if available
        syncedTo: issue.syncedTo, // Pass existing sync info to check for duplicates
      });

      await issueService.updateSyncStatus(issueId, "synced", {
        platform: "github",
        externalId: result.issueNumber.toString(),
        url: result.url,
      });

      return {
        success: true,
        data: {
          ...result,
          message: result.isUpdate
            ? "GitHub issue updated successfully"
            : "GitHub issue created successfully",
        },
      };
    } catch (error) {
      await issueService.updateSyncStatus(issueId, "failed");
      return { success: false, error: error.message };
    }
  });

  // Sync handler - Cloud (Supabase)
  ipcMain.handle("sync:to-cloud", async (_event, { userId }) => {
    try {
      const result = await syncService.syncAllToCloud(userId);
      return { success: result.success, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:from-cloud", async (_event, { userId }) => {
    try {
      const result = await syncService.fetchFromCloud(userId);
      return { success: result.success, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:full", async (_event, { userId }) => {
    try {
      const result = await syncService.fullSync(userId);
      return { success: result.success, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:get-history", async (_event, { userId }) => {
    try {
      const history = await syncService.getLatestSyncHistory(userId);
      return { success: true, data: history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate GitHub connector
  ipcMain.handle(
    "connector:validate-github",
    async (_event, { accessToken, owner, repo }) => {
      try {
        const isValid = await connectorService.validateGitHubConnector(
          accessToken,
          owner,
          repo
        );
        return { success: true, data: { isValid } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

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
      const mimeType =
        ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "image/png";
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

  // Update handlers
  ipcMain.handle("update:check", async () => {
    try {
      const result = await updaterService.checkForUpdates();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("update:check-manual", async () => {
    try {
      console.log("[IPC] Manual update check requested");
      const result = await updaterService.checkForUpdates();

      if (result && result.updateInfo) {
        console.log("[IPC] Update available:", result.updateInfo.version);
        return {
          success: true,
          data: {
            updateAvailable: true,
            version: result.updateInfo.version,
            releaseDate: result.updateInfo.releaseDate,
          },
        };
      } else {
        console.log("[IPC] No update available");
        return {
          success: true,
          data: {
            updateAvailable: false,
            currentVersion: app.getVersion(),
          },
        };
      }
    } catch (error) {
      console.error("[IPC] Manual update check failed:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("update:download", async () => {
    try {
      await updaterService.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("update:install", () => {
    try {
      updaterService.quitAndInstall();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("update:get-info", () => {
    try {
      const info = updaterService.getUpdateInfo();
      return { success: true, data: info };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Debug handler to test screen capture directly
  ipcMain.handle("debug:test-capture", async () => {
    try {
      console.log("[Debug] Testing screen capture...");
      const hasPermission =
        await captureService.checkScreenRecordingPermission();
      console.log("[Debug] Permission status:", hasPermission);

      if (hasPermission) {
        console.log("[Debug] Permission granted, attempting test capture...");
        const result = await captureService.captureScreenshot({
          mode: "fullscreen",
        });
        console.log(
          "[Debug] Test capture successful! Buffer size:",
          result.buffer.length
        );
        return {
          success: true,
          data: {
            hasPermission,
            bufferSize: result.buffer.length,
            dataUrlLength: result.dataUrl.length,
          },
        };
      } else {
        console.log("[Debug] No permission detected");
        return { success: false, error: "No screen recording permission" };
      }
    } catch (error) {
      console.error("[Debug] Test capture failed:", error);
      return { success: false, error: error.message };
    }
  });
}

// Handle quit events properly
if (app && app.on) {
  // Set isQuitting flag before quit begins (handles CMD+Q, dock quit, etc.)
  app.on("before-quit", () => {
    console.log("[App] before-quit event - setting isQuitting to true");
    isQuitting = true;
  });

  // Handle activate event (macOS) - show window when clicking dock icon
  app.on("activate", () => {
    console.log("[App] activate event - showing window");
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
}
