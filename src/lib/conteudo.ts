import dadosSite from '@content/site.json'
import dadosEspacos from '@content/espacos.json'
import dadosFaq from '@content/faq.json'

import type { Espaco, PerguntaFrequente, Site } from '@/types/conteudo'

// Paginas leem conteudo so por aqui, nunca importam JSON direto.
export const site = dadosSite as Site
export const espacos = (dadosEspacos as Espaco[]).filter((espaco) => espaco.disponivel)
export const faq = dadosFaq as PerguntaFrequente[]

// Campo ainda nao preenchido nao aparece no site.
export function preenchido(valor?: string | null): valor is string {
  return Boolean(valor && valor.trim() && !valor.startsWith('PREENCHER'))
}

export function enderecoCompleto() {
  const partes = [site.endereco, site.bairro, `${site.cidade}/${site.estado}`, site.cep]
  return partes.filter(preenchido).join(', ')
}

export function linkWhatsApp(mensagem = 'Olá! Vim pelo site do Casa Shopping Design.') {
  const numero = site.contato.whatsapp.replace(/\D/g, '')
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}
