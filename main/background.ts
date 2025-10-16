import path from "path";
import { app, ipcMain, Tray, Menu, nativeImage, BrowserWindow, protocol } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { authService } from "./services/auth";
import { issueService } from "./services/issues";
import { captureService } from "./services/capture";
import { connectorService } from "./services/connectors";
import { storageManager } from "./utils/storage";
import { configService } from "./services/config";
import { prisma, disconnectPrisma } from "./utils/prisma";
import { sessionManager } from "./utils/session";
import fs from "fs";

const isProd = process.env.NODE_ENV === "production";

// Register custom protocol scheme before app is ready
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

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);

  // In development, quit app when terminal process is killed
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, quitting app...");
    app.quit();
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, quitting app...");
    app.quit();
  });
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

async function createMainWindow() {
  mainWindow = createWindow("main", {
    width: 1200,
    height: 800,
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
      label: "Capture Window",
      click: () => {
        handleScreenshotCapture("window");
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

async function handleScreenshotCapture(
  mode: "fullscreen" | "window" | "region"
) {
  try {
    // For window and region modes, hide window first, capture screen, then show UI
    if (mode === "window") {
      mainWindow?.hide();

      // Wait a bit for window to hide
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Capture fullscreen to show available windows
      const { dataUrl } = await captureService.captureScreenshot({ mode: "fullscreen" });

      mainWindow?.show();
      if (isProd) {
        await mainWindow?.loadURL("app://./window-picker");
      } else {
        const port = process.argv[2];
        await mainWindow?.loadURL(`http://localhost:${port}/window-picker`);
      }

      // Send the screenshot to use as background
      mainWindow?.webContents.send("background-screenshot", { dataUrl });
      return;
    }

    if (mode === "region") {
      mainWindow?.hide();

      // Wait a bit for window to hide
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Capture fullscreen for area selection
      const { dataUrl } = await captureService.captureScreenshot({ mode: "fullscreen" });

      mainWindow?.show();
      if (isProd) {
        await mainWindow?.loadURL("app://./area-selector");
      } else {
        const port = process.argv[2];
        await mainWindow?.loadURL(`http://localhost:${port}/area-selector`);
      }

      // Send the screenshot to use as background
      mainWindow?.webContents.send("background-screenshot", { dataUrl });
      return;
    }

    // For fullscreen, capture immediately
    mainWindow?.hide();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { dataUrl } = await captureService.captureScreenshot({ mode });

    mainWindow?.show();
    // Navigate to annotate page
    if (isProd) {
      await mainWindow?.loadURL("app://./annotate");
    } else {
      const port = process.argv[2];
      await mainWindow?.loadURL(`http://localhost:${port}/annotate`);
    }

    // Send the captured image to the renderer
    mainWindow?.webContents.send("screenshot-captured", { dataUrl, mode });
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
  }
}

// Request single instance lock
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

    // Create system tray
    createSystemTray();
  })();
}

// Prevent app from quitting when all windows are closed
app.on("window-all-closed", () => {
  // Do nothing, keep app running in tray
});

// IPC Handlers

// Auth handlers
ipcMain.handle("user:create", async (_event, { name, email, password }) => {
  try {
    const user = await authService.createUser(name, email, password);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("user:login", async (_event, { email, password }) => {
  try {
    const user = await authService.login(email, password);
    // Store user in session
    sessionManager.setUser(user);
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
    authService.logout();
    sessionManager.clearUser();
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

// Capture handlers
ipcMain.handle(
  "capture:screenshot",
  async (_event, { mode, windowId, bounds }) => {
    try {
      const result = await captureService.captureScreenshot({
        mode,
        windowId,
        bounds,
      });

      // Navigate to annotate page
      mainWindow?.show();
      if (isProd) {
        await mainWindow?.loadURL("app://./annotate");
      } else {
        const port = process.argv[2];
        await mainWindow?.loadURL(`http://localhost:${port}/annotate`);
      }

      // Wait for page to load before sending screenshot data
      await new Promise<void>((resolve) => {
        const checkLoaded = () => {
          if (mainWindow?.webContents.isLoading()) {
            setTimeout(checkLoaded, 100);
          } else {
            // Give an extra moment for React to mount
            setTimeout(() => resolve(), 300);
          }
        };
        checkLoaded();
      });

      // Send the captured image to the renderer
      mainWindow?.webContents.send("screenshot-captured", {
        dataUrl: result.dataUrl,
        mode,
      });

      return { success: true, data: result };
    } catch (error) {
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

// Database configuration handlers
ipcMain.handle("db:get-config", async () => {
  try {
    const config = configService.getDatabaseConfig();
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:set-config", async (_event, { url }) => {
  try {
    configService.setDatabaseUrl(url);
    // Update environment variable
    process.env.DATABASE_URL = url;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:test-connection", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

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

// Cleanup on app quit
app.on("before-quit", async () => {
  await disconnectPrisma();
});
