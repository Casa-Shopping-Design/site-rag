# site-rag

Site institucional do Casa Shopping Design, centro empresarial no Ponto Novo, em Aracaju, com um assistente que responde a partir dos documentos da administração.

O assistente atende três perfis. O visitante sem login vê só conteúdo público. O inquilino logado vê também as regras internas e os documentos da própria loja. A administração vê tudo. Quem decide o que cada um vê é a RLS do Postgres, não o prompt: a busca roda com a sessão de quem pergunta e o modelo só recebe o que o banco já filtrou.

## Estrutura

```
content/              textos do site em JSON (endereço, horários, segmentos, espaços, FAQ)
src/app/              páginas, rotas /api/chat e /api/leads, login por link
src/components/       layout, seções, formulário de lead e o widget do assistente
src/lib/              leitura do conteúdo, clientes Supabase, prompt e chamada ao modelo
supabase/migrations/  esquema da rag-ingestao, lojas e perfis, visibilidade, busca e leads
supabase/tests/       testes de isolamento e de ataque (pgTAP)
tests/                testes de unidade, ponta a ponta e auditoria de acessibilidade
avaliacao/            corpus fictício e script de avaliação do assistente
ingestao/             script que envia documentos para a base com o nível escolhido
docs/                 decisões, conteúdo pendente, LGPD e qualidade
.github/              CI e Dependabot
```

## Como rodar

Site:

```bash
npm install
cp .env.example .env.local   # URL do Supabase, chave publishable e chave da OpenAI
npm run dev
```

Banco, com a CLI do Supabase logada:

```bash
supabase link --project-ref <ref>
supabase db push
supabase db push --include-seed   # cadastra os lojistas levantados (conferir antes)
supabase test db              # roda os testes de isolamento
```

Ingestão de documentos (Python 3.10+):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r ingestao/requirements.txt
cp ingestao/.env.example ingestao/.env   # DATABASE_URL, OPENAI_API_KEY, SCD_ID_GALERIA

python ingestao/enviar.py ingestao/base/institucional.md --visibilidade publico --categoria institucional
python ingestao/enviar.py ingestao/base/lojistas.md --visibilidade publico --categoria lojas
python ingestao/enviar.py regimento-interno.pdf --visibilidade inquilino --categoria regimento
python ingestao/enviar.py contrato-sala-12.pdf --loja "Nome da loja" --categoria contrato --valido-ate 2027-12-31
```

Reenviar um arquivo com o mesmo título cria nova versão do mesmo documento, e só os trechos que mudaram são vetorizados de novo. O nível informado no reenvio passa a valer para o documento inteiro.

## Cadastro de lojista

1. No painel do Supabase, em Authentication, crie o usuário com o e-mail do lojista.
2. No SQL Editor:

```sql
insert into lojas (nome, segmento, piso, sala) values ('Nome da loja', 'Móveis', 'Térreo', '12')
returning id;

insert into perfis (id_usuario, papel)
select id, 'inquilino' from auth.users where email = 'lojista@exemplo.com';

insert into vinculos_loja (id_usuario, id_loja)
select u.id, '<id da loja>' from auth.users u where u.email = 'lojista@exemplo.com';
```

Para a equipe da administração, o papel é `admin` e não precisa de vínculo com loja.

O lojista entra pela página /entrar com um link enviado por e-mail. Quem não foi cadastrado não consegue criar conta pelo site.

## Testes

```bash
npm run teste          # unidade (Vitest), sem rede nem banco
npm run teste:e2e      # ponta a ponta (Playwright) numa pilha local simulada
npm run acessibilidade # axe-core nas páginas públicas, com o site rodando
npm run contraste      # contraste dos pares de cor do globals.css
supabase test db       # isolamento e ataques no banco (pgTAP)
```

O que cada camada cobre e o que ela precisa para rodar está em `tests/README.md`. A avaliação do assistente com corpus fictício está em `docs/avaliacao-assistente.md`.

## CI e qualidade

Todo push na `main` e todo pull request rodam `.github/workflows/ci.yml`, com três jobs:

- web: `npm ci`, ESLint, `tsc --noEmit`, `next build` com variáveis falsas e `npm run teste` (Vitest).
- banco: sobe o Postgres local com a CLI do Supabase e roda `supabase test db`, que inclui os quatro testes obrigatórios de isolamento. Depende do `supabase/config.toml` gerado pelo `supabase init`. Enquanto ele não estiver commitado, esse job falha avisando o motivo.
- ingestao: Python 3.11, instala `ingestao/requirements.txt`, roda ruff e pyflakes e confere que `enviar.py --help` abre.

O workflow não usa segredo nenhum. O Dependabot (`.github/dependabot.yml`) abre pull requests semanais para npm, pip e GitHub Actions.

A matriz da ISO/IEC 25010 está em `docs/qualidade-iso25010.md`. O tratamento de dados pessoais está em `docs/lgpd-ripd.md` e a resposta a incidente em `docs/lgpd-plano-incidente.md`, os dois ainda em rascunho para validação jurídica.

## Deploy

Vercel, com as variáveis do `.env.example`. A service_role do Supabase não entra na Vercel: ela só é usada na ingestão, na máquina da administração.

O passo a passo completo, do commit ao site de teste no ar num endereço `*.vercel.app`, está em `docs/deploy-teste.md`. Enquanto o site não estiver no domínio oficial, ele sai com `noindex`.
