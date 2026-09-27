import type { Metadata } from 'next'

import { preenchido, site } from '@/lib/conteudo'

type Pagina = {
  titulo?: string
  descricao?: string
  caminho?: string
}

export function montarMetadata({ titulo, descricao, caminho = '/' }: Pagina = {}): Metadata {
  const texto = descricao ?? site.descricaoCurta
  const tituloFinal = titulo ?? site.seo.titulo

  return {
    title: titulo ?? { absolute: site.seo.titulo },
    description: texto,
    alternates: { canonical: caminho },
    openGraph: {
      type: 'website',
      locale: site.idioma,
      siteName: site.nome,
      title: tituloFinal,
      description: texto,
      url: caminho,
    },
  }
}

export function dadosEstruturados() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ShoppingCenter',
    name: site.nome,
    description: site.descricaoCurta,
    url: site.url,
    telephone: preenchido(site.contato.telefone) ? site.contato.telefone : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: preenchido(site.endereco) ? site.endereco : undefined,
      addressLocality: site.cidade,
      addressRegion: site.estado,
      postalCode: preenchido(site.cep) ? site.cep : undefined,
      addressCountry: 'BR',
    },
  }
}
