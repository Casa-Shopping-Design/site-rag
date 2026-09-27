-- Lojistas levantados em 27/09/2026 a partir do linklist.ai/casashoppingdesign
-- e dos vídeos de tour do Instagram. Conferir nome, segmento e contato com a
-- administração antes de publicar. Telefone e Instagram só entraram quando
-- estavam legíveis na fachada.
-- Aplicar com: supabase db push --include-seed (ou colar no SQL Editor)

insert into lojas (nome, segmento, descricao, telefone, instagram, site)
select v.nome, v.segmento, v.descricao, v.telefone, v.instagram, v.site
  from (values
    ('Acalanto Sergipe', 'Organização social', 'Grupo de apoio à adoção de crianças e adolescentes.', '(79) 99865-2353', null, null),
    ('Bend Propaganda', 'Serviços para empresas', null, null, null, null),
    ('Braga Consultoria', 'Serviços para empresas', null, null, null, null),
    ('Carrara Mármores e Granitos', 'Casa e construção', null, null, null, null),
    ('Casa Rosa Imobiliária', 'Imóveis', 'Vendas, aluguéis e administração de imóveis.', '(79) 3022-3345', null, 'https://casarosaimobiliaria.com.br'),
    ('Conexão Imobi', 'Imóveis', null, null, null, null),
    ('Domus Correspondente', 'Imóveis', 'Correspondente bancário.', null, null, null),
    ('Domus Imóveis', 'Imóveis', 'Lançamentos, imóveis novos e usados.', null, null, null),
    ('Dra. Ana Rodrigues', 'Saúde e estética', null, null, null, null),
    ('Ease Odontologia Avançada', 'Saúde e estética', null, null, null, null),
    ('Espaço Anne Karoline', 'Saúde e estética', null, null, null, null),
    ('EST Coban', null, null, null, null, null),
    ('FAMA Cursos', 'Educação e cursos', null, null, null, null),
    ('Filtros e Cia', 'Casa e construção', 'Purificadores e filtros de água.', null, null, null),
    ('Gráfica PrintAju', 'Serviços para empresas', 'Impressão, banners, adesivos, cartões e encadernação.', '(79) 99923-4747', 'https://www.instagram.com/printaju', null),
    ('Home Store', 'Casa e construção', null, null, null, null),
    ('Hutah Foods', 'Moda e alimentação', null, null, null, null),
    ('Instituto Amarillis', 'Saúde e estética', 'Tricologia e cuidados com o cabelo.', null, null, null),
    ('Lara Modas', 'Moda e alimentação', null, null, null, null),
    ('Palco Escola de Oratória', 'Educação e cursos', null, null, null, null),
    ('Pelvic Magic', 'Saúde e estética', null, null, null, null),
    ('Raiz Imóveis', 'Imóveis', null, '(79) 99980-1987', 'https://www.instagram.com/raizimoveis.oficial', null),
    ('Rede Imob', 'Imóveis', null, null, null, null),
    ('Studio Magic Pilates e Fisioterapia', 'Saúde e estética', 'Pilates, fisioterapia ortopédica e neurológica.', '(79) 99647-0695', null, null),
    ('Tecsol Tecnologia Solar', 'Casa e construção', 'Energia solar residencial, comercial, industrial e para o agronegócio.', '(79) 99691-0102', 'https://www.instagram.com/tecsolse', null),
    ('The Coffee Roasting', 'Moda e alimentação', 'Café.', null, null, null),
    ('Uniasselvi', 'Educação e cursos', 'Graduação e pós-graduação.', null, null, null),
    ('Unise Contabilidade', 'Serviços para empresas', 'Contabilidade, administração de condomínios e escritório virtual.', '(79) 3022-0800', null, 'https://www.unise.com.br'),
    ('Vitória Monteiro Nutricionista', 'Saúde e estética', null, null, null, null),
    ('Você Mais', 'Saúde e estética', 'Tratamentos capilares, técnica de cachos, pé e mão.', '(79) 99931-4656', null, null)
  ) as v(nome, segmento, descricao, telefone, instagram, site)
 where not exists (select 1 from lojas l where l.nome = v.nome);
