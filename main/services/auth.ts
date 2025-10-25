import { getSupabase } from "../utils/supabase";
import { AuthError, User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  /**
   * Create a new user account using Supabase Auth
   */
  async createUser(
    name: string,
    email: string,
    password: string
  ): Promise<User> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    // Sign up user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name, // Store name in user metadata
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        throw new Error("User with this email already exists");
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Failed to create user");
    }

    return this.mapSupabaseUser(data.user);
  }

  /**
   * Login with email and password using Supabase Auth
   */
  async login(email: string, password: string): Promise<User> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error("Invalid email or password");
    }

    if (!data.user) {
      throw new Error("Failed to sign in");
    }

    return this.mapSupabaseUser(data.user);
  }

  /**
   * Get user by ID using Supabase Auth
   */
  async getUserById(userId: string): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data.user) {
      return null;
    }

    return this.mapSupabaseUser(data.user);
  }

  /**
   * Get user by email
   * Note: This requires RLS policies or admin access in Supabase
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    // Get current session user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.email === email) {
      return this.mapSupabaseUser(user);
    }

    return null;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return this.mapSupabaseUser(user);
  }

  /**
   * Check if any user exists (for initial setup)
   * Since Supabase handles users globally, we check if there's a current session
   */
  async hasAnyUser(): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) {
      return false;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session !== null;
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updates: Partial<Pick<User, "name" | "email">>
  ): Promise<User> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    const updateData: any = {};

    if (updates.email) {
      updateData.email = updates.email;
    }

    if (updates.name) {
      updateData.data = { name: updates.name };
    }

    const { data, error } = await supabase.auth.updateUser(updateData);

    if (error) {
      if (error.message.includes("already in use")) {
        throw new Error("Email is already in use");
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Failed to update user");
    }

    return this.mapSupabaseUser(data.user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    // First, verify current password by attempting to sign in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not found");
    }

    // Re-authenticate with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error("Invalid current password");
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    // Supabase doesn't have a direct client method to delete user
    // This typically requires admin access or a backend function
    // For now, we'll sign out the user
    await supabase.auth.signOut();

    // Note: To fully delete a user, you would need to:
    // 1. Create a Supabase Edge Function
    // 2. Call supabase.auth.admin.deleteUser(userId) from that function
    console.warn(
      "User deletion requires Supabase Edge Function. User signed out instead."
    );
  }

  /**
   * Logout - signs out user from Supabase
   */
  async logout(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Set session (for restoring from storage)
   */
  async setSession(accessToken: string, refreshToken: string) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.session;
  }

  /**
   * Helper: Map Supabase User to our User interface
   */
  private mapSupabaseUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      name:
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split("@")[0] ||
        "User",
      email: supabaseUser.email!,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
    };
  }
}

export const authService = new AuthService();
