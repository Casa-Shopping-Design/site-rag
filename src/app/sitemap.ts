import type { MetadataRoute } from 'next'

import { site } from '@/lib/conteudo'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || site.url
  return ['', '/lojas', '/locacao', '/contato', '/privacidade'].map((caminho) => ({
    url: `${base}${caminho}`,
    changeFrequency: 'weekly',
  }))
}
