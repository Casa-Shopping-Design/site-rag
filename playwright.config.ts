import { defineConfig, devices } from '@playwright/test'

import { urlSite } from './tests/e2e/apoio/ambiente.mjs'

// E2E local: sobe banco de teste, PostgREST, mocks e o site compilado.
// Detalhes em tests/README.md.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  outputDir: 'tests/e2e/.resultados',
  use: {
    baseURL: urlSite,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node tests/e2e/apoio/pilha.mjs',
    url: urlSite,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
})
