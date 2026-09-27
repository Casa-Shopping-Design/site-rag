'use client'

import Link from 'next/link'
import { useState } from 'react'

type Situacao = 'editando' | 'enviando' | 'enviado' | 'erro'

const estiloCampo =
  'mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto outline-none focus:border-destaque'

export default function FormularioLead({
  origem = 'site',
  aviso,
  compacto = false,
}: {
  origem?: 'site' | 'assistente'
  aviso: string
  compacto?: boolean
}) {
  const [situacao, setSituacao] = useState<Situacao>('editando')
  const [mensagemErro, setMensagemErro] = useState('')

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const campos = new FormData(evento.currentTarget)
    setSituacao('enviando')

    const resposta = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: campos.get('nome'),
        telefone: campos.get('telefone'),
        email: campos.get('email'),
        tipoEspaco: campos.get('tipoEspaco'),
        mensagem: campos.get('mensagem') ?? '',
        origem,
        consentimento: campos.get('consentimento') === 'on',
      }),
    }).catch(() => null)

    if (resposta?.ok) {
      setSituacao('enviado')
      return
    }
    const corpo = await resposta?.json().catch(() => null)
    setMensagemErro(corpo?.erro ?? 'Não foi possível enviar agora.')
    setSituacao('erro')
  }

  if (situacao === 'enviado') {
    return (
      <p className="rounded-padrao border border-borda bg-destaque-claro p-4 text-sm text-texto">
        Recebemos seu contato. A administração vai falar com você em breve.
      </p>
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-3 text-sm">
      <label className="block">
        Nome
        <input name="nome" required minLength={2} maxLength={120} className={estiloCampo} autoComplete="name" />
      </label>
      <div className={compacto ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
        <label className="block">
          Telefone ou WhatsApp
          <input name="telefone" type="tel" maxLength={30} className={estiloCampo} autoComplete="tel" />
        </label>
        <label className="block">
          E-mail
          <input name="email" type="email" maxLength={160} className={estiloCampo} autoComplete="email" />
        </label>
      </div>
      <label className="block">
        Que tipo de espaço procura?
        <input
          name="tipoEspaco"
          maxLength={120}
          placeholder="Ex.: loja no térreo, sala para escritório"
          className={estiloCampo}
        />
      </label>
      {!compacto && (
        <label className="block">
          Mensagem (opcional)
          <textarea name="mensagem" rows={3} maxLength={2000} className={estiloCampo} />
        </label>
      )}
      <label className="flex items-start gap-2 text-xs text-texto-suave">
        <input name="consentimento" type="checkbox" required className="mt-0.5" />
        <span>
          {aviso}{' '}
          <Link href="/privacidade" className="underline hover:text-destaque">
            Política de privacidade
          </Link>
        </span>
      </label>
      {situacao === 'erro' && <p className="text-xs text-destaque">{mensagemErro}</p>}
      <button
        type="submit"
        disabled={situacao === 'enviando'}
        className="rounded-full bg-primaria px-5 py-2 font-medium text-fundo disabled:opacity-60"
      >
        {situacao === 'enviando' ? 'Enviando...' : 'Quero ser contatado'}
      </button>
    </form>
  )
}
