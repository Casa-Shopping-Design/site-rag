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
            <details key={item.pergunta} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-primaria">
                {item.pergunta}
              </summary>
              <p className="mt-2 text-sm text-texto-suave">{item.resposta}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
