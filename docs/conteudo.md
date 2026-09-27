# Conteúdo

Há dois lugares para o conteúdo, com papéis diferentes.

## Texto das páginas: `content/*.json`

É o que aparece no site. Campo que começa com `PREENCHER` ou está vazio não é exibido, então dá para publicar aos poucos.

- `site.json`: nome, chamada, texto sobre o centro, endereço, CEP, link do mapa (Google Maps > Compartilhar > Incorporar), horários, estacionamento, WhatsApp, telefone, e-mail, Instagram e segmentos.
- `espacos.json`: espaços disponíveis para locação, sem valores. Para tirar um espaço do ar, marque `"disponivel": false`.
- `faq.json`: perguntas frequentes.

As lojas não ficam em JSON: elas estão na tabela `lojas` do banco, porque o mesmo cadastro serve para a vitrine e para o acesso do lojista.

## Base do assistente: `ingestao/enviar.py`

É o que o assistente usa para responder. Cada arquivo entra com um nível:

| Material | Nível |
|---|---|
| Endereço, horários, estacionamento, lojas, segmentos, espaços disponíveis, eventos, contatos | publico |
| Regimento interno, normas de obra e reforma, carga e descarga, horário de fornecedores, comunicados | inquilino |
| Contrato ou documento de uma loja | --loja |
| Material interno da administração | admin |

Os arquivos `ingestao/base/institucional.md` e `ingestao/base/lojistas.md` já trazem o resumo público (endereço, horário, contato, locação e lojistas). Quando o JSON ou a lista de lojas mudar, atualize esses arquivos e reenvie.

## De onde veio o que já está no site

Levantado em 27/09/2026 a partir dos posts e vídeos do Instagram @casashoppingdesign e do linklist.ai/casashoppingdesign.

- Endereço, CEP, telefone e horário: posts de localização e de horário.
- Posicionamento ("Negócios que geram negócios", "qualidade para quem vende e para quem compra", 20 anos, centro empresarial): bio e posts.
- Salas, lojas, auditório e espaço para eventos: descrição do linklist.
- Lojistas: `supabase/seed.sql`, com os 24 nomes do linklist e os que aparecem nas fachadas dos vídeos. Telefones e Instagram só onde estavam legíveis.
- Fotos em `public/images`: quadros dos vídeos de tour. Servem por enquanto; a resolução é baixa.
- Identidade: a atual é a do CSD Centro Empresarial (vinho e salmão). Os posts antigos em vermelho e azul, com o logo anterior, não foram usados.

## O que falta receber

- Logo atual em vetor (SVG ou PDF) e fotos em boa resolução
- WhatsApp e e-mail da administração
- Funcionamento aos domingos e feriados
- Conferência da lista de lojistas: grafia, segmento, piso e sala (e quem saiu)
- Detalhes do auditório e do espaço para eventos (capacidade, estrutura)
- Regimento interno, normas de obra e reforma, regras de carga e descarga e horário de fornecedores
- Domínio do site
