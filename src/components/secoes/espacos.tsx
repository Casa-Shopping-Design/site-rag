import type { Espaco } from '@/types/conteudo'

export default function ListaEspacos({ espacos }: { espacos: Espaco[] }) {
  if (!espacos.length) {
    return (
      <p className="mt-6 text-texto-suave">
        No momento não há espaços anunciados. Deixe seu contato que a administração avisa quando abrir vaga.
      </p>
    )
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {espacos.map((espaco) => (
        <li key={espaco.id} className="rounded-padrao border border-borda bg-superficie p-5">
          <p className="text-xs uppercase tracking-wider text-destaque">{espaco.tipo}</p>
          <p className="mt-1 font-medium text-primaria">{espaco.titulo}</p>
          {(espaco.area || espaco.piso) && (
            <p className="mt-1 text-sm text-texto-suave">{[espaco.area, espaco.piso].filter(Boolean).join(' · ')}</p>
          )}
          {espaco.descricao && <p className="mt-2 text-sm text-texto-suave">{espaco.descricao}</p>}
        </li>
      ))}
    </ul>
  )
}
