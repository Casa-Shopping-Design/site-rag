import { z } from 'zod'

import { gerarEmbedding, responderEmFluxo, type MensagemModelo } from '@/lib/assistente/openai'
import { passouDoLimite } from '@/lib/assistente/limite'
import { montarInstrucoes, type TrechoEncontrado } from '@/lib/assistente/prompt'
import { clienteServidor, supabaseConfigurado } from '@/lib/supabase/servidor'
import type { Perfil } from '@/types/conteudo'

const esquema = z.object({
  mensagens: z
    .array(
      z.object({
        papel: z.enum(['usuario', 'assistente']),
        texto: z.string().trim().min(1).max(1500),
      }),
    )
    .min(1)
    .max(20),
})

function textoSimples(texto: string, status = 200) {
  return new Response(texto, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (passouDoLimite(ip)) {
    return textoSimples('Muitas perguntas seguidas. Espere um minuto e tente de novo.', 429)
  }

  const validacao = esquema.safeParse(await request.json().catch(() => null))
  if (!validacao.success) return textoSimples('Mensagem inválida.', 400)

  if (!supabaseConfigurado() || !process.env.OPENAI_API_KEY) {
    return textoSimples('O assistente ainda não foi configurado.', 503)
  }

  const historico = validacao.data.mensagens.slice(-6)
  const pergunta = historico[historico.length - 1]
  if (pergunta.papel !== 'usuario') return textoSimples('Mensagem inválida.', 400)

  // Sessao de quem pergunta. Sem login e a chave anon; nunca a service_role.
  const supabase = await clienteServidor()

  try {
    const { data: perfil } = await supabase.rpc('meu_perfil')

    // Pergunta curta de continuacao ("e no sabado?") busca junto com a anterior.
    const anterior = historico.filter((m) => m.papel === 'usuario').slice(-2, -1)[0]
    const textoBusca = pergunta.texto.length < 40 && anterior
      ? `${anterior.texto}\n${pergunta.texto}`
      : pergunta.texto

    const vetor = await gerarEmbedding(textoBusca)
    const { data: trechos, error } = await supabase.rpc('buscar_trechos_chat', {
      p_vetor: JSON.stringify(vetor),
      p_limite: 6,
      p_similaridade_min: 0.3,
    })
    if (error) throw error

    const mensagens: MensagemModelo[] = [
      {
        role: 'system',
        content: montarInstrucoes((perfil as Perfil) ?? 'visitante', (trechos ?? []) as TrechoEncontrado[]),
      },
      ...historico.map((m) => ({
        role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
        content: m.texto,
      })),
    ]

    const fluxo = await responderEmFluxo(mensagens)
    return new Response(fluxo, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  } catch (erro) {
    console.error('[chat]', erro)
    return textoSimples('Não consegui responder agora. Tente de novo em instantes.', 500)
  }
}
