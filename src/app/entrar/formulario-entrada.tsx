'use client'

import { useActionState } from 'react'

import { enviarLink, type EstadoEntrada } from './acoes'

const inicial: EstadoEntrada = { situacao: 'inicio' }

export default function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(enviarLink, inicial)

  if (estado.situacao === 'enviado') {
    return <p className="rounded-padrao bg-destaque-claro p-4 text-sm">{estado.mensagem}</p>
  }

  return (
    <form action={acao} className="space-y-3 text-sm">
      <label className="block">
        E-mail cadastrado
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 outline-none focus:border-destaque"
        />
      </label>
      {estado.situacao === 'erro' && <p className="text-xs text-destaque">{estado.mensagem}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-full bg-primaria px-5 py-2 font-medium text-fundo disabled:opacity-60"
      >
        {enviando ? 'Enviando...' : 'Receber link de acesso'}
      </button>
    </form>
  )
}
