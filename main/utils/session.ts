/**
 * Session Manager for storing current logged-in user
 * Uses electron-store for persistence across app restarts
 */

import Store from "electron-store";

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
}

const sessionStore = new Store<SessionData>({
  name: "snapflow-session",
  defaults: {
    userId: null,
    user: null,
  },
});

class SessionManager {
  private currentUser: User | null = null;

  /**
   * Initialize session from persistent storage
   * Call this when app starts
   */
  async initialize(): Promise<void> {
    const storedUser = sessionStore.get("user");
    if (storedUser) {
      // Convert stored dates back to Date objects
      this.currentUser = {
        ...storedUser,
        createdAt: new Date(storedUser.createdAt),
        updatedAt: new Date(storedUser.updatedAt),
      };
    }
  }

  setUser(user: User): void {
    this.currentUser = user;
    // Persist to storage
    sessionStore.set("user", user);
    sessionStore.set("userId", user.id);
  }

  getUser(): User | null {
    return this.currentUser;
  }

  clearUser(): void {
    this.currentUser = null;
    // Clear from persistent storage
    sessionStore.set("user", null);
    sessionStore.set("userId", null);
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUserId(): string | null {
    return this.currentUser?.id || null;
  }
}

export const sessionManager = new SessionManager();
