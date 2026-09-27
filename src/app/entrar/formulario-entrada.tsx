'use client'

import { useActionState, useEffect, useRef } from 'react'

import { enviarLink, type EstadoEntrada } from './acoes'

const inicial: EstadoEntrada = { situacao: 'inicio' }

export default function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(enviarLink, inicial)
  const confirmacao = useRef<HTMLParagraphElement>(null)
  const temErro = estado.situacao === 'erro'

  useEffect(() => {
    if (estado.situacao === 'enviado') confirmacao.current?.focus()
  }, [estado.situacao])

  if (estado.situacao === 'enviado') {
    return (
      <p ref={confirmacao} tabIndex={-1} role="status" className="rounded-padrao bg-destaque-claro p-4 text-sm text-texto">
        {estado.mensagem}
      </p>
    )
  }

  return (
    <form action={acao} className="space-y-3 text-sm" aria-busy={enviando}>
      <label htmlFor="email-entrada" className="block">
        E-mail cadastrado
      </label>
      <input
        id="email-entrada"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        aria-invalid={temErro || undefined}
        aria-describedby={temErro ? 'erro-entrada' : undefined}
        className="block min-h-11 w-full rounded-lg border border-borda-campo bg-fundo px-3 py-2 text-base text-texto focus:border-foco aria-[invalid=true]:border-destaque sm:text-sm"
      />
      <p id="erro-entrada" role="alert" className="text-sm text-destaque empty:hidden">
        {temErro ? estado.mensagem : ''}
      </p>
      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 rounded-full bg-primaria px-5 py-2 font-medium text-fundo disabled:opacity-60"
      >
        {enviando ? 'Enviando...' : 'Receber link de acesso'}
      </button>
      <p role="status" className="sr-only">
        {enviando ? 'Enviando o link de acesso.' : ''}
      </p>
    </form>
  )
}
