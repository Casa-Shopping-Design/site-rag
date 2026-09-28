-- Tentativas de furar o isolamento como anon e como authenticated.
-- Complementa isolamento_rls.sql: aqui o foco e o que um cliente mal-intencionado
-- faria com a chave publica ou com a propria sessao de lojista.
-- Tudo roda dentro de uma transacao desfeita no fim; nada fica no banco.

begin;
create extension if not exists pgtap with schema extensions;
-- No banco remoto a CLI entra com um papel temporario que nao herda os privilegios
-- de postgres; sem isto o pgtap em extensions fica invisivel.
set local role postgres;
set local search_path = public, extensions;

select plan(75);

-- Massa de teste (como postgres, que ignora RLS)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a0a0', 'admin@teste.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'loja.a@teste.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'loja.b@teste.local');

insert into lojas (id, nome, ativa) values
  ('10000000-0000-0000-0000-00000000000a', 'Loja A', true),
  ('10000000-0000-0000-0000-00000000000b', 'Loja B', true),
  ('10000000-0000-0000-0000-00000000000f', 'Loja Fechada', false);

insert into perfis (id_usuario, papel) values
  ('00000000-0000-0000-0000-00000000a0a0', 'admin'),
  ('00000000-0000-0000-0000-0000000000a1', 'inquilino'),
  ('00000000-0000-0000-0000-0000000000b1', 'inquilino');

insert into vinculos_loja (id_usuario, id_loja) values
  ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b');

create function pg_temp.criar_documento(p_titulo text, p_audiencia text)
returns uuid
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

  insert into fila_ingestao (id_versao) values (v_versao);
  insert into log_ingestao (id_versao, etapa, situacao) values (v_versao, 'teste', 'ok');
  insert into contextos_trechos (id_documento, hash_cru, id_modelo, contexto)
  values (v_doc, md5(p_titulo), 'teste', 'contexto de ' || p_titulo);
  return v_doc;
end;
$$;

select pg_temp.criar_documento('Publico', 'publico');
select pg_temp.criar_documento('Inquilinos', 'inquilino');
select pg_temp.criar_documento('Administracao', 'admin');
select pg_temp.criar_documento('Loja A', 'loja:10000000-0000-0000-0000-00000000000a');
select pg_temp.criar_documento('Loja B', 'loja:10000000-0000-0000-0000-00000000000b');

insert into uso_consultas (id_proprietario, pergunta) values
  ('20000000-0000-0000-0000-000000000001', 'pergunta de teste');

insert into leads (id, nome, telefone, consentimento, consentimento_texto) values
  ('30000000-0000-0000-0000-000000000001', 'Lead Ficticio', '00000000', true, 'texto de teste');

create function pg_temp.vetor_teste()
returns vector
language sql
as $$ select array_fill(0.01::real, array[1536])::vector $$;

grant execute on function pg_temp.vetor_teste() to anon, authenticated;


-- Estrutura: o que vale para qualquer cliente
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c
                       where c like 'search_path=%')),
  0, 'estrutura: toda funcao security definer tem search_path fixo');
select is(
  (select count(*)::int
     from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')),
  0, 'estrutura: anon e authenticated nao tem TRUNCATE, TRIGGER nem REFERENCES');
select ok(
  not has_function_privilege('anon', 'publicar_versao(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'publicar_versao(uuid)', 'execute'),
  'estrutura: cliente nao executa publicar_versao');
select ok(
  not has_function_privilege('anon',
        'buscar_trechos(uuid, vector, int, float, text[], text[], date)', 'execute')
  and not has_function_privilege('authenticated',
        'buscar_trechos(uuid, vector, int, float, text[], text[], date)', 'execute'),
  'estrutura: cliente nao executa a busca da biblioteca, que aceita audiencias');
select ok(
  not has_column_privilege('anon', 'leads', 'consentimento_em', 'insert')
  and not has_column_privilege('anon', 'leads', 'criado_em', 'insert')
  and not has_column_privilege('anon', 'leads', 'situacao', 'insert')
  and not has_column_privilege('anon', 'leads', 'id', 'insert'),
  'estrutura: visitante nao escolhe id, situacao nem datas do lead');
select ok(
  not has_column_privilege('authenticated', 'leads', 'consentimento_em', 'insert')
  and not has_column_privilege('authenticated', 'leads', 'situacao', 'insert'),
  'estrutura: logado tambem nao escolhe situacao nem data do aceite');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.leads'::regclass)
  and (select bool_and(c.relrowsecurity)
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'),
  'estrutura: todas as tabelas de public estao com RLS ligada');


-- Visitante (chave anon, sem sessao)
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select eh_admin()), false, 'visitante: eh_admin devolve falso');
select is((select eh_inquilino()), false, 'visitante: eh_inquilino devolve falso');
select is((select minhas_lojas()), '{}'::uuid[], 'visitante: minhas_lojas vem vazio');
select ok(
  not pode_ver('inquilino', null)
  and not pode_ver('admin', null)
  and not pode_ver('inquilino', '10000000-0000-0000-0000-00000000000a'),
  'visitante: pode_ver so libera o publico');

select throws_ok(
  $$ select traduzir_audiencias() $$,
  null, null, 'visitante: nao chama a funcao de gatilho direto');
select throws_ok(
  $$ select publicar_versao(gen_random_uuid()) $$,
  '42501', null, 'visitante: publicar_versao e negado');
select throws_ok(
  $$ select * from buscar_trechos('20000000-0000-0000-0000-000000000001',
       pg_temp.vetor_teste(), 50, -1, null, array['admin'], null) $$,
  '42501', null, 'visitante: busca da biblioteca com audiencia admin e negada');
select is(
  (select count(*)::int from buscar_trechos_chat(pg_temp.vetor_teste(), 1000, -1)
    where visibilidade <> 'publico'),
  0, 'visitante: limite e similaridade extremos nao abrem nivel restrito');

select throws_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto, situacao)
     values ('Ficticio', '00000001', true, 'aceito', 'convertido') $$,
  '42501', null, 'visitante: lead ja convertido e recusado');
select throws_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto, consentimento_em)
     values ('Ficticio', '00000002', true, 'aceito', '2020-01-01') $$,
  '42501', null, 'visitante: aceite com data retroativa e recusado');
select throws_ok(
  $$ insert into leads (id, nome, telefone, consentimento, consentimento_texto)
     values ('30000000-0000-0000-0000-000000000001', 'Ficticio', '00000003', true, 'aceito') $$,
  '42501', null, 'visitante: nao escolhe o id do lead');
select throws_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto)
     values ('Ficticio', '00000004', false, 'nao aceito') $$,
  null, null, 'visitante: lead sem consentimento e recusado');
select throws_ok(
  $$ insert into leads (nome, consentimento, consentimento_texto)
     values ('Ficticio', true, 'aceito') $$,
  null, null, 'visitante: lead sem telefone e sem e-mail e recusado');
select throws_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto)
     values ('Ficticio', '00000005', true, 'aceito') returning id, nome $$,
  '42501', null, 'visitante: nao le lead pelo retorno do insert');
select lives_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto)
     values ('Ficticio Valido', '00000006', true, 'aceito') $$,
  'visitante: lead normal continua entrando');

with alterados as (update leads set situacao = 'descartado' returning 1)
select is(count(*)::int, 0, 'visitante: nao altera lead') from alterados;
with apagados as (delete from leads returning 1)
select is(count(*)::int, 0, 'visitante: nao apaga lead') from apagados;
select throws_ok($$ truncate leads $$, '42501', null, 'visitante: nao esvazia leads');

select throws_ok(
  $$ insert into documentos (id_proprietario, titulo, categoria, audiencias, criado_por)
     values (gen_random_uuid(), 'Falso', 'x', '{publico}', gen_random_uuid()) $$,
  '42501', null, 'visitante: nao cria documento');
with alterados as (update documentos set audiencias = '{admin}' returning 1)
select is(count(*)::int, 0, 'visitante: nao reclassifica documento publico') from alterados;
with apagados as (delete from trechos returning 1)
select is(count(*)::int, 0, 'visitante: nao apaga trecho') from apagados;
select throws_ok(
  $$ insert into versoes_documento (id_documento, numero_versao, caminho_binario,
       nome_arquivo, tipo_conteudo, tamanho_bytes, hash_arquivo, id_modelo_embedding,
       versao_normalizador)
     values (gen_random_uuid(), 1, 'x', 'x', 'x', 1, 'x', 'x', 1) $$,
  '42501', null, 'visitante: nao cria versao');
select throws_ok(
  $$ insert into fila_ingestao (id_versao) values (gen_random_uuid()) $$,
  '42501', null, 'visitante: nao entra na fila de ingestao');
select throws_ok(
  $$ insert into log_ingestao (id_versao, etapa, situacao) values (gen_random_uuid(), 'x', 'x') $$,
  '42501', null, 'visitante: nao escreve no log');
select throws_ok(
  $$ insert into uso_consultas (id_proprietario, pergunta) values (gen_random_uuid(), 'x') $$,
  '42501', null, 'visitante: nao escreve no uso');
select throws_ok(
  $$ insert into contextos_trechos (id_documento, hash_cru, id_modelo, contexto)
     values (gen_random_uuid(), 'x', 'x', 'x') $$,
  '42501', null, 'visitante: nao escreve em contextos');
select is(
  (select count(*)::int from fila_ingestao) + (select count(*)::int from log_ingestao)
  + (select count(*)::int from uso_consultas) + (select count(*)::int from contextos_trechos),
  0, 'visitante: nao le fila, log, uso nem contextos');

select throws_ok(
  $$ insert into lojas (nome) values ('Loja Falsa') $$,
  '42501', null, 'visitante: nao cadastra loja');
select is(
  (select count(*)::int from lojas where not ativa),
  0, 'visitante: nao ve loja inativa');
select is((select count(*)::int from perfis), 0, 'visitante: nao le perfis');
select is((select count(*)::int from vinculos_loja), 0, 'visitante: nao le vinculos');
select throws_ok(
  $$ insert into perfis (id_usuario, papel)
     values ('00000000-0000-0000-0000-0000000000a1', 'admin') $$,
  '42501', null, 'visitante: nao cria perfil');

set local role postgres;


-- Inquilino da loja A tentando sair da propria loja
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is(
  (select minhas_lojas()), array['10000000-0000-0000-0000-00000000000a']::uuid[],
  'inquilino A: minhas_lojas so traz a loja A');
select ok(
  not pode_ver('inquilino', '10000000-0000-0000-0000-00000000000b')
  and not pode_ver('admin', null),
  'inquilino A: pode_ver nega loja B e administracao');
select is(
  (select count(*)::int from buscar_trechos_chat(pg_temp.vetor_teste(), 1000, -1)
    where titulo in ('Loja B', 'Administracao')),
  0, 'inquilino A: nenhum trecho da loja B ou da administracao na busca');

select throws_ok(
  $$ insert into leads (nome, telefone, consentimento, consentimento_texto)
     values ('Ficticio', '00000007', true, 'aceito') returning * $$,
  '42501', null, 'inquilino A: nao le lead pelo retorno do insert');
with alterados as (update leads set situacao = 'convertido' returning 1)
select is(count(*)::int, 0, 'inquilino A: nao altera lead') from alterados;
with apagados as (delete from leads returning 1)
select is(count(*)::int, 0, 'inquilino A: nao apaga lead') from apagados;

select is((select count(*)::int from perfis), 1, 'inquilino A: so le o proprio perfil');
select is((select count(*)::int from vinculos_loja), 1, 'inquilino A: so le o proprio vinculo');
select throws_ok(
  $$ insert into perfis (id_usuario, papel)
     values ('00000000-0000-0000-0000-0000000000c9', 'admin') $$,
  null, null, 'inquilino A: nao cria perfil de admin');
with alterados as (
  update vinculos_loja set id_loja = '10000000-0000-0000-0000-00000000000b'
   where id_usuario = '00000000-0000-0000-0000-0000000000a1' returning 1)
select is(count(*)::int, 0, 'inquilino A: nao troca o proprio vinculo para a loja B') from alterados;
with apagados as (delete from vinculos_loja returning 1)
select is(count(*)::int, 0, 'inquilino A: nao apaga vinculo') from apagados;
with apagados as (delete from perfis returning 1)
select is(count(*)::int, 0, 'inquilino A: nao apaga perfil') from apagados;

with alterados as (update trechos set id_loja = null, visibilidade = 'publico' returning 1)
select is(count(*)::int, 0, 'inquilino A: nao muda nivel de trecho') from alterados;
with apagados as (delete from documentos returning 1)
select is(count(*)::int, 0, 'inquilino A: nao apaga documento') from apagados;
select throws_ok(
  $$ insert into trechos (id_proprietario, id_documento, id_versao, indice, conteudo,
       hash_conteudo, qtd_tokens, vetor)
     select id_proprietario, id_documento, id_versao, 50, 'injetado', 'x', 1, vetor
       from trechos limit 1 $$,
  '42501', null, 'inquilino A: nao injeta trecho em documento que enxerga');
select is(
  (select count(*)::int from versoes_documento) + (select count(*)::int from fila_ingestao)
  + (select count(*)::int from log_ingestao) + (select count(*)::int from uso_consultas)
  + (select count(*)::int from contextos_trechos),
  0, 'inquilino A: nao le tabelas operacionais da ingestao');
select throws_ok(
  $$ insert into uso_consultas (id_proprietario, pergunta) values (gen_random_uuid(), 'x') $$,
  '42501', null, 'inquilino A: nao escreve no uso');

select is(
  (select count(*)::int from lojas where not ativa),
  0, 'inquilino A: nao ve loja inativa');
with alterados as (update lojas set nome = 'Trocado' returning 1)
select is(count(*)::int, 0, 'inquilino A: nao edita loja, nem a propria') from alterados;
select throws_ok($$ truncate trechos $$, '42501', null, 'inquilino A: nao esvazia trechos');
select throws_ok($$ truncate perfis $$, '42501', null, 'inquilino A: nao esvazia perfis');
select throws_ok(
  $$ select publicar_versao(gen_random_uuid()) $$,
  '42501', null, 'inquilino A: publicar_versao e negado');

set local role postgres;


-- Conferencia como postgres: nada do que foi tentado acima mudou o banco
select is(
  (select count(*)::int from leads), 2,
  'conferencia: so o lead ficticio e o lead valido do visitante estao gravados');
select is(
  (select count(*)::int from leads where situacao <> 'novo'), 0,
  'conferencia: nenhum lead mudou de situacao');
select ok(
  (select bool_and(consentimento_em > now() - interval '1 minute') from leads),
  'conferencia: data do aceite foi a do banco, nao a do cliente');
select is(
  (select count(*)::int from documentos), 5, 'conferencia: documentos intactos');
select set_eq(
  $$ select titulo || ':' || visibilidade from documentos $$,
  array['Publico:publico', 'Inquilinos:inquilino', 'Administracao:admin',
        'Loja A:inquilino', 'Loja B:inquilino'],
  'conferencia: nenhum documento mudou de nivel');
select is(
  (select count(*)::int from trechos), 5, 'conferencia: nenhum trecho entrou ou saiu');
select is(
  (select count(*)::int from trechos where visibilidade = 'publico'), 1,
  'conferencia: nenhum trecho virou publico');
select is(
  (select id_loja from vinculos_loja
    where id_usuario = '00000000-0000-0000-0000-0000000000a1'),
  '10000000-0000-0000-0000-00000000000a'::uuid,
  'conferencia: vinculo do inquilino A continua na loja A');
select is(
  (select count(*)::int from perfis where papel = 'admin'), 1,
  'conferencia: continua havendo um admin so');
select is(
  (select count(*)::int from lojas where nome = 'Trocado'), 0,
  'conferencia: nenhuma loja foi renomeada');


-- Administracao: o aperto nao pode tirar o que ela precisa
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a0a0","role":"authenticated"}', true);

select is((select count(*)::int from leads), 2, 'admin: le todos os leads');
with alterados as (
  update leads set situacao = 'em_contato'
   where id = '30000000-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 1, 'admin: muda a situacao do lead') from alterados;
select is(
  (select count(*)::int from lojas where not ativa), 1, 'admin: ve loja inativa');
select is(
  (select count(*)::int from uso_consultas), 1, 'admin: le o uso do assistente');

set local role postgres;

select * from finish();
rollback;
