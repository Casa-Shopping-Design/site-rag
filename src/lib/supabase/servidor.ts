import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente com a sessao de quem esta navegando. Sem login, age como anon.
// E o unico cliente usado pelo chat: a RLS decide o que volta da busca.
export async function clienteServidor() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Chamado de um Server Component: o proxy renova a sessao.
          }
        },
      },
    },
  )
}

export function supabaseConfigurado() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
