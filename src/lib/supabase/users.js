import { createClient } from "@/lib/supabase/client";

const userCache = new Map();

export async function fetchUsers(clinicId, ids) {
  const missing = (ids || []).filter((id) => id && !userCache.has(id));
  if (missing.length === 0) return;
  const supabase = createClient();
  if (!supabase) return;
  const { data } = await supabase
    .from("users")
    .select("id, full_name, avatar_url")
    .eq("clinic_id", clinicId)
    .in("id", missing);
  (data || []).forEach((u) => userCache.set(u.id, u));
}

export function enrichUser(userId) {
  if (!userId) return null;
  const u = userCache.get(userId);
  return u ? { id: u.id, full_name: u.full_name, avatar_url: u.avatar_url } : null;
}

export function getUserCache() {
  return userCache;
}
