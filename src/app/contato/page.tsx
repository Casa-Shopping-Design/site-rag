import Container from '@/components/layout/container'
import TituloSecao from '@/components/secoes/titulo-secao'
import Visita from '@/components/secoes/visita'
import { linkWhatsApp, preenchido, site } from '@/lib/conteudo'
import { montarMetadata } from '@/lib/seo'

export const metadata = montarMetadata({
  titulo: 'Contato',
  descricao: 'Endereço, horários e contato da administração do Casa Shopping Design.',
  caminho: '/contato',
})

export default function PaginaContato() {
  const { telefone, email, instagram } = site.contato
  const whatsapp = linkWhatsApp()
  const temContato = whatsapp || preenchido(telefone) || preenchido(email) || preenchido(instagram)

  return (
    <>
      <Container className="pt-16">
        <TituloSecao rotulo="Contato" titulo="Administração do centro" principal />
        {temContato ? (
          <ul className="mt-6 space-y-2 text-sm">
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noreferrer" className="text-destaque hover:underline">
                  Conversar pelo WhatsApp{' '}
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </li>
            )}
            {preenchido(telefone) && <li>Telefone: {telefone}</li>}
            {preenchido(email) && (
              <li>
                E-mail: <a href={`mailto:${email}`} className="hover:text-destaque">{email}</a>
              </li>
            )}
            {preenchido(instagram) && (
              <li>
                <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-destaque">
                  Instagram <span className="sr-only">(abre em nova aba)</span>
                </a>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-texto-suave">Os canais de contato serão publicados em breve.</p>
        )}
      </Container>
      <Visita />
    </>
  )
}
