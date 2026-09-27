import { z } from 'zod'

import { AVISO_CONSENTIMENTO } from '@/lib/lgpd'
import { clienteServidor, supabaseConfigurado } from '@/lib/supabase/servidor'

const esquema = z
  .object({
    nome: z.string().trim().min(2).max(120),
    telefone: z.string().trim().max(30).optional().or(z.literal('')),
    email: z.email().max(160).optional().or(z.literal('')),
    tipoEspaco: z.string().trim().max(120).optional().or(z.literal('')),
    mensagem: z.string().trim().max(2000).optional().or(z.literal('')),
    origem: z.enum(['site', 'assistente']).default('site'),
    consentimento: z.literal(true),
  })
  .refine((dados) => dados.telefone || dados.email, {
    message: 'Informe telefone ou e-mail.',
  })

export async function POST(request: Request) {
  const validacao = esquema.safeParse(await request.json().catch(() => null))
  if (!validacao.success) {
    return Response.json({ erro: 'Confira os campos e o aceite do aviso de privacidade.' }, { status: 400 })
  }
  if (!supabaseConfigurado()) {
    return Response.json({ erro: 'Formulário indisponível no momento.' }, { status: 503 })
  }

  const dados = validacao.data
  const supabase = await clienteServidor()

  // Sem .select(): quem envia nao tem leitura na tabela, nem do proprio registro.
  const { error } = await supabase.from('leads').insert({
    nome: dados.nome,
    telefone: dados.telefone || null,
    email: dados.email || null,
    tipo_espaco: dados.tipoEspaco || null,
    mensagem: dados.mensagem || null,
    origem: dados.origem,
    consentimento: true,
    consentimento_texto: AVISO_CONSENTIMENTO,
  })

  if (error) {
    console.error('[leads]', error.message)
    return Response.json({ erro: 'Não foi possível enviar agora.' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
