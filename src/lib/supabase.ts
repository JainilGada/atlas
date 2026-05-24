import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Unauthenticated client — for calling public edge functions (otp-request, otp-verify)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

// Authenticated client — created after login with the custom JWT in Authorization header.
// The JWT is signed with SUPABASE_JWT_SECRET (HS256) and carries sub=user_id,
// role='authenticated', so PostgREST RLS policies work via auth.uid().
export function createAuthedClient(jwt: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
}

export type SupabaseClient = ReturnType<typeof createAuthedClient>
