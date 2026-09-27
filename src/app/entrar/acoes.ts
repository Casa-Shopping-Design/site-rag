'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { clienteServidor } from '@/lib/supabase/servidor'

export type EstadoEntrada = { situacao: 'inicio' | 'enviado' | 'erro'; mensagem?: string }

// Login por link no e-mail. So entra quem a administracao ja cadastrou:
// shouldCreateUser falso impede que qualquer pessoa crie conta pelo site.
export async function enviarLink(_: EstadoEntrada, dados: FormData): Promise<EstadoEntrada> {
  const email = z.email().safeParse(String(dados.get('email') ?? '').trim().toLowerCase())
  if (!email.success) return { situacao: 'erro', mensagem: 'Confira o e-mail digitado.' }

  const cabecalhos = await headers()
  const origem = process.env.NEXT_PUBLIC_SITE_URL || `https://${cabecalhos.get('host')}`

  const supabase = await clienteServidor()
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${origem}/auth/confirmar` },
  })

  // Mesma resposta com ou sem cadastro, para nao revelar quem e lojista.
  return {
    situacao: 'enviado',
    mensagem: 'Se este e-mail estiver cadastrado, você vai receber um link de acesso em instantes.',
  }
}
