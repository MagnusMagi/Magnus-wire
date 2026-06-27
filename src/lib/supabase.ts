import { createClient } from "@supabase/supabase-js";

// Server-side okuma istemcisi (anon key, RLS public read).
// SUPABASE_URL = http://127.0.0.1:8000 (kong, yalnız sunucu içi).
export function supabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY tanımlı değil");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Server-side yazma istemcisi (service_role; yalnız API route'larında, RLS bypass).
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil");
  return createClient(url, key, { auth: { persistSession: false } });
}
