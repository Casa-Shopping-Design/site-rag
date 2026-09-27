// OPENAI_BASE_URL permite apontar para outro provedor compativel
const URL_OPENAI = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

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
  })
  if (!resposta.ok || !resposta.body) throw new Error(`chat falhou: ${resposta.status}`)

  const leitor = resposta.body.getReader()
  const decodificador = new TextDecoder()
  const codificador = new TextEncoder()
  let sobra = ''

  return new ReadableStream({
    async pull(controle) {
      const { done, value } = await leitor.read()
      if (done) {
        controle.close()
        return
      }
      sobra += decodificador.decode(value, { stream: true })
      const linhas = sobra.split('\n')
      sobra = linhas.pop() ?? ''

      for (const linha of linhas) {
        const dado = linha.replace(/^data: /, '').trim()
        if (!dado || dado === '[DONE]') continue
        try {
          const pedaco = JSON.parse(dado).choices?.[0]?.delta?.content
          if (pedaco) controle.enqueue(codificador.encode(pedaco))
        } catch {
          // linha quebrada no meio; o resto chega no proximo pedaco
        }
      }
    },
    cancel() {
      leitor.cancel()
    },
  })
}
