# Qualidade pela ISO/IEC 25010:2023

Matriz das nove características do modelo de qualidade de produto da ISO/IEC 25010:2023 aplicadas ao site-rag. Para cada uma: como o projeto atende hoje, onde está a evidência e o que falta.

Situação em 27/09/2026, depois da junção das frentes de segurança, testes, acessibilidade, desempenho, avaliação do assistente e CI/LGPD. Os números abaixo saíram das execuções feitas na cópia integrada, salvo onde está dito que vêm da frente.

## Resumo

| Característica | Situação | Evidência principal |
|---|---|---|
| Adequação funcional | Atende no que dá para testar sem chave real | 81 testes de unidade, 6 E2E, avaliação do assistente com 69 conferências |
| Eficiência de desempenho | Atende nas páginas; chat sem medição real | Lighthouse da frente de desempenho |
| Compatibilidade | Atende no escopo atual | Esquema da rag-ingestao sem mudança |
| Capacidade de interação | Atende WCAG 2.2 AA nas páginas públicas auditadas | axe com 0 violações, teste de teclado sem falha |
| Confiabilidade | Parcial | Bug de travamento do chat achado e corrigido; sem monitoramento |
| Segurança | Atende no banco e nas rotas; lacunas de auditoria | 111 asserções pgTAP, teste de mutação |
| Manutenibilidade | Atende, com CI | CI em três jobs, testes em quatro camadas |
| Flexibilidade | Atende no escopo atual | Build sem rede externa, fornecedor de IA por variável |
| Proteção (safety) | Atende na recuperação; modelo real não testado | Avaliação do assistente com perguntas maliciosas |

## Adequação funcional

Completude, correção e pertinência das funções.

Hoje: o site cobre as páginas institucionais (início, lojas, locação, contato, privacidade), a área do lojista com login por link e o assistente com três perfis. O formulário de lead grava com consentimento. O prompt manda admitir quando não sabe e não inventar horário, valor ou regra.

Evidência:
- `npm run teste`: 81 testes de unidade no Vitest. Conferem as regras do prompt por perfil, a validação de leads (consentimento literal `true`, telefone ou e-mail) e a busca chamada só com vetor, limite e similaridade.
- `npm run teste:e2e`: 6 testes no Playwright contra Postgres com as migrations reais e RLS ativa. Home e /lojas com lojistas vindos do banco, pergunta do visitante que só recebe o trecho público, lead gravado pelo assistente com consentimento, aceite obrigatório em /locacao e redirecionamento da área do lojista.
- `avaliacao/avaliar.py --modo recuperacao`: 33 perguntas para cinco perfis, 69 conferências, 0 falhas.
- O widget manda só as 6 últimas mensagens. Antes a 11ª pergunta da mesma conversa recebia "Mensagem inválida.".

Lacuna: o E2E cobre só o visitante. O modo completo da avaliação (modelo e embedding reais) não foi executado, então não há medida de acerto das respostas. Parte do conteúdo real ainda não chegou (ver `docs/conteudo.md`).

## Eficiência de desempenho

Comportamento no tempo, uso de recursos e capacidade.

Hoje: páginas públicas estáticas, com revalidação a cada 5 minutos em / e /lojas. Imagens em AVIF com WebP de reserva e `sizes` ajustado à coluna. Fontes do fontsource carregadas pelo `next/font/local`, com preload e fonte de reserva de métrica ajustada. Resposta do chat em fluxo. Índice HNSW com varredura iterativa na busca.

Evidência (frente de desempenho, Lighthouse mobile, mediana de três rodadas, detalhes em `docs/desempenho.md`):
- FCP de 1,4 s para 0,8 s em /, /lojas e /locacao.
- Página inicial de 343 para 306 KiB; imagens de 84 para 46 KiB (hero de 63 KiB em WebP para 31 KiB em AVIF).
- CLS da página inicial de 0,001 para 0.
- Na cópia integrada, `/_next/image` responde `image/avif` para navegador que aceita.

Lacuna: o LCP variou demais na máquina compartilhada para afirmar ganho. Não há medição do tempo até a primeira palavra do chat. As propostas para o `/api/chat` (`Promise.all` entre perfil e embedding, tempo limite nas chamadas à OpenAI, `maxDuration`) estão em `docs/desempenho.md` e não foram aplicadas. O Lighthouse não foi rodado de novo depois da junção. Falta favicon (404 no console).

## Compatibilidade

Coexistência e interoperabilidade.

Hoje: o esquema do banco é o da biblioteca rag-ingestao sem alteração, então o worker da biblioteca grava direto nas tabelas. A visibilidade é traduzida por gatilho a partir das audiências da biblioteca. O cliente de IA usa a API no formato OpenAI por `fetch`, com `OPENAI_BASE_URL` configurável.

Evidência: `supabase/migrations/20260927000001_rag_ingestao.sql`, `20260927000003_visibilidade.sql`, `supabase/tests/visibilidade_ingestao.sql` (9 asserções). A avaliação do assistente ingere o corpus pelo próprio `ingestao/enviar.py`, já com a migration 000006 aplicada, e confere o nível gravado de cada documento.

Lacuna: a versão da rag-ingestao está fixada por commit em `ingestao/requirements.txt`; a atualização é manual (o Dependabot não acompanha dependência instalada por Git).

## Capacidade de interação

Reconhecimento de adequação, aprendizado, operabilidade, proteção contra erro, engajamento, inclusividade, assistência ao usuário e autodescrição.

Hoje: o assistente funciona todo pelo teclado (o foco vai para o campo ao abrir, Esc fecha e devolve o foco ao botão) e é um diálogo não modal. A resposta é anunciada uma vez ao leitor de tela, não pedaço por pedaço. Os alvos de toque têm 44px. O formulário de lead avisa o que é obrigatório, confere telefone ou e-mail antes do envio e liga o erro ao campo. O menu marca a página atual.

Evidência:
- `npm run acessibilidade` na cópia integrada: 0 violações do axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice) em 6 páginas e no assistente aberto, em 1280px e 360px, temas claro e escuro. 0 falhas no teste de teclado. Antes da frente eram 34 violações e 12 falhas de teclado.
- `npm run contraste`: os 32 pares de cor passam do mínimo.
- Detalhes em `docs/acessibilidade.md`.

Lacuna: a área do lojista não foi auditada (precisa de sessão de teste). Não houve teste com leitor de tela real. O `themeColor` não acompanha o tema escuro.

## Confiabilidade

Ausência de falhas, disponibilidade, tolerância a falhas e recuperabilidade.

Hoje: o site compila e roda sem `.env.local`; chat e formulário respondem 503 com mensagem clara quando o Supabase ou a OpenAI não estão configurados. Erro na busca ou no modelo vira mensagem para o usuário, sem vazar a mensagem do banco. A publicação de versão da ingestão é atômica.

Evidência:
- A frente de testes achou um travamento real: quando um bloco da rede não fechava nenhuma linha SSE, o fluxo parava e a tela ficava em "Pensando...". A correção está em `src/lib/assistente/openai.ts`, com testes de evento cortado no meio da linha, no meio de acento e byte a byte (`tests/unidade/openai.test.ts`). O mock do E2E manda o SSE cortado.
- `tests/unidade/rota-chat.test.ts` e `rota-leads.test.ts` conferem 500 sem vazamento, 503 sem configuração e que o modelo não é chamado depois de erro na busca.

Lacuna: sem monitoramento de disponibilidade nem alerta de erro em produção. O limite por IP é em memória e zera a cada instância.

## Segurança

Confidencialidade, integridade, não repúdio, responsabilização, autenticidade e resistência.

| Subcaracterística | Como atende | Evidência | Lacuna |
|---|---|---|---|
| Confidencialidade | RLS nas 11 tabelas; busca `security invoker` sem parâmetro de permissão; service_role fora do site | `isolamento_rls.sql` 27/27, `visibilidade_ingestao.sql` 9/9; avaliação do assistente 0 falhas em 69 conferências, com limite 12 e similaridade -1 | Nenhuma conhecida |
| Integridade | `anon` e `authenticated` sem TRUNCATE, TRIGGER e REFERENCES; insert em `leads` só nas colunas do formulário | Migration 000006; `ataques_rls.sql` 75/75 (sem a 000006, 17 falhas, segundo a frente e a revisão) | `consentimento_texto` livre para quem chama a API direto |
| Não repúdio | id, situação e data do aceite vêm do banco | teste "data do aceite foi a do banco, nao a do cliente" em `ataques_rls.sql` | Admin pode alterar os campos do aceite |
| Responsabilização | Parcial | `docs/seguranca.md` | Sem trilha de auditoria de perfis, vínculos e leads |
| Autenticidade | Perfil lido de `meu_perfil` e validado; `/api/leads` e `/api/chat` recusam outra origem | `rota-chat.test.ts` (perfil desconhecido vira visitante, 403); curl com Origin externo recebe 403 | `/auth/sair` não confere origem (o cookie SameSite=Lax cobre) |
| Resistência | CSP, HSTS, `frame-ancestors 'none'`, nosniff; corpo limitado (16 KB e 64 KB); 5 leads por IP a cada 10 minutos; campo isca; trechos delimitados e marcador de contato filtrado para quem não é visitante | `curl -I` na cópia integrada; Chromium sem violação de CSP nas 6 páginas; `avaliacao/unidade.test.ts` 6/6 | CSP com `'unsafe-inline'` em script; limite por IP em memória |

Testes de mutação da frente de avaliação e da revisão dela: `pode_ver` ignorando a loja gerou 67 falhas de segurança no runner; `pode_ver` deixando o visitante ver o nível inquilino gerou 58; a busca como `security definer` gerou 381. O runner pega vazamento de verdade.

## Manutenibilidade

Modularidade, reusabilidade, analisabilidade, modificabilidade e testabilidade.

| Subcaracterística | Como atende | Evidência | Lacuna |
|---|---|---|---|
| Modularidade | Conteúdo, componentes, clientes Supabase e lógica do assistente em pastas separadas; histórico e marcador do chat em módulos próprios; banco em migrations numeradas | `content/`, `src/components/`, `src/lib/assistente/` (`conversa.ts`, `marcador.ts`, `limite.ts`), `supabase/migrations/` | |
| Reusabilidade | Esquema e worker da rag-ingestao usados sem mudança; uma função de permissão (`pode_ver`) serve às duas tabelas; `limite.ts` serve ao chat e ao lead | `docs/decisoes.md`, migration 003 | |
| Analisabilidade | Decisões registradas com o motivo; ESLint e TypeScript estrito; ruff e pyflakes na ingestão; modelo de ameaças documentado | `docs/decisoes.md`, `docs/seguranca.md`, jobs do CI | Sem log estruturado no servidor |
| Modificabilidade | Texto do site em JSON; modelos de IA por variável de ambiente; migrations novas em vez de editar as aplicadas | `content/*.json`, `.env.example` | |
| Testabilidade | Quatro camadas de teste (unidade, E2E, pgTAP, acessibilidade) mais a avaliação do assistente; CI com três jobs | `tests/README.md`, `docs/avaliacao-assistente.md`, `.github/workflows/ci.yml` | E2E, auditoria de acessibilidade e avaliação não rodam no CI; o job `banco` depende do `supabase/config.toml` |

O Dependabot (`.github/dependabot.yml`) abre pull requests semanais para npm, pip e GitHub Actions, e o CI roda em cada um.

## Flexibilidade

Adaptabilidade, escalabilidade, instalabilidade e substituibilidade.

Hoje: o fornecedor do modelo troca por variável (`OPENAI_BASE_URL`, `MODELO_CHAT`, `MODELO_EMBEDDING`). O banco é Postgres com extensões comuns (pgvector), sem recurso exclusivo do Supabase fora de `auth.uid()` e dos papéis `anon` e `authenticated`. O build não depende de rede externa para fontes. O E2E sobe uma pilha inteira local (Postgres, PostgREST, mocks), o que mostra que o site roda fora do Supabase hospedado.

Evidência: `src/lib/assistente/openai.ts`, `.env.example`, `README.md`, `tests/e2e/apoio/pilha.mjs`; o job `web` do CI compila a partir de um checkout limpo com variáveis falsas.

Lacuna: a dimensão do vetor (1536) está fixa no esquema; trocar de modelo de embedding com outra dimensão pede migration nova e reingestão. O limite por IP não escala entre instâncias.

## Proteção (safety)

Restrição operacional, identificação de risco, falha segura, aviso de perigo e integração segura.

Hoje: na dúvida, fecha. Audiência desconhecida vira `admin` no gatilho de visibilidade. Usuário logado sem perfil, erro em `meu_perfil` ou valor desconhecido contam como visitante. O assistente responde só com os trechos que a RLS liberou e não confirma nem nega conteúdo restrito. O prompt diz que o perfil vem do login e não muda pela conversa. Só visitante pode abrir o formulário de contato; para os outros perfis o servidor tira o marcador da resposta, mesmo partido ou montado por dentro de outro.

Evidência: `avaliacao/perguntas.jsonl` com 14 perguntas maliciosas (fingir ser admin, pedir o contrato da outra loja, histórico forjado, injeção escondida num documento público); `avaliacao/unidade.test.ts` 6/6; `tests/unidade/rota-chat.test.ts`.

Lacuna: sem teste do modelo real diante dessas perguntas (o modo completo depende de uma homologação com chaves). Um visitante consegue induzir o modelo a abrir o formulário de lead, o que não expõe dado.

## LGPD

Não é característica da norma, mas entra aqui porque afeta segurança e adequação funcional. O tratamento de dados está descrito em `docs/lgpd-ripd.md` e a resposta a incidente em `docs/lgpd-plano-incidente.md`. Os dois são rascunhos para validação jurídica e da administração.
