import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Singleton pattern for Supabase Client in Electron
// Prevents multiple instances during hot-reload in development
declare global {
  var supabase: SupabaseClient | undefined;
}

// Get Supabase configuration from environment variables
const getSupabaseUrl = () => process.env.SUPABASE_URL || "";
const getSupabaseAnonKey = () => process.env.SUPABASE_ANON_KEY || "";

// Lazy initialization function for Supabase client
function initializeSupabase(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "⚠️ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file."
    );
    return null;
  }

  // Create Supabase client with auth configuration
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // We handle session persistence manually via electron-store
      detectSessionInUrl: false,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    global.supabase = client;
  }

  return client;
}

// Export getter function that lazily initializes the client
export function getSupabase(): SupabaseClient | null {
  if (global.supabase) {
    return global.supabase;
  }
  return initializeSupabase();
}

// Export type for use in other files
export type { SupabaseClient };
