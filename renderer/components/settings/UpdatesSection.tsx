import React, { useState } from "react";

export function UpdatesSection() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    type: "idle" | "checking" | "available" | "upToDate" | "error";
    message?: string;
    version?: string;
  }>({ type: "idle" });

  const checkForUpdates = async () => {
    setIsChecking(true);
    setUpdateStatus({ type: "checking", message: "Checking for updates..." });

    try {
      const result = await window.api.checkForUpdatesManual();

      if (result.success) {
        if (result.data.updateAvailable) {
          setUpdateStatus({
            type: "available",
            message: `Update available: Version ${result.data.version}`,
            version: result.data.version,
          });
        } else {
          setUpdateStatus({
            type: "upToDate",
            message: `You're running the latest version (${result.data.currentVersion})`,
          });
        }
      } else {
        setUpdateStatus({
          type: "error",
          message: result.error || "Failed to check for updates",
        });
      }
    } catch {
      setUpdateStatus({
        type: "error",
        message: "Network error. Please check your internet connection.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    switch (updateStatus.type) {
      case "checking":
        return (
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
        );
      case "available":
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        );
      case "upToDate":
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        );
    }
  };

  const getStatusColor = () => {
    switch (updateStatus.type) {
      case "checking":
        return "text-blue-400";
      case "available":
        return "text-green-400";
      case "upToDate":
        return "text-green-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-100">
            Software Updates
          </h3>
          <p className="text-sm text-gray-400">
            Keep SnapFlow up to date with the latest features and security
            improvements
          </p>
        </div>
        <button
          onClick={checkForUpdates}
          disabled={isChecking}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2"
        >
          {isChecking ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
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
              <span>Checking...</span>
            </>
          ) : (
            <>
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Check for Updates</span>
            </>
          )}
        </button>
      </div>

      {updateStatus.type !== "idle" && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {updateStatus.message}
            </span>
          </div>

          {updateStatus.type === "available" && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <p className="text-xs text-gray-400 mb-2">
                The update will be downloaded automatically and you'll be
                prompted to install it.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>• Updates are checked automatically when the app starts</p>
        <p>• You can also check for updates from the system tray menu</p>
        <p>• All updates are verified and signed for security</p>
      </div>
    </div>
  );
}
