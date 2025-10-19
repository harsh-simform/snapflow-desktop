import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function CapturePage() {
  const router = useRouter();
  const [windows, setWindows] = useState<any[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWindows();
  }, []);

  const loadWindows = async () => {
    try {
      const result = await window.api.getAvailableWindows();
      if (result.success) {
        setWindows(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load windows:", error);
    }
  };

  const handleCapture = async (mode: "fullscreen" | "window" | "region") => {
    setLoading(true);
    try {
      const options: any = { mode };

      if (mode === "window" && selectedWindow) {
        options.windowId = selectedWindow;
      }

      const result = await window.api.captureScreenshot(options);

      if (result.success) {
        // Navigate to annotate page
        router.push("/annotate");

        // The screenshot will be sent via IPC event to the annotate page
      } else {
        alert(`Capture failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Capture error:", error);
      alert("An error occurred during capture");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Capture - SnapFlow</title>
      </Head>
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 backdrop-blur-sm bg-gray-900/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/home")}
                  className="flex items-center space-x-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 px-3 py-2 rounded-lg transition-all duration-200"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="font-medium">Back</span>
                </button>
                <div className="h-6 w-px bg-gray-800"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-100">
                    New Capture
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full Screen Capture */}
            <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 p-6 hover:shadow-md transition">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Full Screen
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Capture your entire screen
                </p>
              </div>
              <button
                onClick={() => handleCapture("fullscreen")}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg font-medium transition"
              >
                {loading ? "Capturing..." : "Capture"}
              </button>
            </div>

            {/* Window Capture */}
            <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 p-6 hover:shadow-md transition">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="5"
                      y="5"
                      width="14"
                      height="14"
                      rx="2"
                      strokeWidth="2"
                    />
                    <line x1="5" y1="9" x2="19" y2="9" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Select Window
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Capture a specific application window
                </p>
              </div>

              <select
                value={selectedWindow || ""}
                onChange={(e) => setSelectedWindow(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-800 text-gray-100 rounded-lg mb-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value="">Select a window...</option>
                {windows.map((window) => (
                  <option key={window.id} value={window.id}>
                    {window.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleCapture("window")}
                disabled={loading || !selectedWindow}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg font-medium transition"
              >
                {loading ? "Capturing..." : "Capture"}
              </button>
            </div>

            {/* Region Capture */}
            <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-800 p-6 hover:shadow-md transition">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      rx="1"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Select Region
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Capture a custom area of your screen
                </p>
              </div>
              <button
                onClick={() => handleCapture("region")}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg font-medium transition"
              >
                {loading ? "Capturing..." : "Select Region"}
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Click and drag to select area
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              How to capture:
            </h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start">
                <span className="font-medium mr-2">1.</span>
                Choose your capture mode above
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">2.</span>
                After capturing, you'll be able to annotate your screenshot with
                arrows, rectangles, circles, and text
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">3.</span>
                Add a title and description, then save to create an issue
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">4.</span>
                Sync your issues to GitHub or Zoho Projects from the home page
              </li>
            </ul>
          </div>
        </main>
      </div>
    </>
  );
}
