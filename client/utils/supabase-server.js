import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side usage with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase server-side environment variables. Please check your .env.local file.')
}

// Create client with service role key for admin privileges to bypass RLS policies
const supabaseServer = createClient(
  supabaseUrl || '', 
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default supabaseServer
