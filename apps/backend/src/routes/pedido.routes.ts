import { Router, type Router as ExpressRouter } from 'express';
import pedidoController from '../controllers/pedido.controller';

const router: ExpressRouter = Router();

/**
 * GET /api/pedidos
 * Lista pedidos para admin
 */
router.get('/', pedidoController.listar.bind(pedidoController));
router.get('/metricas/abandono', pedidoController.metricasAbandono.bind(pedidoController));
router.get('/cliente/:telefone', pedidoController.listarPorCliente.bind(pedidoController));

/**
 * POST /api/pedidos
 * Cria novo pedido
 */
router.post('/', pedidoController.criar.bind(pedidoController));

/**
 * GET /api/pedidos/:id
 * Busca pedido por ID
 */
router.get('/:id', pedidoController.buscarPorId.bind(pedidoController));

export default router;
