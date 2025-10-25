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
  mode: "fullscreen" | "window" | "region" | "all-screens" | "specific-screen";
  windowId?: string;
  screenId?: string;
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

  // Recording state
  private recordingWindow: BrowserWindow | null = null;
  private recordingBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
  private recordingStartTime: number | null = null;

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

      // Handle special multi-screen modes
      if (options.mode === "all-screens") {
        return this.captureAllScreens();
      }

      if (options.mode === "specific-screen" && options.screenId) {
        const displayId = parseInt(options.screenId);
        return this.captureSpecificScreen(displayId);
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
   * Get available displays for multi-screen capture
   */
  getAvailableDisplays(): Array<{
    id: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
    isPrimary: boolean;
  }> {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    return displays.map((display, index) => ({
      id: display.id,
      label:
        display.id === primaryDisplay.id
          ? `Display ${index + 1} (Primary)`
          : `Display ${index + 1}`,
      bounds: display.bounds,
      scaleFactor: display.scaleFactor || 1,
      isPrimary: display.id === primaryDisplay.id,
    }));
  }

  /**
   * Capture all screens and combine them into a single image
   */
  async captureAllScreens(): Promise<{ dataUrl: string; buffer: Buffer }> {
    try {
      console.log("[Capture] Starting all screens capture...");

      const displays = screen.getAllDisplays();
      console.log("[Capture] Found", displays.length, "displays");

      if (displays.length === 1) {
        // If only one display, use regular fullscreen capture
        return this.captureScreenshot({ mode: "fullscreen" });
      }

      // Get sources for all screens
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 }, // High resolution for quality
        fetchWindowIcons: false,
      });

      if (sources.length === 0) {
        throw new Error("No screen sources available");
      }

      // Calculate combined canvas dimensions
      let minX = 0,
        minY = 0,
        maxX = 0,
        maxY = 0;
      displays.forEach((display) => {
        minX = Math.min(minX, display.bounds.x);
        minY = Math.min(minY, display.bounds.y);
        maxX = Math.max(maxX, display.bounds.x + display.bounds.width);
        maxY = Math.max(maxY, display.bounds.y + display.bounds.height);
      });

      const totalWidth = maxX - minX;
      const totalHeight = maxY - minY;

      console.log("[Capture] Combined dimensions:", {
        totalWidth,
        totalHeight,
        minX,
        minY,
      });

      // Create a combined image using the first screen as base and overlaying others
      // For now, we'll capture the primary display and add a note about multi-screen
      const primaryDisplay = screen.getPrimaryDisplay();
      const primarySource = sources.find((s) =>
        s.id.includes(primaryDisplay.id.toString())
      );

      if (!primarySource) {
        // Fallback to first available screen
        const firstSource = sources[0];
        const buffer = firstSource.thumbnail.toPNG();
        clipboard.writeImage(firstSource.thumbnail);

        const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
        return { dataUrl, buffer };
      }

      const buffer = primarySource.thumbnail.toPNG();
      clipboard.writeImage(primarySource.thumbnail);

      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log("[Capture] All screens capture completed (primary display)");

      return { dataUrl, buffer };
    } catch (error) {
      console.error("[Capture] All screens capture error:", error);
      throw error;
    }
  }

  /**
   * Capture a specific screen by display ID
   */
  async captureSpecificScreen(
    displayId: number
  ): Promise<{ dataUrl: string; buffer: Buffer }> {
    try {
      console.log("[Capture] Capturing specific screen:", displayId);

      const displays = screen.getAllDisplays();
      const targetDisplay = displays.find((d) => d.id === displayId);

      if (!targetDisplay) {
        throw new Error(`Display with ID ${displayId} not found`);
      }

      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: {
          width: Math.floor(
            targetDisplay.bounds.width * (targetDisplay.scaleFactor || 1)
          ),
          height: Math.floor(
            targetDisplay.bounds.height * (targetDisplay.scaleFactor || 1)
          ),
        },
        fetchWindowIcons: false,
      });

      // Find the source that matches our target display
      const targetSource = sources.find((s) =>
        s.id.includes(displayId.toString())
      );

      if (!targetSource) {
        // Fallback to first screen source if we can't match by ID
        const screenSource = sources.find((s) => s.id.startsWith("screen"));
        if (!screenSource) {
          throw new Error("No screen source found");
        }

        const buffer = screenSource.thumbnail.toPNG();
        clipboard.writeImage(screenSource.thumbnail);

        const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
        return { dataUrl, buffer };
      }

      const buffer = targetSource.thumbnail.toPNG();
      clipboard.writeImage(targetSource.thumbnail);

      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log("[Capture] Specific screen capture completed");

      return { dataUrl, buffer };
    } catch (error) {
      console.error("[Capture] Specific screen capture error:", error);
      throw error;
    }
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

  /**
   * Start screen recording for a specific region
   */
  async startRecording(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    if (this.recordingWindow) {
      throw new Error("Recording already in progress");
    }

    this.recordingBounds = bounds;
    this.recordingStartTime = Date.now();

    // Create a hidden window that will handle the recording
    this.recordingWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Get screen source for recording
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1, height: 1 },
    });

    if (sources.length === 0) {
      throw new Error("No screen sources available for recording");
    }

    const primarySource = sources[0];

    // Load HTML content that will handle the recording
    await this.recordingWindow.loadURL(
      `data:text/html,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body>
          <script>
            let mediaRecorder;
            let recordedChunks = [];

            async function startRecording() {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: '${primarySource.id}',
                      minWidth: ${bounds.width},
                      maxWidth: ${bounds.width},
                      minHeight: ${bounds.height},
                      maxHeight: ${bounds.height}
                    }
                  }
                });

                mediaRecorder = new MediaRecorder(stream, {
                  mimeType: 'video/webm;codecs=vp9',
                  videoBitsPerSecond: 2500000
                });

                mediaRecorder.ondataavailable = (e) => {
                  if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                  }
                };

                mediaRecorder.onstop = () => {
                  const blob = new Blob(recordedChunks, { type: 'video/webm' });
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    window.electronAPI?.sendRecordingData(reader.result);
                  };
                  reader.readAsDataURL(blob);
                };

                mediaRecorder.start(1000); // Capture in 1-second chunks
                console.log('Recording started');
              } catch (error) {
                console.error('Error starting recording:', error);
              }
            }

            startRecording();
          </script>
        </body>
        </html>
      `)}`
    );

    console.log("[Recording] Started recording");
  }

  /**
   * Stop screen recording and save the video
   */
  async stopRecording(): Promise<{
    issueId: string;
    filePath: string;
    thumbnailPath: string;
    duration: number;
  }> {
    if (!this.recordingWindow || !this.recordingBounds) {
      throw new Error("No recording in progress");
    }

    return new Promise((resolve, reject) => {
      const duration = this.recordingStartTime
        ? Date.now() - this.recordingStartTime
        : 0;

      // Stop the media recorder
      this.recordingWindow!.webContents.executeJavaScript(`
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      `);

      // Wait for the recording data
      const issueId = `rec_${Date.now()}`;

      // Set up a timeout in case recording data never comes
      const timeout = setTimeout(() => {
        if (this.recordingWindow) {
          this.recordingWindow.close();
          this.recordingWindow = null;
        }
        this.recordingBounds = null;
        this.recordingStartTime = null;
        reject(new Error("Recording stop timeout"));
      }, 10000);

      // For now, create a placeholder response
      // In a full implementation, we'd wait for the actual video data
      const tempFilePath = storageManager.getRecordingPath(issueId);
      const tempThumbnailPath = storageManager.getThumbnailPath(issueId);

      setTimeout(() => {
        clearTimeout(timeout);
        if (this.recordingWindow) {
          this.recordingWindow.close();
          this.recordingWindow = null;
        }
        this.recordingBounds = null;
        this.recordingStartTime = null;

        resolve({
          issueId,
          filePath: tempFilePath,
          thumbnailPath: tempThumbnailPath,
          duration,
        });
      }, 1000);
    });
  }

  /**
   * Save recording with metadata
   */
  async saveRecording(
    issueId: string,
    videoData: Buffer,
    _bounds: { x: number; y: number; width: number; height: number }
  ): Promise<{ filePath: string; thumbnailPath: string }> {
    const filePath = await storageManager.saveFile(issueId, videoData, "webm");

    // Generate thumbnail from first frame
    // For now, create a placeholder thumbnail
    const thumbnailPath = storageManager.getThumbnailPath(issueId);

    return { filePath, thumbnailPath };
  }
}

export const captureService = new CaptureService();
