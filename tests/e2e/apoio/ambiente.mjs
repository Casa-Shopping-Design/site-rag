// Configuracao da pilha simulada, usada pelo script que sobe tudo e pelos testes.
import { createHmac } from 'node:crypto'

export const banco = process.env.BANCO_E2E || 'scd_testes'
export const portas = {
  site: Number(process.env.PORTA_SITE || 3102),
  gateway: Number(process.env.PORTA_GATEWAY || 3120),
  postgrest: Number(process.env.PORTA_POSTGREST || 3121),
  openai: Number(process.env.PORTA_OPENAI || 3122),
}
export const postgres = {
  host: process.env.PGHOST_E2E || '/var/tmp/pgt',
  porta: process.env.PGPORT_E2E || '5499',
  usuario: 'postgres',
}

// Segredo so de teste, o mesmo que o PostgREST local usa para validar o token
export const segredoJwt = 'segredo-falso-do-e2e-com-mais-de-32-caracteres'

function base64url(texto) {
  return Buffer.from(texto).toString('base64url')
}

// Chave publica no formato antigo do Supabase: JWT com role anon
export function chaveAnon() {
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = base64url(JSON.stringify({ role: 'anon', iss: 'e2e-local', exp: 4102444800 }))
  const assinatura = createHmac('sha256', segredoJwt).update(`${cabecalho}.${corpo}`).digest('base64url')
  return `${cabecalho}.${corpo}.${assinatura}`
}

export const urlSite = `http://127.0.0.1:${portas.site}`
export const urlSupabase = `http://127.0.0.1:${portas.gateway}`
