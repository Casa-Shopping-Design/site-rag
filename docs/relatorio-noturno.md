# Relatório da noite de 27/09/2026

Seis frentes trabalharam em cópias separadas do projeto e tudo foi juntado em `/home/claude/trabalho/integrado`. Nada foi commitado nem publicado. A pasta integrada não é repositório git: copie os arquivos para o seu clone antes de rodar os comandos do fim.

## O que mudou por frente

Segurança. A migration nova `20260927000006_privilegios_minimos.sql` tira TRUNCATE, TRIGGER e REFERENCES de `anon` e `authenticated` e limita o insert em `leads` às colunas do formulário. Antes, qualquer pessoa com a chave pública gravava lead com data de aceite retroativa, e o anon conseguia esvaziar a tabela com TRUNCATE (a RLS não cobre esse comando). Entraram também 75 testes de ataque em `supabase/tests/ataques_rls.sql`, cabeçalhos de segurança (CSP, HSTS e outros) em `next.config.ts`, checagem de origem e teto de tamanho do corpo em `/api/leads` e `/api/chat`, limite de 5 leads por IP a cada 10 minutos e um campo isca contra robô. O modelo de ameaças está em `docs/seguranca.md`.

Testes. Vitest para unidade e Playwright para E2E numa pilha local simulada. Os testes acharam um bug real: o chat travava em "Pensando..." quando a rede entregava um evento SSE cortado no meio. A correção está em `src/lib/assistente/openai.ts`. O passo a passo fica em `tests/README.md`.

Acessibilidade. O assistente passou a funcionar todo pelo teclado: é um diálogo, Esc fecha e o foco é controlado. O leitor de tela ouve a resposta uma vez só, e não cada pedaço do streaming. O formulário avisa que precisa de telefone ou e-mail. Os campos ganharam contorno com contraste suficiente, os alvos de toque passaram a ter 44px, o cabeçalho do celular deixou de se sobrepor e as páginas sem h1 foram corrigidas. Registro em `docs/acessibilidade.md`.

Desempenho. Imagens em AVIF, `sizes` ajustado à coluna e preload do hero com prioridade alta. As fontes passaram a entrar pelo `next/font/local`. O FCP caiu de 1,4 s para 0,8 s e a página inicial de 343 para 306 KiB. Registro em `docs/desempenho.md`.

Assistente. Os trechos vão ao modelo entre `<trechos>` e `</trechos>`, e tag desse tipo escrita dentro de documento é neutralizada. O perfil lido do banco é validado: valor estranho vira visitante. O marcador de contato sai do texto do usuário e, para inquilino e admin, também da resposta, mesmo partido ou montado por dentro de outro. O widget manda só as 6 últimas mensagens; antes, a 11ª pergunta dava erro. Entrou a pasta `avaliacao/` com corpus fictício, 33 perguntas (14 maliciosas) e o script `avaliar.py`. Registro em `docs/avaliacao-assistente.md`.

CI e LGPD. `.github/workflows/ci.yml` com três jobs (site, banco, ingestão) e Dependabot semanal. Rascunhos do RIPD e do plano de incidente, adaptados do Coral Village e marcados para validação jurídica. A matriz ISO 25010 está em `docs/qualidade-iso25010.md` e já traz as evidências das outras frentes.

## O que eu fiz na junção

- Merge de três vias em `next.config.ts` (cabeçalhos + imagens), `src/app/api/chat/route.ts` (proteções da rota + defesas do assistente), `assistente.tsx` (acessibilidade + histórico curto), `formulario-lead.tsx` (isca + dicas de erro) e `globals.css`. `package.json` juntou os scripts e as dependências das duas frentes, e o `package-lock.json` foi regenerado com `npm install`. Fixei `playwright` em 1.56.1, igual ao `@playwright/test`, porque é a versão que casa com o Chromium da máquina.
- Corrigi um defeito que veio da frente do assistente: em `prompt.ts`, duas regras do prompt estavam coladas na mesma linha ("sem discutir.- Quando usar um trecho"). Agora há um teste que pega isso.
- Os testes de unidade da frente de testes foram escritos contra a base e quebraram com as proteções novas (11 falhas). Ajustei os testes, não o código: cada pedido sai de um IP diferente, e o formato dos trechos passou a ser o novo. Acrescentei testes para 403, 413, isca, 429 no sexto lead, perfil desconhecido e marcador fora da resposta do inquilino. São 81 testes no total.
- O E2E procurava o assistente como `region`. Depois da acessibilidade, ele é `dialog` com o nome "Assistente do Casa Design". Atualizei o seletor e a conferência do anúncio para leitor de tela.
- Atualizei `README.md` (seção de testes), `tests/README.md`, `docs/decisoes.md` (privilégios mínimos, limite de leads, fontes e a decisão em aberto sobre o histórico), `docs/lgpd-ripd.md`, `docs/desempenho.md` e `docs/seguranca.md` para refletirem o estado integrado.

## O que foi testado na cópia integrada

Tudo passou:

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | sem erros |
| `npx eslint` | sem avisos |
| `npx next build` sem `.env.local` | compila, 14 rotas |
| `npm run teste` (Vitest) | 81 de 81 |
| `rodar-testes-sql.sh integrado scd_integrado` | 111 ok: ataques 75, isolamento 27, visibilidade 9 |
| `avaliar.py --modo recuperacao` | 69 conferências, 0 falhas |
| `npx tsx --test avaliacao/unidade.test.ts` | 6 de 6 |
| `npm run teste:e2e` (portas 3140 a 3143) | 6 de 6 |
| `npm run acessibilidade` (next start na 3144) | 0 violações do axe, 0 falhas de teclado |
| `npm run contraste` | 32 pares acima do mínimo |
| Chromium nas 6 páginas | nenhuma violação de CSP, fontes carregam; único erro é o 404 do favicon |
| curl nas rotas | outra origem 403; sem Supabase 503; imagem sai em AVIF |

Os servidores que subi foram encerrados pelo PID e as portas 3140 a 3149 ficaram livres. Os bancos de teste (`scd_integrado`, `scd_integrado_aval`, `scd_integrado_e2e`) continuam no Postgres local.

## Achados de segurança

| Achado | Severidade | Situação |
|---|---|---|
| Lead gravado pela API com data de aceite, id e situação escolhidos pelo cliente | média | corrigido (000006) |
| TRUNCATE, TRIGGER e REFERENCES para anon e authenticated | média | corrigido (000006) |
| Histórico do chat aceitava marcador de contato vindo do usuário | média | corrigido |
| Marcador aninhado passava pelo filtro e chegava a inquilino e admin | média | corrigido na revisão |
| `< /trechos>` escapava da neutralização | baixa | corrigido na revisão |
| Perfil do banco usado sem validação | baixa | corrigido |
| `consentimento_texto` livre para quem chama a API direto | baixa | pendente, decisão sua |
| Admin pode alterar os campos do aceite; sem trilha de auditoria | baixa | pendente, decisão sua |
| Funções invoker e gatilhos sem `search_path` fixo; extensões em `public` | baixa | pendente |
| `/auth/sair` não confere origem (SameSite=Lax cobre) | baixa | aceito |
| CSP com `'unsafe-inline'` em script | baixa | aceito (nonce tiraria as páginas estáticas) |
| Limite por IP em memória, dependente de `x-forwarded-for` | baixa | aceito |
| Visitante consegue induzir o modelo a abrir o formulário | baixa | aceito, sem dado exposto |

## O que falhou ou ficou de fora

- O modo completo da avaliação do assistente não rodou, porque exige homologação do Supabase com chaves reais.
- O job `banco` do CI vai falhar até o `supabase/config.toml` ser commitado. O `supabase test db` real e o `ataques_rls.sql` no Supabase de verdade nunca rodaram aqui, só no Postgres local com o shim.
- O E2E e a auditoria de acessibilidade cobrem só o visitante. A área do lojista precisa de sessão de teste.
- O Lighthouse não foi rodado de novo depois da junção.
- As propostas de desempenho do `/api/chat` (`Promise.all`, tempo limite nas chamadas à OpenAI, `maxDuration`) estão em `docs/desempenho.md` e não foram aplicadas.
- Não houve teste com leitor de tela real.
- O `rodar-testes-sql.sh` (fora do repositório) sai com código 0 quando o Postgres está fora do ar. Hoje ele estava no ar.

## Pendências que dependem de você

Decisões:
- Turnos de assistente vindos do navegador: manter como está (6 últimas mensagens, sem marcador), descartar ou assinar com HMAC. Está em `docs/decisoes.md`, em aberto.
- Versionar o texto do consentimento numa tabela e decidir o que a administração pode editar num lead.
- Lead que preenche o campo isca: descartar em silêncio, como hoje, ou gravar marcado.
- `includeSubDomains` e `preload` no HSTS, depois de confirmar que nenhum subdomínio usa só http.
- Se `tsx` entra como devDependency, com um script npm para `avaliacao/unidade.test.ts`.
- Se vale ter E2E de inquilino e admin.

Conteúdo e cadastro:
- Favicon e ícone da marca.
- Fotos em boa resolução (hoje são quadros de vídeo de 478 px).
- Encarregado (DPO), razão social, CNPJ e e-mail de privacidade (`content/site.json` está com o e-mail vazio).
- Revisão jurídica do RIPD e do plano de incidente, das bases legais e dos prazos marcados como PROPOSTA A VALIDAR.
- Página /privacidade: citar a OpenAI e a transferência internacional e rever a frase "não são repassados a terceiros".
- Regra para ingestão de documento com dado pessoal de terceiro (contrato com CPF).

Infraestrutura:
- Rodar `supabase init` e commitar o `supabase/config.toml`.
- Rodar a avaliação no modo completo numa homologação, nunca em produção.
- Depois do E2E, rodar `npm run build` de novo, porque ele deixa no `.next` um build apontando para 127.0.0.1.

## Arquivos alterados em relação à base

Novos: `.github/dependabot.yml`, `.github/workflows/ci.yml`, `avaliacao/` (avaliar.py, perguntas.jsonl, supabase_simulado.sql, unidade.test.ts e os 7 arquivos de `corpus/`), `docs/acessibilidade.md`, `docs/avaliacao-assistente.md`, `docs/desempenho.md`, `docs/lgpd-plano-incidente.md`, `docs/lgpd-ripd.md`, `docs/qualidade-iso25010.md`, `docs/seguranca.md`, `docs/relatorio-noturno.md`, `playwright.config.ts`, `vitest.config.ts`, `src/components/layout/link-menu.tsx`, `src/lib/assistente/conversa.ts`, `supabase/migrations/20260927000006_privilegios_minimos.sql`, `supabase/tests/ataques_rls.sql`, `tests/` (README.md, `acessibilidade/auditar.mjs`, `acessibilidade/contraste.mjs`, `e2e/visitante.spec.ts`, os 5 arquivos de `e2e/apoio/` e os 6 de `unidade/`).

Alterados: `.gitignore`, `README.md`, `docs/decisoes.md`, `next.config.ts`, `package.json`, `package-lock.json`, `src/app/api/chat/route.ts`, `src/app/api/leads/route.ts`, `src/app/contato/page.tsx`, `src/app/entrar/formulario-entrada.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/locacao/page.tsx`, `src/app/lojas/page.tsx`, `src/app/page.tsx`, `src/components/assistente/assistente.tsx`, `src/components/formularios/formulario-lead.tsx`, `src/components/layout/navbar.tsx`, `src/components/layout/rodape.tsx`, `src/components/secoes/hero.tsx`, `src/components/secoes/lista-lojas.tsx`, `src/components/secoes/perguntas.tsx`, `src/components/secoes/sobre.tsx`, `src/components/secoes/titulo-secao.tsx`, `src/components/secoes/visita.tsx`, `src/lib/assistente/limite.ts`, `src/lib/assistente/marcador.ts`, `src/lib/assistente/openai.ts`, `src/lib/assistente/prompt.ts`.

Nenhuma migration antiga foi editada.

## Comandos sugeridos

Revise o diff antes de commitar. Para levar a pasta integrada ao seu clone (sem `node_modules`, `.next` e artefatos de build):

```bash
rsync -a --exclude node_modules --exclude .next --exclude '*.tsbuildinfo' --exclude next-env.d.ts \
  /home/claude/trabalho/integrado/ /caminho/do/seu/clone/site-rag/
cd /caminho/do/seu/clone/site-rag
npm install
git status
git diff --stat
git add -A
git commit -m "Integra seguranca, testes, acessibilidade, desempenho, assistente e CI/LGPD"
git push
```
