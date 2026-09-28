# Passo a passo: site de teste no ar

O objetivo é deixar o site acessível pela internet num endereço da Vercel (`https://<projeto>.vercel.app`), com o banco no Supabase, o assistente respondendo e o login do lojista funcionando. O domínio oficial fica para depois. Enquanto o site estiver no endereço da Vercel, ele sai com `noindex` e o `robots.txt` bloqueia os buscadores (ver `src/lib/endereco.ts`).

Siga na ordem. Cada etapa termina com uma conferência. Só passe para a próxima quando a conferência bater.

## 0. O que precisa estar pronto antes

Contas:

- GitHub, com acesso de escrita à organização Casa-Shopping-Design.
- Supabase (o plano gratuito serve para o teste).
- Vercel, entrando com o GitHub.
- OpenAI, com crédito e uma chave de API só para este projeto.

No Mac:

```bash
brew install supabase/tap/supabase   # CLI do Supabase
supabase --version                    # 2.x
node --version                        # 22.x
python3 --version                     # 3.10 ou mais novo
```

Na OpenAI, em Settings > Limits, defina um limite mensal de gasto baixo para esta chave. O site vai estar aberto na internet e o limite por IP do chat é contado em memória.

## 1. Commitar o que está pendente

Na pasta do projeto, revise antes de commitar:

```bash
cd ~/Projetos/casa-shopping-design/site-rag
git status
git diff --stat
```

Depois, três commits:

```bash
git add .github avaliacao docs/acessibilidade.md docs/avaliacao-assistente.md docs/desempenho.md \
  docs/lgpd-plano-incidente.md docs/lgpd-ripd.md docs/qualidade-iso25010.md docs/relatorio-noturno.md \
  playwright.config.ts vitest.config.ts tests/README.md tests/acessibilidade tests/e2e \
  tests/unidade/conteudo.test.ts tests/unidade/limite.test.ts tests/unidade/openai.test.ts \
  tests/unidade/prompt.test.ts tests/unidade/rota-chat.test.ts tests/unidade/rota-leads.test.ts \
  src/components src/app/contato src/app/entrar src/app/globals.css src/app/locacao src/app/lojas src/app/page.tsx \
  src/lib/assistente/conversa.ts src/lib/assistente/limite.ts src/lib/assistente/marcador.ts src/lib/assistente/prompt.ts \
  src/app/api/leads supabase/migrations/20260927000006_privilegios_minimos.sql supabase/tests/ataques_rls.sql \
  .gitignore package.json package-lock.json next.config.ts
git commit -m "Integra seguranca, testes, acessibilidade, desempenho, assistente e CI/LGPD"

git add supabase/config.toml supabase/migrations/20260927000007_search_path_fixo.sql supabase/tests/search_path.sql docs/seguranca.md
git commit -m "Adiciona config.toml do Supabase e fixa o search_path das funcoes"

git add -A
git status   # confira que só sobrou o que é deste passo a passo
git commit -m "Prepara deploy de teste: noindex fora do dominio, tempo limite no chat e icone"

git push
```

Se algum `git add` reclamar de caminho inexistente, rode `git add -A` direto e confira com `git status`: o que importa é que tudo entre, os três commits só deixam o histórico mais legível.

Conferência: no GitHub, a aba Actions mostra o workflow CI rodando nos três jobs (Site, Banco, Ingestao). O job Banco agora encontra o `supabase/config.toml`. Se algum job falhar, pare aqui e me mande o log.

## 2. Criar o banco no Supabase

1. Em supabase.com, crie um projeto novo na organização que vai ficar com o Casa Shopping Design. Nome: `casa-shopping-design`. Região: South America (São Paulo). Guarde a senha do banco num gerenciador de senhas.
2. Anote o Project ref, que é o trecho `xxxx` de `https://xxxx.supabase.co` (também aparece em Project Settings > General).

No terminal, dentro da pasta do projeto:

```bash
supabase login
supabase link --project-ref <ref>        # pede a senha do banco
supabase db push --include-seed          # aplica as 7 migrations e cadastra os lojistas
```

O seed não duplica loja se for rodado de novo (confere pelo nome).

Rodar os testes de isolamento no banco de verdade. Os testes rodam dentro de uma transação desfeita no fim, então não deixam nada no banco:

```bash
supabase test db --linked
```

Esse comando usa o Docker para rodar o `pg_prove`. Se você não tiver Docker, abra no painel o SQL Editor, cole o conteúdo de cada arquivo de `supabase/tests/` (um por vez) e rode. Cada linha do resultado tem que começar com `ok`. Qualquer `not ok` é para parar e me mandar.

Conferência:

- Table Editor mostra as tabelas `lojas` (com os lojistas), `perfis`, `vinculos_loja`, `leads`, `documentos` e `trechos`.
- Os 4 arquivos de teste passam (112 testes no total).
- Em Advisors > Security Advisor, o único aviso esperado é o das extensões no schema `public`. Ele já está registrado em `docs/seguranca.md`.

## 3. Configurar o login no Supabase

Em Authentication:

1. Sign In / Providers: deixe só Email ligado e desligue "Allow new users to sign up". O site já não cria conta, e isso fecha também a criação de conta direto pela API com a chave pública. Convidar e criar usuário pelo painel continua funcionando.
2. Emails > SMTP Settings: o envio padrão do Supabase tem limite baixo por hora e só entrega para e-mails de quem é membro da equipe do projeto no Supabase. Para testar com você mesmo, serve. Para mandar link a um lojista de verdade, configure um SMTP próprio. O Resend tem plano gratuito e o painel dele mostra os valores de host, porta, usuário e senha para colar aqui. O remetente precisa ser de um domínio que você controla.
3. URL Configuration: preencha depois da etapa 5, quando o endereço da Vercel existir.

## 4. Mandar os documentos para o assistente

A ingestão roda na sua máquina, nunca na Vercel.

```bash
cd ~/Projetos/casa-shopping-design/site-rag
python3 -m venv .venv && source .venv/bin/activate
pip install -r ingestao/requirements.txt
cp ingestao/.env.example ingestao/.env
python3 -c "import uuid; print(uuid.uuid4())"   # vira o SCD_ID_GALERIA
```

Preencha o `ingestao/.env`:

- `DATABASE_URL`: no painel, botão Connect > Session pooler (porta 5432), com a senha do banco no lugar de `[YOUR-PASSWORD]`.
- `OPENAI_API_KEY`: a chave do projeto.
- `SCD_ID_GALERIA`: o uuid gerado acima. Não troque mais depois de usar.

Envie a base pública:

```bash
python ingestao/enviar.py ingestao/base/institucional.md --visibilidade publico --categoria institucional
python ingestao/enviar.py ingestao/base/lojistas.md --visibilidade publico --categoria lojas
```

Quando a administração entregar o regimento e as normas:

```bash
python ingestao/enviar.py regimento-interno.pdf --visibilidade inquilino --categoria regimento
python ingestao/enviar.py normas-obra.pdf --visibilidade inquilino --categoria regimento
```

Para o teste de isolamento na prática, vale mandar agora um documento curto e fictício como inquilino, por exemplo um `teste-inquilino.md` com "O horário de carga e descarga é das 7h às 9h". Depois do teste, apague esse documento pelo Table Editor (tabela `documentos`).

Conferência, no SQL Editor:

```sql
select titulo, visibilidade, id_loja from documentos;
select visibilidade, count(*) from trechos group by 1;
```

Os dois documentos da base aparecem como `publico` e têm trechos.

## 5. Publicar na Vercel

1. Em vercel.com, Add New > Project. Se a organização Casa-Shopping-Design não aparecer, clique em "Adjust GitHub App Permissions" e libere o acesso ao repositório `site-rag`.
2. Importe o repositório. A Vercel reconhece o Next.js sozinha, então não mexa em Build Command nem em Output Directory.
3. Em Environment Variables, cadastre (valem para Production e Preview):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API Keys > Publishable key (`sb_publishable_...`) |
| `OPENAI_API_KEY` | a chave do projeto |
| `MODELO_CHAT` | `gpt-4o-mini` |
| `MODELO_EMBEDDING` | `text-embedding-3-small` (tem que ser o mesmo da ingestão) |

   A secret key e a service_role do Supabase não entram na Vercel.
   Deixe `NEXT_PUBLIC_SITE_URL` de fora por enquanto.
4. Deploy. Quando terminar, vá em Settings > Domains e copie o endereço de produção (algo como `site-rag-xxxx.vercel.app`).
5. Cadastre `NEXT_PUBLIC_SITE_URL` com esse endereço, com `https://` e sem barra no fim. Depois, em Deployments, abra o último e clique em Redeploy. As variáveis `NEXT_PUBLIC_*` entram no build, então só valem depois do redeploy.
6. Em Settings > Functions, confira que a região é `gru1` (São Paulo), perto do banco.

Sobre a proteção de deploy: a Vercel protege com login os endereços únicos de cada deploy e os de preview. O endereço de produção (o que está em Domains) fica aberto. É ele que você manda para quem vai testar.

Sobre o plano: o Hobby da Vercel é para uso não comercial. Serve para o teste, mas antes de o site ir para o domínio oficial do cliente, o projeto tem que estar num time Pro ou na conta da galeria.

Volte ao Supabase, em Authentication > URL Configuration:

- Site URL: `https://<endereço-da-vercel>`
- Redirect URLs: `https://<endereço-da-vercel>/auth/confirmar` e, se quiser testar login nos previews, `https://*-<seu-time>.vercel.app/auth/confirmar`

Conferência:

- A página inicial abre no celular e no computador.
- `https://<endereço>/robots.txt` mostra `Disallow: /`.
- `https://<endereço>/lojas` lista os lojistas vindos do banco.
- O ícone vinho com "CSD" aparece na aba.

## 6. Cadastrar a administração e um lojista de teste

1. Authentication > Users > Add user > Create new user, com o seu e-mail (marque "Auto Confirm User"). Repita com um segundo e-mail seu, que vai fazer o papel de lojista.
2. No SQL Editor:

```sql
-- você como administração
insert into perfis (id_usuario, papel)
select id, 'admin' from auth.users where email = 'seu-email@exemplo.com';

-- segundo e-mail como lojista de uma loja do seed
insert into perfis (id_usuario, papel)
select id, 'inquilino' from auth.users where email = 'seu-outro-email@exemplo.com';

insert into vinculos_loja (id_usuario, id_loja)
select u.id, l.id
  from auth.users u, lojas l
 where u.email = 'seu-outro-email@exemplo.com' and l.nome = 'Braga Consultoria';
```

Se usar o SMTP padrão do Supabase, os dois e-mails precisam ser de membros da equipe do projeto (etapa 3).

## 7. Roteiro de teste

Visitante, numa janela anônima:

1. Abra o assistente e pergunte o endereço, o horário de sábado e se há estacionamento. As respostas batem com `content/site.json`.
2. Pergunte "qual o horário de carga e descarga?". O assistente diz que essa informação é restrita a inquilinos e sugere entrar ou falar com a administração, sem revelar o horário do documento fictício.
3. Diga que quer alugar uma sala. O formulário de contato abre com o aviso de consentimento. Envie com dados de teste.
4. Tente mandar o formulário 6 vezes seguidas. A sexta recebe o aviso de limite.

Lojista:

1. Em `/entrar`, peça o link com o e-mail de lojista e abra o link no mesmo navegador em que pediu. Se abrir em outro, o login falha, porque o código do link fica preso ao navegador de origem.
2. A área do lojista abre. Repita a pergunta da carga e descarga: agora vem o horário do documento de teste.
3. Peça para falar com alguém sobre locação. O formulário não abre para lojista.

Administração:

1. Entre com o seu e-mail e confira, no SQL Editor ou no Table Editor, que o lead do passo do visitante chegou.

Segurança, no terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<endereço>/api/chat \
  -H "Origin: https://exemplo.com" -H "Content-Type: application/json" \
  -d '{"mensagens":[{"papel":"usuario","texto":"oi"}]}'
# esperado: 403
```

Se tudo bater, apague o documento fictício de inquilino e o lead de teste.

## 8. Conteúdo que falta e onde entra

| O quê | Onde | Observação |
|---|---|---|
| WhatsApp da administração | `content/site.json`, `contato.whatsapp` | Só números, com DDI e DDD: `5579...` |
| E-mail da administração | `content/site.json`, `contato.email` | Também é o e-mail de privacidade da página /privacidade |
| Domingo e feriados | `content/site.json`, `horarios` | Hoje está `PREENCHER` e a linha não aparece no site |
| Logo em vetor | `src/app/icon.svg` (ícone) e `public/images/` | Mande o SVG que eu encaixo no cabeçalho e no ícone |
| Fotos | `public/images/`, com nome novo | Pelo menos 1.200 px de largura (ver `docs/desempenho.md`) |
| Lista de lojistas | `supabase/seed.sql` e `ingestao/base/lojistas.md` | "EST Coban" está no .md e não no seed. Depois de conferir, reenviar o .md pela ingestão |
| Regimento e normas | ingestão com `--visibilidade inquilino` | Etapa 4 |
| Razão social, CNPJ, encarregado (DPO) | `content/site.json` e /privacidade | Com a administração |
| Revisão jurídica do RIPD e do plano de incidente | `docs/lgpd-ripd.md`, `docs/lgpd-plano-incidente.md` | Antes do domínio oficial |

Cada mudança em `content/` ou `public/` é um commit e um push: a Vercel publica sozinha.

## 9. Decisões que ficam como estão no teste

O site funciona para o teste sem resolver estas, mas elas precisam de resposta antes do domínio oficial. Estão em `docs/decisoes.md`:

- histórico do chat vindo do navegador (hoje: 6 últimas mensagens, sem marcador);
- versão do texto de consentimento numa tabela e o que a administração pode editar num lead;
- tempo de guarda dos leads (LGPD);
- valores de locação (hoje: "tratados com a administração");
- permissão diferente para funcionário da loja;
- atendimento pelo WhatsApp.

## 10. Quando vier o domínio oficial

1. Em Vercel > Settings > Domains, adicione o domínio e siga as instruções de DNS.
2. Troque `NEXT_PUBLIC_SITE_URL` para o domínio e faça redeploy. O `noindex` sai sozinho quando o endereço bate com o `url` de `content/site.json`.
3. No Supabase, troque Site URL e Redirect URLs para o domínio.
4. Configure o SMTP com remetente do domínio da galeria.
