-- Traducao de audiencias (o que a ingestao grava) para visibilidade e loja.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into lojas (id, nome) values ('10000000-0000-0000-0000-00000000000a', 'Loja A');

create function pg_temp.nivel(p_audiencias text[])
returns text
language plpgsql
as $$
declare
  v_resultado text;
begin
  insert into documentos (id_proprietario, titulo, categoria, audiencias, criado_por)
  values (gen_random_uuid(), 'teste', 'teste', p_audiencias, gen_random_uuid())
  returning visibilidade || coalesce('/' || id_loja::text, '') into v_resultado;
  return v_resultado;
end;
$$;

select is(pg_temp.nivel('{publico}'), 'publico', 'publico vira publico');
select is(pg_temp.nivel('{inquilino}'), 'inquilino', 'inquilino vira inquilino');
select is(pg_temp.nivel('{admin}'), 'admin', 'admin vira admin');
select is(pg_temp.nivel('{todos}'), 'admin', 'o padrao da biblioteca (todos) fecha em admin');
select is(pg_temp.nivel('{qualquer-coisa}'), 'admin', 'rotulo desconhecido fecha em admin');
select is(
  pg_temp.nivel('{publico,loja:10000000-0000-0000-0000-00000000000a}'),
  'inquilino/10000000-0000-0000-0000-00000000000a',
  'loja prevalece sobre publico');
select throws_ok(
  $$ select pg_temp.nivel('{loja:10000000-0000-0000-0000-00000000000a,loja:10000000-0000-0000-0000-00000000000b}') $$,
  null, null, 'documento com duas lojas e recusado');

-- Trecho herda o nivel e acompanha a reclassificacao do documento.
do $$
declare
  v_doc uuid;
  v_versao uuid := gen_random_uuid();
begin
  insert into documentos (id, id_proprietario, titulo, categoria, audiencias, criado_por)
  values ('30000000-0000-0000-0000-000000000001', gen_random_uuid(), 'reclassificar',
          'teste', '{admin}', gen_random_uuid())
  returning id into v_doc;

  insert into versoes_documento
    (id, id_documento, numero_versao, caminho_binario, nome_arquivo, tipo_conteudo,
     tamanho_bytes, hash_arquivo, id_modelo_embedding, versao_normalizador)
  values (v_versao, v_doc, 1, 'x', 'x.md', 'text/markdown', 1, 'h', 'teste', 1);

  insert into trechos
    (id_proprietario, id_documento, id_versao, indice, conteudo, hash_conteudo,
     qtd_tokens, id_modelo_embedding, vetor, visibilidade)
  values (gen_random_uuid(), v_doc, v_versao, 0, 'x', 'x', 1, 'teste',
          array_fill(0.01::real, array[1536])::vector, 'publico');
end $$;

select is(
  (select visibilidade from trechos
    where id_documento = '30000000-0000-0000-0000-000000000001'),
  'admin', 'trecho ignora o nivel informado e herda o do documento');

update documentos set audiencias = '{inquilino}'
 where id = '30000000-0000-0000-0000-000000000001';

select is(
  (select visibilidade from trechos
    where id_documento = '30000000-0000-0000-0000-000000000001'),
  'inquilino', 'reclassificar o documento reclassifica os trechos');

select * from finish();
rollback;
