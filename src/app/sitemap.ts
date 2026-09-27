import type { MetadataRoute } from 'next'

import { enderecoDoSite } from '@/lib/endereco'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = enderecoDoSite()
  return ['', '/lojas', '/locacao', '/contato', '/privacidade'].map((caminho) => ({
    url: `${base}${caminho}`,
    changeFrequency: 'weekly',
  }))
}
