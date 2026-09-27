-- Massa ficticia do E2E. Nada aqui e dado real da galeria.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e2e0', 'admin@teste.local');

insert into lojas (id, nome, segmento) values
  ('e2e00000-0000-0000-0000-00000000000a', 'Loja Ficticia Alfa', 'Teste'),
  ('e2e00000-0000-0000-0000-00000000000b', 'Loja Ficticia Beta', 'Teste');

create function pg_temp.criar_documento(p_titulo text, p_audiencia text, p_conteudo text)
returns void
language plpgsql
as $$
declare
  v_doc uuid;
  v_versao uuid := gen_random_uuid();
begin
  insert into documentos (id_proprietario, titulo, categoria, audiencias, criado_por)
  values ('e2e00000-0000-0000-0000-000000000001', p_titulo, 'teste',
          array[p_audiencia], '00000000-0000-0000-0000-00000000e2e0')
  returning id into v_doc;

  insert into versoes_documento
    (id, id_documento, numero_versao, caminho_binario, nome_arquivo, tipo_conteudo,
     tamanho_bytes, hash_arquivo, situacao, id_modelo_embedding, versao_normalizador)
  values (v_versao, v_doc, 1, 'teste/' || p_titulo, p_titulo || '.md', 'text/markdown',
          10, md5(p_titulo), 'VIGENTE', 'teste', 1);

  update documentos set id_versao_vigente = v_versao where id = v_doc;

  -- Mesmo vetor em todos: so a RLS separa o que cada perfil recebe
  insert into trechos
    (id_proprietario, id_documento, id_versao, indice, conteudo, hash_conteudo,
     qtd_tokens, id_modelo_embedding, vetor)
  values ('e2e00000-0000-0000-0000-000000000001', v_doc, v_versao, 0,
          p_conteudo, md5(p_conteudo), 3, 'teste',
          array_fill(0.01::real, array[1536])::vector);
end;
$$;

select pg_temp.criar_documento('Institucional de teste', 'publico', 'TRECHO-PUBLICO-E2E texto ficticio para visitante.');
select pg_temp.criar_documento('Regimento de teste', 'inquilino', 'TRECHO-INQUILINO-E2E texto ficticio restrito.');
select pg_temp.criar_documento('Nota interna de teste', 'admin', 'TRECHO-ADMIN-E2E texto ficticio da administracao.');
select pg_temp.criar_documento('Contrato de teste', 'loja:e2e00000-0000-0000-0000-00000000000a', 'TRECHO-LOJA-E2E texto ficticio da loja Alfa.');
