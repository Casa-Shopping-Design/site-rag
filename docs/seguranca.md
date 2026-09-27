# Segurança

Modelo de ameaças do site-rag, o que já está coberto e o que falta. Serve de ponto de partida para revisão, não de certificado.

## O que proteger

- Trechos e documentos de nível inquilino e admin, e os documentos de cada loja.
- Leads: nome, telefone, e-mail e o registro do aceite (texto e data), que é a prova de consentimento pela LGPD.
- Perfis e vínculos entre usuário e loja, que decidem quem vê o quê.
- Chave da OpenAI e cota de uso do modelo, que custam dinheiro.
- Sessão do lojista (cookies do Supabase Auth).

## Quem pode atacar

- Visitante anônimo com a chave pública do Supabase. Essa chave vai para o navegador, então qualquer pessoa pode chamar a API do Supabase direto, sem passar pelo site.
- Lojista logado tentando ver outra loja, virar admin ou mexer em documento.
- Robô enchendo o formulário de lead ou gastando a cota do assistente.
- Página de outro site tentando usar a sessão de quem está logado (CSRF, clickjacking).

## Ameaças por componente

| Componente | Ameaça | Mitigação existente | Lacuna |
|---|---|---|---|
| Busca do chat | Visitante ou lojista recebe trecho que não pode ver | RLS em `trechos` e `documentos` via `pode_ver`; `buscar_trechos_chat` é security invoker e não aceita nível nem loja | Nenhuma conhecida |
| Busca da biblioteca | `buscar_trechos` aceita `p_audiencias` e é invoker | Execute revogado de anon e authenticated | Nenhuma |
| Funções auxiliares | Chamar `eh_admin`, `minhas_lojas`, `meu_perfil`, `pode_ver` direto | Só respondem sobre a própria sessão; as security definer têm `search_path` vazio | Nenhuma |
| Tabelas da ingestão | Cliente grava ou apaga documento, trecho, versão, fila, log, uso ou contexto | RLS só com política de leitura; ninguém escreve pelo cliente | Nenhuma |
| Grants padrão | `grant all` do Supabase dá TRUNCATE, que a RLS não cobre | Revogado na migration 000006, também para tabelas futuras | Sequências continuam com grant padrão |
| Perfis e vínculos | Lojista se promove a admin ou se vincula a outra loja | Escrita só com `eh_admin()` | Sem trilha de quem alterou |
| Leads | Ler leads, inclusive pelo retorno do insert | Só admin tem política de leitura | Nenhuma |
| Leads | Gravar aceite com data retroativa ou já com situação avançada | Insert liberado só nas colunas do formulário (000006); id, situação e datas vêm do banco | `consentimento_texto` ainda é texto livre para quem chama a API direto |
| Leads | Admin reescreve dados do aceite | Nenhuma | Update de admin vale para todas as colunas |
| `/api/leads` | Spam de robô | Campo isca, 5 envios por IP a cada 10 minutos, corpo até 16 KB | Contagem em memória, por instância |
| `/api/chat` | Gasto de cota da OpenAI | 15 perguntas por IP por minuto, corpo até 64 KB, histórico cortado em 6 | Contagem em memória, por instância |
| `/api/leads` e `/api/chat` | CSRF | Origem conferida (`Origin`, ou `Sec-Fetch-Site` quando falta) | Nenhuma |
| `/auth/sair` | CSRF para deslogar | Cookie de sessão do Supabase é `SameSite=Lax`, então não vai em POST de outro site | A rota não confere origem |
| Páginas | Clickjacking, XSS, vazamento de URL | CSP, `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS | CSP com `'unsafe-inline'` em script |
| Login | Descobrir quem é lojista, criar conta | Resposta igual com ou sem cadastro; `shouldCreateUser` falso | Limite de envio de link fica a cargo do Supabase Auth |
| Ingestão | Service_role vazar para o site | Só roda na máquina da administração; nenhum arquivo do site usa | Nenhuma |

## Cabeçalhos HTTP

Definidos em `next.config.ts` e aplicados a todas as rotas. As exceções da CSP:

- `script-src 'unsafe-inline'`: o Next coloca scripts inline para hidratar a página e entregar o payload do React Server Components. A alternativa é nonce por requisição, que obriga render dinâmico em todas as páginas e perde o cache estático. O JSON-LD do layout não entra nessa conta, porque bloco `application/ld+json` não é executado nem bloqueado pela CSP.
- `script-src 'unsafe-eval'`: só em desenvolvimento, porque o React usa eval para montar pilhas de erro.
- `style-src 'unsafe-inline'`: atributos `style` do React e do `next/image`.
- `img-src data: blob:`: placeholders de imagem.
- `font-src data:`: vem de quando as fontes do fontsource entravam embutidas no CSS. Hoje elas são carregadas pelo `next/font/local` e saem de `/_next/static/media`, que já cabe em `'self'`. Dá para tirar o `data:` numa próxima revisão, conferindo no navegador que nenhuma fonte deixa de carregar.
- `connect-src`: o próprio site mais a origem de `NEXT_PUBLIC_SUPABASE_URL`, lida no build. Hoje o navegador só chama `/api/*`; a origem do Supabase está lá para quando houver cliente no navegador. Em desenvolvimento entra `ws:` para o recarregamento automático.
- `frame-src`: só o Google Maps, usado na seção de visita.

HSTS vai sem `includeSubDomains` e sem `preload` até alguém confirmar que nenhum subdomínio do domínio da galeria depende de http.

## Como rodar os testes de ataque

Com a CLI do Supabase, junto com os outros testes:

```bash
supabase test db
```

Sem a CLI, dá para rodar num Postgres com pgvector e pgTAP: primeiro um shim que cria os papéis `anon`, `authenticated` e a função `auth.uid()`, depois as migrations em ordem e por fim os arquivos de `supabase/tests`. O shim e o script usados na revisão não fazem parte deste repositório.

`supabase/tests/ataques_rls.sql` roda dentro de uma transação desfeita no fim. Ele tenta, como visitante e como lojista, chamar as funções direto, gravar lead forjado, ler lead pelo retorno do insert, escrever nas tabelas da ingestão, alterar perfis e vínculos, ver loja inativa e usar TRUNCATE. No fim confere como postgres que nada mudou e, como admin, que o aperto não tirou o que a administração precisa.

Para conferir os cabeçalhos:

```bash
npx next build && npx next start -p 3101
curl -sI http://localhost:3101/
curl -s -X POST http://localhost:3101/api/leads -H 'Origin: https://outro.example' -d '{}'   # espera 403
```

## Dependências

Em 27/09/2026: `npm audit` sem vulnerabilidades; `pip-audit -r ingestao/requirements.txt` sem vulnerabilidades conhecidas nas dependências resolvidas. O pacote `rag-ingestao` vem do GitHub e não é coberto pelo pip-audit.

## Pendências

- Texto do consentimento: hoje quem chama a API direto pode gravar qualquer texto em `consentimento_texto`. Uma saída é guardar as versões do aviso numa tabela e o lead apontar para a versão. Depende de decidir como a administração publica um aviso novo.
- O que a administração pode alterar num lead. Se os campos do aceite devem ficar imutáveis, basta trocar o grant de update por colunas.
- Trilha de auditoria (quem mudou perfil, vínculo ou situação de lead, e quando).
- Limite por IP persistente (Upstash ou tabela), para valer entre instâncias da Vercel. O IP vem de `x-forwarded-for`, que a Vercel preenche; fora dela esse cabeçalho pode ser forjado.
- CSP com nonce, se o ganho compensar perder as páginas estáticas.
- `includeSubDomains` e `preload` no HSTS.
- As extensões `vector` e `pgcrypto` continuam no schema `public`, e o Security Advisor do Supabase vai apontar isso. Mudar de schema mexe no tipo `vector` usado pela biblioteca de ingestão, então fica para quando houver motivo. O `search_path` das funções da biblioteca e dos gatilhos foi fixado na migration 000007, com o mesmo caminho que o Supabase já usa, e `supabase/tests/search_path.sql` falha se aparecer função nova sem ele.
- Grants padrão nas sequências (`log_ingestao_id_seq`).
- Se um dia o JSON-LD passar a usar texto vindo do banco, escapar `<` antes de colocar no `<script>`.
- `font-src data:` provavelmente sobrou (ver a seção de cabeçalhos).
- Cookies de sessão do Supabase não são `httpOnly`, então um XSS leria a sessão. A CSP reduz o risco, mas não elimina enquanto houver `'unsafe-inline'`.
