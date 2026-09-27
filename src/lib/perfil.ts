import { clientePublico } from '@/lib/supabase/publico'
import { clienteServidor, supabaseConfigurado } from '@/lib/supabase/servidor'
import type { Loja, Perfil } from '@/types/conteudo'

export type Sessao = {
  perfil: Perfil
  email: string | null
  lojas: Pick<Loja, 'id' | 'nome'>[]
}

const semSessao: Sessao = { perfil: 'visitante', email: null, lojas: [] }

// Serve para ajustar a interface. Permissao de dado quem garante e a RLS.
export async function sessaoAtual(): Promise<Sessao> {
  if (!supabaseConfigurado()) return semSessao

  const supabase = await clienteServidor()
  const { data: usuario } = await supabase.auth.getUser()
  if (!usuario.user) return semSessao

  const { data: perfil } = await supabase.rpc('meu_perfil')
  const { data: vinculos } = await supabase
    .from('vinculos_loja')
    .select('lojas(id, nome)')
    .eq('id_usuario', usuario.user.id)

  const lojas = (vinculos ?? [])
    .map((vinculo) => vinculo.lojas as unknown as Pick<Loja, 'id' | 'nome'> | null)
    .filter((loja): loja is Pick<Loja, 'id' | 'nome'> => Boolean(loja))

  return {
    perfil: (perfil as Perfil) ?? 'visitante',
    email: usuario.user.email ?? null,
    lojas,
  }
}

export async function lojasAtivas(): Promise<Loja[]> {
  if (!supabaseConfigurado()) return []

  const { data } = await clientePublico()
    .from('lojas')
    .select('id, nome, segmento, piso, sala, descricao, instagram, site, telefone, logo_url')
    .eq('ativa', true)
    .order('nome')

  return data ?? []
}
