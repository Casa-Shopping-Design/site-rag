import type { MetadataRoute } from 'next'

import { site } from '@/lib/conteudo'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || site.url
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/area-do-lojista', '/entrar', '/api/'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
