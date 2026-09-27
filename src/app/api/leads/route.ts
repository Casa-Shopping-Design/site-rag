import { z } from 'zod'

import { ipDaRequisicao, lerJsonLimitado, origemPermitida, passouDoLimite } from '@/lib/assistente/limite'
import { AVISO_CONSENTIMENTO } from '@/lib/lgpd'
import { clienteServidor, supabaseConfigurado } from '@/lib/supabase/servidor'

// Folga sobre a soma dos campos, contando acento em UTF-8.
const tamanhoMaximoCorpo = 16 * 1024

const esquema = z
  .object({
    nome: z.string().trim().min(2).max(120),
    telefone: z.string().trim().max(30).optional().or(z.literal('')),
    email: z.email().max(160).optional().or(z.literal('')),
    tipoEspaco: z.string().trim().max(120).optional().or(z.literal('')),
    mensagem: z.string().trim().max(2000).optional().or(z.literal('')),
    origem: z.enum(['site', 'assistente']).default('site'),
    consentimento: z.literal(true),
    // Campo isca: gente nao ve, robo preenche.
    site: z.string().max(500).optional(),
  })
  .refine((dados) => dados.telefone || dados.email, {
    message: 'Informe telefone ou e-mail.',
  })

export async function POST(request: Request) {
  if (!origemPermitida(request)) {
    return Response.json({ erro: 'Origem não permitida.' }, { status: 403 })
  }
  if (passouDoLimite(`lead:${ipDaRequisicao(request)}`, { maximo: 5, janelaMs: 10 * 60_000 })) {
    return Response.json({ erro: 'Muitos envios seguidos. Tente de novo em alguns minutos.' }, { status: 429 })
  }

  const corpo = await lerJsonLimitado(request, tamanhoMaximoCorpo)
  if (!corpo.ok) {
    const erro = corpo.status === 413 ? 'Texto grande demais.' : 'Confira os campos e o aceite do aviso de privacidade.'
    return Response.json({ erro }, { status: corpo.status })
  }

  const validacao = esquema.safeParse(corpo.dados)
  if (!validacao.success) {
    return Response.json({ erro: 'Confira os campos e o aceite do aviso de privacidade.' }, { status: 400 })
  }

  // Responde como se tivesse gravado, para o robo nao aprender a desviar da isca.
  if (validacao.data.site) return Response.json({ ok: true })

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
