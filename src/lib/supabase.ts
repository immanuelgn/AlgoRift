import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getConfigurationError() {
  if (!supabaseUrl) {
    return "The Supabase project URL is missing from the production environment.";
  }
  if (!supabasePublishableKey) {
    return "The Supabase publishable key is missing from the production environment.";
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
    !supabasePublishableKey.startsWith("sb_publishable_") &&
    !supabasePublishableKey.startsWith("eyJ")
  ) {
    return "The browser key is not a Supabase publishable or legacy anon key.";
  }

  return "";
}

export const supabaseConfigurationError = getConfigurationError();
export const isSupabaseConfigured = !supabaseConfigurationError;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;

  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}
