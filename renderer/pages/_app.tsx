import React from "react";
import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import { TooltipProvider } from "../components/ui/Tooltip";

import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          className:
            "rounded-xl border border-gray-800/50 bg-gray-900/95 backdrop-blur-xl text-gray-100 shadow-2xl cursor-pointer",
          style: {
            background: "rgba(17, 24, 39, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(75, 85, 99, 0.3)",
          },
          duration: 4000,
        }}
        closeButton
        richColors
      />
    </TooltipProvider>
  );
}

export default MyApp;
