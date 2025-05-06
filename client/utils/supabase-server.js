import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esjxiettkmjomggqobzi.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanhpZXR0a21qb21nZ3FvYnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQyMDA2NywiZXhwIjoyMDYxOTk2MDY3fQ.VcL7dopjcR-uZP2Q8UDRqoiZoX2SIFI0eeBH9tdb0cs'

// Create a single supabase client for interacting with your database
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

export default supabaseServer
