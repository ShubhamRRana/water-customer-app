function parseNamedKeys(raw: string | undefined): Record<string, string> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getPublishableKey(name = "default"): string {
  const named = parseNamedKeys(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  if (named?.[name]) return named[name];
  return (
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    ""
  );
}

export function getSecretKey(name = "default"): string {
  const named = parseNamedKeys(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (named?.[name]) return named[name];
  return (
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    ""
  );
}
