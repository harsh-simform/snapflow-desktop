import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline";
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  size = "md",
}) => {
  const sizeConfig = {
    sm: {
      container: "py-8",
      iconSize: "w-12 h-12",
      title: "text-lg",
      description: "text-sm",
      spacing: "space-y-3",
    },
    md: {
      container: "py-16",
      iconSize: "w-16 h-16",
      title: "text-xl",
      description: "text-base",
      spacing: "space-y-4",
    },
    lg: {
      container: "py-24",
      iconSize: "w-20 h-20",
      title: "text-2xl",
      description: "text-lg",
      spacing: "space-y-6",
    },
  };

  const config = sizeConfig[size];

  const defaultIcon = (
    <div
      className={clsx(
        "bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto",
        config.iconSize
      )}
    >
      <svg
        className={clsx(
          "text-gray-500",
          size === "sm" ? "w-6 h-6" : size === "md" ? "w-8 h-8" : "w-10 h-10"
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    </div>
  );

  return (
    <motion.div
      className={clsx("text-center", config.container, className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className={config.spacing}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {icon || defaultIcon}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="space-y-2"
        >
          <h3 className={clsx("font-semibold text-gray-100", config.title)}>
            {title}
          </h3>
          {description && (
            <p
              className={clsx(
                "text-gray-500 max-w-md mx-auto",
                config.description
              )}
            >
              {description}
            </p>
          )}
        </motion.div>

        {action && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <Button
              variant={action.variant || "primary"}
              onClick={action.onClick}
              className="animate-bounce-subtle"
            >
              {action.label}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Preset empty states for common scenarios
export const NoSnapsEmptyState: React.FC<{ onCapture?: () => void }> = ({
  onCapture,
}) => (
  <div className="text-center py-20">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Enhanced Icon with Animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 animate-pulse"></div>

          {/* Camera icon */}
          <svg
            className="w-16 h-16 text-blue-400 relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>

          {/* Floating plus icon */}
          <motion.div
            animate={{
              y: [-2, 2, -2],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 border-2 border-gray-950 rounded-full flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Text Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="space-y-4"
      >
        <h3 className="text-3xl font-bold text-gray-100">
          Welcome to SnapFlow
        </h3>
        <p className="text-lg text-gray-400 max-w-md mx-auto leading-relaxed">
          Start capturing screenshots and screen recordings to create visual bug
          reports and documentation
        </p>
      </motion.div>

      {/* Enhanced Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="space-y-6"
      >
        {onCapture && (
          <Button
            variant="primary"
            onClick={onCapture}
            className="px-8 py-4 text-lg font-semibold shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 transform hover:scale-105 transition-all duration-200"
            leftIcon={
              <svg
                className="w-6 h-6"
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
            }
          >
            Take Your First Snap
          </Button>
        )}

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600/20 border border-green-500/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-100">
                  Area Capture
                </div>
                <div className="text-xs text-gray-400 flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-800/50 border border-gray-700/50 rounded text-xs">
                    ⌘⇧4
                  </kbd>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-400"
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
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-100">
                  Full Screen
                </div>
                <div className="text-xs text-gray-400 flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-800/50 border border-gray-700/50 rounded text-xs">
                    ⌘⇧3
                  </kbd>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  </div>
);

export const NoResultsEmptyState: React.FC<{ onClearFilters?: () => void }> = ({
  onClearFilters,
}) => (
  <EmptyState
    icon={
      <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto">
        <svg
          className="w-8 h-8 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    }
    title="No results found"
    description="Try adjusting your search terms or filters to find what you're looking for"
    action={
      onClearFilters
        ? {
            label: "Clear Filters",
            onClick: onClearFilters,
            variant: "outline",
          }
        : undefined
    }
    size="sm"
  />
);
