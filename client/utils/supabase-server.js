import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

// Create a single supabase client for interacting with your database
const supabaseServer = createClient(supabaseUrl || '', supabaseServiceKey || '')

export default supabaseServer
