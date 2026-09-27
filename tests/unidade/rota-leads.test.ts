import { beforeEach, describe, expect, it, vi } from 'vitest'

const falsos = vi.hoisted(() => ({
  configurado: vi.fn(() => true),
  insert: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/servidor', () => ({
  supabaseConfigurado: falsos.configurado,
  clienteServidor: vi.fn(async () => ({ from: falsos.from })),
}))

import { POST } from '@/app/api/leads/route'
import { AVISO_CONSENTIMENTO } from '@/lib/lgpd'

let contadorIp = 0

// Cada pedido sai de um IP diferente para o limite de 5 envios nao interferir
// nos outros testes.
function pedido(corpo: unknown, { ip = `10.2.0.${++contadorIp}`, cabecalhos = {} as Record<string, string> } = {}) {
  return new Request('http://site.local/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, ...cabecalhos },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  })
}

const valido = {
  nome: 'Pessoa Ficticia',
  telefone: '(79) 90000-0000',
  email: '',
  tipoEspaco: 'sala para escritorio',
  consentimento: true,
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  falsos.configurado.mockReturnValue(true)
  // insert devolve a promessa do resultado e ainda expoe .select, para
  // o teste conferir que a rota nao encadeia leitura depois de gravar
  falsos.insert.mockImplementation(() => Object.assign(Promise.resolve({ error: null }), { select: falsos.select }))
  falsos.from.mockReturnValue({ insert: falsos.insert })
})

describe('POST /api/leads', () => {
  it('grava o lead com o aviso aceito e sem .select()', async () => {
    const resposta = await POST(pedido(valido))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(falsos.from).toHaveBeenCalledWith('leads')
    expect(falsos.insert).toHaveBeenCalledWith({
      nome: 'Pessoa Ficticia',
      telefone: '(79) 90000-0000',
      email: null,
      tipo_espaco: 'sala para escritorio',
      mensagem: null,
      origem: 'site',
      consentimento: true,
      consentimento_texto: AVISO_CONSENTIMENTO,
    })
    expect(falsos.select).not.toHaveBeenCalled()
  })

  it('aceita so e-mail, sem telefone', async () => {
    const resposta = await POST(pedido({ ...valido, telefone: '', email: 'pessoa@exemplo.test', origem: 'assistente' }))
    expect(resposta.status).toBe(200)
    expect(falsos.insert).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: null, email: 'pessoa@exemplo.test', origem: 'assistente' }),
    )
  })

  it.each([
    ['sem consentimento', { ...valido, consentimento: undefined }],
    ['consentimento falso', { ...valido, consentimento: false }],
    ['consentimento como texto', { ...valido, consentimento: 'on' }],
    ['sem telefone e sem e-mail', { ...valido, telefone: '', email: '' }],
    ['e-mail invalido', { ...valido, telefone: '', email: 'nao-e-email' }],
    ['nome curto', { ...valido, nome: 'A' }],
    ['origem desconhecida', { ...valido, origem: 'whatsapp' }],
    ['telefone longo demais', { ...valido, telefone: '9'.repeat(31) }],
  ])('recusa %s com 400', async (_caso, corpo) => {
    const resposta = await POST(pedido(corpo))
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).erro).toContain('aviso de privacidade')
    expect(falsos.insert).not.toHaveBeenCalled()
  })

  it('recusa corpo que nao e JSON', async () => {
    const resposta = await POST(pedido('{nome: quebrado'))
    expect(resposta.status).toBe(400)
  })

  it('valida antes de olhar a configuracao', async () => {
    falsos.configurado.mockReturnValue(false)
    expect((await POST(pedido({ nome: 'x' }))).status).toBe(400)
  })

  it('responde 503 sem Supabase configurado', async () => {
    falsos.configurado.mockReturnValue(false)
    const resposta = await POST(pedido(valido))
    expect(resposta.status).toBe(503)
    expect(falsos.from).not.toHaveBeenCalled()
  })

  it('responde 500 quando o banco recusa, sem vazar a mensagem do banco', async () => {
    falsos.insert.mockImplementation(() =>
      Object.assign(Promise.resolve({ error: { message: 'new row violates row-level security policy' } }), {
        select: falsos.select,
      }),
    )
    const resposta = await POST(pedido(valido))
    expect(resposta.status).toBe(500)
    expect(JSON.stringify(await resposta.json())).not.toContain('row-level')
  })

  it('recusa com 403 envio vindo de outro site', async () => {
    const resposta = await POST(pedido(valido, { cabecalhos: { origin: 'https://outro-site.test', host: 'site.local' } }))
    expect(resposta.status).toBe(403)
    expect(falsos.insert).not.toHaveBeenCalled()
  })

  it('aceita envio da mesma origem', async () => {
    const resposta = await POST(pedido(valido, { cabecalhos: { origin: 'http://site.local', host: 'site.local' } }))
    expect(resposta.status).toBe(200)
  })

  it('recusa com 413 corpo acima de 16 KB', async () => {
    const resposta = await POST(pedido({ ...valido, mensagem: 'a'.repeat(17 * 1024) }))
    expect(resposta.status).toBe(413)
    expect(falsos.insert).not.toHaveBeenCalled()
  })

  it('campo isca preenchido responde ok sem gravar', async () => {
    const resposta = await POST(pedido({ ...valido, site: 'https://robo.test' }))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(falsos.insert).not.toHaveBeenCalled()
  })

  it('responde 429 no 6o envio do mesmo IP em 10 minutos', async () => {
    const ip = '10.250.0.1'
    for (let vez = 1; vez <= 5; vez++) {
      expect((await POST(pedido(valido, { ip }))).status).toBe(200)
    }
    const resposta = await POST(pedido(valido, { ip }))
    expect(resposta.status).toBe(429)
    expect(falsos.insert).toHaveBeenCalledTimes(5)
  })
})
