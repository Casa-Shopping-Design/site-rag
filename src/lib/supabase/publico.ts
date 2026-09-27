import { createClient } from '@supabase/supabase-js'

// Cliente anonimo sem cookie, para paginas publicas que podem ser cacheadas
// (vitrine de lojas). Continua sujeito a RLS como qualquer visitante.
export function clientePublico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
