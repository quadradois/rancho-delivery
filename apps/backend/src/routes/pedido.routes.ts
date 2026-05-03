import { Router, type Router as ExpressRouter } from 'express';
import pedidoController from '../controllers/pedido.controller';
import { autenticarAdmin, tryAutenticarAdmin } from '../middlewares/adminAuth.middleware';
import { verificarAcessoPedido } from '../middlewares/pedidoAuth.middleware';
import { pedidoLimiter } from '../middlewares/rateLimit.middleware';
import { idempotencyMiddleware } from '../middlewares/idempotency.middleware';

const router: ExpressRouter = Router();

// GET /api/pedidos — lista pública (usada pelo painel admin via admin.routes)
router.get('/', pedidoController.listar.bind(pedidoController));

// GET /api/pedidos/metricas/abandono — apenas admin
router.get(
  '/metricas/abandono',
  autenticarAdmin,
  pedidoController.metricasAbandono.bind(pedidoController),
);

// GET /api/pedidos/cliente/:telefone — apenas admin (LGPD: expõe histórico completo do cliente)
router.get(
  '/cliente/:telefone',
  autenticarAdmin,
  pedidoController.listarPorCliente.bind(pedidoController),
);

// POST /api/pedidos — rate limit + idempotência
router.post(
  '/',
  pedidoLimiter,
  idempotencyMiddleware,
  pedidoController.criar.bind(pedidoController),
);

// POST /api/pedidos/reorder/:id — cria novo pedido copiando itens de pedido anterior (token/JWT admin)
router.post(
  '/reorder/:id',
  tryAutenticarAdmin,
  verificarAcessoPedido,
  pedidoController.reorder.bind(pedidoController),
);

router.post(
  '/:id/pagamento/pix',
  tryAutenticarAdmin,
  verificarAcessoPedido,
  pedidoController.gerarPagamentoPix.bind(pedidoController),
);

// GET /api/pedidos/:id/eventos — stream em tempo real (SSE) para acompanhamento do pedido
router.get(
  '/:id/eventos',
  tryAutenticarAdmin,
  verificarAcessoPedido,
  pedidoController.streamEventos.bind(pedidoController),
);

// POST /api/pedidos/:id/nps — cliente registra avaliação 1-5 do pedido
router.post(
  '/:id/nps',
  tryAutenticarAdmin,
  verificarAcessoPedido,
  pedidoController.registrarNps.bind(pedidoController),
);

// GET /api/pedidos/:id — requer token de acesso (?token=) OU JWT admin
// tryAutenticarAdmin seta req.adminUser se houver JWT válido, sem rejeitar se não houver
router.get(
  '/:id',
  tryAutenticarAdmin,
  verificarAcessoPedido,
  pedidoController.buscarPorId.bind(pedidoController),
);

export default router;
