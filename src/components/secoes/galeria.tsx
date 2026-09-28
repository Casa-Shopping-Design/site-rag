import Image from 'next/image'

import Container from '@/components/layout/container'
import TituloSecao from '@/components/secoes/titulo-secao'
import { preenchido, site } from '@/lib/conteudo'

export default function Galeria() {
  const fotos = site.galeria.filter((foto) => preenchido(foto.imagem))
  if (fotos.length === 0) return null

  const perfilInstagram = site.contato.instagram.replace(/\/+$/, '').split('/').pop()

  return (
    <section className="py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TituloSecao
            rotulo="Por dentro"
            titulo="Um passeio pelo centro"
            texto="Corredores cobertos, vitrines de vidro e estacionamento na porta."
          />
          {preenchido(site.contato.instagram) && (
            <a
              href={site.contato.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-block py-2 text-sm text-destaque underline-offset-4 hover:underline"
            >
              Mais vídeos no Instagram @{perfilInstagram} <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {fotos.map((foto) => (
            <li key={foto.imagem} className="relative aspect-[3/4] overflow-hidden rounded-padrao border border-borda">
              {/* 368px: um terco do max-w-6xl no desktop */}
              <Image
                src={foto.imagem}
                alt={foto.alt}
                fill
                sizes="(min-width: 1024px) 368px, 50vw"
                className="object-cover"
              />
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 text-sm font-medium text-white">
                {foto.legenda}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
