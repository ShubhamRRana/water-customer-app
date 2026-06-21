import { createClient, type User } from "@supabase/supabase-js";
import { getPublishableKey, getSecretKey } from "./keys.ts";

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = getSecretKey();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = getPublishableKey();
  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
