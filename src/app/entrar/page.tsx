import { redirect } from 'next/navigation'

import Container from '@/components/layout/container'
import { sessaoAtual } from '@/lib/perfil'
import { montarMetadata } from '@/lib/seo'

import FormularioEntrada from './formulario-entrada'

export const metadata = { ...montarMetadata({ titulo: 'Entrar', caminho: '/entrar' }), robots: { index: false } }

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sessao = await sessaoAtual()
  if (sessao.perfil !== 'visitante') redirect('/area-do-lojista')
  const { erro } = await searchParams

  return (
    <Container className="max-w-md py-20">
      <h1 className="text-3xl text-primaria">Área do lojista</h1>
      <p className="mb-6 mt-2 text-sm text-texto-suave">
        Acesso para lojistas e equipe da administração. Informe o e-mail cadastrado e enviamos um link para
        entrar, sem senha.
      </p>
      {erro && (
        <p className="mb-4 text-sm text-destaque">O link expirou ou já foi usado. Peça um novo abaixo.</p>
      )}
      <FormularioEntrada />
      <p className="mt-6 text-xs text-texto-suave">
        Ainda não tem acesso? Peça seu cadastro à administração do centro.
      </p>
    </Container>
  )
}
