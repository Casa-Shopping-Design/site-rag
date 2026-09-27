-- Nivel de visibilidade em documento e trecho, e a RLS que aplica esse nivel.
--
-- A biblioteca rag-ingestao so conhece "audiencias" (text[]). O script de
-- ingestao grava uma destas audiencias:
--   publico            -> qualquer pessoa, inclusive sem login
--   inquilino          -> qualquer inquilino logado
--   admin              -> so a administracao
--   loja:<uuid>        -> so os usuarios vinculados a essa loja (e a administracao)
-- O gatilho abaixo traduz isso para as colunas visibilidade e id_loja.
-- Qualquer coisa fora dessa lista vira admin: na duvida, fecha.

alter table documentos
  add column if not exists visibilidade text not null default 'admin',
  add column if not exists id_loja uuid references lojas(id) on delete restrict;

alter table trechos
  add column if not exists visibilidade text not null default 'admin',
  add column if not exists id_loja uuid references lojas(id) on delete restrict;

alter table documentos drop constraint if exists ck_documentos_visibilidade;
alter table documentos add constraint ck_documentos_visibilidade check (
  visibilidade in ('publico', 'inquilino', 'admin')
  and (id_loja is null or visibilidade = 'inquilino')
);

alter table trechos drop constraint if exists ck_trechos_visibilidade;
alter table trechos add constraint ck_trechos_visibilidade check (
  visibilidade in ('publico', 'inquilino', 'admin')
  and (id_loja is null or visibilidade = 'inquilino')
);

create index if not exists idx_documentos_visibilidade on documentos (visibilidade, id_loja);
create index if not exists idx_trechos_visibilidade on trechos (visibilidade, id_loja);

create or replace function traduzir_audiencias()
returns trigger
language plpgsql
as $$
declare
  rotulo text;
  loja uuid;
  qtd_lojas int := 0;
begin
  foreach rotulo in array coalesce(new.audiencias, '{}') loop
    if rotulo like 'loja:%' then
      loja := substr(rotulo, 6)::uuid;
      qtd_lojas := qtd_lojas + 1;
    end if;
  end loop;

  if qtd_lojas > 1 then
    raise exception 'Documento de loja deve pertencer a uma loja so (recebido: %)', new.audiencias;
  end if;

  if loja is not null then
    new.visibilidade := 'inquilino';
    new.id_loja := loja;
  elsif 'publico' = any(new.audiencias) then
    new.visibilidade := 'publico';
    new.id_loja := null;
  elsif 'inquilino' = any(new.audiencias) then
    new.visibilidade := 'inquilino';
    new.id_loja := null;
  else
    new.visibilidade := 'admin';
    new.id_loja := null;
  end if;

  return new;
end;
$$;

drop trigger if exists tg_documentos_audiencias on documentos;
create trigger tg_documentos_audiencias
  before insert or update of audiencias on documentos
  for each row execute function traduzir_audiencias();

-- O trecho herda o nivel do documento no momento em que e gravado.
create or replace function copiar_visibilidade_trecho()
returns trigger
language plpgsql
as $$
begin
  select d.visibilidade, d.id_loja
    into new.visibilidade, new.id_loja
    from documentos d
   where d.id = new.id_documento;
  return new;
end;
$$;

drop trigger if exists tg_trechos_visibilidade on trechos;
create trigger tg_trechos_visibilidade
  before insert on trechos
  for each row execute function copiar_visibilidade_trecho();

-- Reclassificar um documento (rag-ingestao reclassificar) reclassifica os trechos.
create or replace function propagar_visibilidade()
returns trigger
language plpgsql
as $$
begin
  update trechos
     set visibilidade = new.visibilidade,
         id_loja = new.id_loja
   where id_documento = new.id;
  return null;
end;
$$;

drop trigger if exists tg_documentos_propagar on documentos;
-- Sem "of coluna": a mudanca vem do gatilho before, e gatilho por coluna so
-- dispara para colunas citadas no update.
create trigger tg_documentos_propagar
  after update on documentos
  for each row
  when (old.visibilidade is distinct from new.visibilidade
        or old.id_loja is distinct from new.id_loja)
  execute function propagar_visibilidade();

-- Regra unica de leitura, usada por documentos e trechos.
create or replace function pode_ver(p_visibilidade text, p_id_loja uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select case
    when (select public.eh_admin()) then true
    when p_visibilidade = 'publico' then true
    when p_visibilidade = 'inquilino' and (select public.eh_inquilino()) then
      p_id_loja is null or p_id_loja = any(public.minhas_lojas())
    else false
  end;
$$;

grant execute on function pode_ver(text, uuid) to anon, authenticated;

alter table documentos        enable row level security;
alter table trechos           enable row level security;
alter table versoes_documento enable row level security;
alter table fila_ingestao     enable row level security;
alter table log_ingestao      enable row level security;
alter table uso_consultas     enable row level security;
alter table contextos_trechos enable row level security;

drop policy if exists documentos_leitura on documentos;
create policy documentos_leitura on documentos
  for select to anon, authenticated
  using (pode_ver(visibilidade, id_loja));

drop policy if exists trechos_leitura on trechos;
create policy trechos_leitura on trechos
  for select to anon, authenticated
  using (pode_ver(visibilidade, id_loja));

-- Tabelas operacionais da ingestao: so a administracao le. Ninguem escreve
-- pelo cliente; quem grava e o worker, fora do caminho do chat.
drop policy if exists versoes_admin on versoes_documento;
create policy versoes_admin on versoes_documento
  for select to authenticated using ((select eh_admin()));

drop policy if exists fila_admin on fila_ingestao;
create policy fila_admin on fila_ingestao
  for select to authenticated using ((select eh_admin()));

drop policy if exists log_admin on log_ingestao;
create policy log_admin on log_ingestao
  for select to authenticated using ((select eh_admin()));

drop policy if exists uso_admin on uso_consultas;
create policy uso_admin on uso_consultas
  for select to authenticated using ((select eh_admin()));

drop policy if exists contextos_admin on contextos_trechos;
create policy contextos_admin on contextos_trechos
  for select to authenticated using ((select eh_admin()));

-- Funcoes da biblioteca que alteram estado nao sao para o cliente.
revoke execute on function publicar_versao(uuid) from public, anon, authenticated;
revoke execute on function buscar_trechos(uuid, vector, int, float, text[], text[], date)
  from public, anon, authenticated;
