import { beforeEach, describe, expect, it, vi } from 'vitest'

// URL e chave sao lidas quando o modulo carrega, por isso o import e dinamico.
async function carregar() {
  vi.resetModules()
  return import('@/lib/assistente/openai')
}

function eventos(...pedacos: string[]) {
  return pedacos.map((texto) => `data: ${JSON.stringify({ choices: [{ delta: { content: texto } }] })}\n\n`).join('')
}

// Corpo de resposta entregue em blocos de bytes arbitrarios
function corpoEmBlocos(blocos: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controle) {
      for (const bloco of blocos) controle.enqueue(bloco)
      controle.close()
    },
  })
}

function fatiar(bytes: Uint8Array, cortes: number[]) {
  const blocos: Uint8Array[] = []
  let inicio = 0
  for (const corte of [...cortes, bytes.length]) {
    blocos.push(bytes.slice(inicio, corte))
    inicio = corte
  }
  return blocos
}

async function lerTudo(fluxo: ReadableStream<Uint8Array>) {
  return new Response(fluxo).text()
}

let fetchFalso: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'chave-falsa-de-teste')
  vi.stubEnv('OPENAI_BASE_URL', 'http://openai.falso.local/v1')
  vi.stubEnv('MODELO_CHAT', 'modelo-chat-teste')
  vi.stubEnv('MODELO_EMBEDDING', 'modelo-embedding-teste')
  fetchFalso = vi.fn()
  vi.stubGlobal('fetch', fetchFalso)
})

describe('gerarEmbedding', () => {
  it('chama o endpoint configurado e devolve o vetor', async () => {
    fetchFalso.mockResolvedValue(Response.json({ data: [{ embedding: [0.1, 0.2] }] }))
    const { gerarEmbedding } = await carregar()

    expect(await gerarEmbedding('estacionamento')).toEqual([0.1, 0.2])

    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://openai.falso.local/v1/embeddings')
    expect(opcoes.headers.Authorization).toBe('Bearer chave-falsa-de-teste')
    expect(JSON.parse(opcoes.body)).toEqual({ model: 'modelo-embedding-teste', input: 'estacionamento' })
  })

  it('falha com o status quando a API recusa', async () => {
    fetchFalso.mockResolvedValue(new Response('erro', { status: 429 }))
    const { gerarEmbedding } = await carregar()
    await expect(gerarEmbedding('x')).rejects.toThrow('embedding falhou: 429')
  })

  it('nao chama a API sem chave', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const { gerarEmbedding } = await carregar()
    await expect(gerarEmbedding('x')).rejects.toThrow('OPENAI_API_KEY')
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})

describe('responderEmFluxo', () => {
  it('pede resposta em fluxo com o modelo configurado', async () => {
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos([]), { status: 200 }))
    const { responderEmFluxo } = await carregar()
    await lerTudo(await responderEmFluxo([{ role: 'user', content: 'oi' }]))

    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://openai.falso.local/v1/chat/completions')
    const corpo = JSON.parse(opcoes.body)
    expect(corpo).toMatchObject({ model: 'modelo-chat-teste', stream: true, messages: [{ role: 'user', content: 'oi' }] })
  })

  it('devolve so o texto dos deltas e ignora [DONE] e linhas vazias', async () => {
    const sse = eventos('Olá', ', tudo', ' bem?') + 'data: {"choices":[{"delta":{}}]}\n\n' + 'data: [DONE]\n\n'
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos([new TextEncoder().encode(sse)])))
    const { responderEmFluxo } = await carregar()

    expect(await lerTudo(await responderEmFluxo([]))).toBe('Olá, tudo bem?')
  })

  it('remonta evento quebrado no meio da linha e no meio de um caractere acentuado', async () => {
    const sse = eventos('Horário de ', 'funcionamento: ', 'não sei.') + 'data: [DONE]\n\n'
    const bytes = new TextEncoder().encode(sse)
    // corta dentro do JSON e bem no meio do "á" (2 bytes em UTF-8)
    const posicaoAcento = bytes.indexOf(0xc3)
    const blocos = fatiar(bytes, [7, posicaoAcento + 1, posicaoAcento + 9, bytes.length - 3])
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos(blocos)))
    const { responderEmFluxo } = await carregar()

    expect(await lerTudo(await responderEmFluxo([]))).toBe('Horário de funcionamento: não sei.')
  })

  it('aguenta o SSE entregue byte a byte', async () => {
    const sse = eventos('Estacionamento ', 'em frente.') + 'data: [DONE]\n\n'
    const bytes = new TextEncoder().encode(sse)
    const blocos = Array.from(bytes, (byte) => new Uint8Array([byte]))
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos(blocos)))
    const { responderEmFluxo } = await carregar()

    expect(await lerTudo(await responderEmFluxo([]))).toBe('Estacionamento em frente.')
  })

  it('aceita quebra de linha CRLF', async () => {
    const sse = eventos('a', 'b').replaceAll('\n', '\r\n')
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos([new TextEncoder().encode(sse)])))
    const { responderEmFluxo } = await carregar()

    expect(await lerTudo(await responderEmFluxo([]))).toBe('ab')
  })

  it('aproveita o ultimo evento mesmo sem quebra de linha no fim', async () => {
    const sse = eventos('primeiro ') + 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'ultimo' } }] })
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos([new TextEncoder().encode(sse)])))
    const { responderEmFluxo } = await carregar()

    expect(await lerTudo(await responderEmFluxo([]))).toBe('primeiro ultimo')
  })

  it('ignora comentario e keep-alive do SSE', async () => {
    const sse = ': ping\n\n' + eventos('ok') + 'event: fim\n\n'
    fetchFalso.mockResolvedValue(new Response(corpoEmBlocos([new TextEncoder().encode(sse)])))
    const { responderEmFluxo } = await carregar()

    expect(await lerTudo(await responderEmFluxo([]))).toBe('ok')
  })

  it('falha antes de abrir o fluxo quando a API responde erro', async () => {
    fetchFalso.mockResolvedValue(new Response('fora do ar', { status: 500 }))
    const { responderEmFluxo } = await carregar()
    await expect(responderEmFluxo([])).rejects.toThrow('chat falhou: 500')
  })
})
