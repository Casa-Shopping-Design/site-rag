import type { Loja } from '@/types/conteudo'

function CartaoLoja({ loja }: { loja: Loja }) {
  const local = [loja.piso, loja.sala && `Sala ${loja.sala}`].filter(Boolean).join(' · ')

  return (
    <li className="rounded-padrao border border-borda bg-superficie p-5">
      <p className="font-medium text-primaria">{loja.nome}</p>
      {loja.descricao && <p className="mt-1 text-sm text-texto-suave">{loja.descricao}</p>}
      {local && <p className="mt-2 text-xs text-texto-suave">{local}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {loja.telefone && (
          <a href={`tel:+55${loja.telefone.replace(/\D/g, '')}`} className="text-primaria hover:text-destaque">
            {loja.telefone}
          </a>
        )}
        {loja.instagram && (
          <a href={loja.instagram} target="_blank" rel="noreferrer" className="text-primaria hover:text-destaque">
            Instagram
          </a>
        )}
        {loja.site && (
          <a href={loja.site} target="_blank" rel="noreferrer" className="text-primaria hover:text-destaque">
            Site
          </a>
        )}
      </div>
    </li>
  )
}

export default function ListaLojas({ lojas, compacta = false }: { lojas: Loja[]; compacta?: boolean }) {
  if (!lojas.length) {
    return <p className="mt-8 text-texto-suave">A lista de lojistas será publicada em breve.</p>
  }

  if (compacta) {
    return (
      <ul className="mt-8 flex flex-wrap gap-2">
        {lojas.map((loja) => (
          <li key={loja.id} className="rounded-full border border-borda bg-fundo px-4 py-1.5 text-sm text-texto">
            {loja.nome}
          </li>
        ))}
      </ul>
    )
  }

  const grupos = lojas.reduce<Record<string, Loja[]>>((acumulado, loja) => {
    const chave = loja.segmento ?? 'Outros'
    acumulado[chave] = [...(acumulado[chave] ?? []), loja]
    return acumulado
  }, {})
  const ordem = Object.keys(grupos).sort((a, b) => (a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b)))

  return (
    <div className="mt-8 space-y-12">
      {ordem.map((segmento) => (
        <section key={segmento}>
          <h2 className="text-xl text-primaria">{segmento}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupos[segmento].map((loja) => (
              <CartaoLoja key={loja.id} loja={loja} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
