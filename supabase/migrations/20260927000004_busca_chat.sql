-- Busca do assistente. Roda com os direitos de quem pergunta (security invoker):
-- visitante chega pela chave anon, inquilino e administracao pela propria sessao.
-- A RLS de trechos e documentos corta o que o perfil nao pode ver antes de
-- qualquer trecho sair do banco. Nao existe parametro de nivel ou de loja aqui
-- de proposito: quem pergunta nao escolhe o que enxerga.

create or replace function buscar_trechos_chat(
  p_vetor            vector(1536),
  p_limite           int   default 6,
  p_similaridade_min float default 0.30
)
returns table (
  id_trecho     uuid,
  conteudo      text,
  similaridade  float,
  titulo        text,
  pagina        int,
  titulo_secao  text,
  visibilidade  text
)
language plpgsql stable
security invoker
set search_path = public, extensions
as $$
begin
  -- Com RLS o filtro vem depois do indice HNSW e pode sobrar menos trecho que o
  -- limite. A varredura iterativa (pgvector 0.8+) continua ate completar.
  -- Em versao antiga o parametro nao existe e seguimos sem ele.
  begin
    perform set_config('hnsw.iterative_scan', 'relaxed_order', true);
  exception when others then
    null;
  end;

  return query
  select t.id,
         t.conteudo,
         (1 - (t.vetor <=> p_vetor))::float,
         d.titulo,
         t.pagina,
         t.titulo_secao,
         t.visibilidade
    from trechos t
    join documentos d on d.id = t.id_documento
   where t.id_versao = d.id_versao_vigente
     and d.excluido_em is null
     and (d.vigencia_inicio is null or d.vigencia_inicio <= current_date)
     and (d.vigencia_fim is null or d.vigencia_fim >= current_date)
     and 1 - (t.vetor <=> p_vetor) >= p_similaridade_min
   order by t.vetor <=> p_vetor
   limit least(greatest(p_limite, 1), 12);
end;
$$;

revoke all on function buscar_trechos_chat(vector, int, float) from public;
grant execute on function buscar_trechos_chat(vector, int, float) to anon, authenticated;
