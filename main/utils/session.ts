/**
 * Session Manager for storing current logged-in user with Supabase
 * Uses electron-store for persistence across app restarts
 */

import Store from "electron-store";
import { authService } from "../services/auth";

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

  /**
   * Initialize session from persistent storage
   * Restores Supabase session if it exists
   * Call this when app starts
   */
  async initialize(): Promise<void> {
    console.log("[Session] Initializing session...");
    const storedUser = sessionStore.get("user");
    const storedSupabaseSession = sessionStore.get("supabaseSession");

    console.log("[Session] Stored user:", storedUser ? `${storedUser.email} (${storedUser.id})` : "none");
    console.log("[Session] Stored Supabase session:", storedSupabaseSession ? "exists" : "none");

    // If we have a stored Supabase session, restore it
    if (storedSupabaseSession) {
      try {
        console.log("[Session] Restoring Supabase session with tokens...");
        const session = await authService.setSession(
          storedSupabaseSession.accessToken,
          storedSupabaseSession.refreshToken
        );

        console.log("[Session] Session restored, getting current user...");
        // Get the current user from Supabase
        const user = await authService.getCurrentUser();
        if (user) {
          this.currentUser = user;
          // Update stored user with fresh data
          sessionStore.set("user", user);
          console.log("✓ Session restored successfully for:", user.email);
          return;
        } else {
          console.warn("[Session] getCurrentUser returned null after setSession");
        }
      } catch (error) {
        console.error("[Session] Failed to restore Supabase session:", error);
        // Clear invalid session
        await this.clearUser();
      }
    }

    // Fallback: if stored user exists but no Supabase session, clear it
    if (storedUser && !storedSupabaseSession) {
      console.log("[Session] User exists but no Supabase tokens - clearing");
      await this.clearUser();
    }

    console.log("[Session] No valid session to restore");
  }

  /**
   * Set user and store Supabase session
   */
  async setUser(user: User): Promise<void> {
    console.log("[Session] Setting user:", user.email);
    this.currentUser = user;

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
      });
      console.log("✓ Session persisted for:", user.email);
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
    this.currentUser = null;

    // Clear from persistent storage
    sessionStore.set("user", null);
    sessionStore.set("userId", null);
    sessionStore.set("supabaseSession", null);

    // Sign out from Supabase
    try {
      await authService.logout();
    } catch (error) {
      console.error("Error signing out from Supabase:", error);
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
   */
  async refreshSession(): Promise<void> {
    const storedSession = sessionStore.get("supabaseSession");

    if (storedSession) {
      try {
        const session = await authService.setSession(
          storedSession.accessToken,
          storedSession.refreshToken
        );

        if (session) {
          // Update stored tokens
          sessionStore.set("supabaseSession", {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
        }
      } catch (error) {
        console.error("Failed to refresh session:", error);
        await this.clearUser();
      }
    }
  }
}

export const sessionManager = new SessionManager();
