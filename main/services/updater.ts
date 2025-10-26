import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";
import log from "electron-log";
import fs from "fs";
import path from "path";

interface PublishConfig {
  provider: string;
  owner: string;
  repo: string;
}

export class UpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateDownloaded = false;
  private isInitialized = false;
  private updateInfo: { version: string; releaseDate?: string } | null = null;

  constructor() {
    // Don't initialize in constructor - wait for explicit init() call
  }

  /**
   * Read publish configuration from electron-builder.yml
   */
  private getPublishConfig(): PublishConfig | null {
    try {
      const configPath = path.join(__dirname, "..", "electron-builder.yml");

      // If config doesn't exist in prod, use fallback values
      if (!fs.existsSync(configPath)) {
        console.warn(
          "[Updater] electron-builder.yml not found, using default config"
        );
        return {
          provider: "github",
          owner: "harsh-simform",
          repo: "snapflow-desktop",
        };
      }

      const yaml = fs.readFileSync(configPath, "utf8");

      // Parse YAML manually (simple parser for our use case)
      const ownerMatch = yaml.match(/owner:\s*(.+)/);
      const repoMatch = yaml.match(/repo:\s*(.+)/);

      if (ownerMatch && repoMatch) {
        return {
          provider: "github",
          owner: ownerMatch[1].trim(),
          repo: repoMatch[1].trim(),
        };
      }

      // Fallback to default
      return {
        provider: "github",
        owner: "harsh-simform",
        repo: "snapflow-desktop",
      };
    } catch (error) {
      console.error("[Updater] Failed to read publish config:", error);
      // Return default config
      return {
        provider: "github",
        owner: "harsh-simform",
        repo: "snapflow-desktop",
      };
    }
  }

  init() {
    if (this.isInitialized) return;

    // Configure logging
    autoUpdater.logger = log;
    (autoUpdater.logger as typeof log).transports.file.level = "info";
    log.info("[Updater] Initializing auto-updater service");

    // Get publish config from electron-builder.yml
    const publishConfig = this.getPublishConfig();

    if (publishConfig) {
      log.info(
        `[Updater] Setting feed URL: ${publishConfig.owner}/${publishConfig.repo}`
      );

      // Configure update feed URL for GitHub releases
      autoUpdater.setFeedURL({
        provider: "github" as const,
        owner: publishConfig.owner,
        repo: publishConfig.repo,
        private: false,
      });
    }

    // Don't check for pre-releases unless explicitly enabled
    autoUpdater.allowPrerelease = false;

    // Disable automatic downloading to give user control
    autoUpdater.autoDownload = false;

    this.setupAutoUpdater();
    this.isInitialized = true;

    log.info("[Updater] Auto-updater service initialized successfully");
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupAutoUpdater() {
    // Configure auto-updater
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on startup (only in production)
    autoUpdater.on("checking-for-update", () => {
      log.info("[Updater] Checking for updates...");
      this.sendStatusToWindow("checking-for-update");
    });

    autoUpdater.on("update-available", (info) => {
      log.info("[Updater] Update available:", info);

      // Store update info
      this.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
      };

      this.sendStatusToWindow("update-available", {
        version: info.version,
        releaseDate: info.releaseDate,
        currentVersion: autoUpdater.currentVersion.version,
      });

      // Automatically download the update
      log.info("[Updater] Starting automatic download...");
      autoUpdater.downloadUpdate().catch((error) => {
        log.error("[Updater] Download failed:", error);
        this.sendStatusToWindow("update-error", {
          message: `Download failed: ${error.message}`,
        });
      });
    });

    autoUpdater.on("update-not-available", (info) => {
      log.info("[Updater] Update not available:", info);
      this.sendStatusToWindow("update-not-available", {
        currentVersion: autoUpdater.currentVersion.version,
      });
    });

    autoUpdater.on("error", (err) => {
      log.error("[Updater] Error in auto-updater:", err);

      let errorMessage = err.message;

      // Provide user-friendly error messages
      if (
        err.message.includes("ENOTFOUND") ||
        err.message.includes("ETIMEDOUT")
      ) {
        errorMessage =
          "Cannot connect to update server. Please check your internet connection.";
      } else if (err.message.includes("404")) {
        errorMessage = "No updates found. This may be a development build.";
      } else if (err.message.includes("EACCES")) {
        errorMessage =
          "Permission denied. Please ensure the app has write permissions.";
      }

      this.sendStatusToWindow("update-error", { message: errorMessage });
    });

    autoUpdater.on("download-progress", (progressObj) => {
      const percent = Math.round(progressObj.percent);
      const speed = this.formatBytes(progressObj.bytesPerSecond);
      const downloaded = this.formatBytes(progressObj.transferred);
      const total = this.formatBytes(progressObj.total);

      log.info(
        `[Updater] Download progress: ${percent}% (${downloaded}/${total}) @ ${speed}/s`
      );

      this.sendStatusToWindow("download-progress", {
        percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
        speed,
        downloaded,
        totalSize: total,
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      log.info("[Updater] Update downloaded successfully:", info);
      this.updateDownloaded = true;

      this.sendStatusToWindow("update-downloaded", {
        version: info.version,
        releaseDate: info.releaseDate,
      });

      // Show dialog to user
      this.promptUserToUpdate(info);
    });
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }

  private sendStatusToWindow(event: string, data?: unknown) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send("update-status", { event, data });
    }
  }

  private async promptUserToUpdate(info: {
    version: string;
    releaseDate?: string;
  }) {
    if (!this.mainWindow) return;

    const currentVersion = autoUpdater.currentVersion.version;
    const releaseInfo = info.releaseDate
      ? `\n\nRelease Date: ${new Date(info.releaseDate).toLocaleDateString()}`
      : "";

    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Downloaded",
      message: `SnapFlow ${info.version} is ready to install`,
      detail: `Current version: ${currentVersion}\nNew version: ${info.version}${releaseInfo}\n\nThe application will restart to complete the installation. Your data will be preserved.`,
      buttons: ["Install and Restart", "Install Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response === 0) {
      // User chose to install now
      log.info("[Updater] User chose to install update now");
      // setImmediate ensures all windows are closed before restart
      autoUpdater.quitAndInstall(false, true);
    } else {
      log.info(
        "[Updater] User chose to install later - will install on next quit"
      );
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
      currentVersion: autoUpdater.currentVersion.version,
      updateDownloaded: this.updateDownloaded,
      updateInfo: this.updateInfo,
    };
  }
}

export const updaterService = new UpdaterService();
