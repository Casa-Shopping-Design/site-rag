import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Mantem o cookie de sessao atualizado a cada requisicao.
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return resposta
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value))
          resposta = NextResponse.next({ request })
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options))
        },
      },
    },
  )

  await supabase.auth.getUser()
  return resposta
}
