import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "white";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const variantClasses = {
  primary: "text-blue-500",
  secondary: "text-gray-400",
  white: "text-white",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "primary",
  className,
}) => {
  return (
    <motion.div
      className={clsx("inline-block", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <svg
        className={clsx(
          "animate-spin",
          sizeClasses[size],
          variantClasses[variant]
        )}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
};

interface LoadingSkeletonProps {
  className?: string;
  variant?: "text" | "card" | "avatar" | "image";
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = "text",
}) => {
  const baseClasses = "skeleton bg-gray-800";

  const variantClasses = {
    text: "h-4 rounded",
    card: "h-32 rounded-xl",
    avatar: "w-10 h-10 rounded-full",
    image: "h-40 rounded-lg",
  };

  return (
    <div className={clsx(baseClasses, variantClasses[variant], className)} />
  );
};

interface LoadingStateProps {
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "Loading...",
  description,
  size = "md",
  className,
}) => {
  const sizeConfig = {
    sm: { spinner: "md", title: "text-base", desc: "text-sm" },
    md: { spinner: "lg", title: "text-lg", desc: "text-base" },
    lg: { spinner: "xl", title: "text-xl", desc: "text-lg" },
  };

  return (
    <motion.div
      className={clsx(
        "flex flex-col items-center justify-center space-y-4 py-12",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <LoadingSpinner size={sizeConfig[size].spinner as any} />
      <div className="text-center space-y-2">
        <h3
          className={clsx(
            "font-semibold text-gray-100",
            sizeConfig[size].title
          )}
        >
          {title}
        </h3>
        {description && (
          <p className={clsx("text-gray-400", sizeConfig[size].desc)}>
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};
