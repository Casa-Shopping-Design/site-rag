import { z } from 'zod'

import { historicoDaConversa } from '@/lib/assistente/conversa'
import { lerJsonLimitado, origemPermitida, passouDoLimite } from '@/lib/assistente/limite'
import { fluxoSemMarcador, removerMarcador } from '@/lib/assistente/marcador'
import { gerarEmbedding, responderEmFluxo, type MensagemModelo } from '@/lib/assistente/openai'
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

// Folga sobre os tempos limite das chamadas ao modelo (openai.ts).
export const maxDuration = 30

const perfisConhecidos: Perfil[] = ['visitante', 'inquilino', 'admin']

// Qualquer resposta inesperada do banco conta como visitante.
function perfilSeguro(valor: unknown): Perfil {
  return perfisConhecidos.includes(valor as Perfil) ? (valor as Perfil) : 'visitante'
}

function textoSimples(texto: string, status = 200) {
  return new Response(texto, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

// 20 mensagens de ate 1500 caracteres, com folga para acento em UTF-8.
const tamanhoMaximoCorpo = 64 * 1024

export async function POST(request: Request) {
  if (!origemPermitida(request)) return textoSimples('Origem não permitida.', 403)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (passouDoLimite(ip)) {
    return textoSimples('Muitas perguntas seguidas. Espere um minuto e tente de novo.', 429)
  }

  const corpo = await lerJsonLimitado(request, tamanhoMaximoCorpo)
  if (!corpo.ok) return textoSimples('Mensagem inválida.', corpo.status)

  const validacao = esquema.safeParse(corpo.dados)
  if (!validacao.success) return textoSimples('Mensagem inválida.', 400)

  if (!supabaseConfigurado() || !process.env.OPENAI_API_KEY) {
    return textoSimples('O assistente ainda não foi configurado.', 503)
  }

  const recebidas = validacao.data.mensagens
  const ultima = recebidas[recebidas.length - 1]
  if (ultima.papel !== 'usuario' || !removerMarcador(ultima.texto).trim()) {
    return textoSimples('Mensagem inválida.', 400)
  }

  const historico = historicoDaConversa(recebidas)
  const pergunta = historico[historico.length - 1].texto

  // Sessao de quem pergunta. Sem login e a chave anon; nunca a service_role.
  const supabase = await clienteServidor()

  try {
    // Pergunta curta de continuacao ("e no sabado?") busca junto com a anterior.
    const anterior = historico.filter((m) => m.papel === 'usuario').slice(-2, -1)[0]?.texto
    const textoBusca = pergunta.length < 40 && anterior ? `${anterior}\n${pergunta}` : pergunta

    // Perfil e embedding nao dependem um do outro. O vetor nao carrega permissao:
    // quem corta o resultado e a RLS, na busca logo abaixo.
    const [{ data: perfilDoBanco, error: erroPerfil }, vetor] = await Promise.all([
      supabase.rpc('meu_perfil'),
      gerarEmbedding(textoBusca),
    ])
    const perfil = erroPerfil ? 'visitante' : perfilSeguro(perfilDoBanco)

    const { data: trechos, error } = await supabase.rpc('buscar_trechos_chat', {
      p_vetor: JSON.stringify(vetor),
      p_limite: 6,
      p_similaridade_min: 0.3,
    })
    if (error) throw error

    const mensagens: MensagemModelo[] = [
      { role: 'system', content: montarInstrucoes(perfil, (trechos ?? []) as TrechoEncontrado[]) },
      ...historico.map((m) => ({
        role: m.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
        content: m.texto,
      })),
    ]

    // So visitante pode abrir o formulario de contato. Para os outros perfis o
    // marcador sai da resposta aqui, mesmo que o modelo o escreva.
    const resposta = await responderEmFluxo(mensagens)
    const fluxo = perfil === 'visitante' ? resposta : fluxoSemMarcador(resposta)
    return new Response(fluxo, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  } catch (erro) {
    console.error('[chat]', erro)
    return textoSimples('Não consegui responder agora. Tente de novo em instantes.', 500)
  }
}
