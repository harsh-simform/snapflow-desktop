import React, { useEffect, useState } from "react";

interface Display {
  id: number;
  label: string;
  bounds: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  scaleFactor: number;
  isPrimary: boolean;
}

export function DisplaysSection() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDisplays();
  }, []);

  const loadDisplays = async () => {
    try {
      const result = await window.api.getAvailableDisplays();
      if (result.success) {
        setDisplays(result.data || []);
      }
    } catch {
      console.error("Failed to load displays");
    } finally {
      setLoading(false);
    }
  };

  const testCapture = async (type: "all" | "specific", displayId?: number) => {
    try {
      let result;
      if (type === "all") {
        result = await window.api.captureAllScreens();
      } else if (displayId !== undefined) {
        result = await window.api.captureSpecificScreen(displayId);
      }

      if (result?.success) {
        alert("Capture successful! Check your clipboard.");
      } else {
        alert(`Capture failed: ${result?.error || "Unknown error"}`);
      }
    } catch {
      alert("Capture failed: Network error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-blue-500 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-gray-400">Loading displays...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-100">
            Multi-Screen Capture
          </h3>
          <p className="text-sm text-gray-400">
            Manage and test multi-screen capture functionality
          </p>
        </div>
        {displays.length > 1 && (
          <button
            onClick={() => testCapture("all")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z"
              />
            </svg>
            <span>Test All Screens</span>
          </button>
        )}
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <svg
            className="w-5 h-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="font-medium text-gray-100">
            {displays.length === 1
              ? "Single Display Detected"
              : `${displays.length} Displays Detected`}
          </span>
        </div>

        {displays.length === 1 ? (
          <p className="text-sm text-gray-400">
            Only one display is currently connected. Multi-screen capture
            options will appear when additional displays are connected.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Multiple displays detected. You can capture all screens at once or
              capture individual screens from the system tray menu.
            </p>

            <div className="grid gap-3">
              {displays.map((display) => (
                <div
                  key={display.id}
                  className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/30"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${display.isPrimary ? "bg-blue-500" : "bg-gray-500"}`}
                    ></div>
                    <div>
                      <div className="text-sm font-medium text-gray-100">
                        {display.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {display.bounds.width} × {display.bounds.height}
                        {display.scaleFactor !== 1 &&
                          ` (${display.scaleFactor}x)`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => testCapture("specific", display.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Test Capture
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Multi-screen capture is available from the system tray menu</p>
        <p>• "Capture All Screens" combines all displays into a single image</p>
        <p>
          • "Capture Specific Screen" allows you to capture individual displays
        </p>
        <p>• All captures are automatically copied to your clipboard</p>
      </div>
    </div>
  );
}
