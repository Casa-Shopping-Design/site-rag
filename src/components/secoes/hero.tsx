import Image from 'next/image'
import Link from 'next/link'

import Container from '@/components/layout/container'
import { site } from '@/lib/conteudo'

export default function Hero() {
  return (
    <section className="border-b border-borda">
      <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-destaque">
            {site.complemento} · {site.bairro}, {site.cidade}
          </p>
          <h1 className="mt-4 text-4xl leading-tight text-primaria sm:text-6xl">{site.chamada}</h1>
          <p className="mt-5 max-w-xl text-lg text-texto-suave">{site.subchamada}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/lojas"
              className="rounded-full bg-primaria px-6 py-3 text-sm font-medium text-fundo transition-opacity hover:opacity-90"
            >
              Conhecer os lojistas
            </Link>
            <Link
              href="/locacao"
              className="rounded-full border border-primaria px-6 py-3 text-sm font-medium text-primaria transition-colors hover:border-destaque hover:text-destaque"
            >
              Alugar sala, loja ou auditório
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-padrao border border-borda sm:aspect-[4/3] lg:aspect-[4/5]">
          {/* 484px: coluna da direita do max-w-6xl no desktop */}
          <Image
            src="/images/estacionamento.webp"
            alt="Fachada do Casa Shopping Design com o estacionamento em frente"
            fill
            preload
            fetchPriority="high"
            sizes="(min-width: 1024px) 484px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-salmao" aria-hidden />
        </div>
      </Container>
    </section>
  )
}
