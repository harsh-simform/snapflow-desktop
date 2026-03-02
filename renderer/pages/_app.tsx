import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Toaster } from "sonner";
import { TooltipProvider } from "../components/ui/Tooltip";

import "../styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = React.useState(false);

  useEffect(() => {
    // Setup OAuth callback listener
    const unsubscribe = window.api.onNavigate((route: string) => {
      router.push(route);
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      const publicRoutes = ["/auth", "/500"];

      // Skip auth checks for public routes
      if (publicRoutes.includes(router.pathname)) {
        setAuthChecked(true);
        return;
      }

      try {
        // Check if user is authenticated
        const userResult = await window.api.getUser();

        if (!userResult.success || !userResult.data) {
          // Not authenticated, redirect to auth
          router.push("/auth");
          return;
        }

        // User is authenticated, check onboarding status for non-auth routes
        if (router.pathname !== "/onboarding") {
          const onboardingResult = await window.api.getOnboardingStatus();

          if (onboardingResult.success && !onboardingResult.data?.isComplete) {
            // Onboarding incomplete, redirect to onboarding
            router.push("/onboarding");
            return;
          }
        }

        setAuthChecked(true);
      } catch (err) {
        console.error("Auth check error:", err);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router.pathname, router]);

  return (
    <TooltipProvider delayDuration={300}>
      {authChecked && <Component {...pageProps} />}
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
