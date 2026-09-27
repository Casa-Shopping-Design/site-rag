// OPENAI_BASE_URL permite apontar para outro provedor compativel
const URL_OPENAI = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

// Se o provedor travar, a rota desiste antes do limite da Vercel e o
// visitante recebe a mensagem de erro em vez de esperar sem resposta.
const TEMPO_EMBEDDING_MS = 10_000
const TEMPO_RESPOSTA_MS = 25_000

function chave() {
  const valor = process.env.OPENAI_API_KEY
  if (!valor) throw new Error('OPENAI_API_KEY nao configurada')
  return valor
}

export async function gerarEmbedding(texto: string): Promise<number[]> {
  const resposta = await fetch(`${URL_OPENAI}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.MODELO_EMBEDDING || 'text-embedding-3-small',
      input: texto,
    }),
    signal: AbortSignal.timeout(TEMPO_EMBEDDING_MS),
  })
  if (!resposta.ok) throw new Error(`embedding falhou: ${resposta.status}`)
  const corpo = await resposta.json()
  return corpo.data[0].embedding
}

export type MensagemModelo = { role: 'system' | 'user' | 'assistant'; content: string }

// Devolve so o texto, pedaco a pedaco, a partir do SSE da OpenAI.
export async function responderEmFluxo(mensagens: MensagemModelo[]): Promise<ReadableStream<Uint8Array>> {
  const resposta = await fetch(`${URL_OPENAI}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.MODELO_CHAT || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 600,
      stream: true,
      messages: mensagens,
    }),
    signal: AbortSignal.timeout(TEMPO_RESPOSTA_MS),
  })
  if (!resposta.ok || !resposta.body) throw new Error(`chat falhou: ${resposta.status}`)

  const leitor = resposta.body.getReader()
  const decodificador = new TextDecoder()
  const codificador = new TextEncoder()
  let sobra = ''

  // Devolve o texto das linhas completas; o que sobrar espera o proximo bloco.
  function textoDasLinhas(linhas: string[]) {
    let texto = ''
    for (const linha of linhas) {
      const dado = linha.replace(/^data: /, '').trim()
      if (!dado || dado === '[DONE]') continue
      try {
        texto += JSON.parse(dado).choices?.[0]?.delta?.content ?? ''
      } catch {
        // linha que nao e JSON (comentario do SSE, keep-alive); ignora
      }
    }
    return texto
  }

  return new ReadableStream({
    async pull(controle) {
      // Um bloco da rede pode nao fechar nenhuma linha. Se o pull terminasse
      // sem enfileirar nada, o stream nao pediria outro e a resposta travaria.
      while (true) {
        const { done, value } = await leitor.read()
        if (done) {
          const final = textoDasLinhas([sobra + decodificador.decode()])
          if (final) controle.enqueue(codificador.encode(final))
          controle.close()
          return
        }
        sobra += decodificador.decode(value, { stream: true })
        const linhas = sobra.split('\n')
        sobra = linhas.pop() ?? ''

        const texto = textoDasLinhas(linhas)
        if (texto) {
          controle.enqueue(codificador.encode(texto))
          return
        }
      }
    },
    cancel() {
      leitor.cancel()
    },
  })
}
