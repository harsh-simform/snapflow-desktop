import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface LocalImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

export const LocalImage: React.FC<LocalImageProps> = ({
  src,
  alt,
  className = "",
  style,
  onError,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const result = await window.api.readImageFile(src);

        if (!mounted) return;

        if (result.success && result.data) {
          setDataUrl(result.data);
        } else {
          console.error("Failed to load image:", result.error);
          setError(true);
          onError?.();
        }
      } catch (err) {
        console.error("Error loading image:", err);
        if (mounted) {
          setError(true);
          onError?.();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (src) {
      loadImage();
    }

    return () => {
      mounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div className={clsx("flex items-center justify-center bg-gray-900/30 rounded-lg w-full h-full", className)} style={style}>
        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-600 animate-spin mb-4"
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
          <p className="text-sm text-gray-400">Loading image...</p>
        </div>
      </div>
    );
  }

  if (error || !dataUrl) {
    return null;
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={clsx(className)}
      style={{
        imageRendering: '-webkit-optimize-contrast',
        ...style,
      }}
      loading="eager"
    />
  );
};
