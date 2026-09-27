import { redirect } from 'next/navigation'

import Container from '@/components/layout/container'
import { sessaoAtual } from '@/lib/perfil'
import { clienteServidor } from '@/lib/supabase/servidor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Área do lojista', robots: { index: false } }

type LinhaLead = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  tipo_espaco: string | null
  origem: string
  situacao: string
  criado_em: string
}

async function leadsRecentes(): Promise<LinhaLead[]> {
  const supabase = await clienteServidor()
  const { data } = await supabase
    .from('leads')
    .select('id, nome, telefone, email, tipo_espaco, origem, situacao, criado_em')
    .order('criado_em', { ascending: false })
    .limit(30)
  return data ?? []
}

export default async function AreaDoLojista() {
  const sessao = await sessaoAtual()
  if (sessao.perfil === 'visitante') redirect('/entrar')

  const leads = sessao.perfil === 'admin' ? await leadsRecentes() : []
  const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <Container className="py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-primaria">
            {sessao.perfil === 'admin' ? 'Administração' : 'Área do lojista'}
          </h1>
          <p className="mt-1 text-sm text-texto-suave">{sessao.email}</p>
        </div>
        <form action="/auth/sair" method="post">
          <button className="rounded-full border border-borda px-4 py-1.5 text-sm hover:border-destaque">Sair</button>
        </form>
      </div>

      {sessao.perfil === 'inquilino' && (
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-padrao border border-borda bg-superficie p-6">
            <h2 className="text-xl text-primaria">Sua loja</h2>
            {sessao.lojas.length ? (
              <ul className="mt-2 text-sm">
                {sessao.lojas.map((loja) => (
                  <li key={loja.id}>{loja.nome}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-texto-suave">
                Seu acesso ainda não está ligado a uma loja. Fale com a administração.
              </p>
            )}
          </div>
          <div className="rounded-padrao border border-borda bg-superficie p-6 text-sm text-texto-suave">
            <h2 className="text-xl text-primaria">Pergunte ao assistente</h2>
            <p className="mt-2">
              Logado, o assistente também responde sobre regimento interno, normas de obra e reforma, carga e
              descarga, acesso de fornecedores, comunicados e documentos da sua loja.
            </p>
          </div>
        </section>
      )}

      {sessao.perfil === 'admin' && (
        <section className="mt-10">
          <h2 className="text-xl text-primaria">Interessados em locação</h2>
          {leads.length ? (
            <div className="mt-4 overflow-x-auto rounded-padrao border border-borda">
              <table className="w-full text-left text-sm">
                <thead className="bg-destaque-claro text-texto">
                  <tr>
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Contato</th>
                    <th className="px-3 py-2 font-medium">Procura</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                    <th className="px-3 py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda bg-superficie">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="whitespace-nowrap px-3 py-2">{data.format(new Date(lead.criado_em))}</td>
                      <td className="px-3 py-2">{lead.nome}</td>
                      <td className="px-3 py-2">{[lead.telefone, lead.email].filter(Boolean).join(' · ')}</td>
                      <td className="px-3 py-2">{lead.tipo_espaco ?? '-'}</td>
                      <td className="px-3 py-2">{lead.origem}</td>
                      <td className="px-3 py-2">{lead.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-texto-suave">Nenhum contato recebido ainda.</p>
          )}
        </section>
      )}
    </Container>
  )
}
