import type { NextConfig } from 'next'

const emDesenvolvimento = process.env.NODE_ENV !== 'production'

// So a origem (esquema + host). Valor invalido ou ausente fica de fora da CSP
// em vez de quebrar o build.
function origemSupabase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return ''
  }
}

// Por que cada excecao existe esta em docs/seguranca.md.
const politicaConteudo = [
  "default-src 'self'",
  // Next injeta scripts inline para hidratar a pagina e o payload do RSC.
  // Sem nonce (que obrigaria render dinamico em todas as paginas), resta 'unsafe-inline'.
  // Em dev o React usa eval para montar pilhas de erro.
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ''}`,
  // Estilos inline do next/image e de atributos style do React.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${origemSupabase()}${emDesenvolvimento ? ' ws:' : ''}`,
  // Mapa da secao de visita.
  'frame-src https://www.google.com/maps https://maps.google.com',
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]
  .map((diretiva) => diretiva.replace(/\s+/g, ' ').trim())
  .join('; ')

const cabecalhosSeguranca = [
  { key: 'Content-Security-Policy', value: politicaConteudo },
  // Sem includeSubDomains/preload ate confirmar que nenhum subdominio roda so em http.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // AVIF sai de 30% a 50% menor que WebP nas fotos atuais; WebP fica para quem nao aceita
    formats: ['image/avif', 'image/webp'],
    // Sem 2048 e 3840: a foto mais larga ocupa ~980px no tablet, e 1920 cobre tela 2x.
    // O 480 casa com as fotos de hoje (quadros de video com 478px).
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
  },
  async headers() {
    return [{ source: '/:path*', headers: cabecalhosSeguranca }]
  },
}

export default nextConfig
