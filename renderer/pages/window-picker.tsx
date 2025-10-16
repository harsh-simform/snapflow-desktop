import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

interface WindowSource {
  id: string;
  name: string;
  thumbnail: string;
}

export default function WindowPicker() {
  const router = useRouter();
  const [windows, setWindows] = useState<WindowSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWindows();
  }, []);

  const loadWindows = async () => {
    try {
      const result = await window.api.getAvailableWindows();
      if (result.success && result.data) {
        setWindows(result.data);
      }
    } catch (error) {
      console.error("Failed to load windows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWindowSelect = async (windowId: string) => {
    try {
      await window.api.captureScreenshot({
        mode: "window",
        windowId,
      });
      // The screenshot handler in background.ts will navigate to annotate page
    } catch (error) {
      console.error("Failed to capture window:", error);
    }
  };

  const handleCancel = () => {
    router.push("/home");
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading windows...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">
              Select Window to Capture
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Click on any window to capture it
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Window Grid */}
      <div className="flex-1 overflow-auto p-6">
        {windows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 text-lg">No windows available</p>
              <p className="text-gray-500 text-sm mt-2">
                Try opening some applications first
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {windows.map((window) => (
              <button
                key={window.id}
                onClick={() => handleWindowSelect(window.id)}
                className="group relative bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 hover:bg-gray-800 transition-all overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-3">
                  <img
                    src={window.thumbnail}
                    alt={window.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Window Name */}
                <p className="text-sm text-gray-300 group-hover:text-gray-100 truncate">
                  {window.name}
                </p>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
