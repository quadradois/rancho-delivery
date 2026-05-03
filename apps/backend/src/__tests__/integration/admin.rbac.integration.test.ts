import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import adminRoutes from '../../routes/admin.routes';
import pedidoService from '../../services/pedido.service';
import { criarAdminToken } from '../../middlewares/adminAuth.middleware';

vi.mock('../../services/pedido.service');
vi.mock('../../services/realtime.service', () => ({ default: { emit: vi.fn() } }));
vi.mock('../../services/evolution.service', () => ({ default: { notificarClienteStatusPedido: vi.fn().mockResolvedValue(true) } }));

function buildApp(): Express {
  const app = express();
  app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.use('/api/admin', adminRoutes);
  return app;
}

const tokenAdmin    = `Bearer ${criarAdminToken('admin-test', 'admin')}`;
const tokenOperador = `Bearer ${criarAdminToken('operador-test', 'operador')}`;
const tokenViewer   = `Bearer ${criarAdminToken('viewer-test', 'viewer')}`;

const mockPedido = {
  id: 'ped-rbac-1',
  numero: 42,
  status: 'PREPARANDO',
  statusPagamento: 'CONFIRMADO',
  cliente: { nome: 'João', telefone: '5562999990000', endereco: 'Rua A', bairro: 'Centro' },
  itens: [],
  subtotal: 50,
  taxaEntrega: 5,
  total: 55,
  timeline: [],
};

describe('Admin RBAC — integração', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('Autenticação', () => {
    it('rejeita requisição sem token (401)', async () => {
      const res = await request(app).get('/api/admin/pedidos');
      expect(res.status).toBe(401);
    });

    it('rejeita token malformado (401)', async () => {
      const res = await request(app)
        .get('/api/admin/pedidos')
        .set('Authorization', 'Bearer token-invalido');
      expect(res.status).toBe(401);
    });

    it('aceita token válido de admin', async () => {
      vi.mocked(pedidoService.sincronizarExpiracoesCheckout).mockResolvedValue(undefined as any);
      vi.mocked(pedidoService.listarPedidosAdmin).mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 50 } } as any);

      const res = await request(app)
        .get('/api/admin/pedidos')
        .set('Authorization', tokenAdmin);
      expect(res.status).toBe(200);
    });
  });

  describe('Role: viewer — somente leitura', () => {
    it('pode listar pedidos (pedidos:ler)', async () => {
      vi.mocked(pedidoService.sincronizarExpiracoesCheckout).mockResolvedValue(undefined as any);
      vi.mocked(pedidoService.listarPedidosAdmin).mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 50 } } as any);

      const res = await request(app)
        .get('/api/admin/pedidos')
        .set('Authorization', tokenViewer);
      expect(res.status).toBe(200);
    });

    it('pode ver métricas (metricas:ler)', async () => {
      vi.mocked(pedidoService.sincronizarExpiracoesCheckout).mockResolvedValue(undefined as any);
      vi.mocked(pedidoService.obterMetricasAdmin).mockResolvedValue({} as any);

      const res = await request(app)
        .get('/api/admin/metricas')
        .set('Authorization', tokenViewer);
      expect(res.status).toBe(200);
    });

    it('NÃO pode cancelar pedido (pedidos:cancelar → 403)', async () => {
      const res = await request(app)
        .post('/api/admin/pedidos/ped-1/cancelar')
        .set('Authorization', tokenViewer)
        .send({ motivo: 'Teste' });
      expect(res.status).toBe(403);
    });

    it('NÃO pode criar pedido manual (pedidos:criar_manual → 403)', async () => {
      const res = await request(app)
        .post('/api/admin/pedidos/manual')
        .set('Authorization', tokenViewer)
        .send({});
      expect(res.status).toBe(403);
    });

    it('NÃO pode marcar estorno (pedidos:estorno → 403)', async () => {
      const res = await request(app)
        .patch('/api/admin/pedidos/ped-1/estorno')
        .set('Authorization', tokenViewer);
      expect(res.status).toBe(403);
    });

    it('NÃO pode gerenciar loja (loja:gerenciar → 403)', async () => {
      const res = await request(app)
        .patch('/api/admin/loja/status')
        .set('Authorization', tokenViewer)
        .send({ status: 'FECHADO' });
      expect(res.status).toBe(403);
    });
  });

  describe('Role: operador — pedidos sem cancelar/estornar', () => {
    it('pode avançar status do pedido (pedidos:status)', async () => {
      vi.mocked(pedidoService.atualizarStatusAdmin).mockResolvedValue({ ...mockPedido, status: 'SAIU_ENTREGA' } as any);

      const res = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/status')
        .set('Authorization', tokenOperador)
        .send({ status: 'SAIU_ENTREGA' });
      expect(res.status).toBe(200);
    });

    it('pode atribuir motoboy (pedidos:motoboy)', async () => {
      vi.mocked(pedidoService.atribuirMotoboy).mockResolvedValue({ ...mockPedido, motoboy: null } as any);

      const res = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/motoboy')
        .set('Authorization', tokenOperador)
        .send({ motoboyId: null });
      expect(res.status).toBe(200);
    });

    it('NÃO pode cancelar pedido (403)', async () => {
      const res = await request(app)
        .post('/api/admin/pedidos/ped-rbac-1/cancelar')
        .set('Authorization', tokenOperador)
        .send({ motivo: 'Teste' });
      expect(res.status).toBe(403);
    });

    it('NÃO pode marcar estorno (403)', async () => {
      const res = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/estorno')
        .set('Authorization', tokenOperador);
      expect(res.status).toBe(403);
    });

    it('executa fluxo PREPARANDO -> PRONTO -> SAIU_ENTREGA (com motoboy)', async () => {
      vi.mocked(pedidoService.atualizarStatusAdmin)
        .mockResolvedValueOnce({ ...mockPedido, status: 'PRONTO' } as any)
        .mockResolvedValueOnce({ ...mockPedido, status: 'SAIU_ENTREGA' } as any);
      vi.mocked(pedidoService.atribuirMotoboy).mockResolvedValue({ ...mockPedido, motoboy: { id: 'mb-1', nome: 'Moto 1' } } as any);

      const pronto = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/status')
        .set('Authorization', tokenOperador)
        .send({ status: 'PRONTO' });
      expect(pronto.status).toBe(200);

      const atribuir = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/motoboy')
        .set('Authorization', tokenOperador)
        .send({ motoboyId: 'mb-1' });
      expect(atribuir.status).toBe(200);

      const rota = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/status')
        .set('Authorization', tokenOperador)
        .send({ status: 'SAIU_ENTREGA' });
      expect(rota.status).toBe(200);
    });

    it('bloqueia PRONTO -> SAIU_ENTREGA sem motoboy com 422', async () => {
      vi.mocked(pedidoService.atualizarStatusAdmin)
        .mockResolvedValueOnce({ ...mockPedido, status: 'PRONTO' } as any)
        .mockRejectedValueOnce(new Error('DESPACHO_SEM_ENTREGADOR'));

      const pronto = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/status')
        .set('Authorization', tokenOperador)
        .send({ status: 'PRONTO' });
      expect(pronto.status).toBe(200);

      const rota = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/status')
        .set('Authorization', tokenOperador)
        .send({ status: 'SAIU_ENTREGA' });
      expect(rota.status).toBe(422);
      expect(rota.body.error.code).toBe('DESPACHO_SEM_ENTREGADOR');
    });
  });

  describe('Role: admin — acesso total', () => {
    it('pode cancelar pedido', async () => {
      vi.mocked(pedidoService.cancelarPedidoAdmin).mockResolvedValue({ ...mockPedido, status: 'CANCELADO' } as any);

      const res = await request(app)
        .post('/api/admin/pedidos/ped-rbac-1/cancelar')
        .set('Authorization', tokenAdmin)
        .send({ motivo: 'Teste de cancelamento' });
      expect(res.status).toBe(200);
    });

    it('pode marcar estorno', async () => {
      vi.mocked(pedidoService.marcarEstornoAdmin).mockResolvedValue({ ...mockPedido, estornoNecessario: false } as any);

      const res = await request(app)
        .patch('/api/admin/pedidos/ped-rbac-1/estorno')
        .set('Authorization', tokenAdmin);
      expect(res.status).toBe(200);
    });

    it('pode gerenciar status da loja', async () => {
      vi.mocked(pedidoService.atualizarStatusLoja).mockResolvedValue({ status: 'FECHADO', mensagem: null, atualizadoEm: new Date() } as any);

      const res = await request(app)
        .patch('/api/admin/loja/status')
        .set('Authorization', tokenAdmin)
        .send({ status: 'FECHADO' });
      expect(res.status).toBe(200);
    });

    it('pode criar pedido manual', async () => {
      vi.mocked(pedidoService.criarPedidoManual).mockResolvedValue({ ...mockPedido, status: 'CONFIRMADO' } as any);

      const res = await request(app)
        .post('/api/admin/pedidos/manual')
        .set('Authorization', tokenAdmin)
        .send({
          pagamentoMetodo: 'DINHEIRO',
          cliente: { nome: 'João', telefone: '5562999990000', endereco: 'Rua A', bairro: 'Centro' },
          itens: [{ produtoId: 'p1', quantidade: 1 }],
        });
      expect(res.status).toBe(201);
    });
  });

  describe('Login', () => {
    it('retorna 401 para credenciais inválidas', async () => {
      process.env.ADMIN_USERNAME = 'adminrancho';
      process.env.ADMIN_PASSWORD = 'senha-correta';

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ username: 'adminrancho', password: 'senha-errada' });
      expect(res.status).toBe(401);
    });

    it('retorna token e role para credenciais válidas', async () => {
      process.env.ADMIN_USERNAME = 'adminrancho';
      process.env.ADMIN_PASSWORD = 'senha-correta';
      process.env.ADMIN_ROLE = 'admin';

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ username: 'adminrancho', password: 'senha-correta' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('role', 'admin');
    });
  });
});
