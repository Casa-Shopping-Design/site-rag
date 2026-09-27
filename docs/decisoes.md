# Decisões

## Stack

Next.js 16 com App Router na Vercel, Supabase (Postgres, Auth, pgvector) e RLS no banco. Segue as instruções do projeto. O Coral Village em produção roda em Cloudflare Worker; aqui ficou Next.js porque as páginas públicas são estáticas e o chat cabe numa rota de API.

As fontes vêm do fontsource (servidas pelo próprio site) em vez de next/font/google, para o build não depender do Google.

## Esquema da ingestão reaproveitado sem mudança

A primeira migration é o esquema da biblioteca rag-ingestao (001 e a tabela de contexto da 008), com dimensão 1536 e full-text em português. O worker da biblioteca grava direto nessas tabelas. A RLS da biblioteca (007, baseada em `app.id_proprietario`) ficou de fora porque este projeto usa `auth.uid()`.

## Visibilidade traduzida por gatilho

A biblioteca só conhece `audiencias`. O script de ingestão grava uma de quatro: `publico`, `inquilino`, `admin` ou `loja:<uuid>`. Um gatilho em `documentos` traduz isso para as colunas `visibilidade` e `id_loja`, e outro copia os dois valores para cada trecho gravado. Qualquer rótulo fora da lista, inclusive o `todos` que a biblioteca usa por padrão, vira `admin`. Na dúvida, fecha.

Documento de loja é sempre nível inquilino com `id_loja` preenchido. Se o mesmo arquivo trouxer loja e público, a loja prevalece.

## Uma regra de leitura só

A função `pode_ver(visibilidade, id_loja)` é usada pelas políticas de `documentos` e `trechos`. Admin vê tudo. Público vê público. Inquilino vê público, o nível inquilino geral e o da própria loja. Usuário logado sem linha em `perfis` conta como visitante.

## Busca sem parâmetro de permissão

`buscar_trechos_chat` recebe só o vetor, o limite e a similaridade mínima. Não aceita nível nem loja, então quem pergunta não tem como pedir mais do que pode ver. É `security invoker`, então roda com a sessão do usuário e a RLS corta o resultado. A varredura iterativa do HNSW (pgvector 0.8) é ligada dentro da função para o filtro da RLS não deixar a busca vazia.

## Chat sem service_role

A rota `/api/chat` usa o cliente com os cookies da sessão. Sem login, o Supabase trata a requisição como `anon`. A service_role não aparece em nenhum arquivo do site.

## Lead pelo formulário, não pelo chat

O modelo não pede nome nem telefone. Quando o visitante mostra interesse em alugar, ele termina a resposta com um marcador e a tela abre o formulário, com o aviso de consentimento. O texto aceito fica gravado junto com o lead. Visitante pode inserir na tabela `leads`, mas não lê nada, nem o próprio registro. Só a administração lê.

## Login por link no e-mail

Sem senha. `shouldCreateUser` falso impede cadastro pelo site: só entra quem a administração criou. A resposta da tela é a mesma com ou sem cadastro, para não revelar quem é lojista.

## Limite de perguntas em memória

15 perguntas por minuto por IP, contadas em memória. Na Vercel cada instância conta separado, então segura abuso simples. Se o uso crescer, trocar por Upstash ou por uma tabela.

## Em aberto

- Valores de locação ficam públicos, só para lead identificado ou só no contato com a administração? Hoje o assistente responde que valores são tratados com a administração.
- Funcionário da loja vê menos que o responsável? A coluna `funcao` em `vinculos_loja` já existe, mas ainda não muda permissão.
- Atendimento pelo WhatsApp, como no Coral Village.
- Tela de upload para a administração. Hoje a ingestão é pelo script.
