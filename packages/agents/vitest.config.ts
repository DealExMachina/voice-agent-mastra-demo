import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    setupFiles: [],
    reporters: 'default'
  }
});