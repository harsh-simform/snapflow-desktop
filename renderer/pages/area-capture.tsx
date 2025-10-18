import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AreaCapture() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<SelectionBounds | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [displayBounds, setDisplayBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [overlayBounds, setOverlayBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    // Listen for area capture ready event
    const unsubscribe = window.ipc.on("area-capture-ready", (data: any) => {
      console.log("=== Area Capture Ready ===");
      console.log("Scale factor:", data.scaleFactor);
      console.log("Display bounds:", data.displayBounds);
      console.log("Overlay bounds:", data.overlayBounds);
      console.log("Viewport size:", { width: window.innerWidth, height: window.innerHeight });

      setScaleFactor(data.scaleFactor || 1);
      setDisplayBounds(data.displayBounds || null);
      setOverlayBounds(data.overlayBounds || null);
    });

    // Handle escape key to cancel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.api.cancelWindowSelect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getMousePosition = (e: React.MouseEvent): { x: number; y: number } => {
    // Use clientX/clientY which are relative to the viewport
    // The overlay window is sized to match the screen in CSS pixels
    // Background image is scaled to fit via background-size: 100% 100%
    // So coordinates in CSS pixels should map 1:1 to the visual representation

    const x = e.clientX;
    const y = e.clientY;

    // Also log screenX/Y for comparison
    console.log("Mouse event:", {
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      pageX: e.pageX,
      pageY: e.pageY,
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY,
    });

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getMousePosition(e);
    setIsSelecting(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting && startPos) {
      e.preventDefault();
      const pos = getMousePosition(e);
      setCurrentPos(pos);
    }
  };

  const handleMouseUp = async () => {
    if (isSelecting && startPos && currentPos) {
      // Calculate selection bounds in CSS pixels (relative to overlay window)
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      // Only capture if there's a meaningful selection (at least 10x10 pixels)
      if (width >= 10 && height >= 10) {
        const bounds = { x, y, width, height };
        setSelection(bounds);

        try {
          // The selection is in CSS pixels relative to the overlay window
          // The screenshot will be captured at full native resolution
          // So we need to apply the scale factor to convert CSS pixels to device pixels

          // Note: overlayBounds are already in screen coordinates (CSS pixels)
          // We don't need to add overlay position because the overlay is positioned at (0,0)
          // relative to the screen origin

          const captureParams = {
            x: Math.round(x * scaleFactor),
            y: Math.round(y * scaleFactor),
            width: Math.round(width * scaleFactor),
            height: Math.round(height * scaleFactor),
          };

          console.log("=== Area Capture Debug ===");
          console.log("Selection in overlay (CSS pixels):", bounds);
          console.log("Overlay position:", overlayBounds);
          console.log("Display bounds:", displayBounds);
          console.log("Scale factor:", scaleFactor);
          console.log("Capture params (device pixels):", captureParams);
          console.log("Expected cropped size:", {
            width: Math.round(width * scaleFactor),
            height: Math.round(height * scaleFactor)
          });
          console.log("==========================");

          // Now capture screenshot with these exact coordinates
          await window.api.captureScreenshot({
            mode: "region",
            bounds: captureParams,
          });
        } catch (error) {
          console.error("Failed to capture area:", error);
        }
      }
    }

    setIsSelecting(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  // Calculate selection rectangle
  const getSelectionStyle = () => {
    if (!startPos || !currentPos) return {};

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    return {
      left: x,
      top: y,
      width,
      height,
    };
  };

  const selectionStyle = getSelectionStyle();

  return (
    <>
      <Head>
        <title>Select Area - SnapFlow</title>
      </Head>
      <style jsx global>{`
        html, body {
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div
        ref={containerRef}
        className="fixed inset-0 cursor-crosshair overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent dark overlay
        }}
      >
        {/* Instructions */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-lg px-5 py-2.5 shadow-2xl">
            <p className="text-white text-sm font-medium text-center">
              Click and drag to select an area
            </p>
            <p className="text-gray-400 text-xs mt-0.5 text-center">
              Press ESC to cancel
            </p>
          </div>
        </div>

        {/* Selection rectangle */}
        {(isSelecting || selection) && startPos && currentPos && (
          <>
            {/* Selection border - using box-shadow to avoid affecting bounds */}
            <div
              className="absolute bg-transparent pointer-events-none"
              style={{
                ...selectionStyle,
                boxShadow: '0 0 0 2px #3b82f6 inset',
              }}
            />

            {/* Darken everything except selection */}
            <div className="absolute inset-0 pointer-events-none">
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <mask id="selection-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x={selectionStyle.left}
                      y={selectionStyle.top}
                      width={selectionStyle.width}
                      height={selectionStyle.height}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.5)"
                  mask="url(#selection-mask)"
                />
              </svg>
            </div>

            {/* Selection info */}
            {selectionStyle.width && selectionStyle.height && (
              <div
                className="absolute pointer-events-none bg-gray-900/95 backdrop-blur-md border border-blue-500/50 rounded px-3 py-2 text-xs text-white font-mono shadow-lg space-y-1"
                style={{
                  left: (selectionStyle.left || 0) + (selectionStyle.width || 0) + 8,
                  top: (selectionStyle.top || 0) + (selectionStyle.height || 0) + 8,
                }}
              >
                <div className="text-blue-400 font-bold">Selection (CSS pixels):</div>
                <div>Position: {Math.round(selectionStyle.left || 0)}, {Math.round(selectionStyle.top || 0)}</div>
                <div>Size: {Math.round(selectionStyle.width)} × {Math.round(selectionStyle.height)}</div>
                <div className="text-yellow-400 font-bold mt-2">Device pixels (×{scaleFactor}):</div>
                <div>Position: {Math.round((selectionStyle.left || 0) * scaleFactor)}, {Math.round((selectionStyle.top || 0) * scaleFactor)}</div>
                <div>Size: {Math.round(selectionStyle.width * scaleFactor)} × {Math.round(selectionStyle.height * scaleFactor)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
