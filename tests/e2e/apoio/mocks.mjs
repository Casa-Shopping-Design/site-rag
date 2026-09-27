// Servidores falsos para o E2E: gateway do Supabase na frente do PostgREST e
// uma OpenAI que responde sem sair da maquina. Portas vem do ambiente.
import http from 'node:http'

const portaGateway = Number(process.env.PORTA_GATEWAY || 3120)
const portaPostgrest = Number(process.env.PORTA_POSTGREST || 3121)
const portaOpenai = Number(process.env.PORTA_OPENAI || 3122)

// /rest/v1 vai para o PostgREST; /auth/v1 responde como se nao houvesse sessao
const gateway = http.createServer((req, res) => {
  if (req.url.startsWith('/auth/v1')) {
    res.writeHead(401, { 'content-type': 'application/json' })
    return res.end('{"message":"sem sessao"}')
  }
  const caminho = req.url.replace(/^\/rest\/v1/, '')
  const cabecalhos = { ...req.headers }
  delete cabecalhos.host
  const repasse = http.request(
    { host: '127.0.0.1', port: portaPostgrest, path: caminho, method: req.method, headers: cabecalhos },
    (resposta) => {
      res.writeHead(resposta.statusCode, resposta.headers)
      resposta.pipe(res)
    },
  )
  repasse.on('error', () => {
    res.writeHead(502)
    res.end()
  })
  req.pipe(repasse)
})

// Embedding constante e resposta que repete os trechos do prompt de sistema,
// assim o teste enxerga exatamente o que a RLS deixou chegar ao modelo.
const openai = http.createServer((req, res) => {
  let corpo = ''
  req.on('data', (pedaco) => (corpo += pedaco))
  req.on('end', () => {
    const dados = JSON.parse(corpo || '{}')
    if (req.url.endsWith('/embeddings')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ data: [{ embedding: Array(1536).fill(0.01) }] }))
    }
    const sistema = dados.messages?.[0]?.content ?? ''
    const trechos = sistema.slice(sistema.indexOf('Trechos disponíveis'))
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    // manda em pedacos que cortam a linha no meio, como a rede real faz
    const eventos = [trechos.slice(0, 40), trechos.slice(40), '\n[[CONTATO]]']
      .map((parte) => `data: ${JSON.stringify({ choices: [{ delta: { content: parte } }] })}\n\n`)
      .join('')
    const meio = Math.floor(eventos.length / 2)
    res.write(eventos.slice(0, meio))
    setTimeout(() => res.end(eventos.slice(meio) + 'data: [DONE]\n\n'), 20)
  })
})

gateway.listen(portaGateway, '127.0.0.1')
openai.listen(portaOpenai, '127.0.0.1')
console.log(`mocks: gateway ${portaGateway} -> postgrest ${portaPostgrest}, openai ${portaOpenai}`)
