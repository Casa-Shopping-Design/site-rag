import { NextResponse, type NextRequest } from 'next/server'

import { clienteServidor } from '@/lib/supabase/servidor'

// Destino do link enviado por e-mail: troca o codigo pela sessao.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const codigo = searchParams.get('code')

  if (codigo) {
    const supabase = await clienteServidor()
    const { error } = await supabase.auth.exchangeCodeForSession(codigo)
    if (!error) return NextResponse.redirect(`${origin}/area-do-lojista`)
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`)
}
