import Image from 'next/image'
import Link from 'next/link'

import Container from '@/components/layout/container'
import VideoTour from '@/components/secoes/video-tour'
import { preenchido, site } from '@/lib/conteudo'

export default function Hero({ quantidadeLojas = 0 }: { quantidadeLojas?: number }) {
  const destaques = [
    ...(quantidadeLojas > 0 ? [{ valor: String(quantidadeLojas), rotulo: 'lojistas e serviços' }] : []),
    ...site.destaques.filter((d) => preenchido(d.valor)),
  ]

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
          {destaques.length > 0 && (
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-borda pt-6 sm:grid-cols-4">
              {destaques.map((destaque) => (
                <li key={destaque.rotulo}>
                  <span className="block font-titulo text-2xl text-primaria">{destaque.valor}</span>
                  <span className="block text-xs text-texto-suave">{destaque.rotulo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-padrao border border-borda bg-primaria sm:mx-auto sm:w-full sm:max-w-md lg:max-w-none">
          {/* Imagem por baixo: aparece antes do video carregar e fica quando ele nao toca */}
          {/* 484px: coluna da direita do max-w-6xl; 448px: max-w-md no tablet */}
          <Image
            src={site.tour.poster}
            alt=""
            fill
            preload
            fetchPriority="high"
            sizes="(min-width: 1024px) 484px, (min-width: 640px) 448px, 100vw"
            className="object-cover"
          />
          <VideoTour video={site.tour.video} poster={site.tour.poster} descricao={site.tour.descricao} />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-salmao" aria-hidden />
        </div>
      </Container>
    </section>
  )
}
