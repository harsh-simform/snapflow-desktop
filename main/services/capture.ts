import {
  screen,
  desktopCapturer,
  BrowserWindow,
  systemPreferences,
} from "electron";
import { storageManager } from "../utils/storage";
import sharp from "sharp";

interface CaptureOptions {
  mode: "fullscreen" | "window" | "region";
  windowId?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class CaptureService {
  /**
   * Check if the app has screen recording permission (macOS)
   */
  async checkScreenRecordingPermission(): Promise<boolean> {
    if (process.platform !== "darwin") {
      return true; // Not needed on other platforms
    }

    try {
      // On macOS, attempt to get sources - if it fails, permission is denied
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 },
      });
      return sources.length > 0;
    } catch (error) {
      console.error("Screen recording permission check failed:", error);
      return false;
    }
  }

  async captureScreenshot(
    options: CaptureOptions
  ): Promise<{ dataUrl: string; buffer: Buffer }> {
    try {
      // Check permission first
      const hasPermission = await this.checkScreenRecordingPermission();
      if (!hasPermission) {
        throw new Error(
          "Screen Recording permission denied. Please grant permission in System Preferences > Security & Privacy > Privacy > Screen Recording"
        );
      }

      // Get all SnapFlow windows to filter them out
      const allWindows = BrowserWindow.getAllWindows();
      const snapflowWindowIds = allWindows.map((win) => `window:${win.id}:0`);

      const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      if (sources.length === 0) {
        throw new Error(
          "No screen sources available. Please check Screen Recording permissions."
        );
      }

      let source;
      if (options.mode === "fullscreen") {
        // Get all displays to determine which screen to capture
        const displays = screen.getAllDisplays();
        const primaryDisplay = screen.getPrimaryDisplay();

        // Find which display has the SnapFlow window
        let snapflowDisplayId = primaryDisplay.id;
        for (const win of allWindows) {
          if (win && !win.isDestroyed()) {
            const winBounds = win.getBounds();
            const winCenter = {
              x: winBounds.x + winBounds.width / 2,
              y: winBounds.y + winBounds.height / 2
            };

            // Check which display contains the window center
            for (const display of displays) {
              const bounds = display.bounds;
              if (
                winCenter.x >= bounds.x &&
                winCenter.x < bounds.x + bounds.width &&
                winCenter.y >= bounds.y &&
                winCenter.y < bounds.y + bounds.height
              ) {
                snapflowDisplayId = display.id;
                break;
              }
            }
          }
        }

        // If there are multiple displays, prefer one without SnapFlow
        if (displays.length > 1) {
          const alternativeDisplay = displays.find(d => d.id !== snapflowDisplayId);
          if (alternativeDisplay) {
            // Find the screen source for the alternative display
            source = sources.find((s) =>
              s.id.startsWith("screen") &&
              s.display_id === alternativeDisplay.id.toString()
            );
          }
        }

        // Fallback to any screen if no alternative found
        if (!source) {
          source = sources.find((s) => s.id.startsWith("screen"));
        }
      } else if (options.mode === "window" && options.windowId) {
        source = sources.find((s) => s.id === options.windowId);
      } else {
        source = sources.find((s) => s.id.startsWith("screen"));
      }

      if (!source) {
        throw new Error("No capture source found");
      }

      let buffer = source.thumbnail.toPNG();

      // If region capture, crop the image
      if (options.mode === "region" && options.bounds) {
        buffer = await sharp(buffer)
          .extract({
            left: Math.round(options.bounds.x),
            top: Math.round(options.bounds.y),
            width: Math.round(options.bounds.width),
            height: Math.round(options.bounds.height),
          })
          .png()
          .toBuffer();
      }

      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

      return { dataUrl, buffer };
    } catch (error) {
      console.error("Screenshot capture error:", error);
      throw error;
    }
  }

  async saveScreenshot(issueId: string, buffer: Buffer): Promise<string> {
    const filePath = await storageManager.saveCapture(
      issueId,
      "capture.png",
      buffer
    );
    return filePath;
  }

  async createThumbnail(buffer: Buffer, issueId: string): Promise<string> {
    const thumbnailBuffer = await sharp(buffer)
      .resize(800, 600, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 95, compressionLevel: 6 })
      .toBuffer();

    const thumbnailPath = await storageManager.saveCapture(
      issueId,
      "thumbnail.png",
      thumbnailBuffer
    );
    return thumbnailPath;
  }

  async getAvailableWindows(): Promise<
    { id: string; name: string; thumbnail: string }[]
  > {
    // Get all SnapFlow windows to filter them out
    const allWindows = BrowserWindow.getAllWindows();
    const snapflowWindowIds = allWindows.map((win) => `window:${win.id}:0`);

    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 150, height: 150 },
    });

    return sources
      .filter((source) => {
        // Filter out unnamed windows
        if (source.name === "") return false;

        // Filter out SnapFlow windows by ID
        if (snapflowWindowIds.includes(source.id)) return false;

        // Filter out SnapFlow windows by name
        if (source.name.toLowerCase().includes("snapflow")) return false;

        return true;
      })
      .map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      }));
  }

  async getScreens(): Promise<{ id: number; bounds: any }[]> {
    const displays = screen.getAllDisplays();
    return displays.map((display) => ({
      id: display.id,
      bounds: display.bounds,
    }));
  }
}

export const captureService = new CaptureService();
