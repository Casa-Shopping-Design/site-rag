-- Fixa o search_path das funcoes que ainda usavam o da sessao. Sem isso, quem
-- conseguisse criar objeto num schema que venha antes no caminho poderia
-- trocar a tabela que a funcao le. Os nomes continuam sem schema, entao o
-- caminho fixado e o mesmo que o Supabase ja usa por padrao.

alter function publicar_versao(uuid)
  set search_path = public, extensions, pg_temp;

alter function buscar_trechos(uuid, vector, int, float, text[], text[], date)
  set search_path = public, extensions, pg_temp;

alter function traduzir_audiencias()
  set search_path = public, pg_temp;

alter function copiar_visibilidade_trecho()
  set search_path = public, pg_temp;

alter function propagar_visibilidade()
  set search_path = public, pg_temp;
