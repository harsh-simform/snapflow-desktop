import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface FloatingActionButtonProps {
  onCapture?: () => void;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onCapture,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      id: "fullscreen",
      label: "Full Screen",
      icon: (
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
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      ),
      onClick: () => {
        // Trigger full screen capture
        onCapture?.();
        setIsExpanded(false);
      },
    },
    {
      id: "area",
      label: "Select Area",
      icon: (
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
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      ),
      onClick: () => {
        // Trigger area capture
        onCapture?.();
        setIsExpanded(false);
      },
    },
  ];

  return (
    <div className={clsx("fixed bottom-6 right-6 z-50", className)}>
      <div className="relative">
        {/* Action Items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 right-0 space-y-3"
            >
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { delay: index * 0.1 },
                  }}
                  exit={{
                    opacity: 0,
                    y: 20,
                    scale: 0.8,
                    transition: { delay: (actions.length - index - 1) * 0.05 },
                  }}
                  className="flex items-center justify-end"
                >
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: { delay: index * 0.1 + 0.1 },
                    }}
                    exit={{ opacity: 0, x: 10 }}
                    className="mr-3 px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-gray-100 text-sm font-medium rounded-lg border border-gray-800/50 shadow-lg"
                  >
                    {action.label}
                  </motion.span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={action.onClick}
                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/25 flex items-center justify-center transition-all duration-200"
                  >
                    {action.icon}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/30 flex items-center justify-center transition-all duration-300 relative overflow-hidden group"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-all duration-300" />

          <motion.div
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </motion.div>
        </motion.button>

        {/* Backdrop */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface QuickCaptureTooltipProps {
  children: React.ReactNode;
  shortcut?: string;
}

export const QuickCaptureTooltip: React.FC<QuickCaptureTooltipProps> = ({
  children,
  shortcut = "Cmd+Shift+4",
}) => {
  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-900/95 backdrop-blur-sm text-gray-100 text-xs font-medium px-3 py-2 rounded-lg border border-gray-800/50 shadow-xl whitespace-nowrap">
          Quick Capture
          <div className="text-gray-400 mt-0.5">{shortcut}</div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95"></div>
        </div>
      </div>
    </div>
  );
};
