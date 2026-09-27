import { site } from '@/lib/conteudo'

// Sem NEXT_PUBLIC_SITE_URL, usa o endereco de producao que a Vercel informa.
export function enderecoDoSite(): string {
  const definido = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (definido) return definido.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return site.url
}

// So o dominio oficial entra nos buscadores. O endereco de teste na Vercel fica fora.
export function podeIndexar(): boolean {
  try {
    return new URL(enderecoDoSite()).host === new URL(site.url).host
  } catch {
    return false
  }
}
