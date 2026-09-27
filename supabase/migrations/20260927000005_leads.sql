-- Interessados em locacao. Qualquer pessoa pode deixar o contato, mas so com
-- consentimento marcado. Ler, atualizar e apagar e coisa da administracao.

create table if not exists leads (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null check (length(trim(nome)) between 2 and 120),
  telefone             text check (telefone is null or length(telefone) <= 30),
  email                text check (email is null or length(email) <= 160),
  tipo_espaco          text check (tipo_espaco is null or length(tipo_espaco) <= 120),
  mensagem             text check (mensagem is null or length(mensagem) <= 2000),
  origem               text not null default 'site' check (origem in ('site', 'assistente')),
  consentimento        boolean not null,
  -- Guarda o texto exato que a pessoa aceitou, para provar depois (LGPD, art. 8).
  consentimento_texto  text not null,
  consentimento_em     timestamptz not null default now(),
  situacao             text not null default 'novo'
                       check (situacao in ('novo', 'em_contato', 'convertido', 'descartado')),
  criado_em            timestamptz not null default now(),
  constraint ck_leads_contato check (telefone is not null or email is not null),
  constraint ck_leads_consentimento check (consentimento)
);

create index if not exists idx_leads_criado on leads (criado_em desc);

alter table leads enable row level security;

drop policy if exists leads_inserir on leads;
create policy leads_inserir on leads
  for insert to anon, authenticated
  with check (consentimento and situacao = 'novo');

drop policy if exists leads_admin_leitura on leads;
create policy leads_admin_leitura on leads
  for select to authenticated
  using ((select eh_admin()));

drop policy if exists leads_admin_alteracao on leads;
create policy leads_admin_alteracao on leads
  for update to authenticated
  using ((select eh_admin()))
  with check ((select eh_admin()));

drop policy if exists leads_admin_exclusao on leads;
create policy leads_admin_exclusao on leads
  for delete to authenticated
  using ((select eh_admin()));
