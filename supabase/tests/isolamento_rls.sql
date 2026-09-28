-- Testes obrigatorios de isolamento. Rode com: supabase test db
--   1. visitante nao recupera trecho de nivel inquilino ou admin
--   2. inquilino da loja A nao recupera conteudo da loja B
--   3. inquilino nao le a tabela de leads
--   4. administracao enxerga tudo
-- Tudo roda dentro de uma transacao desfeita no fim; nada fica no banco.

begin;
create extension if not exists pgtap with schema extensions;
-- No banco remoto a CLI entra com um papel temporario que nao herda os privilegios
-- de postgres; sem isto o pgtap em extensions fica invisivel.
set local role postgres;
set local search_path = public, extensions;

select plan(27);

-- Massa de teste (como postgres, que ignora RLS)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a0a0', 'admin@teste.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'loja.a@teste.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'loja.b@teste.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'sem.perfil@teste.local');

insert into lojas (id, nome) values
  ('10000000-0000-0000-0000-00000000000a', 'Loja A'),
  ('10000000-0000-0000-0000-00000000000b', 'Loja B');

insert into perfis (id_usuario, papel) values
  ('00000000-0000-0000-0000-00000000a0a0', 'admin'),
  ('00000000-0000-0000-0000-0000000000a1', 'inquilino'),
  ('00000000-0000-0000-0000-0000000000b1', 'inquilino');

insert into vinculos_loja (id_usuario, id_loja) values
  ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b');

-- Um documento publicado, com um trecho, para cada nivel.
create function pg_temp.criar_documento(p_titulo text, p_audiencia text)
returns void
language plpgsql
as $$
declare
  v_doc uuid;
  v_versao uuid := gen_random_uuid();
begin
  insert into documentos (id_proprietario, titulo, categoria, audiencias, criado_por)
  values ('20000000-0000-0000-0000-000000000001', p_titulo, 'teste',
          array[p_audiencia], '00000000-0000-0000-0000-00000000a0a0')
  returning id into v_doc;

  insert into versoes_documento
    (id, id_documento, numero_versao, caminho_binario, nome_arquivo, tipo_conteudo,
     tamanho_bytes, hash_arquivo, situacao, id_modelo_embedding, versao_normalizador)
  values (v_versao, v_doc, 1, 'teste/' || p_titulo, p_titulo || '.md', 'text/markdown',
          10, md5(p_titulo), 'VIGENTE', 'teste', 1);

  update documentos set id_versao_vigente = v_versao where id = v_doc;

  insert into trechos
    (id_proprietario, id_documento, id_versao, indice, conteudo, hash_conteudo,
     qtd_tokens, id_modelo_embedding, vetor)
  values ('20000000-0000-0000-0000-000000000001', v_doc, v_versao, 0,
          'conteudo de ' || p_titulo, md5(p_titulo), 3, 'teste',
          array_fill(0.01::real, array[1536])::vector);
end;
$$;

select pg_temp.criar_documento('Publico', 'publico');
select pg_temp.criar_documento('Inquilinos', 'inquilino');
select pg_temp.criar_documento('Administracao', 'admin');
select pg_temp.criar_documento('Loja A', 'loja:10000000-0000-0000-0000-00000000000a');
select pg_temp.criar_documento('Loja B', 'loja:10000000-0000-0000-0000-00000000000b');

create function pg_temp.vetor_teste()
returns vector
language sql
as $$ select array_fill(0.01::real, array[1536])::vector $$;

grant execute on function pg_temp.vetor_teste() to anon, authenticated;


-- 1. Visitante (chave anon, sem sessao)
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*)::int from buscar_trechos_chat(pg_temp.vetor_teste(), 12, 0)),
  1, 'visitante: a busca devolve so o trecho publico');
select is(
  (select count(*)::int from buscar_trechos_chat(pg_temp.vetor_teste(), 12, 0)
    where visibilidade <> 'publico'),
  0, 'visitante: a busca nao devolve trecho de inquilino nem de admin');
select is(
  (select count(*)::int from trechos where visibilidade <> 'publico'),
  0, 'visitante: select direto em trechos nao mostra nivel restrito');
select is(
  (select count(*)::int from documentos where visibilidade <> 'publico'),
  0, 'visitante: select direto em documentos nao mostra nivel restrito');
select is(
  (select count(*)::int from versoes_documento),
  0, 'visitante: nao le versoes de documento');
select is(
  (select meu_perfil()), 'visitante', 'visitante: meu_perfil devolve visitante');

select lives_ok(
  $$ insert into leads (nome, telefone, tipo_espaco, consentimento, consentimento_texto)
     values ('Maria Teste', '79999990000', 'loja no terreo', true, 'aceito') $$,
  'visitante: consegue deixar lead com consentimento');
select throws_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto)
     values ('Sem Aceite', '79999990001', false, 'nao aceito') $$,
  null, null, 'visitante: lead sem consentimento e recusado');
select is(
  (select count(*)::int from leads),
  0, 'visitante: nao le a tabela de leads, nem o que acabou de enviar');
select throws_ok(
  $$ insert into trechos (id_proprietario, id_documento, id_versao, indice, conteudo,
       hash_conteudo, qtd_tokens, vetor)
     values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 99, 'x', 'x', 1,
       array_fill(0.01::real, array[1536])::vector) $$,
  null, null, 'visitante: nao grava trecho');

set local role postgres;


-- Usuario logado sem perfil conta como visitante
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select is(
  (select count(*)::int from buscar_trechos_chat(pg_temp.vetor_teste(), 12, 0)
    where visibilidade <> 'publico'),
  0, 'logado sem perfil: continua vendo so o publico');

set local role postgres;


-- 2 e 3. Inquilino da loja A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select set_eq(
  $$ select titulo from buscar_trechos_chat(pg_temp.vetor_teste(), 12, 0) $$,
  array['Publico', 'Inquilinos', 'Loja A'],
  'inquilino A: busca devolve publico, inquilinos e a propria loja');
select is(
  (select count(*)::int from trechos
    where id_loja = '10000000-0000-0000-0000-00000000000b'),
  0, 'inquilino A: nao le trecho da loja B');
select is(
  (select count(*)::int from documentos
    where id_loja = '10000000-0000-0000-0000-00000000000b'),
  0, 'inquilino A: nao le documento da loja B');
select is(
  (select count(*)::int from trechos where visibilidade = 'admin'),
  0, 'inquilino A: nao le trecho da administracao');
select is(
  (select count(*)::int from leads),
  0, 'inquilino A: nao le a tabela de leads');

update perfis set papel = 'admin'
 where id_usuario = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select eh_admin()), false, 'inquilino A: nao consegue se promover a admin');

select throws_ok(
  $$ insert into vinculos_loja (id_usuario, id_loja)
     values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000b') $$,
  null, null, 'inquilino A: nao consegue se vincular a loja B');
update documentos set audiencias = '{publico}';
select is(
  (select count(*)::int from documentos where visibilidade = 'publico'),
  1, 'inquilino A: nao reclassifica documento');

set local role postgres;


-- Inquilino da loja B, espelho do anterior
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select set_eq(
  $$ select titulo from buscar_trechos_chat(pg_temp.vetor_teste(), 12, 0) $$,
  array['Publico', 'Inquilinos', 'Loja B'],
  'inquilino B: busca devolve publico, inquilinos e a propria loja');
select is(
  (select count(*)::int from trechos
    where id_loja = '10000000-0000-0000-0000-00000000000a'),
  0, 'inquilino B: nao le trecho da loja A');

set local role postgres;


-- 4. Administracao
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a0a0","role":"authenticated"}', true);

select set_eq(
  $$ select titulo from buscar_trechos_chat(pg_temp.vetor_teste(), 12, 0) $$,
  array['Publico', 'Inquilinos', 'Administracao', 'Loja A', 'Loja B'],
  'admin: busca devolve todos os niveis e todas as lojas');
select is((select count(*)::int from trechos), 5, 'admin: le todos os trechos');
select is((select count(*)::int from documentos), 5, 'admin: le todos os documentos');
select is((select count(*)::int from leads), 1, 'admin: le os leads');
select is((select count(*)::int from versoes_documento), 5, 'admin: le as versoes');
select is((select meu_perfil()), 'admin', 'admin: meu_perfil devolve admin');

set local role postgres;

select * from finish();
rollback;
