# Plano de resposta a incidente com dados pessoais

Site e assistente do Casa Shopping Design. Base: art. 48 da LGPD e Resolução CD/ANPD nº 15/2024 (comunicação de incidente de segurança).

Situação: RASCUNHO para validação jurídica e da administração. Adaptado do plano do Coral Village para a estrutura deste projeto. Os nomes dos responsáveis ainda não foram definidos.

Versão 0.1, setembro de 2026. Ler junto com o RIPD (`docs/lgpd-ripd.md`).

## 1. O que conta como incidente

Qualquer evento, confirmado ou suspeito, que afete a confidencialidade, a integridade ou a disponibilidade de dados pessoais. Exemplos ligados a este site:

- Chave da OpenAI, service_role do Supabase ou senha do banco exposta (commit, print, mensagem, máquina perdida).
- Visitante ou lojista vendo documento de outro nível ou de outra loja, por erro de política ou de ingestão.
- Alguém fora da administração lendo a tabela `leads`.
- Documento com dados pessoais enviado com o nível errado (por exemplo, contrato de loja enviado como `publico`).
- Acesso indevido ao painel do Supabase, da Vercel ou da OpenAI.
- Perda ou roubo da máquina que faz a ingestão, que guarda o `ingestao/.env` e a pasta `ingestao/arquivos/`.

## 2. Papéis

| Papel | Quem | O que faz |
|---|---|---|
| Encarregado | A designar | Coordena, decide sobre comunicar ANPD e titulares, registra |
| Responsável técnico | A designar (hoje, quem mantém o repositório) | Contém, investiga e corrige |
| Administração da galeria | A designar | Aprova a comunicação e fala com lojistas e interessados |

## 3. Fluxo

1. Registrar na hora: data e hora, quem percebeu, o que se sabe até ali.
2. Conter no mesmo dia (ver seção 6): trocar chaves, derrubar sessões, tirar o documento errado da base, bloquear o acesso.
3. Avaliar em até 24 horas: quais dados, quantos titulares, por quanto tempo ficaram expostos, se há dado sensível ou de criança. A tabela de riscos do RIPD ajuda a medir.
4. Corrigir a causa: política, migration, script de ingestão ou configuração. Toda correção em política, busca ou ingestão passa pelos testes pgTAP (`supabase test db`) antes de subir.
5. Comunicar quando houver risco ou dano relevante: ANPD e titulares em até 3 dias úteis contados da ciência (Resolução 15/2024, art. 6º). Se faltar informação, comunicar o que se sabe e complementar depois.
6. Registrar e revisar: preencher a seção 5, atualizar o RIPD e este plano.

## 4. O que a comunicação precisa dizer

- Que dados foram afetados.
- Quantos titulares, mesmo que aproximado.
- Medidas de proteção que já existiam e as tomadas depois.
- Riscos para os titulares e o que eles podem fazer.
- Data do incidente e data em que a galeria soube.
- Contato do encarregado.
- Se a comunicação atrasou, o motivo.

Aos lojistas e interessados, usar texto simples, pelo e-mail ou telefone que eles deixaram. A comunicação à ANPD segue o formulário do site da autoridade.

## 5. Registro de incidentes

Mesmo incidente que não precise ser comunicado fica registrado aqui, com a justificativa. A Resolução 15/2024 pede guardar esse registro por pelo menos 5 anos.

| Data | O que houve | Dados afetados | Titulares | Contenção | Comunicado (ANPD e titulares) | Situação |
|---|---|---|---|---|---|---|
| | | | | | | |

## 6. Contenção rápida

Chave da OpenAI: revogar e criar outra no painel da OpenAI (API keys). Atualizar `OPENAI_API_KEY` na Vercel e no `ingestao/.env` e refazer o deploy.

Chaves do Supabase: em Project Settings > API, gerar novas chaves. A publishable key vai para a Vercel; a service_role (ou a senha do banco usada no `DATABASE_URL`) só para a máquina da ingestão. Nunca cadastrar a service_role na Vercel.

Senha do banco: em Project Settings > Database, redefinir e atualizar o `DATABASE_URL` da ingestão.

Sessões de lojistas: em Authentication > Users, apagar ou bloquear o usuário afetado. Para derrubar todas as sessões, trocar a chave de assinatura JWT do projeto (JWT Keys), o que obriga todo mundo a entrar de novo.

Documento com nível errado: tirar da busca e reenviar com o nível certo.

```sql
update documentos set excluido_em = now() where id = '<id>';
```

Se o documento tiver dado pessoal que não deveria estar na base, apagar de vez (`delete from documentos where id = '<id>'`) e remover o arquivo de `ingestao/arquivos/`. Depois rodar os testes de isolamento.

Erro de política: reverter com uma migration nova que restaure a política anterior. Não editar migration já aplicada. Rodar `supabase test db` antes do `db push`.

Site fora do ar de propósito: na Vercel, apontar o domínio para uma página estática ou pausar o projeto. Com `NEXT_PUBLIC_SUPABASE_URL` vazia e novo deploy (a variável entra no build), o chat e o formulário respondem "indisponível" e as páginas continuam no ar.

Acesso aos painéis: revisar membros em Supabase, Vercel, OpenAI e GitHub, e ligar a verificação em duas etapas onde ainda não estiver.

ANPD: canais oficiais em gov.br/anpd.

## 7. Prevenção

- CI em `.github/workflows/ci.yml` roda os testes de isolamento em todo push e pull request.
- `.env*` fica fora do Git (ver `.gitignore`).
- Dependabot semanal para npm, pip e GitHub Actions.
- Revisar quem tem acesso aos painéis a cada troca de equipe.
- Testar este plano uma vez por ano com um caso simulado (por exemplo, chave da OpenAI vazada) e anotar quanto tempo levou cada etapa.

## 8. Pendências

- [ ] Nomear encarregado, responsável técnico e contato da administração.
- [ ] Validar prazos e texto com o jurídico.
- [ ] Definir onde fica o registro da seção 5, se não for neste arquivo (o repositório pode ser público ou compartilhado).
