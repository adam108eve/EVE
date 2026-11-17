type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: { name?: string; college?: string };
  identities?: Array<{ id: string; provider: string }>;
};

export type SupabaseAuthSession = {
  user: SupabaseAuthUser;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

function config() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required for Supabase Auth.");
  }
  return { url: url.replace(/\/$/, ""), anonKey, serviceKey };
}

async function authRequest<T>(path: string, key: string, body: unknown): Promise<T> {
  const { url } = config();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result.message === "string" ? result.message : "Supabase Auth request failed.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return result as T;
}

export async function signInWithSupabase(email: string, password: string) {
  const { anonKey } = config();
  return authRequest<SupabaseAuthSession>("token?grant_type=password", anonKey, { email, password });
}

export async function refreshSupabaseSession(refreshToken: string) {
  const { anonKey } = config();
  return authRequest<SupabaseAuthSession>("token?grant_type=refresh_token", anonKey, { refresh_token: refreshToken });
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseAuthUser | null> {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("Could not validate Supabase Auth session.");
  return response.json() as Promise<SupabaseAuthUser>;
}

export async function signOutSupabase(accessToken: string) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 401) throw new Error("Could not sign out of Supabase Auth.");
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  metadata: { name: string; college: string | null }
) {
  const { anonKey } = config();
  return authRequest<SupabaseAuthSession>("signup", anonKey, {
    email,
    password,
    data: metadata,
  });
}

export async function createSupabaseUser(
  email: string,
  password: string,
  metadata: { name: string; college: string | null }
) {
  const { serviceKey } = config();
  return authRequest<SupabaseAuthUser>("admin/users", serviceKey, {
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
}

export async function deleteSupabaseUser(id: string) {
  const { url, serviceKey } = config();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not roll back the Supabase Auth user.");
}

export function getSupabaseAuthErrorStatus(error: unknown) {
  return error && typeof error === "object" && "status" in error && typeof error.status === "number"
    ? error.status
    : null;
}
