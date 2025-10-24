import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  interactive?: boolean;
  variant?: "default" | "glass" | "elevated";
  animate?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      hover = true,
      interactive = false,
      variant = "default",
      animate = true,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = "rounded-xl transition-all duration-300";

    const variantClasses = {
      default:
        "border border-gray-800/50 bg-gray-900/90 shadow-xl backdrop-blur-sm",
      glass: "border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl",
      elevated:
        "border border-gray-700/50 bg-gray-900 shadow-2xl shadow-black/20",
    };

    const hoverClasses = hover
      ? {
          default:
            "hover:shadow-2xl hover:border-gray-700/50 hover:bg-gray-900",
          glass: "hover:bg-white/10 hover:border-white/20 hover:shadow-glow",
          elevated: "hover:shadow-glow hover:border-gray-600/50",
        }[variant]
      : "";

    const interactiveClasses = interactive
      ? "hover:scale-[1.02] hover:-translate-y-1 cursor-pointer"
      : "";

    const cardClassName = clsx(
      baseClasses,
      variantClasses[variant],
      hoverClasses,
      interactiveClasses,
      className
    );

    // Filter out props that conflict with framer-motion
    const {
      onDrag: _onDrag,
      onDragEnd: _onDragEnd,
      onDragStart: _onDragStart,
      onDragCapture: _onDragCapture,
      onDragEndCapture: _onDragEndCapture,
      onDragStartCapture: _onDragStartCapture,
      onAnimationStart: _onAnimationStart,
      onAnimationEnd: _onAnimationEnd,
      onAnimationStartCapture: _onAnimationStartCapture,
      onAnimationEndCapture: _onAnimationEndCapture,
      ...safeProps
    } = props;

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cardClassName}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          {...safeProps}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={cardClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={clsx(
      "text-lg font-semibold leading-none tracking-tight text-gray-100",
      className
    )}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx("text-sm text-gray-400", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx("p-6 pt-0", className)} {...props} />
));

CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx("flex items-center p-6 pt-0", className)}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";
