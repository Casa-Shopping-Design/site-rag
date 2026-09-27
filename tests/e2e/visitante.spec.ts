import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

import { banco, chaveAnon, postgres, urlSupabase } from './apoio/ambiente.mjs'

function consultar(sql: string) {
  return execFileSync(
    'psql',
    ['-h', postgres.host, '-p', postgres.porta, '-U', postgres.usuario, '-d', banco, '-tAc', sql],
    { encoding: 'utf8' },
  ).trim()
}

test('visitante ve a home e os lojistas cadastrados', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Quem está no Casa Design')).toBeVisible()
  await expect(page.getByText('Loja Ficticia Alfa').first()).toBeVisible()
  await expect(page.getByText('Loja Ficticia Beta').first()).toBeVisible()
})

test('pagina /lojas lista os lojistas vindos do banco', async ({ page }) => {
  await page.goto('/lojas')
  await expect(page.getByText('Loja Ficticia Alfa')).toBeVisible()
  await expect(page.getByText('Loja Ficticia Beta')).toBeVisible()
})

test('assistente responde ao visitante so com trecho publico e abre o formulario de contato', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Tire sua dúvida' }).click()

  const painel = page.getByRole('dialog', { name: 'Assistente do Casa Design' })
  await painel.getByLabel('Sua pergunta').fill('Quero alugar uma sala, o que tem disponivel?')
  await painel.getByRole('button', { name: 'Enviar pergunta' }).click()

  // O OpenAI falso devolve os trechos que chegaram no prompt
  // A resposta aparece na conversa e, uma vez, no anuncio para leitor de tela
  await expect(painel.getByText(/TRECHO-PUBLICO-E2E/).first()).toBeVisible()
  await expect(painel.getByRole('status').filter({ hasText: 'TRECHO-PUBLICO-E2E' })).toHaveCount(1)
  await expect(painel.getByRole('button', { name: 'Quero ser contatado' })).toBeVisible()

  const conversa = await painel.textContent()
  expect(conversa).not.toContain('TRECHO-INQUILINO-E2E')
  expect(conversa).not.toContain('TRECHO-ADMIN-E2E')
  expect(conversa).not.toContain('TRECHO-LOJA-E2E')
  // o marcador vira formulario, nao aparece como texto
  expect(conversa).not.toContain('[[CONTATO]]')
})

test('visitante envia lead com consentimento pelo assistente', async ({ page }) => {
  const nome = `Pessoa Ficticia E2E ${Date.now()}`
  await page.goto('/')
  await page.getByRole('button', { name: 'Tire sua dúvida' }).click()
  const painel = page.getByRole('dialog', { name: 'Assistente do Casa Design' })
  await painel.getByLabel('Sua pergunta').fill('Tenho interesse em alugar uma loja')
  await painel.getByRole('button', { name: 'Enviar pergunta' }).click()

  await painel.getByRole('textbox', { name: 'Nome', exact: true }).fill(nome)
  await painel.getByLabel('Telefone ou WhatsApp').fill('(79) 90000-0000')
  await painel.getByLabel('Que tipo de espaço procura?').fill('loja ficticia no terreo')
  await painel.getByRole('checkbox').check()
  await painel.getByRole('button', { name: 'Quero ser contatado' }).click()

  await expect(painel.getByText('Recebemos seu contato')).toBeVisible()

  const gravado = consultar(
    `select origem || '|' || consentimento || '|' || (consentimento_texto <> '') from leads where nome = '${nome}'`,
  )
  expect(gravado).toBe('assistente|true|true')

  // A chave anon grava, mas nao le a tabela de leads
  const resposta = await fetch(`${urlSupabase}/rest/v1/leads?select=nome`, {
    headers: { apikey: chaveAnon(), Authorization: `Bearer ${chaveAnon()}` },
  })
  expect(await resposta.json()).toEqual([])
})

test('formulario da pagina de locacao exige o aceite do aviso', async ({ page }) => {
  const nome = `Pessoa Ficticia Locacao ${Date.now()}`
  await page.goto('/locacao')
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill(nome)
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('pessoa@exemplo.test')

  // Sem o aceite o navegador nao deixa enviar
  await page.getByRole('button', { name: 'Quero ser contatado' }).click()
  await expect(page.getByText('Recebemos seu contato')).toHaveCount(0)
  expect(consultar(`select count(*) from leads where nome = '${nome}'`)).toBe('0')

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Quero ser contatado' }).click()
  await expect(page.getByText('Recebemos seu contato')).toBeVisible()
  expect(consultar(`select origem from leads where nome = '${nome}'`)).toBe('site')
})

test('area do lojista manda o visitante para /entrar', async ({ page }) => {
  await page.goto('/area-do-lojista')
  await expect(page).toHaveURL(/\/entrar$/)
})
