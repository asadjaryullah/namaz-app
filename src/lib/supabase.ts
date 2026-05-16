import { createClient } from "@supabase/supabase-js";

// Fallbacks verhindern Build-Fehler beim Prerendering (env vars sind erst zur Laufzeit gesetzt).
// Zur Laufzeit werden immer die echten Werte aus den Vercel-Umgebungsvariablen genutzt.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "r2s-auth", // optional, aber nice (verhindert Konflikte)
  },
});