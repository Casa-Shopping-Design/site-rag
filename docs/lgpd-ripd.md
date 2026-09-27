# RIPD do site do Casa Shopping Design

Relatório de Impacto à Proteção de Dados Pessoais (LGPD, art. 5º, XVII, e art. 38) do site e do assistente.

Situação: RASCUNHO para validação jurídica e da administração. Foi adaptado do RIPD do Coral Village a partir do que o código faz hoje. Nada aqui foi aprovado pela galeria. Prazos de retenção e outros pontos marcados como PROPOSTA A VALIDAR são sugestões técnicas e só passam a valer depois de aprovados.

Versão 0.1, setembro de 2026. Revisar sempre que entrar um tratamento novo (outro formulário, WhatsApp, tela de upload, novo fornecedor) e pelo menos uma vez por ano.

## 1. Agentes de tratamento

| Papel | Quem | Observação |
|---|---|---|
| Controlador | Administração do Casa Shopping Design (razão social e CNPJ a preencher) | Decide para que e como os dados são usados |
| Encarregado | A designar | O art. 41 pede nome e contato publicados. A página /privacidade hoje usa o e-mail da administração, que ainda está vazio em `content/site.json` |
| Operadores | Supabase (banco, autenticação e envio do link de login), Vercel (hospedagem e logs), OpenAI (embeddings e respostas do assistente) | Tratam dados em nome da galeria. Falta conferir os termos de cada um (DPA) e registrar aqui |

## 2. Inventário de tratamentos

| # | Dados | Titulares | Finalidade | Base legal sugerida | Onde ficam |
|---|---|---|---|---|---|
| 1 | Nome, telefone, e-mail, tipo de espaço, mensagem, origem (site ou assistente) | Interessados em locação (leads) | Retornar o contato sobre locação | Consentimento (art. 7º, I). O jurídico pode avaliar também procedimentos preliminares de contrato (art. 7º, V) | Tabela `leads` |
| 2 | Texto do aviso aceito, data e hora do aceite | Leads | Provar o consentimento (art. 8º, §2º) | Cumprimento de obrigação legal (art. 7º, II) | Colunas `consentimento_texto` e `consentimento_em` em `leads` |
| 3 | E-mail, identificador do usuário, papel (inquilino ou admin), nome opcional, vínculo com loja e função | Lojistas, funcionários autorizados e equipe da administração | Dar acesso à área do lojista e aos documentos certos | Execução de contrato (art. 7º, V) com o lojista; legítimo interesse (art. 7º, IX) para a equipe | `auth.users` (Supabase Auth), `perfis`, `vinculos_loja` |
| 4 | Dados de vitrine da loja: nome, segmento, telefone, Instagram, site, sala | Lojistas; quando a loja leva o nome de uma pessoa (profissional liberal), a própria pessoa | Divulgar as lojas do centro | Legítimo interesse (art. 7º, IX), com dados já tornados públicos pelo próprio lojista (art. 7º, §4º) | Tabela `lojas` e `supabase/seed.sql` |
| 5 | Texto das perguntas e respostas do chat, histórico curto da conversa | Qualquer visitante ou lojista que use o assistente | Responder a dúvida | Legítimo interesse (art. 7º, IX) | Não é gravado no banco. O texto vai para a OpenAI para gerar o embedding e a resposta (ver seção 3) |
| 6 | Trechos de documentos recuperados pela busca | Pessoas citadas em documentos da galeria (regimento, comunicados, contratos de loja) | Montar a resposta do assistente | Legítimo interesse (art. 7º, IX); para contratos, execução de contrato (art. 7º, V) | `documentos`, `versoes_documento`, `trechos`; cópia do arquivo original na máquina de quem faz a ingestão (`ingestao/arquivos/`) |
| 7 | IP, data e hora, rota acessada, mensagens de erro | Qualquer visitante | Segurança, limite de perguntas e diagnóstico | Legítimo interesse (art. 7º, IX); o jurídico deve avaliar o art. 15 do Marco Civil (ver seção 5) | Logs da Vercel e do Supabase. O IP também fica em memória no limite por IP (`src/lib/assistente/limite.ts`): um minuto no chat e dez minutos no formulário de lead |
| 8 | Cookie de sessão do Supabase | Lojistas e equipe logados | Manter a pessoa logada | Execução de contrato ou legítimo interesse; cookie estritamente necessário | Navegador da pessoa |

O site não usa ferramenta de analytics, pixel de anúncio nem cookie de terceiros. O assistente não pede nome, telefone ou e-mail. Quando alguém mostra interesse em alugar, a tela abre o formulário com o aviso de consentimento (decisão registrada em `docs/decisoes.md`).

Nenhum dado sensível (art. 5º, II) é pedido. O risco é a pessoa escrever um dado desses por conta própria no chat ou na mensagem do formulário. O texto da página /privacidade já orienta a não escrever dados pessoais no chat.

## 3. Transferência internacional

As perguntas do chat e o texto dos documentos ingeridos vão para a API da OpenAI, que processa fora do Brasil. É transferência internacional (art. 33). Pontos para o jurídico:

- Definir a hipótese do art. 33 que se aplica (cláusulas-padrão contratuais da Resolução CD/ANPD nº 19/2024 ou outra) e conferir o que os termos da OpenAI oferecem.
- Conferir por quanto tempo a OpenAI guarda o conteúdo das chamadas de API e se o contrato permite pedir retenção zero. Pela política pública do fornecedor, dado de API não é usado para treinar modelo por padrão, mas isso precisa ser confirmado no contrato vigente.
- Citar a transferência na página /privacidade, que hoje fala só em "um serviço de inteligência artificial".
- A região do projeto Supabase e da Vercel também precisa ser registrada. O exemplo em `ingestao/.env.example` aponta para São Paulo (sa-east-1), mas isso depende de como o projeto foi criado.

A variável `OPENAI_BASE_URL` permite trocar o fornecedor por outro compatível sem mudar código, o que pode ajudar se a galeria preferir processamento no Brasil.

## 4. Retenção

Todos os prazos abaixo são PROPOSTA A VALIDAR. Hoje nenhum deles é aplicado automaticamente.

| Dado | Proposta | Como aplicar |
|---|---|---|
| Lead novo, em contato ou descartado | Apagar 12 meses depois do cadastro se não virou contrato | Rotina agendada (pg_cron no Supabase) ou revisão manual trimestral |
| Lead convertido | Sai do site: os dados passam para o cadastro do contrato de locação, que segue os prazos contratuais e fiscais. Apagar da tabela `leads` em até 90 dias depois da assinatura | Manual, pela administração |
| Registro do consentimento | Enquanto o lead existir. Se o titular pedir exclusão, o jurídico decide se guarda só a prova do aceite e do pedido (sem telefone e e-mail) | Depende da decisão |
| Conta de lojista e vínculo com loja | Remover em até 30 dias depois do fim do contrato da loja | Apagar o usuário em Authentication; `perfis` e `vinculos_loja` saem em cascata |
| Dados de vitrine da loja | Tirar do ar no fim do contrato (`ativa = false`) e apagar em até 6 meses | Manual |
| Documento de loja ingerido na base | Até a data de validade (`--valido-ate`) ou fim do contrato, o que vier antes | Exclusão definitiva do documento (ver seção 6) e do arquivo em `ingestao/arquivos/` |
| Perguntas do chat | Não guardar no banco, como hoje. Na OpenAI, o menor prazo que o contrato permitir | Configuração da conta OpenAI |
| Logs de acesso | 6 meses, se o jurídico entender que o art. 15 do Marco Civil se aplica | Depende do plano da Vercel e do Supabase, ou de exportação dos logs |

## 5. Riscos e medidas

| Risco | Nível | O que já existe | O que falta |
|---|---|---|---|
| Visitante ou lojista ler documento que não pode | Alto | RLS em `documentos` e `trechos` pela função `pode_ver`; busca `security invoker` sem parâmetro de nível; visitante usa a chave anon; testes pgTAP em `supabase/tests/isolamento_rls.sql` e `visibilidade_ingestao.sql`, rodados no CI | Manter os testes passando em toda mudança de política ou busca |
| Lojista da loja A ver dado da loja B | Alto | `id_loja` em documento e trecho; `minhas_lojas()`; teste obrigatório 2 | Nada além dos testes |
| Leitura da tabela de leads por quem não é da administração | Alto | Visitante só insere e não lê nem o próprio registro; select, update e delete só com `eh_admin()`; teste obrigatório 3 e os ataques de `supabase/tests/ataques_rls.sql` | Nada além dos testes |
| Uso da service_role no chat | Alto | Service_role fora do site e da Vercel; chat usa a sessão de quem pergunta (`clienteServidor`) | Conferir no painel da Vercel que a chave não foi cadastrada |
| Documento com dado pessoal de terceiro (contrato com CPF, endereço de sócio) entrar na base e ir para a OpenAI | Médio | Nível de visibilidade escolhido no envio; documento de loja só aparece para a própria loja | Definir regra de ingestão: contratos com dados pessoais completos não entram, ou entram em versão resumida |
| Pessoa escrever dado sensível no chat | Médio | Aviso na página /privacidade; perguntas não ficam no banco | Aviso curto junto do campo do chat |
| Vazamento das chaves (OpenAI, service_role, senha do banco) | Alto | `.env*` no `.gitignore`; CI sem segredos; service_role só na máquina da ingestão | Rotina de rotação e revisão de quem tem acesso aos painéis |
| Excesso de retenção de leads e contas | Médio | Coluna `situacao` e `criado_em` em `leads` | Aprovar os prazos da seção 4 e criar a rotina de exclusão |
| Cadastro indevido pela tela de login | Baixo | `shouldCreateUser` falso; resposta igual com ou sem cadastro | Nada |
| Abuso do chat (custo e volume de dados enviados à OpenAI) | Baixo | 15 perguntas por minuto por IP, em memória; corpo limitado a 64 KB; pergunta de outro site recusada | Limite compartilhado entre instâncias, se o uso crescer |
| Prova do consentimento forjada (aceite com data retroativa gravado direto pela API do Supabase) | Médio | Insert em `leads` liberado só nas colunas do formulário; id, situação e data do aceite vêm do banco (migration 000006) | `consentimento_texto` ainda aceita texto livre de quem chama a API direto; versionar o aviso numa tabela |
| Dados de vitrine de profissionais liberais publicados sem aviso | Baixo | Levantados de perfis públicos da própria loja | Confirmar com cada lojista o que pode aparecer |
| Registros de acesso guardados por prazo menor que o exigido | Médio | Logs da Vercel e do Supabase no plano atual | Jurídico avaliar o art. 15 do Marco Civil; se aplicável, exportar logs |

## 6. Direitos do titular (art. 18) e como atender no Supabase

O pedido chega pelo canal do encarregado (e-mail publicado na página /privacidade). A LGPD dá 15 dias para a confirmação de existência e o acesso completo (art. 19, II). Antes de responder, confirmar que quem pede é o titular, por exemplo respondendo ao mesmo e-mail ou telefone do cadastro.

Os comandos abaixo rodam no SQL Editor do Supabase, com a conta da administração. Troque os valores de exemplo.

Confirmação e acesso:

```sql
select nome, telefone, email, tipo_espaco, mensagem, origem,
       consentimento_texto, consentimento_em, situacao, criado_em
  from leads
 where email = 'pessoa@exemplo.com' or telefone = '(79) 90000-0000';
```

Para lojista, somar o cadastro:

```sql
select u.email, u.created_at, u.last_sign_in_at, p.papel, p.nome,
       l.nome as loja, v.funcao
  from auth.users u
  left join perfis p on p.id_usuario = u.id
  left join vinculos_loja v on v.id_usuario = u.id
  left join lojas l on l.id = v.id_loja
 where u.email = 'lojista@exemplo.com';
```

Correção: `update leads set telefone = '...' where id = '<id>';` ou `update perfis set nome = '...' where id_usuario = '<id>';`.

Eliminação e revogação do consentimento:

```sql
delete from leads where id = '<id>';
```

Para lojista, apagar o usuário em Authentication > Users. `perfis` e `vinculos_loja` saem em cascata.

Documento da base que cite o titular: a exclusão pela biblioteca preenche `excluido_em` e tira o documento da busca, mas o texto continua nas tabelas. Para eliminar de fato:

```sql
delete from documentos where id = '<id>';  -- versoes, trechos, contextos e fila saem em cascata
```

A tabela `log_ingestao` não tem chave estrangeira para a versão e fica. Ela guarda etapa e situação do processamento; conferir a coluna `detalhe` antes de responder que nada restou.

E apagar o arquivo original em `ingestao/arquivos/` na máquina da ingestão.

Portabilidade: exportar o resultado da consulta de acesso em CSV pelo próprio SQL Editor.

Informação sobre compartilhamento: responder com a lista de operadores da seção 1.

Perguntas feitas ao chat não ficam no banco, então não há o que exportar ou apagar do lado da galeria. O pedido sobre esse dado deve citar a retenção do fornecedor (seção 3).

## 7. Medidas de segurança já implementadas

- RLS ligada nas 11 tabelas do esquema público, com leitura por perfil. A escrita fica com a administração e com a ingestão; a única exceção é o insert em `leads`, que exige consentimento e só aceita as colunas do formulário.
- Busca do chat `security invoker`, sem parâmetro de permissão, testada com pgTAP.
- Quatro testes obrigatórios de isolamento em `supabase/tests/isolamento_rls.sql`, mais os de tradução de visibilidade em `supabase/tests/visibilidade_ingestao.sql`. O CI (`.github/workflows/ci.yml`) roda todos os arquivos de `supabase/tests` a cada push e pull request.
- Consentimento obrigatório no banco (`ck_leads_consentimento`) e na rota `/api/leads`, com o texto aceito gravado junto.
- Login sem senha, sem cadastro aberto.
- `anon` e `authenticated` sem TRUNCATE, TRIGGER e REFERENCES (migration 000006), com 75 testes de ataque em `supabase/tests/ataques_rls.sql`.
- Cabeçalhos de segurança (CSP, HSTS, `frame-ancestors 'none'`) em todas as páginas; `/api/leads` e `/api/chat` recusam pedido de outro site e corpo grande demais; o formulário de lead tem limite por IP e campo isca contra robô. Detalhes em `docs/seguranca.md`.
- Segredos fora do repositório e do CI. Dependabot semanal para npm, pip e GitHub Actions.

## 8. Pendências

- [ ] Preencher razão social e CNPJ do controlador.
- [ ] Designar o encarregado e publicar o contato na página /privacidade.
- [ ] Validar bases legais e os prazos da seção 4.
- [ ] Registrar os termos de tratamento (DPA) de Supabase, Vercel e OpenAI e a hipótese de transferência internacional.
- [ ] Revisar a página /privacidade: citar a OpenAI e a transferência internacional, e rever a frase "não são repassados a terceiros", já que os operadores tratam os dados.
- [ ] Definir se o art. 15 do Marco Civil se aplica e como guardar os registros de acesso.
- [ ] Definir regra para ingestão de documentos com dados pessoais de terceiros.
- [ ] Criar a rotina de exclusão de leads antigos depois de aprovado o prazo.
- [ ] Confirmar com os lojistas os dados de vitrine publicados.

## 9. Conclusão provisória

Os tratamentos têm finalidade clara e pedem poucos dados. O controle de acesso aos documentos e aos leads está no banco e é testado automaticamente. Os pontos em aberto são documentais e de governança: encarregado, contratos com os operadores, transferência internacional para a OpenAI e prazos de retenção. Este texto só vale como RIPD depois da revisão jurídica e da aprovação da administração.
