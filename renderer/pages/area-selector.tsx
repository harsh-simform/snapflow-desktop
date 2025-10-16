import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function AreaSelector() {
  const router = useRouter();
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Listen for the background screenshot from main process
    const cleanup = window.api.onBackgroundScreenshot?.((data: any) => {
      if (data && data.dataUrl) {
        setScreenshot(data.dataUrl);
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPoint({ x, y });
    setEndPoint({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEndPoint({ x, y });
  };

  const handleMouseUp = async () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    // Calculate bounds
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    // Minimum size check
    if (width < 10 || height < 10) {
      setStartPoint({ x: 0, y: 0 });
      setEndPoint({ x: 0, y: 0 });
      return;
    }

    // Capture the selected region
    try {
      await window.api.captureScreenshot({
        mode: "region",
        bounds: { x, y, width, height },
      });
      // The screenshot handler in background.ts will navigate to annotate page
    } catch (error) {
      console.error("Failed to capture region:", error);
    }
  };

  const handleCancel = () => {
    router.push("/home");
  };

  // Calculate selection rectangle
  const selectionBounds = {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  };

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-gray-900/95 border border-gray-800 rounded-lg px-4 py-2 shadow-lg">
        <p className="text-sm text-gray-300">
          Click and drag to select an area. Press{" "}
          <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">
            ESC
          </kbd>{" "}
          to cancel
        </p>
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="absolute top-4 right-4 z-20 px-4 py-2 bg-gray-900/95 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg transition-colors"
      >
        Cancel
      </button>

      {/* Selection Area */}
      <div
        className="relative flex-1 cursor-crosshair overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            handleCancel();
          }
        }}
        tabIndex={0}
      >
        {/* Background Screenshot */}
        {screenshot && (
          <img
            src={screenshot}
            alt="Screenshot"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Selection Rectangle */}
        {(isSelecting || selectionBounds.width > 0) && (
          <>
            {/* Clear area (no dark overlay) */}
            <div
              className="absolute border-2 border-blue-500 bg-transparent"
              style={{
                left: `${selectionBounds.x}px`,
                top: `${selectionBounds.y}px`,
                width: `${selectionBounds.width}px`,
                height: `${selectionBounds.height}px`,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Dimensions Label */}
              {selectionBounds.width > 0 && selectionBounds.height > 0 && (
                <div className="absolute -top-8 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  {Math.round(selectionBounds.width)} x{" "}
                  {Math.round(selectionBounds.height)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
