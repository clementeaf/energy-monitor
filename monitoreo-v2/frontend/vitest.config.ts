import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest; se combina con vite.config.ts al ejecutar pruebas.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'vite/**/*.test.ts'],
  },
});
