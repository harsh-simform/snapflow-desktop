/**
 * Session Manager for storing current logged-in user with Supabase
 * Uses electron-store for persistence across app restarts
 */

import Store from "electron-store";
import { authService } from "../services/auth";
import { getSupabase } from "./supabase";
import { storageManager } from "./storage";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionData {
  userId: string | null;
  user: User | null;
  supabaseSession: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null;
}

const sessionStore = new Store<SessionData>({
  name: "snapflow-session",
  defaults: {
    userId: null,
    user: null,
    supabaseSession: null,
  },
});

// Log the session store path for debugging
console.log("[Session Store] Path:", sessionStore.path);

class SessionManager {
  private currentUser: User | null = null;
  private sessionListenerInitialized = false;
  private isClearing = false; // Flag to prevent circular clearUser calls

  /**
   * Initialize session from persistent storage
   * Restores Supabase session if it exists
   * Call this when app starts
   */
  async initialize(): Promise<void> {
    console.log("[Session] Initializing session...");

    // Setup auth state change listener first
    this.setupAuthStateListener();

    const supabase = getSupabase();
    if (!supabase) {
      console.warn("[Session] Supabase not available");
      return;
    }

    // Try to get the session from Supabase's storage (which now uses electron-store)
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("[Session] Error getting session:", error);
      await this.clearUser();
      return;
    }

    if (session) {
      try {
        console.log("[Session] Found existing Supabase session, restoring...");

        // Get the current user
        const user = await authService.getCurrentUser();
        if (user) {
          this.currentUser = user;

          // Set current user in storage manager for user-specific paths
          storageManager.setCurrentUser(user.id);
          // Ensure user-specific directories exist
          await storageManager.ensureDirectories();

          // Store user data for quick access
          sessionStore.set("user", user);
          sessionStore.set("userId", user.id);
          // Also store session tokens for backup
          sessionStore.set("supabaseSession", {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at || 0,
          });
          console.log("✓ Session restored successfully for:", user.email);
          return;
        } else {
          console.warn("[Session] Session exists but no user found");
          await this.clearUser();
        }
      } catch (error) {
        console.error("[Session] Failed to restore session:", error);
        await this.clearUser();
      }
    } else {
      console.log("[Session] No session found");
      // Clear any stale data
      sessionStore.set("user", null);
      sessionStore.set("userId", null);
      sessionStore.set("supabaseSession", null);
    }
  }

  /**
   * Setup Supabase auth state change listener
   * This monitors token refresh and session changes
   */
  private setupAuthStateListener(): void {
    if (this.sessionListenerInitialized) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      console.warn(
        "[Session] Cannot setup auth listener - Supabase not initialized"
      );
      return;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Session] Auth state changed:", event);

      if (event === "TOKEN_REFRESHED" && session) {
        console.log("[Session] Token refreshed, updating stored session");
        sessionStore.set("supabaseSession", {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        });
      } else if (event === "SIGNED_OUT") {
        console.log("[Session] User signed out via auth state change");
        await this.clearUser();
      } else if (event === "SIGNED_IN" && session) {
        console.log("[Session] User signed in via auth state change");
        // Update session tokens
        sessionStore.set("supabaseSession", {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        });
      }
    });

    this.sessionListenerInitialized = true;
    console.log("[Session] Auth state listener initialized");
  }

  /**
   * Set user and store Supabase session
   */
  async setUser(user: User): Promise<void> {
    console.log("[Session] Setting user:", user.email);
    this.currentUser = user;

    // Set current user in storage manager for user-specific paths
    storageManager.setCurrentUser(user.id);
    // Ensure user-specific directories exist
    await storageManager.ensureDirectories();

    // Setup auth state listener if not already done
    this.setupAuthStateListener();

    // Get current Supabase session
    const session = await authService.getSession();

    if (session) {
      console.log("[Session] Storing user and Supabase tokens");
      // Store both user data and Supabase tokens
      sessionStore.set("user", user);
      sessionStore.set("userId", user.id);
      sessionStore.set("supabaseSession", {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
      });
      console.log("✓ Session persisted for:", user.email);
      console.log(
        "[Session] Token expires at:",
        new Date((session.expires_at || 0) * 1000).toLocaleString()
      );
    } else {
      console.warn("[Session] No Supabase session found - storing user only");
      // Just store user if no session (shouldn't happen normally)
      sessionStore.set("user", user);
      sessionStore.set("userId", user.id);
    }
  }

  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Clear user session and sign out from Supabase
   */
  async clearUser(): Promise<void> {
    // Prevent circular calls from auth state listener
    if (this.isClearing) {
      console.log("[Session] clearUser already in progress, skipping");
      return;
    }

    console.log("[Session] Clearing user session...");
    this.isClearing = true;

    try {
      this.currentUser = null;

      // Clear current user from storage manager
      storageManager.clearCurrentUser();

      // Clear from persistent storage
      sessionStore.set("user", null);
      sessionStore.set("userId", null);
      sessionStore.set("supabaseSession", null);

      // Sign out from Supabase
      try {
        await authService.logout();
        console.log("[Session] ✓ Supabase logout complete");
      } catch (error) {
        console.error("[Session] Error signing out from Supabase:", error);
      }
    } finally {
      this.isClearing = false;
      console.log("[Session] ✓ Session cleared");
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  /**
   * Refresh Supabase session tokens
   * Note: This is automatically handled by Supabase's autoRefreshToken
   * and our auth state change listener. This method is kept for manual refresh if needed.
   */
  async refreshSession(): Promise<void> {
    const storedSession = sessionStore.get("supabaseSession");

    if (storedSession) {
      try {
        console.log("[Session] Manually refreshing session...");
        const session = await authService.setSession(
          storedSession.accessToken,
          storedSession.refreshToken
        );

        if (session) {
          // Update stored tokens
          sessionStore.set("supabaseSession", {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at || 0,
          });
          console.log("[Session] Session manually refreshed successfully");
        }
      } catch (error) {
        console.error("[Session] Failed to refresh session:", error);
        await this.clearUser();
      }
    }
  }

  /**
   * Check if the current session is valid and not expired
   */
  isSessionValid(): boolean {
    const storedSession = sessionStore.get("supabaseSession");
    if (!storedSession || !this.currentUser) {
      return false;
    }

    // Check if token has expired
    const now = Date.now() / 1000; // Convert to seconds
    if (storedSession.expiresAt && storedSession.expiresAt < now) {
      console.log("[Session] Token has expired");
      return false;
    }

    return true;
  }
}

export const sessionManager = new SessionManager();
