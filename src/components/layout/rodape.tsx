import Link from 'next/link'

import Container from '@/components/layout/container'
import { enderecoCompleto, preenchido, site } from '@/lib/conteudo'

export default function Rodape() {
  const { email, telefone, instagram } = site.contato

  return (
    <footer className="mt-24 border-t border-borda bg-superficie">
      <Container className="grid gap-8 py-12 text-sm sm:grid-cols-3">
        <div>
          <p className="font-titulo text-lg text-primaria">{site.nome}</p>
          <p className="mt-2 text-texto-suave">{site.descricaoCurta}</p>
        </div>
        <div className="space-y-1 text-texto-suave">
          {enderecoCompleto() && <p>{enderecoCompleto()}</p>}
          {preenchido(telefone) && <p>{telefone}</p>}
          {preenchido(email) && <p>{email}</p>}
          {preenchido(instagram) && (
            <a href={instagram} className="hover:text-destaque" target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
        </div>
        <div className="flex flex-col gap-1 text-texto-suave sm:items-end">
          <Link href="/locacao" className="hover:text-destaque">Quero alugar um espaço</Link>
          <Link href="/area-do-lojista" className="hover:text-destaque">Área do lojista</Link>
          <Link href="/privacidade" className="hover:text-destaque">Privacidade</Link>
        </div>
      </Container>
      <Container className="pb-8 text-xs text-texto-suave">
        © {new Date().getFullYear()} {site.nome}
      </Container>
    </footer>
  )
}
