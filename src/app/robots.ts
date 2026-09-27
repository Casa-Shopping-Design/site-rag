import type { MetadataRoute } from 'next'

import { enderecoDoSite, podeIndexar } from '@/lib/endereco'

export default function robots(): MetadataRoute.Robots {
  if (!podeIndexar()) return { rules: { userAgent: '*', disallow: '/' } }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/area-do-lojista', '/entrar', '/api/'] },
    sitemap: `${enderecoDoSite()}/sitemap.xml`,
  }
}
