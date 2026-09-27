// Protecoes de entrada das rotas POST: limite por IP, tamanho do corpo e origem.
//
// O limite por IP fica em memoria. Na Vercel cada instancia tem a sua
// contagem, entao serve para segurar abuso bobo, nao ataque. Se o uso crescer,
// trocar por Upstash ou por uma tabela no Supabase.
const registros = new Map<string, number[]>()

export function passouDoLimite(chave: string, { maximo = 15, janelaMs = 60_000 } = {}) {
  const agora = Date.now()
  const recentes = (registros.get(chave) ?? []).filter((momento) => agora - momento < janelaMs)
  recentes.push(agora)
  registros.set(chave, recentes)

  if (registros.size > 5000) registros.clear()
  return recentes.length > maximo
}

export function ipDaRequisicao(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

// Recusa POST vindo de pagina de outro site (CSRF). Navegador sempre manda
// Origin em POST; quando falta, e cliente fora do navegador, e ai o
// Sec-Fetch-Site, se vier, ainda precisa ser do proprio site.
export function origemPermitida(request: Request) {
  const origem = request.headers.get('origin')
  if (!origem) {
    const site = request.headers.get('sec-fetch-site')
    return !site || site === 'same-origin' || site === 'none'
  }

  let hostOrigem: string
  try {
    hostOrigem = new URL(origem).host
  } catch {
    return false
  }

  const hostsAceitos = [request.headers.get('x-forwarded-host'), request.headers.get('host')]
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) hostsAceitos.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).host)
  } catch {
    // URL mal escrita no ambiente: vale so o host da requisicao.
  }
  return hostsAceitos.some((host) => host === hostOrigem)
}

type LeituraCorpo = { ok: true; dados: unknown } | { ok: false; status: 400 | 413 }

// Le o JSON parando no limite, sem confiar no Content-Length (pode faltar ou mentir).
export async function lerJsonLimitado(request: Request, limiteBytes: number): Promise<LeituraCorpo> {
  const declarado = Number(request.headers.get('content-length'))
  if (declarado > limiteBytes) return { ok: false, status: 413 }
  if (!request.body) return { ok: false, status: 400 }

  const leitor = request.body.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.byteLength
    if (total > limiteBytes) {
      await leitor.cancel().catch(() => {})
      return { ok: false, status: 413 }
    }
    partes.push(value)
  }

  const bytes = new Uint8Array(total)
  let posicao = 0
  for (const parte of partes) {
    bytes.set(parte, posicao)
    posicao += parte.byteLength
  }

  try {
    return { ok: true, dados: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, status: 400 }
  }
}
