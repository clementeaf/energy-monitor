import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest; se combina con vite.config.ts al ejecutar pruebas.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'vite/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    globals: true,
  },
});
