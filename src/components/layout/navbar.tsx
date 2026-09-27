import Link from 'next/link'

import Container from '@/components/layout/container'
import { site } from '@/lib/conteudo'

const links = [
  { rotulo: 'Lojas', href: '/lojas' },
  { rotulo: 'Locação', href: '/locacao' },
  { rotulo: 'Contato', href: '/contato' },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-borda bg-fundo/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="leading-tight">
          <span className="block font-titulo text-lg text-primaria sm:text-xl">{site.nome}</span>
          <span className="block text-[0.65rem] uppercase tracking-[0.22em] text-texto-suave">
            {site.complemento}
          </span>
        </Link>
        <nav aria-label="Menu principal" className="flex items-center gap-4 text-sm sm:gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden text-texto-suave transition-colors hover:text-primaria sm:inline"
            >
              {link.rotulo}
            </Link>
          ))}
          <Link
            href="/area-do-lojista"
            className="rounded-full border border-borda px-4 py-1.5 text-texto transition-colors hover:border-destaque hover:text-destaque"
          >
            Área do lojista
          </Link>
        </nav>
      </Container>
      <Container className="flex gap-5 pb-3 text-sm sm:hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-texto-suave hover:text-primaria">
            {link.rotulo}
          </Link>
        ))}
      </Container>
    </header>
  )
}
