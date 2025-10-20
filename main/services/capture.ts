import {
  screen,
  desktopCapturer,
  BrowserWindow,
  clipboard,
  DesktopCapturerSource,
  nativeImage,
} from "electron";
import { storageManager } from "../utils/storage";

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
  // Cache permission status for the app session to avoid repeated permission dialogs
  // Note: macOS requires app restart after granting screen recording permission
  private permissionCache: {
    hasPermission: boolean;
    timestamp: number;
  } | null = null;
  private readonly PERMISSION_CACHE_DURATION = 60000; // 60 seconds (1 minute)

  /**
   * Clear the permission cache to force a fresh check
   * Useful when user grants permission and we want to detect it immediately
   */
  clearPermissionCache(): void {
    this.permissionCache = null;
  }

  /**
   * Check if the app has screen recording permission (macOS)
   * Uses a cache to avoid triggering permission dialog repeatedly
   *
   * IMPORTANT: On macOS, after granting screen recording permission in System Settings,
   * the app MUST be completely quit and restarted for the permission to take effect.
   * Simply hiding and showing the window will not work.
   */
  async checkScreenRecordingPermission(): Promise<boolean> {
    if (process.platform !== "darwin") {
      return true;
    }

    // Check cache first
    const now = Date.now();
    if (
      this.permissionCache &&
      now - this.permissionCache.timestamp < this.PERMISSION_CACHE_DURATION
    ) {
      console.log(
        "[Capture] Using cached permission status:",
        this.permissionCache.hasPermission
      );
      return this.permissionCache.hasPermission;
    }

    try {
      // Try to get screen sources with a minimal thumbnail size
      // If permission is not granted, this will return empty array on macOS
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 },
      });

      // Check if we got any screen sources
      const hasPermission = sources.length > 0;
      console.log(
        "[Capture] Screen recording permission check:",
        hasPermission,
        "sources:",
        sources.length
      );

      // Cache the result immediately to prevent repeated checks
      this.permissionCache = { hasPermission, timestamp: now };

      return hasPermission;
    } catch (error) {
      console.error(
        "[Capture] Screen recording permission check failed:",
        error
      );
      // Cache the failure result as well
      this.permissionCache = { hasPermission: false, timestamp: now };
      return false;
    }
  }

  /**
   * Main capture method - handles fullscreen, window, and region captures
   */
  async captureScreenshot(
    options: CaptureOptions
  ): Promise<{ dataUrl: string; buffer: Buffer }> {
    try {
      console.log(
        "[Capture] Starting screenshot capture with options:",
        JSON.stringify(options)
      );

      const primaryDisplay = screen.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor || 1;
      const { width, height } = primaryDisplay.size;

      console.log(
        "[Capture] Display info - width:",
        width,
        "height:",
        height,
        "scaleFactor:",
        scaleFactor
      );

      // Get desktop sources - this will trigger permission prompt if not granted
      console.log("[Capture] Requesting desktop sources...");
      const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: {
          width: Math.floor(width * scaleFactor),
          height: Math.floor(height * scaleFactor),
        },
        fetchWindowIcons: false,
      });

      console.log("[Capture] Retrieved", sources.length, "sources");
      if (sources.length > 0) {
        console.log(
          "[Capture] Available sources:",
          sources.map((s) => ({ id: s.id, name: s.name }))
        );
      }

      if (sources.length === 0) {
        console.error(
          "[Capture] No sources available - permission likely not granted"
        );
        throw new Error(
          "Screen Recording permission denied. Please grant permission in System Preferences > Security & Privacy > Privacy > Screen Recording, then completely quit and restart SnapFlow."
        );
      }

      // Select the appropriate source
      let source: DesktopCapturerSource | undefined;
      if (options.mode === "window" && options.windowId) {
        console.log("[Capture] Looking for window with ID:", options.windowId);
        source = sources.find((s) => s.id === options.windowId);
        console.log("[Capture] Window source found:", !!source);
      } else {
        // For fullscreen or region, get the primary screen
        console.log("[Capture] Looking for screen source...");
        source = sources.find((s) => s.id.startsWith("screen"));
        console.log("[Capture] Screen source found:", source?.id);
      }

      if (!source) {
        console.error(
          "[Capture] No matching source found for mode:",
          options.mode
        );
        throw new Error("No capture source found");
      }

      // Handle region capture
      if (options.mode === "region" && options.bounds) {
        console.log(
          "[Capture] Region mode - cropping to bounds:",
          options.bounds
        );
        const cropRect = {
          x: Math.max(0, Math.floor(options.bounds.x)),
          y: Math.max(0, Math.floor(options.bounds.y)),
          width: Math.floor(options.bounds.width),
          height: Math.floor(options.bounds.height),
        };

        const croppedImage = source.thumbnail.crop(cropRect);
        const buffer = croppedImage.toPNG();
        console.log(
          "[Capture] Region screenshot captured, buffer size:",
          buffer.length,
          "bytes"
        );

        // Copy to clipboard
        clipboard.writeImage(croppedImage);

        const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
        console.log("[Capture] Region dataUrl length:", dataUrl.length);
        return { dataUrl, buffer };
      }

      // Fullscreen or window capture
      console.log("[Capture] Processing", options.mode, "capture...");
      const thumbnailSize = source.thumbnail.getSize();
      console.log("[Capture] Thumbnail size:", thumbnailSize);

      const buffer = source.thumbnail.toPNG();
      console.log("[Capture] Screenshot buffer size:", buffer.length, "bytes");

      // Copy to clipboard
      clipboard.writeImage(source.thumbnail);
      console.log("[Capture] Image copied to clipboard");

      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log("[Capture] DataUrl length:", dataUrl.length);
      console.log("[Capture] Screenshot capture completed successfully");

      return { dataUrl, buffer };
    } catch (error) {
      console.error("[Capture] Screenshot capture error:", error);
      console.error("[Capture] Error stack:", (error as Error).stack);
      throw error;
    }
  }

  /**
   * Save screenshot to storage
   */
  async saveScreenshot(issueId: string, buffer: Buffer): Promise<string> {
    const filePath = await storageManager.saveCapture(
      issueId,
      "capture.png",
      buffer
    );
    return filePath;
  }

  /**
   * Create thumbnail from screenshot
   */
  async createThumbnail(buffer: Buffer, issueId: string): Promise<string> {
    // Create a NativeImage from the buffer
    const image = nativeImage.createFromBuffer(buffer);
    const size = image.getSize();

    // Calculate new dimensions maintaining aspect ratio (max 800x600)
    let newWidth = size.width;
    let newHeight = size.height;

    const maxWidth = 800;
    const maxHeight = 600;

    if (newWidth > maxWidth || newHeight > maxHeight) {
      const widthRatio = maxWidth / newWidth;
      const heightRatio = maxHeight / newHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.floor(newWidth * ratio);
      newHeight = Math.floor(newHeight * ratio);
    }

    // Resize the image
    const resizedImage = image.resize({ width: newWidth, height: newHeight });

    // Convert to PNG buffer
    const thumbnailBuffer = resizedImage.toPNG();

    const thumbnailPath = await storageManager.saveCapture(
      issueId,
      "thumbnail.png",
      thumbnailBuffer
    );
    return thumbnailPath;
  }

  /**
   * Get available windows for window capture
   * Returns empty array if screen recording permission is not granted
   */
  async getAvailableWindows(): Promise<
    { id: string; name: string; thumbnail: string }[]
  > {
    // Check permission first to avoid triggering permission dialog in a loop
    const hasPermission = await this.checkScreenRecordingPermission();
    if (!hasPermission) {
      console.log(
        "[Capture] No screen recording permission, returning empty windows list"
      );
      return [];
    }

    const allWindows = BrowserWindow.getAllWindows();
    const snapflowWindowIds = allWindows.map((win) => `window:${win.id}:0`);

    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 150, height: 150 },
    });

    return sources
      .filter((source) => {
        if (source.name === "") return false;
        if (snapflowWindowIds.includes(source.id)) return false;
        if (source.name.toLowerCase().includes("snapflow")) return false;
        return true;
      })
      .map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      }));
  }
}

export const captureService = new CaptureService();
