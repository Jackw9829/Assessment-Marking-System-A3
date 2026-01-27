// Centralized Supabase config for client-side usage

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    // In production builds, ensure these are provided via GitHub Actions secrets
    throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
}

// Edge Functions base URL
export const supabaseFunctionsBase = `${supabaseUrl}/functions/v1`;
