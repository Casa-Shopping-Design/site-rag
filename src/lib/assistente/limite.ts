// Limite simples por IP, em memoria. Na Vercel cada instancia tem a sua
// contagem, entao serve para segurar abuso bobo, nao ataque. Se o uso crescer,
// trocar por Upstash ou por uma tabela no Supabase.
const janelaMs = 60_000
const maximoPorJanela = 15
const registros = new Map<string, number[]>()

export function passouDoLimite(chave: string) {
  const agora = Date.now()
  const recentes = (registros.get(chave) ?? []).filter((momento) => agora - momento < janelaMs)
  recentes.push(agora)
  registros.set(chave, recentes)

  if (registros.size > 5000) registros.clear()
  return recentes.length > maximoPorJanela
}
