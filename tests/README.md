# Testes

Cada camada tem o seu comando.

| Camada | Comando | Precisa de |
| --- | --- | --- |
| Unidade (Vitest) | `npm run teste` | só o `node_modules` |
| Ponta a ponta (Playwright) | `npm run teste:e2e` | Postgres com pgvector, PostgREST e Chromium do Playwright |
| Isolamento e ataques no banco (pgTAP) | `supabase test db` | CLI do Supabase |
| Acessibilidade (axe-core) | `npm run acessibilidade` e `npm run contraste` | site rodando e Chromium do Playwright |
| Defesas do chat | `npx --yes tsx --test avaliacao/unidade.test.ts` | só o `node_modules` (baixa o tsx) |

## Unidade

```bash
npm run teste
```

Ficam em `tests/unidade` e não acessam rede nem banco. Supabase e OpenAI são substituídos por funções falsas.

- `conteudo.test.ts`: `preenchido`, `enderecoCompleto` e `linkWhatsApp`.
- `prompt.test.ts`: regras de cada perfil, o marcador de contato que só o visitante recebe, os trechos dentro de `<trechos>` e o aviso de quando não há trecho.
- `openai.test.ts`: leitura do fluxo SSE com eventos cortados no meio da linha, no meio de um caractere acentuado e byte a byte.
- `limite.test.ts`: 15 perguntas por minuto por IP, janela e limpeza do mapa. O limite de leads (5 em 10 minutos) é conferido em `rota-leads.test.ts`.
- `rota-leads.test.ts`: validação, consentimento obrigatório, telefone ou e-mail, 503 sem Supabase, insert sem `.select()`, 403 para outra origem, 413 para corpo grande, campo isca e 429 no sexto envio do mesmo IP.
- `rota-chat.test.ts`: respostas 400, 403, 413, 429, 503 e 500, perfil desconhecido tratado como visitante, marcador de contato fora da resposta do inquilino, a chamada a `buscar_trechos_chat` só com vetor, limite e similaridade, e a garantia de que nenhum arquivo de `src` lê a chave service_role.

## Ponta a ponta

Roda só na máquina local. O comando `npm run teste:e2e` chama `tests/e2e/apoio/pilha.mjs`, que:

1. recria o banco `scd_testes` no Postgres local e aplica o shim do Supabase (`apoio/shim-supabase.sql`), as migrations e a massa fictícia (`apoio/semear.sql`);
2. sobe o PostgREST na porta 3121 e os servidores falsos de `apoio/mocks.mjs` (gateway do Supabase na 3120, OpenAI na 3122);
3. compila o site com as variáveis apontando para essa pilha e sobe `next start` na porta 3102.

Quando os testes terminam, o Playwright encerra o script e ele derruba o que subiu.

A massa tem quatro trechos com o mesmo vetor (público, inquilino, admin e de uma loja), como em `supabase/tests/isolamento_rls.sql`. O OpenAI falso devolve na resposta os trechos que chegaram ao prompt. Assim o teste vê o que a RLS deixou passar para o visitante: só o público.

O que é verificado:

- a home e a página /lojas mostram os lojistas cadastrados no banco;
- o assistente responde ao visitante só com o trecho público e abre o formulário de contato no lugar do marcador;
- o lead enviado pelo assistente é gravado com consentimento, e a chave anon não consegue ler a tabela `leads`;
- o formulário de /locacao não envia sem o aceite do aviso;
- /area-do-lojista manda o visitante para /entrar.

### Requisitos e variáveis

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `PGHOST_E2E` / `PGPORT_E2E` | `/var/tmp/pgt` / `5499` | Postgres com pgvector, usuário `postgres` sem senha e o papel `authenticator` com login |
| `BANCO_E2E` | `scd_testes` | banco apagado e recriado a cada execução |
| `POSTGREST_BIN` | `/var/tmp/postgrest` | binário do PostgREST |
| `PORTA_SITE`, `PORTA_GATEWAY`, `PORTA_POSTGREST`, `PORTA_OPENAI` | 3102, 3120, 3121, 3122 | portas locais |
| `PULAR_BUILD` | vazio | com `1`, reaproveita o `.next` que já existe |
| `PLAYWRIGHT_BROWSERS_PATH` | do sistema | onde está o Chromium |

A versão do `@playwright/test` está fixada em 1.56.1 porque ela usa o Chromium 1194. Ao atualizar, rode `npx playwright install chromium`.

Todas as chaves usadas são falsas e servem só para essa pilha. Nada aqui fala com o Supabase, a Vercel ou a OpenAI de verdade.

### Cuidado com o build

O E2E grava em `.next` um build que aponta para `127.0.0.1`. Antes de publicar ou de testar o site de outro jeito, rode `npm run build` de novo com as variáveis certas.

Falhas deixam trace e captura em `tests/e2e/.resultados` (ignorado pelo git). Para abrir: `npx playwright show-trace <arquivo>.zip`.

## Banco

Os testes pgTAP de isolamento ficam em `supabase/tests` e rodam com `supabase test db`. Toda mudança em política, função de busca ou ingestão precisa passar neles.
