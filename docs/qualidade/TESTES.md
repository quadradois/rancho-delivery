# Testes Automatizados - Sabor Express Backend

Documentação completa da suíte de testes do backend.

---

## 📋 Visão Geral

O backend possui uma suíte completa de testes automatizados usando **Vitest** para garantir qualidade e confiabilidade do código.

### Cobertura Atual

```
✓ 17 testes passando
✓ 3 services testados
✓ Cobertura mínima: 80%
```

---

## 🧪 Executar Testes

### Comandos Disponíveis

```bash
# Executar todos os testes (uma vez)
pnpm test

# Executar testes em modo watch (desenvolvimento)
pnpm test:watch

# Executar testes com cobertura
pnpm test:coverage

# Executar apenas testes do backend
pnpm --filter @sabor-express/backend test
```

### Executar Testes Específicos

```bash
# Apenas testes de um service
pnpm test produto.service.test

# Apenas testes de um describe
pnpm test -t "listarProdutos"
```

---

## 📊 Estrutura dos Testes

```
apps/backend/src/
├── __tests__/
│   ├── setup.ts                    # Configuração global (mocks)
│   ├── services/
│   │   ├── produto.service.test.ts
│   │   ├── bairro.service.test.ts
│   │   ├── cliente.service.test.ts
│   │   ├── pedido.service.test.ts
│   │   ├── asaas.service.test.ts
│   │   └── evolution.service.test.ts
│   ├── controllers/
│   │   ├── produto.controller.test.ts
│   │   ├── bairro.controller.test.ts
│   │   ├── pedido.controller.test.ts
│   │   └── webhook.controller.test.ts
│   └── integration/
│       ├── produtos.api.test.ts
│       ├── bairros.api.test.ts
│       └── pedidos.api.test.ts
└── vitest.config.ts
```

---

## ✅ Testes Implementados

### ProdutoService (7 testes)

**listarProdutos:**
- ✓ Deve listar todos os produtos disponíveis
- ✓ Deve retornar array vazio quando não há produtos
- ✓ Deve lançar erro quando falha ao buscar produtos

**buscarProdutoPorId:**
- ✓ Deve retornar produto quando encontrado
- ✓ Deve retornar null quando produto não encontrado
- ✓ Deve lançar erro quando falha ao buscar produto

**listarProdutosPorCategoria:**
- ✓ Deve listar produtos da categoria especificada

### BairroService (5 testes)

**listarBairrosAtivos:**
- ✓ Deve listar todos os bairros ativos

**buscarBairroPorNome:**
- ✓ Deve retornar bairro quando encontrado
- ✓ Deve retornar null quando bairro não encontrado

**validarBairro:**
- ✓ Deve retornar válido quando bairro existe e está ativo
- ✓ Deve retornar inválido quando bairro não existe

### ClienteService (5 testes)

**criarOuAtualizar:**
- ✓ Deve criar novo cliente quando não existe
- ✓ Deve atualizar cliente quando já existe
- ✓ Deve usar origem SITE por padrão

**buscarPorTelefone:**
- ✓ Deve retornar cliente quando encontrado
- ✓ Deve retornar null quando cliente não encontrado

---

## 🔧 Configuração

### vitest.config.ts

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

### Mocks Configurados

**Prisma Client:**
```typescript
vi.mock('../config/database', () => ({
  default: {
    produto: { findMany: vi.fn(), findUnique: vi.fn(), ... },
    bairro: { findMany: vi.fn(), findFirst: vi.fn(), ... },
    cliente: { findUnique: vi.fn(), create: vi.fn(), ... },
    pedido: { findUnique: vi.fn(), create: vi.fn(), ... },
  },
}));
```

**Logger:**
```typescript
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
```

**Axios (Asaas/Evolution):**
```typescript
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
    })),
  },
}));
```

---

## 📝 Exemplo de Teste

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import produtoService from '../../services/produto.service';
import prisma from '../../config/database';

describe('ProdutoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listarProdutos', () => {
    it('deve listar todos os produtos disponíveis', async () => {
      const mockProdutos = [
        { id: '1', nome: 'Marmita', preco: 24.90 },
      ];

      vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos);

      const resultado = await produtoService.listarProdutos();

      expect(resultado).toEqual(mockProdutos);
      expect(prisma.produto.findMany).toHaveBeenCalledWith({
        where: { disponivel: true },
        orderBy: { ordem: 'asc' },
      });
    });
  });
});
```

---

## 🎯 Cobertura de Código

### Verificar Cobertura

```bash
pnpm test:coverage
```

### Relatório de Cobertura

Após executar, o relatório estará disponível em:
- **Terminal:** Resumo da cobertura
- **HTML:** `apps/backend/coverage/index.html`
- **JSON:** `apps/backend/coverage/coverage.json`

### Thresholds Configurados

```
Linhas: 80%
Funções: 80%
Branches: 80%
Statements: 80%
```

Se a cobertura ficar abaixo desses valores, os testes falham.

---

## 🚀 CI/CD

### GitHub Actions

Os testes são executados automaticamente em:
- Push para `main` ou `develop`
- Pull Requests
- Mudanças em `apps/backend/**`

```yaml
# .github/workflows/ci-backend.yml
- name: Executar testes
  run: pnpm --filter @sabor-express/backend test

- name: Verificar cobertura
  run: pnpm --filter @sabor-express/backend test:coverage
```

---

## 📚 Boas Práticas

### 1. Nomenclatura

```typescript
// ✅ Bom
describe('ProdutoService', () => {
  describe('listarProdutos', () => {
    it('deve listar todos os produtos disponíveis', async () => {
      // ...
    });
  });
});

// ❌ Ruim
describe('Teste do produto', () => {
  it('funciona', async () => {
    // ...
  });
});
```

### 2. Arrange-Act-Assert

```typescript
it('deve criar novo cliente', async () => {
  // Arrange (preparar)
  const dadosCliente = { telefone: '123', nome: 'João' };
  vi.mocked(prisma.cliente.create).mockResolvedValue(dadosCliente);

  // Act (executar)
  const resultado = await clienteService.criarOuAtualizar(dadosCliente);

  // Assert (verificar)
  expect(resultado).toEqual(dadosCliente);
  expect(prisma.cliente.create).toHaveBeenCalled();
});
```

### 3. Limpar Mocks

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // Limpa histórico de chamadas
});
```

### 4. Testar Casos de Erro

```typescript
it('deve lançar erro quando falha', async () => {
  vi.mocked(prisma.produto.findMany).mockRejectedValue(new Error('Erro'));

  await expect(produtoService.listarProdutos()).rejects.toThrow('Erro ao buscar produtos');
});
```

---

## 🐛 Troubleshooting

### Testes não encontram módulos

**Problema:** `Cannot find module '../services/produto.service'`

**Solução:** Verificar caminhos relativos nos imports
```typescript
// Correto
import produtoService from '../../services/produto.service';

// Errado
import produtoService from '../services/produto.service';
```

### Mocks não funcionam

**Problema:** Prisma retorna dados reais em vez de mock

**Solução:** Verificar se `setup.ts` está configurado em `vitest.config.ts`
```typescript
setupFiles: ['./src/__tests__/setup.ts']
```

### Testes lentos

**Problema:** Testes demoram muito para executar

**Solução:**
1. Usar mocks em vez de banco real
2. Evitar `setTimeout` nos testes
3. Executar testes em paralelo (padrão do Vitest)

---

## 📈 Próximos Testes

### A Implementar

- [ ] PedidoService (criação de pedido completo)
- [ ] AsaasService (integração com API)
- [ ] EvolutionService (envio de WhatsApp)
- [ ] WebhookController (recebimento de notificações)
- [ ] Testes de integração (endpoints completos)
- [ ] Testes E2E (fluxo completo)

---

## 🎓 Recursos

- [Vitest Docs](https://vitest.dev)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Mocking with Vitest](https://vitest.dev/guide/mocking.html)

---

**Versão:** 0.6.0  
**Última atualização:** 29/04/2026  
**Testes passando:** ✅ 17/17
