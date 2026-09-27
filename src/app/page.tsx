import Link from 'next/link'

import Container from '@/components/layout/container'
import Hero from '@/components/secoes/hero'
import ListaLojas from '@/components/secoes/lista-lojas'
import Perguntas from '@/components/secoes/perguntas'
import Sobre from '@/components/secoes/sobre'
import TituloSecao from '@/components/secoes/titulo-secao'
import Visita from '@/components/secoes/visita'
import { lojasAtivas } from '@/lib/perfil'
import { montarMetadata } from '@/lib/seo'

export const metadata = montarMetadata()
export const revalidate = 300

export default async function Inicio() {
  const lojas = await lojasAtivas()

  return (
    <>
      <Hero />
      <Sobre />
      <section className="border-y border-borda bg-superficie py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TituloSecao rotulo="Lojistas" titulo="Quem está no Casa Design" />
            {lojas.length > 0 && (
              <Link href="/lojas" className="inline-block py-2 text-sm text-destaque underline-offset-4 hover:underline">
                Ver contatos e segmentos
              </Link>
            )}
          </div>
          <ListaLojas lojas={lojas} compacta />
        </Container>
      </section>
      <Visita />
      <section className="py-4">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 rounded-padrao bg-primaria p-8 text-fundo sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl sm:text-3xl">Quer ter sua sala ou loja aqui?</h2>
              <p className="mt-2 max-w-lg text-sm opacity-80">
                Salas, lojas, auditório e espaço para eventos. Deixe seu contato e a administração retorna com as
                condições.
              </p>
            </div>
            <Link href="/locacao" className="rounded-full bg-fundo px-6 py-3 text-sm font-medium text-primaria">
              Ver espaços
            </Link>
          </div>
        </Container>
      </section>
      <Perguntas />
    </>
  )
}
