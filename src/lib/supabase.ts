import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Этот клиент будет автоматически сохранять сессию в куки,
// которые увидит твой API route
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)