import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// O modulo guarda a contagem em memoria; cada teste importa uma copia nova.
async function carregar() {
  vi.resetModules()
  return (await import('@/lib/assistente/limite')).passouDoLimite
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('passouDoLimite', () => {
  it('libera 15 perguntas por minuto e barra a 16a', async () => {
    const passouDoLimite = await carregar()
    for (let vez = 1; vez <= 15; vez++) expect(passouDoLimite('10.0.0.1')).toBe(false)
    expect(passouDoLimite('10.0.0.1')).toBe(true)
  })

  it('conta cada IP separado', async () => {
    const passouDoLimite = await carregar()
    for (let vez = 1; vez <= 16; vez++) passouDoLimite('10.0.0.1')
    expect(passouDoLimite('10.0.0.2')).toBe(false)
  })

  it('libera de novo depois que a janela de um minuto passa', async () => {
    const passouDoLimite = await carregar()
    for (let vez = 1; vez <= 16; vez++) passouDoLimite('10.0.0.1')
    vi.advanceTimersByTime(60_001)
    expect(passouDoLimite('10.0.0.1')).toBe(false)
  })

  it('pergunta barrada tambem conta, entao insistir estende o bloqueio', async () => {
    const passouDoLimite = await carregar()
    for (let vez = 1; vez <= 15; vez++) passouDoLimite('10.0.0.1')
    vi.advanceTimersByTime(30_000)
    expect(passouDoLimite('10.0.0.1')).toBe(true)
    vi.advanceTimersByTime(30_001)
    // As 15 primeiras sairam da janela, mas a barrada ainda esta dentro
    expect(passouDoLimite('10.0.0.1')).toBe(false)
  })

  it('limpa o mapa quando passa de 5000 chaves, sem travar ninguem', async () => {
    const passouDoLimite = await carregar()
    for (let vez = 1; vez <= 15; vez++) passouDoLimite('10.0.0.1')
    for (let ip = 0; ip <= 5000; ip++) passouDoLimite(`172.16.${ip}`)
    expect(passouDoLimite('10.0.0.1')).toBe(false)
  })
})
