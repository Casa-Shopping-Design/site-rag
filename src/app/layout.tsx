import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'

import Assistente from '@/components/assistente/assistente'
import Navbar from '@/components/layout/navbar'
import Rodape from '@/components/layout/rodape'
import { site } from '@/lib/conteudo'
import { AVISO_CONSENTIMENTO } from '@/lib/lgpd'
import { dadosEstruturados } from '@/lib/seo'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || site.url),
  title: { default: site.seo.titulo, template: site.seo.template },
  description: site.descricaoCurta,
  keywords: site.seo.palavrasChave,
}

export const viewport: Viewport = {
  themeColor: '#7e1a3c',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
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
