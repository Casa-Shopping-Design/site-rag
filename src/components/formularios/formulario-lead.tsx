'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

type Situacao = 'editando' | 'enviando' | 'enviado' | 'erro'

const estiloCampo =
  'mt-1 block min-h-11 w-full rounded-lg border border-borda-campo bg-fundo px-3 py-2 text-base text-texto placeholder:text-texto-suave focus:border-foco aria-[invalid=true]:border-destaque sm:text-sm'

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
  const [faltaContato, setFaltaContato] = useState(false)
  const confirmacao = useRef<HTMLParagraphElement>(null)
  const telefone = useRef<HTMLInputElement>(null)

  // Dois formularios podem estar na mesma pagina (locacao e o do assistente)
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`

  useEffect(() => {
    // Leva o foco para a confirmacao, ja que o formulario some da tela
    if (situacao === 'enviado') confirmacao.current?.focus()
  }, [situacao])

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const campos = new FormData(evento.currentTarget)

    const semContato = !String(campos.get('telefone') ?? '').trim() && !String(campos.get('email') ?? '').trim()
    setFaltaContato(semContato)
    if (semContato) {
      setMensagemErro('Informe um telefone ou um e-mail para a administração responder.')
      setSituacao('erro')
      telefone.current?.focus()
      return
    }

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
        site: campos.get('site') ?? '',
      }),
    }).catch(() => null)

    if (resposta?.ok) {
      setSituacao('enviado')
      return
    }
    const corpo = await resposta?.json().catch(() => null)
    setMensagemErro(corpo?.erro ?? 'Não foi possível enviar agora. Tente de novo em instantes.')
    setSituacao('erro')
  }

  if (situacao === 'enviado') {
    return (
      <p
        ref={confirmacao}
        tabIndex={-1}
        role="status"
        className="rounded-padrao border border-borda bg-destaque-claro p-4 text-sm text-texto"
      >
        Recebemos seu contato. A administração vai falar com você em breve.
      </p>
    )
  }

  const erroNoContato = situacao === 'erro' && faltaContato
  const descricaoContato = erroNoContato ? `${idDica} ${idErro}` : idDica

  return (
    <form onSubmit={enviar} className="relative space-y-3 text-sm" aria-busy={situacao === 'enviando'}>
      {/* Isca para robo: fora da tela, fora do Tab e escondida do leitor de tela. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label>
          Deixe este campo em branco
          <input name="site" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <p id={idDica} className="text-xs text-texto-suave">
        Preencha o nome e pelo menos um contato, telefone ou e-mail.
      </p>
      <label className="block">
        Nome
        <input name="nome" required minLength={2} maxLength={120} className={estiloCampo} autoComplete="name" />
      </label>
      <div className={compacto ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
        <label className="block">
          Telefone ou WhatsApp
          <input
            ref={telefone}
            name="telefone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            className={estiloCampo}
            autoComplete="tel"
            aria-describedby={descricaoContato}
            aria-invalid={erroNoContato || undefined}
          />
        </label>
        <label className="block">
          E-mail
          <input
            name="email"
            type="email"
            maxLength={160}
            className={estiloCampo}
            autoComplete="email"
            aria-describedby={descricaoContato}
            aria-invalid={erroNoContato || undefined}
          />
        </label>
      </div>
      <label className="block">
        Que tipo de espaço procura?
        <input
          name="tipoEspaco"
          maxLength={120}
          autoComplete="off"
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
      <label className="flex items-start gap-3 text-xs text-texto-suave">
        <input name="consentimento" type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-primaria" />
        <span>
          {aviso}{' '}
          <Link href="/privacidade" className="underline hover:text-destaque">
            Política de privacidade
          </Link>
        </span>
      </label>
      <p id={idErro} role="alert" className="text-sm text-destaque empty:hidden">
        {situacao === 'erro' ? mensagemErro : ''}
      </p>
      <button
        type="submit"
        disabled={situacao === 'enviando'}
        className="min-h-11 rounded-full bg-primaria px-5 py-2 font-medium text-fundo disabled:opacity-60"
      >
        {situacao === 'enviando' ? 'Enviando...' : 'Quero ser contatado'}
      </button>
      <p role="status" className="sr-only">
        {situacao === 'enviando' ? 'Enviando seu contato.' : ''}
      </p>
    </form>
  )
}
