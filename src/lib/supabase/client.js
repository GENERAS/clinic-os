import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let cachedClient = null;

function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export function createClient() {
    if (cachedClient)
        return cachedClient;

    const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error("Supabase URL or Anon Key is missing. Check your .env.local file.");
        return null;
    }

    cachedClient = createSupabaseClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        global: { fetch: fetchWithTimeout },
    });

    return cachedClient;
}
