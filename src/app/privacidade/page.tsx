import Container from '@/components/layout/container'
import { preenchido, site } from '@/lib/conteudo'
import { montarMetadata } from '@/lib/seo'

export const metadata = montarMetadata({
  titulo: 'Privacidade',
  descricao: 'Como o Casa Shopping Design trata os dados pessoais recebidos pelo site.',
  caminho: '/privacidade',
})

// Texto-base. Revisar com a administração (e o jurídico, se houver) antes de publicar.
export default function PaginaPrivacidade() {
  const email = preenchido(site.contato.email) ? site.contato.email : 'o contato da administração'

  return (
    <Container className="max-w-3xl space-y-5 py-16 text-sm leading-relaxed text-texto-suave">
      <h1 className="text-3xl text-primaria">Privacidade</h1>
      <p>
        Este site é mantido pela administração do {site.nome}. Aqui explicamos quais dados pessoais recebemos
        e o que fazemos com eles, em linha com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>
      <h2 className="text-xl text-primaria">Formulário de interesse em locação</h2>
      <p>
        Quando você preenche o formulário, recebemos nome, telefone, e-mail e o tipo de espaço que procura. Usamos
        esses dados só para responder sobre locação no centro. Eles ficam guardados com acesso restrito à
        administração e não são vendidos nem repassados. Guardamos também o texto do aviso que você aceitou e a
        data do aceite.
      </p>
      <h2 className="text-xl text-primaria">Assistente do site</h2>
      <p>
        As perguntas feitas ao assistente são enviadas a um serviço de inteligência artificial para gerar a
        resposta. Não escreva dados pessoais no chat. O assistente não pede nome, telefone ou e-mail; quando for o
        caso, ele mostra o formulário acima.
      </p>
      <h2 className="text-xl text-primaria">Área do lojista</h2>
      <p>
        Lojistas entram com o e-mail cadastrado pela administração. O acesso serve para consultar documentos
        internos do centro e da própria loja.
      </p>
      <h2 className="text-xl text-primaria">Seus direitos</h2>
      <p>
        Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou retirar o consentimento.
        Basta escrever para {email}.
      </p>
    </Container>
  )
}
