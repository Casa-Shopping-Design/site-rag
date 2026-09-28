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
- Vídeo do topo (`public/videos/tour.mp4`) e fotos da galeria (`public/images/tour/`): trechos e quadros dos dois vídeos de tour do Instagram, recebidos pelo WhatsApp em 478×850. Foram escolhidos os trechos sem texto sobreposto; a marca d'água do CSD fica. O vídeo tem 12,6 s, sem som, 1,7 MB, e começa parado para quem pede menos movimento no sistema.
- Da arte de horário foi mantido o texto, corrigido ("Aos sábados", não "Aos sabádos"). O nome usado no site é "Casa Shopping Design", como no perfil; a arte de localização e o Google Maps usam "Shopping Casa Design".
- Não entraram: a foto de banco de imagens do post "Aqui é qualidade" (licença desconhecida e não mostra o centro) e fotos com pessoas identificáveis, que precisam de autorização de uso de imagem.
- Identidade: a atual é a do CSD Centro Empresarial (vinho e salmão). Os posts antigos em vermelho e azul, com o logo anterior, não foram usados.

## O que falta receber

- Logo atual em vetor (SVG ou PDF) e fotos e vídeos originais, sem passar pelo WhatsApp (mandar como documento). Na horizontal, com pelo menos 1.200 px de largura
- WhatsApp e e-mail da administração
- Funcionamento aos domingos e feriados
- Conferência da lista de lojistas: grafia, segmento, piso e sala (e quem saiu)
- Detalhes do auditório e do espaço para eventos (capacidade, estrutura)
- Regimento interno, normas de obra e reforma, regras de carga e descarga e horário de fornecedores
- Domínio do site
