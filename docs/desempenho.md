# Desempenho

Medição e ajustes de desempenho do site feitos em 27/09/2026, antes de haver domínio real e fotos em boa resolução.

## Como foi medido

Lighthouse 13.5, perfil mobile padrão (Moto G com 4G lento simulado), contra `next build` + `next start` local, sem `.env.local`. Sem Supabase configurado, a lista de lojistas vem vazia, então /lojas mostra só o título e a mensagem de lista vazia.

```bash
npx next build && npx next start -p 3104
CHROME_PATH=/caminho/do/chrome npx lighthouse http://localhost:3104/ \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

A máquina era compartilhada com outros processos e o LCP variou bastante entre rodadas iguais (de 1,1 s a 3,1 s na mesma página). Por isso cada página rodou três vezes antes e três depois, e a tabela mostra a mediana. O que não oscila são os pesos em KiB, que servem de comparação mais segura.

## Antes e depois

Notas (desempenho / acessibilidade / boas práticas / SEO), mediana de três rodadas:

| Página | Antes | Depois |
|---|---|---|
| / | 98 / 96 / 96 / 100 | 99 / 96 / 96 / 100 |
| /lojas | 96 / 100 / 96 / 100 | 97 / 100 / 96 / 100 |
| /locacao | 98 / 100 / 96 / 100 | 98 / 100 / 96 / 100 |

Métricas de desempenho, mediana:

| Página | FCP antes | FCP depois | LCP antes | LCP depois | CLS antes | CLS depois |
|---|---|---|---|---|---|---|
| / | 1,4 s | 0,8 s | 2,2 s | 2,3 s | 0,001 | 0 |
| /lojas | 1,4 s | 0,8 s | 2,6 s | 2,5 s | 0 | 0 |
| /locacao | 1,4 s | 0,8 s | 2,4 s | 2,3 s | 0 | 0 |

Depois da mudança o FCP ficou em 0,8 s nas nove rodadas. Antes variava entre 0,8 s e 1,4 s, com 1,4 s na maioria. A diferença de LCP fica dentro da variação da máquina e não dá para afirmar ganho só por ela.

Pesos transferidos na página inicial (KiB):

| Recurso | Antes | Depois |
|---|---|---|
| Total | 343 | 306 |
| JavaScript | 146 | 146 |
| Fontes | 83 | 83 |
| Imagens | 84 | 46 |
| CSS | 6 | 5 |
| HTML | 8 | 8 |

A foto principal (estacionamento) caiu de 63 KiB em WebP para 31 KiB em AVIF, no mesmo tamanho de 478 px.

## O que mudou

Imagens (`next.config.ts`, `hero.tsx`, `sobre.tsx`):

- O otimizador do Next passou a entregar AVIF, com WebP para navegador que não aceita. As fotos atuais ficaram entre 30% e 50% menores sem mexer na qualidade configurada (75).
- As larguras 2048 e 3840 saíram de `deviceSizes`. A foto mais larga do site ocupa uns 980 px no tablet, antes do layout de duas colunas, e numa tela 2x isso pede perto de 1.950 px, que o 1920 já atende. As duas opções maiores só aumentavam o `srcset` repetido no HTML, no preload e no payload do React. Entrou a largura 480, que é a das fotos de hoje.
- O `sizes` das duas fotos agora reflete a largura real da coluna no desktop (484 px no hero, 528 px no bloco "O centro") em vez de 40vw e 45vw, que pediam imagem maior que a necessária em telas largas.
- No hero, `priority` (obsoleto no Next 16) virou `preload` com `fetchPriority="high"`. O Lighthouse apontava que o preload da imagem do LCP estava sem prioridade alta.
- Não foram geradas novas versões dos arquivos em `public/images`. As fotos são quadros de vídeo com 478 x 850 px e o otimizador já corta e reduz sob demanda sem ampliar. Gerar arquivo maior seria inventar resolução.

Fontes (`layout.tsx`, `globals.css`):

- As fontes continuam vindo do fontsource, mas agora são carregadas pelo `next/font/local`, só com o subconjunto latin, que cobre o português. O CSS deixou de declarar os subconjuntos cirílico, grego, vietnamita e latin-ext.
- O `next/font` faz preload das duas fontes e cria uma fonte de reserva com métrica ajustada (Arial para a Inter, Times New Roman para a Fraunces). Foi isso que levou o FCP de 1,4 s para 0,8 s e zerou o pequeno CLS da página inicial.
- As variáveis `--fonte-texto` e `--fonte-titulo` saíram do `:root` do `globals.css` e passaram a ser definidas pelo `next/font` na tag `html`. Os nomes continuam os mesmos, então as classes `font-texto` e `font-titulo` não mudaram.
- Foi testado tirar o preload das fontes para liberar banda para a foto do hero. O FCP voltou para 1,2 a 1,4 s e o LCP não melhorou de forma que desse para medir, então o preload ficou.

Revalidação: `/` e `/lojas` já tinham `revalidate = 300` e as demais páginas públicas são estáticas. Ficou como estava.

## O que ficou de fora e por quê

- JavaScript: dos 146 KiB, quase tudo é React e o runtime do Next. O código do próprio site no cliente (assistente, formulários e ícones) soma cerca de 11 KiB comprimidos. Dá para carregar o painel do assistente só quando alguém abre o chat, mas o ganho é pequeno e mexe em componente de interface.
- Boas práticas em 96: o navegador pede `/favicon.ico` e recebe 404, o que gera erro no console. Falta um ícone da marca em `src/app/icon.png` ou `favicon.ico`.
- Acessibilidade em 96 na página inicial: na lista de endereço e horário (`<dl>` em `visita.tsx`), a observação do horário era um `<dd>` solto, fora do grupo que tem o `<dt>`. A revisão de acessibilidade já corrigiu isso. O Lighthouse não foi rodado de novo depois da junção das frentes.
- CSS bloqueando a renderização: é um arquivo só, de 5 KiB. O Next tem a opção experimental `inlineCss`, mas ela muda o cache do CSS entre páginas e não compensa agora.
- Subconjunto das fontes: dá para cortar mais peso gerando arquivos só com os pesos usados (Inter entre 400 e 700, Fraunces em 400). A economia estimada é de 20 a 30 KiB na primeira visita, mas qualquer título em negrito passaria a usar negrito sintético. Fica para quando a identidade visual estiver fechada.

## Caminho do chat (/api/chat)

Como está hoje, em série:

1. checagem de origem, limite por IP e leitura do corpo com teto de 64 KB (local, rápido);
2. `rpc('meu_perfil')` no Supabase (uma ida e volta);
3. embedding da pergunta na OpenAI (uma ida e volta);
4. `rpc('buscar_trechos_chat')` no Supabase (uma ida e volta);
5. chamada ao modelo com streaming, `max_tokens` 600.

Pontos observados e propostas. Nenhuma delas mexe em quem vê o quê: a busca continua com a sessão de quem pergunta e a RLS decide.

- Os passos 2 e 3 não dependem um do outro. Rodar os dois com `Promise.all` tira uma ida e volta do tempo até a primeira palavra da resposta, algo entre 50 e 200 ms. O perfil continua vindo do banco pela sessão; só muda a ordem.
- Sem tempo limite nas chamadas à OpenAI. Se o provedor travar, a função fica presa até o limite da Vercel. Proposta: `signal: AbortSignal.timeout(10_000)` no embedding e um tempo maior para o início do streaming, além de `export const maxDuration` na rota.
- Histórico: o servidor usa só as últimas 6 mensagens e o esquema aceita no máximo 20. Quando a tela mandava a conversa inteira, a 11ª pergunta recebia "Mensagem inválida.". Hoje `assistente.tsx` manda só as 6 últimas mensagens não vazias, o que também reduz o corpo da requisição.
- Tamanho do prompt: 6 mensagens de até 1.500 caracteres mais 6 trechos dá, no pior caso, perto de 5 mil tokens de entrada por pergunta. Para o volume esperado está bom. Se o custo pesar, dá para cortar mensagens antigas do assistente para 500 caracteres antes de mandar ao modelo.
- `max_tokens` 600 e temperatura 0,2 estão adequados para respostas curtas. Não há motivo para mudar sem ver respostas reais cortadas.
- Pergunta repetida gera embedding de novo. Um cache em memória do embedding por texto normalizado é seguro, porque o vetor não depende de quem pergunta. O resultado da busca nunca deve ir para cache compartilhado, porque esse depende da sessão.
- No banco, a política de `trechos` chama `pode_ver` linha a linha, e ela chama funções `security definer` que consultam `perfis` e `vinculos_loja`. Com poucas centenas de trechos isso não aparece. Se a base crescer para dezenas de milhares, vale medir com `explain analyze` e considerar guardar o papel no JWT (custom claims do Supabase), sempre com os quatro testes de isolamento passando.
- O `proxy.ts` chama `auth.getUser()` em toda navegação de página. Para visitante sem cookie a biblioteca não faz chamada de rede, mas para o lojista logado cada página custa uma ida ao Supabase Auth. Se isso pesar, dá para limitar o `matcher` às rotas que dependem de sessão. Precisa de cuidado para não deixar o token vencer no meio do chat.

## Quando houver fotos boas e domínio real

- Trocar os quadros de vídeo por fotos com pelo menos 1.200 px de largura. As larguras de `deviceSizes` já cobrem até 1920, então nada muda no código.
- Ao substituir uma foto, usar nome de arquivo novo. O otimizador guarda a versão gerada por 4 horas (`minimumCacheTTL` padrão do Next 16) e o nome novo evita servir a antiga. Com fotos estáveis, dá para subir esse tempo para alguns dias.
- Revisar o `sizes` se o layout do hero ou do bloco "O centro" mudar.
- Rodar o Lighthouse de novo contra o domínio da Vercel, que tem CDN, HTTP/2 e compressão reais. Os números locais servem para comparar antes e depois, não como nota final.
- Acompanhar o Speed Insights da Vercel com visitantes de verdade, principalmente LCP e INP no celular.
- Adicionar o favicon e o ícone da marca para zerar o erro de console.
