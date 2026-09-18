import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Zonder deze twee is elke query een stille 401. Liever hier hard stuk.
  throw new Error(
    'VITE_SUPABASE_URL of VITE_SUPABASE_PUBLISHABLE_KEY ontbreekt. ' +
      'Zet ze in .env.local (lokaal) en in de GitHub Actions variables (deploy).',
  )
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
