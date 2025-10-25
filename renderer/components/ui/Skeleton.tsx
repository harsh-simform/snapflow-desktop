import React from "react";

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className = "", children }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-800/50 rounded ${className}`}>
      {children}
    </div>
  );
}

// Specific skeleton components for common patterns
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 ${className}`}
    >
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30"
            >
              <div className="flex items-center space-x-2 mb-1">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-blue-900/10 border border-blue-800/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Skeleton className="w-5 h-5 rounded flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="flex justify-end pt-2">
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSyncCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-8 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-sm max-w-4xl ${className}`}
    >
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30"
            >
              <div className="flex items-center space-x-2 mb-1">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>

        {/* Info Message */}
        <div className="bg-blue-900/10 border border-blue-800/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Skeleton className="w-5 h-5 rounded flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex justify-end pt-2">
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
