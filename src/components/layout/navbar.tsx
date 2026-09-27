import Link from 'next/link'

import Container from '@/components/layout/container'
import LinkMenu from '@/components/layout/link-menu'
import { site } from '@/lib/conteudo'

const links = [
  { rotulo: 'Lojas', href: '/lojas' },
  { rotulo: 'Locação', href: '/locacao' },
  { rotulo: 'Contato', href: '/contato' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-borda bg-fundo/95 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-3 py-2">
        <Link href="/" className="min-w-0 py-1 leading-tight">
          <span className="block font-titulo text-lg text-primaria sm:text-xl">{site.nome}</span>
          <span className="block text-[0.65rem] uppercase tracking-[0.22em] text-texto-suave">
            {site.complemento}
          </span>
        </Link>
        <nav aria-label="Menu principal" className="flex shrink-0 items-center gap-4 text-sm sm:gap-7">
          {links.map((link) => (
            <LinkMenu key={link.href} href={link.href} className="hidden py-3 sm:inline-block">
              {link.rotulo}
            </LinkMenu>
          ))}
          <Link
            href="/area-do-lojista"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-borda-campo px-4 text-texto transition-colors hover:border-destaque hover:text-destaque"
          >
            Área do lojista
          </Link>
        </nav>
      </Container>
      <Container className="sm:hidden">
        <nav aria-label="Menu principal no celular" className="-ml-3 flex text-sm">
          {links.map((link) => (
            <LinkMenu key={link.href} href={link.href} className="px-3 py-3">
              {link.rotulo}
            </LinkMenu>
          ))}
        </nav>
      </Container>
    </header>
  )
}
