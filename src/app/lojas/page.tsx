import Container from '@/components/layout/container'
import ListaLojas from '@/components/secoes/lista-lojas'
import TituloSecao from '@/components/secoes/titulo-secao'
import { lojasAtivas } from '@/lib/perfil'
import { montarMetadata } from '@/lib/seo'

export const metadata = montarMetadata({
  titulo: 'Lojas',
  descricao: 'Lojas, clínicas, escritórios e escolas do Casa Shopping Design.',
  caminho: '/lojas',
})
export const revalidate = 300

export default async function PaginaLojas() {
  const lojas = await lojasAtivas()

  return (
    <Container className="py-16">
      <TituloSecao rotulo="Lojistas" titulo="Lojistas do centro" />
      <ListaLojas lojas={lojas} />
    </Container>
  )
}
