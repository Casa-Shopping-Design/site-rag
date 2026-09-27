import { ChevronDown } from 'lucide-react'

import Container from '@/components/layout/container'
import TituloSecao from '@/components/secoes/titulo-secao'
import { faq, preenchido } from '@/lib/conteudo'

export default function Perguntas() {
  const itens = faq.filter((item) => preenchido(item.resposta))
  if (!itens.length) return null

  return (
    <section className="py-20">
      <Container>
        <TituloSecao rotulo="Dúvidas" titulo="Perguntas frequentes" />
        <div className="mt-8 divide-y divide-borda border-y border-borda">
          {itens.map((item) => (
            <details key={item.pergunta} className="group py-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium text-primaria [&::-webkit-details-marker]:hidden">
                {item.pergunta}
                <ChevronDown size={20} aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mb-2 text-sm text-texto-suave">{item.resposta}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
