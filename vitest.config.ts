import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const raiz = (caminho: string) => fileURLToPath(new URL(caminho, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@/': raiz('./src/'),
      '@content/': raiz('./content/'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unidade/**/*.test.ts'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
})
