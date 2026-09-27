// Sobe a pilha simulada do E2E: banco de teste, PostgREST, mocks e o site
// compilado apontando para eles. Encerra tudo ao receber SIGINT ou SIGTERM.
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { banco, chaveAnon, portas, postgres, segredoJwt, urlSite, urlSupabase } from './ambiente.mjs'

const apoio = dirname(fileURLToPath(import.meta.url))
const raiz = join(apoio, '..', '..', '..')
const binarioPostgrest = process.env.POSTGREST_BIN || '/var/tmp/postgrest'
const processos = []

function psql(...argumentos) {
  execFileSync(
    'psql',
    ['-h', postgres.host, '-p', postgres.porta, '-U', postgres.usuario, '-v', 'ON_ERROR_STOP=1', '-q', ...argumentos],
    { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, PGOPTIONS: '--client-min-messages=warning' } },
  )
}

function prepararBanco() {
  console.log(`[pilha] recriando o banco ${banco}`)
  psql('-d', 'postgres', '-c', `drop database if exists ${banco} with (force)`, '-c', `create database ${banco}`)
  psql('-d', banco, '-f', join(apoio, 'shim-supabase.sql'))
  const pastaMigrations = join(raiz, 'supabase', 'migrations')
  for (const arquivo of readdirSync(pastaMigrations).filter((nome) => nome.endsWith('.sql')).sort()) {
    psql('-d', banco, '-f', join(pastaMigrations, arquivo))
  }
  psql('-d', banco, '-f', join(apoio, 'semear.sql'))
  psql('-d', banco, '-c', 'grant anon, authenticated to authenticator')
}

function iniciar(nome, comando, argumentos, env = {}) {
  const filho = spawn(comando, argumentos, { cwd: raiz, env: { ...process.env, ...env }, stdio: 'inherit' })
  filho.on('exit', (codigo) => {
    if (!encerrando) {
      console.error(`[pilha] ${nome} saiu com codigo ${codigo}`)
      encerrar(1)
    }
  })
  processos.push(filho)
  return filho
}

async function esperar(url, limiteMs = 30_000) {
  const inicio = Date.now()
  while (Date.now() - inicio < limiteMs) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((ok) => setTimeout(ok, 300))
    }
  }
  throw new Error(`nao respondeu a tempo: ${url}`)
}

let encerrando = false
function encerrar(codigo = 0) {
  encerrando = true
  for (const filho of processos) {
    if (filho.exitCode === null) filho.kill('SIGTERM')
  }
  process.exit(codigo)
}
process.on('SIGINT', () => encerrar(0))
process.on('SIGTERM', () => encerrar(0))

const envSite = {
  NEXT_PUBLIC_SITE_URL: urlSite,
  NEXT_PUBLIC_SUPABASE_URL: urlSupabase,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: chaveAnon(),
  OPENAI_API_KEY: 'chave-falsa-do-e2e',
  OPENAI_BASE_URL: `http://127.0.0.1:${portas.openai}/v1`,
  NEXT_TELEMETRY_DISABLED: '1',
}

try {
  prepararBanco()

  const pastaTemporaria = mkdtempSync(join(tmpdir(), 'scd-e2e-'))
  const configPostgrest = join(pastaTemporaria, 'postgrest.conf')
  writeFileSync(
    configPostgrest,
    [
      `db-uri = "postgres://authenticator@/${banco}?host=${postgres.host}&port=${postgres.porta}"`,
      'db-schemas = "public"',
      'db-anon-role = "anon"',
      `jwt-secret = "${segredoJwt}"`,
      `server-port = ${portas.postgrest}`,
      'server-host = "127.0.0.1"',
    ].join('\n'),
  )
  iniciar('postgrest', binarioPostgrest, [configPostgrest])
  iniciar('mocks', process.execPath, [join(apoio, 'mocks.mjs')], {
    PORTA_GATEWAY: String(portas.gateway),
    PORTA_POSTGREST: String(portas.postgrest),
    PORTA_OPENAI: String(portas.openai),
  })
  await esperar(`http://127.0.0.1:${portas.postgrest}/`)
  await esperar(`${urlSupabase}/rest/v1/`)

  // A home e pre-renderizada no build e ja le as lojas, por isso o build
  // precisa da pilha no ar e das variaveis apontando para ela.
  if (process.env.PULAR_BUILD !== '1') {
    console.log('[pilha] compilando o site para a pilha simulada')
    execFileSync(process.execPath, [join(raiz, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'], {
      cwd: raiz,
      env: { ...process.env, ...envSite },
      stdio: 'inherit',
    })
  }

  iniciar('next', process.execPath, [join(raiz, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(portas.site), '-H', '127.0.0.1'], envSite)
  console.log(`[pilha] site em ${urlSite}`)
} catch (erro) {
  console.error('[pilha] falhou ao subir:', erro.message)
  encerrar(1)
}
