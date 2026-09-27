// Auditoria com axe-core nas paginas publicas, em desktop e em 360px,
// mais uma checagem de teclado no widget do assistente.
//
// Uso (com o site rodando):
//   npx next build && npx next start -p 3103
//   node tests/acessibilidade/auditar.mjs
//
// Variaveis opcionais:
//   ENDERECO   base do site (padrao http://localhost:3103)
//   CAPTURAS   pasta onde salvar as capturas de tela
//   CHROME     executavel do Chromium, se nao for o do Playwright
//   ESQUEMA    light ou dark (padrao: roda os dois)

import AxeBuilder from '@axe-core/playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const endereco = process.env.ENDERECO ?? 'http://localhost:3103'
const pastaCapturas = process.env.CAPTURAS
const esquemas = process.env.ESQUEMA ? [process.env.ESQUEMA] : ['light', 'dark']
const paginas = ['/', '/lojas', '/locacao', '/contato', '/privacidade', '/entrar']
const telas = [
  { nome: 'desktop', width: 1280, height: 800 },
  { nome: 'celular', width: 360, height: 740 },
]
const botaoAssistente = 'button[aria-controls="painel-assistente"]'
const regras = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

if (pastaCapturas) mkdirSync(pastaCapturas, { recursive: true })

const navegador = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const problemas = []
const falhasTeclado = []

function nomeArquivo(...partes) {
  return partes.join('-').replace(/[^a-z0-9-]+/gi, '_').replace(/_+/g, '_') + '.png'
}

async function rodarAxe(pagina, onde) {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(regras).analyze()
  for (const violacao of resultado.violations) {
    problemas.push({
      onde,
      regra: violacao.id,
      impacto: violacao.impact,
      ajuda: violacao.help,
      alvos: violacao.nodes.slice(0, 5).map((no) => no.target.join(' ')),
      detalhe: violacao.nodes[0]?.failureSummary?.split('\n').slice(0, 3).join(' '),
    })
  }
}

// Menor alvo de toque entre os controles do painel (WCAG 2.5.8 pede 24px; o combinado aqui e 44px)
async function menorAlvo(pagina) {
  return pagina.evaluate(() => {
    const itens = [...document.querySelectorAll('#painel-assistente button, #painel-assistente input, button[aria-controls="painel-assistente"]')]
    return itens
      .map((el) => {
        const caixa = el.getBoundingClientRect()
        return { alvo: el.id || el.getAttribute('aria-label') || el.tagName, largura: caixa.width, altura: caixa.height }
      })
      .filter((item) => item.largura < 44 || item.altura < 44)
  })
}

async function testarTeclado(pagina, onde) {
  const falhar = (motivo) => falhasTeclado.push({ onde, motivo })
  await pagina.locator(botaoAssistente).focus()
  await pagina.keyboard.press('Enter')
  await pagina.waitForSelector('#painel-assistente')
  const focoAoAbrir = await pagina.evaluate(() => document.activeElement?.id)
  if (focoAoAbrir !== 'pergunta') falhar(`ao abrir, o foco ficou em "${focoAoAbrir}" e nao no campo`)

  const pequenos = await menorAlvo(pagina)
  if (pequenos.length) falhar(`alvos menores que 44px: ${JSON.stringify(pequenos)}`)

  await pagina.keyboard.press('Escape')
  await pagina.waitForTimeout(100)
  const aindaAberto = await pagina.locator('#painel-assistente').isVisible().catch(() => false)
  if (aindaAberto) {
    falhar('Esc nao fechou o painel')
    await pagina.locator(botaoAssistente).click()
  }
  const focoNoBotao = await pagina.evaluate((seletor) => document.activeElement?.matches(seletor), botaoAssistente)
  if (!focoNoBotao) falhar('ao fechar, o foco nao voltou para o botao do assistente')
}

// Formulario de locacao enviado sem telefone nem e-mail: o erro tem de ficar
// ligado aos campos e o foco tem de ir para o telefone. Nao chega a chamar a API.
async function testarErroDoLead(pagina, onde) {
  const falhar = (motivo) => falhasTeclado.push({ onde, motivo })
  await pagina.goto(endereco + '/locacao', { waitUntil: 'load' })
  const formulario = pagina.locator('main form')
  await formulario.locator('input[name="nome"]').fill('Pessoa Ficticia de Teste')
  await formulario.locator('input[name="consentimento"]').check()
  await formulario.locator('button[type="submit"]').click()
  const telefone = formulario.locator('input[name="telefone"]')
  if ((await telefone.getAttribute('aria-invalid')) !== 'true') falhar('telefone sem aria-invalid depois do erro')
  const ids = ((await telefone.getAttribute('aria-describedby')) ?? '').split(' ').filter(Boolean)
  const textos = await Promise.all(ids.map((idAlvo) => pagina.locator(`[id="${idAlvo}"]`).innerText()))
  if (!textos.some((trecho) => trecho.includes('telefone ou um e-mail'))) falhar('mensagem de erro nao associada ao campo')
  const focado = await pagina.evaluate(() => document.activeElement?.getAttribute('name'))
  if (focado !== 'telefone') falhar(`depois do erro o foco ficou em "${focado}"`)
}

for (const esquema of esquemas) {
  for (const tela of telas) {
    const contexto = await navegador.newContext({
      viewport: { width: tela.width, height: tela.height },
      colorScheme: esquema,
      reducedMotion: 'reduce',
    })
    const pagina = await contexto.newPage()

    for (const caminho of paginas) {
      const onde = `${caminho} ${tela.nome} ${esquema}`
      await pagina.goto(endereco + caminho, { waitUntil: 'networkidle' })
      await rodarAxe(pagina, onde)
      if (pastaCapturas) {
        await pagina.screenshot({ path: join(pastaCapturas, nomeArquivo(caminho === '/' ? 'inicio' : caminho, tela.nome, esquema)), fullPage: true })
      }
    }

    // Widget aberto, auditado na pagina inicial
    await pagina.goto(endereco + '/', { waitUntil: 'networkidle' })
    await testarTeclado(pagina, `assistente ${tela.nome} ${esquema}`)
    await pagina.locator(botaoAssistente).click()
    await pagina.waitForSelector('#painel-assistente')
    await rodarAxe(pagina, `assistente aberto ${tela.nome} ${esquema}`)
    if (pastaCapturas) {
      await pagina.screenshot({ path: join(pastaCapturas, nomeArquivo('assistente', tela.nome, esquema)) })
    }

    if (tela.nome === 'desktop') await testarErroDoLead(pagina, `formulario de locacao ${esquema}`)

    await contexto.close()
  }
}

await navegador.close()

const porRegra = {}
for (const problema of problemas) {
  porRegra[problema.regra] ??= { impacto: problema.impacto, ajuda: problema.ajuda, ocorrencias: [] }
  porRegra[problema.regra].ocorrencias.push({ onde: problema.onde, alvos: problema.alvos, detalhe: problema.detalhe })
}

console.log(JSON.stringify({ violacoes: porRegra, teclado: falhasTeclado }, null, 2))
console.log(`\n${problemas.length} violacoes do axe, ${falhasTeclado.length} falhas de teclado`)
process.exit(problemas.length || falhasTeclado.length ? 1 : 0)
