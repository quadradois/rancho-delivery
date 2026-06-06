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
        // Baseline real após cobertura do fluxo de imóveis. Próxima meta: subir branches
        // com testes dedicados para pedido.service/conversacao.service.
        lines: 42,
        functions: 34,
        branches: 70,
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
