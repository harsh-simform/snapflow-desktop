import React, { useState, useEffect } from "react";

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className = "" }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);

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

  return (
    <div className={`flex items-center ${className}`}>
      {/* Minimize Button */}
      <button
        onClick={handleMinimize}
        className="w-12 h-8 flex items-center justify-center hover:bg-gray-700/50 transition-colors duration-200 group"
        title="Minimize"
      >
        <svg
          className="w-4 h-4 text-gray-400 group-hover:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>

      {/* Maximize/Restore Button */}
      <button
        onClick={handleMaximize}
        className="w-12 h-8 flex items-center justify-center hover:bg-gray-700/50 transition-colors duration-200 group"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          // Restore icon (two overlapping squares)
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        ) : (
          // Maximize icon (single square)
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        )}
      </button>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="w-12 h-8 flex items-center justify-center hover:bg-red-600/20 transition-colors duration-200 group"
        title="Close"
      >
        <svg
          className="w-4 h-4 text-gray-400 group-hover:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
