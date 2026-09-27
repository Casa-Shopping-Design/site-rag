-- Aperta os privilegios que o Supabase da por padrao a anon e authenticated.
-- As politicas de RLS continuam as mesmas; aqui so sai o que o site nao usa.

-- O padrao do Supabase e "grant all" nas tabelas de public. RLS nao vale para
-- TRUNCATE, entao quem tivesse um caminho de SQL como anon apagaria uma tabela
-- inteira. A API nao expoe TRUNCATE hoje; fecha mesmo assim para nao depender
-- disso. TRIGGER e REFERENCES tambem nao servem ao cliente.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- Vale tambem para as tabelas que as proximas migrations criarem.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;

-- Lead: quem envia so escolhe os campos do formulario. Id, situacao e as datas
-- saem do banco. Sem isso, qualquer um com a chave publica gravava um aceite
-- com data retroativa, e o registro deixava de servir como prova (LGPD, art. 8).
revoke insert on leads from anon, authenticated;
grant insert (nome, telefone, email, tipo_espaco, mensagem, origem,
              consentimento, consentimento_texto)
  on leads to anon, authenticated;
