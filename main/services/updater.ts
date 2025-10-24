import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";
import log from "electron-log";

export class UpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateDownloaded = false;
  private isInitialized = false;

  constructor() {
    // Don't initialize in constructor - wait for explicit init() call
  }

  init() {
    if (this.isInitialized) return;

    // Configure logging
    autoUpdater.logger = log;
    (autoUpdater.logger as typeof log).transports.file.level = "info";

    this.setupAutoUpdater();
    this.isInitialized = true;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupAutoUpdater() {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup (only in production)
    autoUpdater.on("checking-for-update", () => {
      log.info("Checking for updates...");
      this.sendStatusToWindow("checking-for-update");
    });

    autoUpdater.on("update-available", (info) => {
      log.info("Update available:", info);
      this.sendStatusToWindow("update-available", info);

      // Automatically download the update
      autoUpdater.downloadUpdate();
    });

    autoUpdater.on("update-not-available", (info) => {
      log.info("Update not available:", info);
      this.sendStatusToWindow("update-not-available", info);
    });

    autoUpdater.on("error", (err) => {
      log.error("Error in auto-updater:", err);
      this.sendStatusToWindow("update-error", { message: err.message });
    });

    autoUpdater.on("download-progress", (progressObj) => {
      log.info("Download progress:", progressObj);
      this.sendStatusToWindow("download-progress", {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      log.info("Update downloaded:", info);
      this.updateDownloaded = true;
      this.sendStatusToWindow("update-downloaded", info);

      // Show dialog to user
      this.promptUserToUpdate(info);
    });
  }

  private sendStatusToWindow(event: string, data?: unknown) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send("update-status", { event, data });
    }
  }

  private async promptUserToUpdate(info: { version: string }) {
    if (!this.mainWindow) return;

    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Available",
      message: `A new version (${info.version}) is available. Would you like to install it now?`,
      detail: "The application will restart to apply the update.",
      buttons: ["Install Now", "Install Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      // User chose to install now
      autoUpdater.quitAndInstall(false, true);
    }
  }

  async checkForUpdates() {
    if (process.env.NODE_ENV === "development") {
      log.info("Skipping update check in development mode");
      return null;
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      log.error("Failed to check for updates:", error);
      return null;
    }
  }

  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error("Failed to download update:", error);
      throw error;
    }
  }

  quitAndInstall() {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
    } else {
      throw new Error("No update has been downloaded yet");
    }
  }

  getUpdateInfo() {
    return {
      currentVersion: autoUpdater.currentVersion,
      updateDownloaded: this.updateDownloaded,
    };
  }
}

export const updaterService = new UpdaterService();
