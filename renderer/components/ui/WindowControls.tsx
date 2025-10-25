import React, { useState, useEffect } from "react";

interface WindowControlsProps {
  className?: string;
  variant?: "default" | "macos";
  showLabels?: boolean;
}

export function WindowControls({
  className = "",
  variant = "default",
  showLabels = false,
}: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  useEffect(() => {
    // Check initial maximized state
    const checkMaximized = async () => {
      try {
        const maximized = await window.api.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Failed to check window state:", error);
      }
    };

    checkMaximized();

    // Listen for window state changes
    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = async () => {
    try {
      await window.api.minimizeWindow();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      await window.api.maximizeWindow();
      // Update state after a short delay to allow the window to update
      setTimeout(async () => {
        const maximized = await window.api.isMaximized();
        setIsMaximized(maximized);
      }, 100);
    } catch (error) {
      console.error("Failed to maximize window:", error);
    }
  };

  const handleClose = async () => {
    try {
      await window.api.closeWindow();
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  };

  if (variant === "macos") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* macOS-style traffic lights */}
        <button
          onClick={handleClose}
          onMouseEnter={() => setIsHovered("close")}
          onMouseLeave={() => setIsHovered(null)}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-200 group"
          title="Close"
          aria-label="Close window"
        >
          {isHovered === "close" && (
            <svg
              className="w-2 h-2 text-red-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>
        <button
          onClick={handleMinimize}
          onMouseEnter={() => setIsHovered("minimize")}
          onMouseLeave={() => setIsHovered(null)}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center transition-all duration-200 group"
          title="Minimize"
          aria-label="Minimize window"
        >
          {isHovered === "minimize" && (
            <svg
              className="w-2 h-2 text-yellow-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M20 12H4"
              />
            </svg>
          )}
        </button>
        <button
          onClick={handleMaximize}
          onMouseEnter={() => setIsHovered("maximize")}
          onMouseLeave={() => setIsHovered(null)}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all duration-200 group"
          title={isMaximized ? "Restore" : "Maximize"}
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
        >
          {isHovered === "maximize" && (
            <svg
              className="w-2 h-2 text-green-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          )}
        </button>
      </div>
    );
  }

  // Default Windows/Linux style
  return (
    <div className={`flex items-center ${className}`}>
      {/* Minimize Button */}
      <button
        onClick={handleMinimize}
        className="group relative h-8 px-4 flex items-center justify-center hover:bg-white/10 active:bg-white/5 transition-all duration-150"
        title="Minimize"
        aria-label="Minimize window"
      >
        <svg
          className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M20 12H4"
          />
        </svg>
        {showLabels && (
          <span className="ml-2 text-xs text-gray-400 group-hover:text-white">
            Minimize
          </span>
        )}
      </button>

      {/* Maximize/Restore Button */}
      <button
        onClick={handleMaximize}
        className="group relative h-8 px-4 flex items-center justify-center hover:bg-white/10 active:bg-white/5 transition-all duration-150"
        title={isMaximized ? "Restore Down" : "Maximize"}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
      >
        {isMaximized ? (
          // Restore icon (two overlapping squares - clearer design)
          <svg
            className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            {/* Back square */}
            <rect
              x="8"
              y="4"
              width="12"
              height="12"
              rx="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Front square */}
            <rect
              x="4"
              y="8"
              width="12"
              height="12"
              rx="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </svg>
        ) : (
          // Maximize icon (single square)
          <svg
            className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="5"
              y="5"
              width="14"
              height="14"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {showLabels && (
          <span className="ml-2 text-xs text-gray-400 group-hover:text-white">
            {isMaximized ? "Restore" : "Maximize"}
          </span>
        )}
      </button>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="group relative h-8 px-4 flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition-all duration-150"
        title="Close"
        aria-label="Close window"
      >
        <svg
          className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        {showLabels && (
          <span className="ml-2 text-xs text-gray-400 group-hover:text-white">
            Close
          </span>
        )}
      </button>
    </div>
  );
}
