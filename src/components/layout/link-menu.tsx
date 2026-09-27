'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

// Marca a pagina atual para quem enxerga e para o leitor de tela
export default function LinkMenu({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const atual = usePathname() === href

  return (
    <Link
      href={href}
      aria-current={atual ? 'page' : undefined}
      className={cn(
        'transition-colors hover:text-primaria',
        atual ? 'font-medium text-primaria underline decoration-salmao decoration-2 underline-offset-8' : 'text-texto-suave',
        className,
      )}
    >
      {children}
    </Link>
  )
}
