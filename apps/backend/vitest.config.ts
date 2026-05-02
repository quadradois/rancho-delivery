import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        'prisma/',
        'src/routes/',          // arquivos de wiring sem lógica
        'src/services/asaas.service.ts',    // integração não usada em pedidos
        'src/services/ia.service.ts',       // feature futura desabilitada
        'src/services/relatorio.service.ts',
        'src/services/alerta.service.ts',
      ],
      thresholds: {
        // Baseline pós Fase 1 do Raio-X (IDOR fix, N+1 fix, idempotência). Próxima meta: 50%/45%.
        lines: 42,
        functions: 34,
        branches: 75,
        statements: 42,
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
