import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function RecordingControlPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordingBounds, setRecordingBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Get recording bounds from URL
    const boundsParam = router.query.bounds as string;
    if (boundsParam) {
      try {
        const bounds = JSON.parse(decodeURIComponent(boundsParam));
        setRecordingBounds(bounds);
      } catch (error) {
        console.error("Failed to parse bounds:", error);
      }
    }
  }, [router.query.bounds]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    if (!recordingBounds) {
      console.error("No recording bounds available");
      return;
    }

    try {
      await window.api.startRecording(recordingBounds);
      setIsRecording(true);
      setElapsedTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const handleStop = async () => {
    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await window.api.stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const handleCancel = async () => {
    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await window.api.cancelRecording();
      setIsRecording(false);
    } catch (error) {
      console.error("Failed to cancel recording:", error);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>Recording Control - SnapFlow</title>
      </Head>
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-700">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              {isRecording ? (
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="10" cy="10" r="6" />
                </svg>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-100">
              Screen Recording
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {recordingBounds
                ? `${recordingBounds.width}x${recordingBounds.height}`
                : "Loading..."}
            </p>
          </div>

          {/* Timer */}
          <div className="bg-gray-900/50 rounded-lg py-6 mb-6">
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-blue-400">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-xs text-gray-500 mt-2 uppercase tracking-wider">
                {isRecording ? "Recording..." : "Ready to Record"}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {!isRecording ? (
              <>
                <button
                  onClick={handleStart}
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <circle cx="10" cy="10" r="6" />
                  </svg>
                  <span>Start Recording</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleStop}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <rect x="6" y="6" width="8" height="8" />
                </svg>
                <span>Stop Recording</span>
              </button>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Press{" "}
              <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                Esc
              </kbd>{" "}
              to cancel
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
