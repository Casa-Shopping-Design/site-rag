# Acessibilidade e usabilidade

Registro da revisão feita em setembro de 2026, com base na WCAG 2.2 nível AA e na característica "capacidade de interação" da ISO/IEC 25010:2023.

## Como verificar

Com o site compilado e rodando (sem `.env.local` a vitrine de lojas fica vazia, mas as páginas abrem):

```bash
npx next build
npx next start -p 3103
npm run acessibilidade     # axe-core em 6 páginas, desktop e 360px, tema claro e escuro
npm run contraste          # razão de contraste dos pares de cor do globals.css
```

O `auditar.mjs` usa `@axe-core/playwright` com as regras wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa e best-practice. Além do axe, ele testa o assistente pelo teclado (Enter abre, o foco vai para o campo, Esc fecha e o foco volta para o botão, controles com pelo menos 44px) e o erro do formulário de locação enviado sem telefone nem e-mail. Se o Chromium não for o do Playwright, informe o caminho em `CHROME`. Para salvar capturas, informe uma pasta em `CAPTURAS`.

Páginas cobertas: `/`, `/lojas`, `/locacao`, `/contato`, `/privacidade`, `/entrar` e o painel do assistente aberto na página inicial. A área do lojista não entrou porque depende de login no Supabase.

## O que o axe encontrou antes

Foram 34 ocorrências de 3 regras e 12 falhas no teste de teclado, somando as 4 combinações de tela e tema:

- `definition-list`: na seção "Como chegar", a observação do horário era um `<dd>` solto dentro da `<dl>`.
- `page-has-heading-one`: `/lojas` e `/locacao` não tinham `<h1>`.
- `target-size`: os links Lojas, Locação e Contato no celular tinham 20px de altura, sem folga entre eles.
- Assistente: o foco não ia para o campo ao abrir, Esc não fechava e o botão de enviar e o campo tinham 36 e 38px.

Depois das mudanças, o script termina com 0 violações e 0 falhas de teclado.

## Contraste

Os pares de texto da paleta já passavam de 4,5:1 nos dois temas. O menor era o salmão escuro (`--destaque`) sobre o fundo claro, com 4,95:1. A tabela completa sai do `npm run contraste`.

O que falhava ficava fora do texto:

| Elemento | Antes | Depois |
| --- | --- | --- |
| Contorno dos campos de formulário (claro) | `--borda` 1,24:1 | `--borda-campo` #94787f, 3,72:1 no fundo e 4,00:1 no cartão |
| Contorno dos campos de formulário (escuro) | `--borda` 1,37:1 | `--borda-campo` #7d6a6f, 3,70:1 e 3,45:1 |
| Ícone branco no botão de enviar do assistente (escuro) | 2,27:1 | botão passou a ser vinho com ícone na cor do fundo, 9,88:1 |
| Anel de foco sobre a faixa vinho da página inicial | 1,88:1 | aro na cor do fundo entre o elemento e o contorno, 9,31:1 |

O vinho, o salmão e os tons de fundo não mudaram. `--borda` continua nas divisórias e nos cartões, onde a borda é decorativa.

## O que mudou

Assistente (`src/components/assistente/assistente.tsx`):

- O painel virou um diálogo não modal (`role="dialog"` com título e descrição ligados por `aria-labelledby` e `aria-describedby`).
- Ao abrir, o foco vai para o campo da pergunta. Esc fecha de qualquer ponto e o foco volta para o botão que abriu.
- A lista de mensagens deixou de ser `aria-live`. Antes o leitor de tela anunciava cada pedaço do streaming. Agora uma região `role="status"` avisa "Buscando a resposta." e, no fim, lê a resposta inteira uma vez, avisando se o formulário de contato apareceu.
- Cada balão tem um prefixo só para leitor de tela ("Você:" ou "Assistente:").
- Campo e botão de enviar com 44px. O campo usa 16px no celular, para o iOS não dar zoom ao focar.
- O texto do botão fechado passou a ser "Fechar assistente". No celular o painel ocupa no máximo a altura da tela menos a área do botão, e o rodapé ganhou folga embaixo para o botão flutuante não cobrir a última linha.

Formulário de locação (`src/components/formularios/formulario-lead.tsx`):

- Uma dica no topo diz o que é obrigatório: nome e pelo menos um contato. Antes a API recusava o envio sem telefone e sem e-mail, mas a tela não avisava.
- Esse caso agora é conferido antes do envio. Os dois campos recebem `aria-invalid`, a mensagem fica ligada a eles por `aria-describedby` e o foco vai para o telefone.
- Erros aparecem numa região `role="alert"` que já existe na página, o que torna o anúncio mais confiável.
- O envio é anunciado ("Enviando seu contato.") e a confirmação recebe o foco, já que o formulário some da tela.
- Ids gerados com `useId`, porque o formulário pode aparecer duas vezes na mesma página (locação e assistente).
- `autocomplete` em nome, telefone e e-mail, `inputMode="tel"` no telefone e caixa de aceite maior (20px).

Formulário de entrada (`src/app/entrar/formulario-entrada.tsx`): rótulo com `htmlFor`, erro ligado ao campo por `aria-describedby` e `aria-invalid`, envio anunciado e foco na mensagem de confirmação.

Navegação e páginas:

- O cabeçalho do celular sobrepunha o nome do centro e o menu de baixo. A altura passou a acompanhar o conteúdo e "Área do lojista" não quebra mais em duas linhas.
- Links do menu com 44px de altura e marcação da página atual (`aria-current="page"`, sublinhado salmão). Isso ficou num componente cliente pequeno, `src/components/layout/link-menu.tsx`.
- `TituloSecao` aceita `principal` para virar `<h1>`. Usado em `/lojas`, `/locacao` e `/contato`.
- Perguntas frequentes ganharam uma seta que gira ao abrir. Antes nada indicava que a pergunta expandia.
- Links que abrem em nova aba avisam isso ao leitor de tela. "Instagram" e "Site" nos cartões de loja dizem de qual loja são.
- `scroll-padding` no `html`, para o cabeçalho fixo e o botão do assistente não esconderem o item focado (WCAG 2.4.11).

## Pendências

- A área do lojista não foi auditada. Precisa de uma sessão de teste no Supabase local para o script entrar logado.
- O mapa depende de `mapaEmbedUrl` e do Google Maps. Quando for preenchido, vale conferir se o iframe não prende o foco do teclado.
- Não houve teste com leitor de tela real (NVDA, VoiceOver ou TalkBack). Os anúncios do assistente foram pensados para isso, mas convém ouvir uma conversa inteira antes de publicar.
- O assistente não tem opção de limpar a conversa nem de copiar a resposta. Ficou fora por ser decisão de produto.
- O `themeColor` do `layout.tsx` é fixo no vinho e não acompanha o tema escuro. O arquivo está fora do escopo desta revisão.
- O axe roda com a vitrine vazia. Quando houver lojas cadastradas, rodar de novo para cobrir os cartões com telefone, Instagram e site.
