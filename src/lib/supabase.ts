import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseBrowserKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getConfigurationError() {
  if (!supabaseUrl) {
    return "The Supabase project URL is missing from the environment.";
  }
  if (!supabaseBrowserKey) {
    return "The Supabase anon key is missing from the environment.";
  }

  try {
    const url = new URL(supabaseUrl);
    if (
      url.protocol !== "https:" ||
      !/^[a-z0-9]+\.supabase\.co$/i.test(url.hostname)
    ) {
      return "The Supabase project URL is not a valid https://PROJECT_REF.supabase.co address.";
    }
  } catch {
    return "The Supabase project URL is malformed.";
  }

  if (
    !supabaseBrowserKey.startsWith("eyJ") &&
    !supabaseBrowserKey.startsWith("sb_publishable_")
  ) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not a valid browser-safe Supabase key.";
  }

  return "";
}

export const supabaseConfigurationError = getConfigurationError();
export const isSupabaseConfigured = !supabaseConfigurationError;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;

  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabaseBrowserKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}
