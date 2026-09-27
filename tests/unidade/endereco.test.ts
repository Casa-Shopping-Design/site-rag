import { describe, expect, it, vi } from 'vitest'

import robots from '@/app/robots'
import { enderecoDoSite, podeIndexar } from '@/lib/endereco'

describe('enderecoDoSite', () => {
  it('usa o endereco definido, sem barra no fim', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://site-rag.vercel.app/')
    expect(enderecoDoSite()).toBe('https://site-rag.vercel.app')
  })

  it('sem variavel, cai no endereco de producao da Vercel', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'site-rag-abc.vercel.app')
    expect(enderecoDoSite()).toBe('https://site-rag-abc.vercel.app')
  })
})

describe('indexacao', () => {
  it('endereco de teste fica fora dos buscadores', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://site-rag.vercel.app')
    expect(podeIndexar()).toBe(false)
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' })
  })

  it('dominio oficial libera as paginas publicas', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://casashoppingdesign.com.br')
    expect(podeIndexar()).toBe(true)
    expect(robots().sitemap).toBe('https://casashoppingdesign.com.br/sitemap.xml')
  })
})
