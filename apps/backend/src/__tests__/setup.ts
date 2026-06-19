import { vi } from 'vitest';

// Mock do Prisma Client
vi.mock('../config/database', () => ({
  default: {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    modulo: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    assinatura: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    produto: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bairro: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cliente: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pedido: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    pedidoTimeline: {
      create: vi.fn(),
    },
    mensagemCliente: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    motoboy: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lojaConfiguracao: {
      findUnique: vi.fn().mockResolvedValue({ id: 'loja_principal', status: 'ABERTO', mensagemPausado: null }),
      findFirst: vi.fn().mockResolvedValue({ id: 'loja_principal', status: 'ABERTO', mensagemPausado: null }),
      create: vi.fn().mockResolvedValue({ id: 'loja_principal', status: 'ABERTO', mensagemPausado: null }),
      update: vi.fn().mockResolvedValue({ id: 'loja_principal', status: 'ABERTO', mensagemPausado: null }),
      upsert: vi.fn().mockResolvedValue({ id: 'loja_principal', status: 'ABERTO', mensagemPausado: null }),
    },
    imovelPrefeitura: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    imovelRancho: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    bairroRancho: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    leadMarketing: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn(),
      update: vi.fn(),
    },
    mensagemLead: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    blacklistWhatsApp: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    sessaoPedidoWhatsApp: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    conexaoWhatsApp: {
      // Default: nenhuma instância casa por nome, mas há uma única conexão
      // (Rancho) — o webhook resolve via fallback de conexão única.
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([{ tenantId: 'rancho' }]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn((callback) => callback({
      pedido: {
        create: vi.fn(),
      },
    })),
  },
}));

// Mock do TaxaEntregaService
vi.mock('../services/taxaEntrega.service', () => ({
  default: {
    obterFaixas: vi.fn().mockResolvedValue([]),
    usaFaixasPorDistancia: vi.fn().mockReturnValue(false),
    calcularPorCep: vi.fn().mockResolvedValue({ atendido: true, taxa: 6 }),
    salvarFaixas: vi.fn(),
  },
}));

// Mock do Logger
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock do Axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));
