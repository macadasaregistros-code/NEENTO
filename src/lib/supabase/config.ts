const resolvedSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolvedSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!resolvedSupabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!resolvedSupabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabaseUrl = resolvedSupabaseUrl;
export const supabaseAnonKey = resolvedSupabaseAnonKey;
