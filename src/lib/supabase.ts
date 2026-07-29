import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Sprawdzamy w konsoli przeglądarki, co Next faktycznie widzi
console.log('URL z env:', supabaseUrl)
console.log('KEY z env:', supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Brak zmiennych NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY w pliku .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)