// Calcula a razao de contraste (WCAG 2.x) dos pares de cor usados no site,
// lendo os tokens direto de src/app/globals.css, no tema claro e no escuro.
// Uso: node tests/acessibilidade/contraste.mjs   (sai com 1 se algum par ficar abaixo do minimo)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../../src/app/globals.css', import.meta.url)), 'utf8')

function lerTokens(trecho) {
  const tokens = {}
  for (const [, nome, valor] of trecho.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)) tokens[nome] = valor
  return tokens
}

const blocoClaro = css.match(/:root\s*{([^}]*)}/)[1]
const blocoEscuro = css.match(/prefers-color-scheme:\s*dark\)\s*{\s*:root\s*{([^}]*)}/)[1]
const claro = lerTokens(blocoClaro)
const temas = { claro, escuro: { ...claro, ...lerTokens(blocoEscuro) } }

const paraRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function luminancia(rgb) {
  const [r, g, b] = rgb.map((canal) => {
    const c = canal / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Cor com opacidade aplicada sobre o fundo (ex.: texto com opacity-80)
const misturar = (frente, fundo, alfa) => frente.map((canal, i) => Math.round(canal * alfa + fundo[i] * (1 - alfa)))

function razao(a, b) {
  const [claroL, escuroL] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claroL + 0.05) / (escuroL + 0.05)
}

// [texto ou componente, fundo, minimo, onde aparece, opacidade opcional do primeiro]
const pares = [
  ['texto', 'fundo', 4.5, 'texto corrido'],
  ['texto', 'superficie', 4.5, 'texto em cartao'],
  ['texto', 'destaque-claro', 4.5, 'confirmacao de envio'],
  ['texto-suave', 'fundo', 4.5, 'texto secundario'],
  ['texto-suave', 'superficie', 4.5, 'texto secundario em cartao e rodape'],
  ['primaria', 'fundo', 4.5, 'titulos, links e botao claro'],
  ['primaria', 'superficie', 4.5, 'nome da loja no cartao'],
  ['destaque', 'fundo', 4.5, 'rotulo pequeno, link e erro'],
  ['destaque', 'superficie', 4.5, 'erro e rotulo dentro de cartao'],
  ['fundo', 'primaria', 4.5, 'texto do botao principal'],
  ['fundo', 'primaria', 4.5, 'paragrafo da faixa de locacao (opacity-80)', 0.8],
  ['borda-campo', 'fundo', 3, 'contorno de campo de formulario'],
  ['borda-campo', 'superficie', 3, 'contorno de campo dentro de cartao'],
  ['foco', 'fundo', 3, 'anel de foco'],
  ['foco', 'superficie', 3, 'anel de foco em cartao'],
  ['fundo', 'primaria', 3, 'aro interno do foco sobre a faixa vinho'],
]

let falhas = 0
for (const [nomeTema, tokens] of Object.entries(temas)) {
  console.log(`\nTema ${nomeTema}`)
  for (const [frente, fundo, minimo, uso, alfa] of pares) {
    if (!tokens[frente] || !tokens[fundo]) {
      console.log(`  ??    ${frente} sobre ${fundo}: token ausente`)
      falhas++
      continue
    }
    const corFundo = paraRgb(tokens[fundo])
    const corFrente = alfa ? misturar(paraRgb(tokens[frente]), corFundo, alfa) : paraRgb(tokens[frente])
    const valor = razao(corFrente, corFundo)
    const passou = valor >= minimo
    if (!passou) falhas++
    const rotulo = `${frente}${alfa ? ` (${alfa * 100}%)` : ''} sobre ${fundo}`
    console.log(`  ${passou ? 'ok   ' : 'FALHA'} ${valor.toFixed(2).padStart(5)}:1 (min ${minimo})  ${rotulo.padEnd(34)} ${uso}`)
  }
}

console.log(falhas ? `\n${falhas} par(es) abaixo do minimo` : '\nTodos os pares passaram')
process.exit(falhas ? 1 : 0)
