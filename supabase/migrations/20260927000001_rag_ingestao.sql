-- Esquema da biblioteca rag-ingestao (migrations 001 e 008), copiado sem mudanca
-- de estrutura para que o worker da biblioteca grave aqui direto.
-- Dimensao 1536 = text-embedding-3-small. Idioma do full-text: portuguese.
-- A RLS da biblioteca (007, baseada em app.id_proprietario) NAO entra aqui:
-- as politicas deste projeto usam auth.uid() e ficam na migration de visibilidade.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Identidade lógica do documento
create table if not exists documentos (
  id                 uuid primary key default gen_random_uuid(),
  id_proprietario    uuid not null,
  titulo             text not null,
  categoria          text not null,
  -- Quem enxerga o documento na consulta. Conjunto de rótulos (papel, grupo).
  -- A audiência 'todos' torna o documento universal. Um documento pode
  -- pertencer a várias audiências ao mesmo tempo.
  audiencias         text[] not null default '{todos}',
  vigencia_inicio    date,
  vigencia_fim       date,
  id_versao_vigente  uuid,
  excluido_em        timestamptz,
  criado_por         uuid not null,
  criado_em          timestamptz not null default now()
);

create index if not exists idx_documentos_proprietario
  on documentos (id_proprietario) where excluido_em is null;
create index if not exists idx_documentos_categoria
  on documentos (id_proprietario, categoria) where excluido_em is null;
-- Interseção de audiências (operador &&) usa índice GIN.
create index if not exists idx_documentos_audiencias
  on documentos using gin (audiencias);

-- Versões: cada envio de arquivo
create table if not exists versoes_documento (
  id                   uuid primary key default gen_random_uuid(),
  id_documento         uuid not null references documentos(id) on delete cascade,
  numero_versao        int  not null,
  caminho_binario      text not null,
  nome_arquivo         text not null,
  tipo_conteudo        text not null,
  tamanho_bytes        bigint not null,
  hash_arquivo         text not null,
  situacao             text not null default 'PENDENTE',
  mensagem_erro        text,
  qtd_paginas          int,
  qtd_trechos          int,
  tokens_consumidos    int,
  id_modelo_embedding  text not null,
  versao_normalizador  int  not null,
  tentativas           int  not null default 0,
  criado_em            timestamptz not null default now(),
  constraint uq_versao_numero unique (id_documento, numero_versao),
  -- Idempotência (P1): mesmo arquivo, mesmo documento, uma única vez.
  constraint uq_versao_hash   unique (id_documento, hash_arquivo),
  constraint ck_situacao check (situacao in (
    'PENDENTE','EXTRAINDO','VETORIZANDO','VIGENTE','SUBSTITUIDA','DUPLICADA','FALHOU'
  ))
);

-- Invariante do desenho: no máximo uma versão vigente por documento.
create unique index if not exists idx_uma_versao_vigente
  on versoes_documento (id_documento) where situacao = 'VIGENTE';

create index if not exists idx_versoes_situacao
  on versoes_documento (situacao);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_versao_vigente'
  ) then
    alter table documentos
      add constraint fk_versao_vigente
      foreign key (id_versao_vigente) references versoes_documento(id)
      deferrable initially deferred;
  end if;
end $$;

-- Trechos vetorizados
create table if not exists trechos (
  id              uuid primary key default gen_random_uuid(),
  id_proprietario uuid not null,
  id_documento    uuid not null references documentos(id) on delete cascade,
  id_versao       uuid not null references versoes_documento(id) on delete cascade,
  indice          int  not null,
  conteudo        text not null,
  hash_conteudo   text not null,
  qtd_tokens      int  not null,
  pagina          int,
  titulo_secao    text,
  -- Qual modelo gerou este vetor. O cache incremental só reaproveita vetor do
  -- mesmo modelo: vetores de modelos diferentes não são comparáveis.
  id_modelo_embedding text not null default '',
  vetor           vector(1536) not null,
  -- Coluna de busca lexical (full-text), para o braço textual da busca híbrida.
  busca           tsvector generated always as (to_tsvector('portuguese', conteudo)) stored,
  criado_em       timestamptz not null default now(),
  constraint uq_trecho_indice unique (id_versao, indice)
);

-- Incrementalidade (P2): consultado a cada reprocessamento, por modelo.
create index if not exists idx_trechos_hash
  on trechos (id_documento, hash_conteudo, id_modelo_embedding);
create index if not exists idx_trechos_versao
  on trechos (id_versao);
create index if not exists idx_trechos_proprietario
  on trechos (id_proprietario);

-- Índice vetorial aproximado. HNSW: mais rápido para buscar, mais lento
-- para construir. Para bases muito grandes, avalie IVFFlat com lists ajustado.
create index if not exists idx_trechos_vetor
  on trechos using hnsw (vetor vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Índice do braço lexical (busca híbrida).
create index if not exists idx_trechos_busca
  on trechos using gin (busca);

-- Fila de processamento
create table if not exists fila_ingestao (
  id             uuid primary key default gen_random_uuid(),
  id_versao      uuid not null unique references versoes_documento(id) on delete cascade,
  disponivel_em  timestamptz not null default now(),
  bloqueado_ate  timestamptz,
  tentativas     int not null default 0,
  criado_em      timestamptz not null default now()
);

create index if not exists idx_fila_disponivel
  on fila_ingestao (disponivel_em) where bloqueado_ate is null;

-- Log de ingestão
create table if not exists log_ingestao (
  id             bigserial primary key,
  id_versao      uuid not null,
  etapa          text not null,
  situacao       text not null,
  detalhe        jsonb,
  duracao_ms     int,
  registrado_em  timestamptz not null default now()
);

create index if not exists idx_log_versao on log_ingestao (id_versao);

-- Uso: uma linha por pergunta ao RAG (monitoramento + base dos limites)
create table if not exists uso_consultas (
  id                uuid primary key default gen_random_uuid(),
  id_proprietario   uuid not null,
  id_usuario        uuid,
  papeis            text[] not null default '{}',
  pergunta          text not null,
  qtd_trechos       int  not null default 0,
  tokens_estimados  int  not null default 0,
  criado_em         timestamptz not null default now()
);

-- Contagens da janela de cota e do painel, por proprietário/usuário/tempo.
create index if not exists idx_uso_prop_data
  on uso_consultas (id_proprietario, criado_em);
create index if not exists idx_uso_usuario
  on uso_consultas (id_proprietario, id_usuario, criado_em);
create index if not exists idx_uso_papeis
  on uso_consultas using gin (papeis);

-- Publicação atômica (P3)
--
-- Devolve TRUE se a versão assumiu a vigência. Só publica se ela for igual ou
-- mais nova que a vigente atual: uma versão antiga que terminou de processar
-- tarde não pode regredir o documento (ordenação sob concorrência).
create or replace function publicar_versao(p_id_versao uuid)
returns boolean
language plpgsql
as $$
declare
  v_documento      uuid;
  v_numero_novo    int;
  v_anterior       uuid;
  v_numero_anterior int;
begin
  select id_documento, numero_versao into v_documento, v_numero_novo
    from versoes_documento where id = p_id_versao;

  if v_documento is null then
    raise exception 'Versão % não encontrada', p_id_versao;
  end if;

  -- Trava a linha do documento: serializa publicações concorrentes.
  select id_versao_vigente into v_anterior
    from documentos where id = v_documento for update;

  if v_anterior is not null then
    select numero_versao into v_numero_anterior
      from versoes_documento where id = v_anterior;
  end if;

  -- Versão obsoleta (mais antiga que a vigente): arquiva e não toca no ponteiro.
  if v_anterior is not null
     and v_anterior <> p_id_versao
     and v_numero_novo <= v_numero_anterior then
    update versoes_documento set situacao = 'SUBSTITUIDA' where id = p_id_versao;
    return false;
  end if;

  if v_anterior is not null and v_anterior <> p_id_versao then
    update versoes_documento set situacao = 'SUBSTITUIDA' where id = v_anterior;
  end if;

  update versoes_documento set situacao = 'VIGENTE' where id = p_id_versao;
  update documentos set id_versao_vigente = p_id_versao where id = v_documento;
  return true;
end;
$$;

-- Consulta (opcional: a biblioteca monta o SQL, esta função existe para
-- quem preferir chamar via RPC, por exemplo no Supabase)
create or replace function buscar_trechos(
  p_id_proprietario    uuid,
  p_vetor              vector(1536),
  p_limite             int     default 8,
  p_similaridade_min   float   default 0.35,
  p_categorias         text[]  default null,
  p_audiencias         text[]  default null,
  p_data_referencia    date    default null
)
returns table (
  id_trecho     uuid,
  conteudo      text,
  similaridade  float,
  id_documento  uuid,
  titulo        text,
  pagina        int,
  titulo_secao  text
)
language sql stable
as $$
  select t.id, t.conteudo,
         1 - (t.vetor <=> p_vetor) as similaridade,
         d.id, d.titulo, t.pagina, t.titulo_secao
    from trechos t
    join documentos d on d.id = t.id_documento
   where t.id_proprietario = p_id_proprietario
     and t.id_versao = d.id_versao_vigente
     and d.excluido_em is null
     and (d.vigencia_inicio is null
          or d.vigencia_inicio <= coalesce(p_data_referencia, current_date))
     and (d.vigencia_fim is null
          or d.vigencia_fim >= coalesce(p_data_referencia, current_date))
     and (p_categorias is null or d.categoria = any(p_categorias))
     and ('todos' = any(d.audiencias)
          or p_audiencias is null
          or d.audiencias && p_audiencias)
     and 1 - (t.vetor <=> p_vetor) >= p_similaridade_min
   order by t.vetor <=> p_vetor
   limit p_limite;
$$;

-- Isolamento por proprietário (P5)
--
-- O isolamento efetivo já vem do filtro id_proprietario que a biblioteca aplica
-- em toda consulta. Para a defesa em profundidade (RLS no nível do banco),
-- aplique a migração dedicada, que cobre todas as tabelas e explica as duas
-- condições necessárias (papel não-dono + set app.id_proprietario por requisição):
--
--   rag-ingestao migrar --arquivo migrations/007_rls.sql


-- Cache do enriquecimento contextual (migration 008 da biblioteca).
create table if not exists contextos_trechos (
  id_documento  uuid not null references documentos(id) on delete cascade,
  hash_cru      text not null,
  id_modelo     text not null,
  contexto      text not null,
  criado_em     timestamptz not null default now(),
  primary key (id_documento, hash_cru, id_modelo)
);
