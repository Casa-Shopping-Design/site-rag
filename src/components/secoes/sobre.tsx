import Image from 'next/image'

import Container from '@/components/layout/container'
import TituloSecao from '@/components/secoes/titulo-secao'
import { preenchido, site } from '@/lib/conteudo'

export default function Sobre() {
  const paragrafos = site.sobre.filter(preenchido)

  return (
    <section className="py-20">
      <Container className="grid gap-12 lg:grid-cols-2">
        <div>
          <TituloSecao rotulo="O centro" titulo="Um endereço para fazer negócio" />
          {paragrafos.map((texto) => (
            <p key={texto} className="mt-4 text-texto-suave">
              {texto}
            </p>
          ))}
          <div className="relative mt-8 aspect-[3/2] overflow-hidden rounded-padrao border border-borda">
            {/* 528px: metade do max-w-6xl no desktop */}
            <Image
              src="/images/lounge.webp"
              alt="Área de convivência com poltronas no corredor central"
              fill
              sizes="(min-width: 1024px) 528px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <ul className="grid content-start gap-4 sm:grid-cols-2">
          {site.segmentos.filter((s) => preenchido(s.descricao)).map((segmento) => (
            <li key={segmento.nome} className="rounded-padrao border border-borda bg-superficie p-5">
              <p className="font-medium text-primaria">{segmento.nome}</p>
              <p className="mt-1 text-sm text-texto-suave">{segmento.descricao}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
