import Container from '@/components/layout/container'
import FormularioLead from '@/components/formularios/formulario-lead'
import ListaEspacos from '@/components/secoes/espacos'
import TituloSecao from '@/components/secoes/titulo-secao'
import { espacos } from '@/lib/conteudo'
import { AVISO_CONSENTIMENTO } from '@/lib/lgpd'
import { montarMetadata } from '@/lib/seo'

export const metadata = montarMetadata({
  titulo: 'Locação de espaços',
  descricao: 'Salas e lojas comerciais, auditório e espaço para eventos no Casa Shopping Design.',
  caminho: '/locacao',
})

export default function PaginaLocacao() {
  return (
    <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <TituloSecao
          rotulo="Locação"
          titulo="Salas, lojas e auditório"
          texto="Valores, metragens e disponibilidade são passados pela administração."
        />
        <ListaEspacos espacos={espacos} />
      </div>
      <div className="rounded-padrao border border-borda bg-superficie p-6">
        <h2 className="text-2xl text-primaria">Fale com a administração</h2>
        <p className="mb-5 mt-1 text-sm text-texto-suave">Deixe seu contato e diga o que procura.</p>
        <FormularioLead aviso={AVISO_CONSENTIMENTO} />
      </div>
    </Container>
  )
}
