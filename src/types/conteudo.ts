export type Horario = {
  dias: string
  horario: string
}

export type Segmento = {
  nome: string
  descricao: string
}

export type Contato = {
  whatsapp: string
  telefone: string
  email: string
  instagram: string
}

export type Site = {
  nome: string
  nomeCurto: string
  complemento: string
  idioma: string
  url: string
  descricaoCurta: string
  chamada: string
  subchamada: string
  sobre: string[]
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  mapaEmbedUrl: string
  linkMapa: string
  horarios: Horario[]
  observacaoHorario: string
  estacionamento: string
  contato: Contato
  segmentos: Segmento[]
  seo: {
    titulo: string
    template: string
    palavrasChave: string[]
    imagemCompartilhamento: string
  }
}

export type Espaco = {
  id: string
  titulo: string
  tipo: string
  area: string
  piso: string
  descricao: string
  disponivel: boolean
}

export type PerguntaFrequente = {
  pergunta: string
  resposta: string
}

// Linha da tabela lojas (so dados de vitrine)
export type Loja = {
  id: string
  nome: string
  segmento: string | null
  piso: string | null
  sala: string | null
  descricao: string | null
  instagram: string | null
  site: string | null
  telefone: string | null
  logo_url: string | null
}

export type Perfil = 'visitante' | 'inquilino' | 'admin'
