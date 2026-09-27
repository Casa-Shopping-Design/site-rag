import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import Assistente from '@/components/assistente/assistente'
import Navbar from '@/components/layout/navbar'
import Rodape from '@/components/layout/rodape'
import { site } from '@/lib/conteudo'
import { enderecoDoSite, podeIndexar } from '@/lib/endereco'
import { AVISO_CONSENTIMENTO } from '@/lib/lgpd'
import { dadosEstruturados } from '@/lib/seo'

import './globals.css'

// Arquivos do fontsource, so o subconjunto latin (cobre o portugues). O next/font
// faz o preload e cria uma fonte de reserva com metrica ajustada, o que evita pulo
// de layout quando a fonte chega.
const fonteTexto = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--fonte-texto',
})

const fonteTitulo = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--fonte-titulo',
  adjustFontFallback: 'Times New Roman',
})

export const metadata: Metadata = {
  metadataBase: new URL(enderecoDoSite()),
  title: { default: site.seo.titulo, template: site.seo.template },
  description: site.descricaoCurta,
  keywords: site.seo.palavrasChave,
  robots: podeIndexar() ? undefined : { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#7e1a3c',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteTexto.variable} ${fonteTitulo.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primaria focus:px-4 focus:py-2 focus:text-fundo"
        >
          Ir para o conteúdo
        </a>
        <Navbar />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Rodape />
        <Assistente avisoLgpd={AVISO_CONSENTIMENTO} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados()) }}
        />
      </body>
    </html>
  )
}
