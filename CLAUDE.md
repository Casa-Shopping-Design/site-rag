# Casa Shopping Design - site-rag

Site do Casa Shopping Design, centro empresarial no Ponto Novo (Aracaju/SE), com assistente RAG. Leia `docs/decisoes.md` antes de mexer em banco, busca ou ingestão.

## Stack

- Next.js 16 (App Router) + TypeScript, Tailwind CSS 4 (tokens em `src/app/globals.css`)
- Supabase: Postgres + pgvector, Auth por link no e-mail, RLS
- OpenAI por fetch (embedding e chat), modelos configuráveis por variável de ambiente
- Ingestão em Python com a biblioteca rag-ingestao

## Regras que não mudam

- Permissão é aplicada no banco. Prompt não substitui política.
- A busca do chat roda com a sessão do usuário (`clienteServidor`). A service_role nunca entra no site.
- Todo documento e trecho tem `visibilidade` (publico, inquilino, admin) e, se for de uma loja, `id_loja`.
- Toda mudança em política, busca ou ingestão passa por `supabase test db`.
- Antes de criar tabela, migration ou política, confira o que já existe em `supabase/migrations`.

## Convenções

- Identificadores e comentários em português, sem acento, com nomes naturais. Exceção: convenções de biblioteca (`cn`, `proxy`, `GET`, `POST`).
- Comentário curto e só quando explica um porquê.
- Texto do site vive em `content/*.json` e é lido por `src/lib/conteudo.ts`.
- Server Components por padrão; `'use client'` só onde há estado ou evento.
- Sem linhas horizontais separando seções em arquivos.
- Claude não faz commit: entrega os arquivos e os comandos git.
