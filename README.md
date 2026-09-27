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
supabase/tests/       testes de isolamento (pgTAP)
ingestao/             script que envia documentos para a base com o nível escolhido
docs/                 decisões e o que falta de conteúdo
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
supabase init                 # só na primeira vez, cria o config.toml
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

## Deploy

Vercel, com as variáveis do `.env.example`. A service_role do Supabase não entra na Vercel: ela só é usada na ingestão, na máquina da administração.

Em Authentication > URL Configuration do Supabase, coloque o domínio do site em Site URL e `https://<domínio>/auth/confirmar` em Redirect URLs.
