import { afterEach, describe, expect, it } from 'vitest'

import { enderecoCompleto, linkWhatsApp, preenchido, site } from '@/lib/conteudo'

const original = structuredClone(site)

afterEach(() => {
  Object.assign(site, structuredClone(original))
})

describe('preenchido', () => {
  it('aceita texto de verdade', () => {
    expect(preenchido('Ponto Novo')).toBe(true)
  })

  it.each([undefined, null, '', '   ', 'PREENCHER', 'PREENCHER: horario de domingo'])(
    'recusa %j',
    (valor) => {
      expect(preenchido(valor)).toBe(false)
    },
  )

  it('so considera PREENCHER no comeco', () => {
    expect(preenchido('Falta PREENCHER')).toBe(true)
  })
})

describe('enderecoCompleto', () => {
  it('junta endereco, bairro, cidade/UF e CEP do content/site.json', () => {
    expect(enderecoCompleto()).toBe(
      [site.endereco, site.bairro, `${site.cidade}/${site.estado}`, site.cep].join(', '),
    )
  })

  it('pula campo vazio ou marcado com PREENCHER', () => {
    site.bairro = ''
    site.cep = 'PREENCHER'
    expect(enderecoCompleto()).toBe(`${site.endereco}, ${site.cidade}/${site.estado}`)
  })
})

describe('linkWhatsApp', () => {
  it('devolve null sem numero cadastrado', () => {
    site.contato.whatsapp = ''
    expect(linkWhatsApp()).toBeNull()
  })

  it('tira mascara do numero e codifica a mensagem', () => {
    // numero ficticio, so para o teste
    site.contato.whatsapp = '+55 (79) 90000-0000'
    expect(linkWhatsApp('Oi, tudo bem?')).toBe('https://wa.me/5579900000000?text=Oi%2C%20tudo%20bem%3F')
  })

  it('usa a mensagem padrao quando nao recebe outra', () => {
    site.contato.whatsapp = '79900000000'
    const link = new URL(linkWhatsApp()!)
    expect(link.searchParams.get('text')).toContain('Casa Shopping Design')
  })
})
