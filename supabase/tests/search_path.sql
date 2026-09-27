-- Toda funcao nossa em public precisa de search_path fixo (ver migration 000007).
-- Funcoes que vem de extensao (pgvector, pgcrypto) ficam de fora.

begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  null::text[],
  'funcoes do projeto em public tem search_path fixo'
);

select * from finish();
rollback;
