import { createClient } from '@supabase/supabase-js'

// The connection to Supabase, where accounts (and later saved progress) live.
// The address and key come from the .env file in the project folder.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
