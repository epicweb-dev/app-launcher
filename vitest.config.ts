import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    root: './tests',
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
})
