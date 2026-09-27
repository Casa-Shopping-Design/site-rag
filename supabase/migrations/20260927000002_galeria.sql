-- Lojas, perfis de acesso e vinculo entre usuario e loja.
-- Visitante nao tem linha em perfis: quem nao esta logado (ou esta logado sem
-- perfil) cai no nivel publico.

create table if not exists lojas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  segmento    text,
  piso        text,
  sala        text,
  descricao   text,
  instagram   text,
  site        text,
  telefone    text,
  logo_url    text,
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists perfis (
  id_usuario  uuid primary key references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('inquilino', 'admin')),
  nome        text,
  criado_em   timestamptz not null default now()
);

-- Uma loja pode ter varios usuarios e um usuario pode responder por mais de uma
-- loja. A funcao ainda nao muda permissao: fica pronta para quando decidirmos
-- se funcionario ve menos que o responsavel.
create table if not exists vinculos_loja (
  id_usuario  uuid not null references auth.users(id) on delete cascade,
  id_loja     uuid not null references lojas(id) on delete cascade,
  funcao      text not null default 'responsavel'
              check (funcao in ('responsavel', 'funcionario')),
  criado_em   timestamptz not null default now(),
  primary key (id_usuario, id_loja)
);

create index if not exists idx_vinculos_loja on vinculos_loja (id_loja);

-- Funcoes auxiliares das politicas. Sao security definer para ler perfis e
-- vinculos sem cair na propria RLS dessas tabelas (evita recursao).
create or replace function eh_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
     where id_usuario = auth.uid() and papel = 'admin'
  );
$$;

create or replace function eh_inquilino()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
     where id_usuario = auth.uid() and papel = 'inquilino'
  );
$$;

create or replace function minhas_lojas()
returns uuid[]
language sql stable security definer
set search_path = ''
as $$
  select coalesce(array_agg(id_loja), '{}')
    from public.vinculos_loja
   where id_usuario = auth.uid();
$$;

-- Usado pelo site para ajustar a conversa. Nao serve de permissao: quem
-- decide o que cada um ve sao as politicas.
create or replace function meu_perfil()
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select papel from public.perfis where id_usuario = auth.uid()),
    'visitante'
  );
$$;

revoke all on function eh_admin(), eh_inquilino(), minhas_lojas(), meu_perfil() from public;
grant execute on function eh_admin(), eh_inquilino(), minhas_lojas(), meu_perfil()
  to anon, authenticated;

alter table lojas         enable row level security;
alter table perfis        enable row level security;
alter table vinculos_loja enable row level security;

-- Lojas ativas aparecem no site para qualquer pessoa. So dados de vitrine
-- ficam nesta tabela; informacao interna da loja vai para documentos com id_loja.
drop policy if exists lojas_leitura on lojas;
create policy lojas_leitura on lojas
  for select to anon, authenticated
  using (ativa or (select eh_admin()));

drop policy if exists lojas_admin on lojas;
create policy lojas_admin on lojas
  for all to authenticated
  using ((select eh_admin()))
  with check ((select eh_admin()));

drop policy if exists perfis_leitura on perfis;
create policy perfis_leitura on perfis
  for select to authenticated
  using (id_usuario = auth.uid() or (select eh_admin()));

drop policy if exists perfis_admin on perfis;
create policy perfis_admin on perfis
  for all to authenticated
  using ((select eh_admin()))
  with check ((select eh_admin()));

drop policy if exists vinculos_leitura on vinculos_loja;
create policy vinculos_leitura on vinculos_loja
  for select to authenticated
  using (id_usuario = auth.uid() or (select eh_admin()));

drop policy if exists vinculos_admin on vinculos_loja;
create policy vinculos_admin on vinculos_loja
  for all to authenticated
  using ((select eh_admin()))
  with check ((select eh_admin()));
