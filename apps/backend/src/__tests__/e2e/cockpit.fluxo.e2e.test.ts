/**
 * E2E de API — Fluxo operacional do cockpit /admin/pedidos
 *
 * Nível: HTTP → Controller → Service real → Prisma mockado
 * (sem browser; Playwright requer ambiente com Chromium instalado)
 *
 * Cobre:
 *   a. Login → token
 *   b. Lista de pedidos → pedido com status CONFIRMADO visível
 *   c. Detalhe → observações do cliente presentes
 *   d. Avanço CONFIRMADO → PREPARANDO ("Iniciar preparo")
 *   e. Avanço PREPARANDO → PRONTO + aguardandoEntregador=true na lista
 *   f. Bloqueio: PRONTO → SAIU_ENTREGA sem motoboy retorna 422
 *   g. Atribuição de motoboy
 *   h. Avanço PRONTO → SAIU_ENTREGA com motoboy ("Em rota")
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import adminRoutes from '../../routes/admin.routes';
import pedidoService from '../../services/pedido.service';
import prisma from '../../config/database';
import { StatusPedido, StatusPagamento, TipoAtendimentoPedido, FormaPagamentoPedido } from '@prisma/client';

vi.mock('../../services/realtime.service', () => ({ default: { emit: vi.fn() } }));
vi.mock('../../services/evolution.service', () => ({
  default: { notificarClienteStatusPedido: vi.fn().mockResolvedValue(true) },
}));
vi.mock('../../middlewares/rateLimit.middleware', () => ({
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  adminLimiter: (_req: any, _res: any, next: any) => next(),
}));

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const PEDIDO_ID = 'e2e-pedido-cockpit-01';

const now = new Date();

const pedidoBase = {
  id: PEDIDO_ID,
  status: StatusPedido.CONFIRMADO,
  statusPagamento: StatusPagamento.CONFIRMADO,
  formaPagamento: FormaPagamentoPedido.PIX,
  tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
  motoboyId: null,
  trocoPara: null,
  pagamentoId: 'pay-123',
  observacao: 'portão azul, tocar campainha',
  observacaoEntrega: null,
  canceladoMotivo: null,
  estornoNecessario: false,
  estornoRealizadoEm: null,
  statusMudouEm: now,
  criadoEm: now,
  atualizadoEm: now,
  pagamentoExpiraEm: null,
  enderecoEntrega: 'Rua B, 200',
  bairroEntrega: 'Centro',
  subtotal: 40,
  taxaEntrega: 5,
  total: 45,
  abandonadoEm: null,
  recuperadoEm: null,
  clienteTelefone: '5562991110001',
  cliente: {
    nome: 'Ana Teste',
    telefone: '5562991110001',
    endereco: 'Rua B, 200',
    bairro: 'Centro',
  },
  itens: [
    {
      id: 'item-1',
      quantidade: 2,
      preco: 20,
      observacao: 'sem cebola',
      produto: { id: 'prod-1', nome: 'Marmita', categoria: 'PRATO', preco: 20 },
    },
  ],
  motoboy: null,
  timeline: [],
};

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Retorna token via login real (sem spy no service) */
async function fazerLogin(app: Express): Promise<string> {
  process.env.ADMIN_USERNAME = 'operador';
  process.env.ADMIN_PASSWORD = 'senha123';
  const res = await request(app)
    .post('/api/admin/auth/login')
    .send({ username: 'operador', password: 'senha123' });
  expect(res.status).toBe(200);
  return `Bearer ${res.body.data.token}`;
}

// ─── testes ───────────────────────────────────────────────────────────────────

describe('Cockpit /admin/pedidos — fluxo operacional E2E (API)', () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Neutraliza a sincronização de expirações (interval guard) para não poluir mocks
    vi.spyOn(pedidoService as any, 'sincronizarExpiracoesCheckout').mockResolvedValue(undefined);
    app = buildApp();
    token = await fazerLogin(app);
  });

  // ── a. Login ────────────────────────────────────────────────────────────────
  it('a. Login retorna token válido para operador', async () => {
    // token já foi obtido no beforeEach; apenas valida que está presente
    expect(token).toMatch(/^Bearer /);
  });

  // ── b. Lista pedidos ─────────────────────────────────────────────────────────
  it('b. Lista exibe pedido com status CONFIRMADO', async () => {
    vi.mocked(prisma.pedido.findMany).mockResolvedValueOnce([pedidoBase] as any);
    vi.mocked(prisma.pedido.count).mockResolvedValueOnce(1 as any);
    vi.mocked(prisma.mensagemCliente.groupBy).mockResolvedValueOnce([] as any);

    const res = await request(app)
      .get('/api/admin/pedidos')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const pedido = res.body.data.data[0];
    expect(pedido.id).toBe(PEDIDO_ID);
    expect(pedido.status).toBe('CONFIRMADO');
    expect(pedido.aguardandoEntregador).toBe(false);
  });

  // ── c. Detalhe com observações ───────────────────────────────────────────────
  it('c. Detalhe expõe observação do pedido e observação do item', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce(pedidoBase as any);

    const res = await request(app)
      .get(`/api/admin/pedidos/${PEDIDO_ID}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.observacao).toBe('portão azul, tocar campainha');
    expect(d.itens[0].observacao).toBe('sem cebola');
  });

  // ── d. CONFIRMADO → PREPARANDO ───────────────────────────────────────────────
  it('d. CONFIRMADO → PREPARANDO ("Iniciar preparo") retorna 200', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      ...pedidoBase,
      status: StatusPedido.CONFIRMADO,
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValueOnce({
      id: PEDIDO_ID,
      status: StatusPedido.PREPARANDO,
      atualizadoEm: new Date(),
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValueOnce({} as any);

    const res = await request(app)
      .patch(`/api/admin/pedidos/${PEDIDO_ID}/status`)
      .set('Authorization', token)
      .send({ status: 'PREPARANDO' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PREPARANDO');
  });

  // ── e. PREPARANDO → PRONTO + aguardandoEntregador na lista ───────────────────
  it('e. PREPARANDO → PRONTO e lista reflete aguardandoEntregador=true', async () => {
    // Avanço de status
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      ...pedidoBase,
      status: StatusPedido.PREPARANDO,
      motoboyId: null,
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValueOnce({
      id: PEDIDO_ID,
      status: StatusPedido.PRONTO,
      atualizadoEm: new Date(),
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValueOnce({} as any);

    const avanco = await request(app)
      .patch(`/api/admin/pedidos/${PEDIDO_ID}/status`)
      .set('Authorization', token)
      .send({ status: 'PRONTO' });
    expect(avanco.status).toBe(200);

    // Lista mostra aguardandoEntregador=true
    const pedidoPronto = { ...pedidoBase, status: StatusPedido.PRONTO, motoboyId: null };
    vi.mocked(prisma.pedido.findMany).mockResolvedValueOnce([pedidoPronto] as any);
    vi.mocked(prisma.pedido.count).mockResolvedValueOnce(1 as any);
    vi.mocked(prisma.mensagemCliente.groupBy).mockResolvedValueOnce([] as any);

    const lista = await request(app)
      .get('/api/admin/pedidos')
      .set('Authorization', token);

    expect(lista.status).toBe(200);
    expect(lista.body.data.data[0].aguardandoEntregador).toBe(true);
  });

  // ── f. Bloqueio: PRONTO → SAIU_ENTREGA sem motoboy retorna 422 ───────────────
  it('f. PRONTO → SAIU_ENTREGA sem motoboy retorna 422 DESPACHO_SEM_ENTREGADOR', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      ...pedidoBase,
      status: StatusPedido.PRONTO,
      tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
      motoboyId: null,
    } as any);

    const res = await request(app)
      .patch(`/api/admin/pedidos/${PEDIDO_ID}/status`)
      .set('Authorization', token)
      .send({ status: 'SAIU_ENTREGA' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('DESPACHO_SEM_ENTREGADOR');
  });

  // ── g. Atribuição de motoboy ──────────────────────────────────────────────────
  it('g. Atribuir motoboy retorna 200 e motoboy no response', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({ id: PEDIDO_ID } as any);
    vi.mocked(prisma.motoboy.findUnique).mockResolvedValueOnce({ id: 'mb-e2e' } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValueOnce({
      id: PEDIDO_ID,
      motoboyId: 'mb-e2e',
      observacaoEntrega: null,
      atualizadoEm: new Date(),
      motoboy: { id: 'mb-e2e', nome: 'Moto E2E', telefone: '5562999000999', status: 'ATIVO' },
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValueOnce({} as any);

    const res = await request(app)
      .patch(`/api/admin/pedidos/${PEDIDO_ID}/motoboy`)
      .set('Authorization', token)
      .send({ motoboyId: 'mb-e2e' });

    expect(res.status).toBe(200);
    expect(res.body.data.motoboy.id).toBe('mb-e2e');
  });

  // ── h. PRONTO → SAIU_ENTREGA com motoboy ─────────────────────────────────────
  it('h. PRONTO → SAIU_ENTREGA com motoboy retorna 200 ("Em rota")', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      ...pedidoBase,
      status: StatusPedido.PRONTO,
      tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
      motoboyId: 'mb-e2e',
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValueOnce({
      id: PEDIDO_ID,
      status: StatusPedido.SAIU_ENTREGA,
      atualizadoEm: new Date(),
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValueOnce({} as any);

    const res = await request(app)
      .patch(`/api/admin/pedidos/${PEDIDO_ID}/status`)
      .set('Authorization', token)
      .send({ status: 'SAIU_ENTREGA' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SAIU_ENTREGA');
  });
});
