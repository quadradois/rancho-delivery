import { Router } from 'express';
import pedidoController from '../controllers/pedido.controller';

const router = Router();

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

/**
 * GET /api/pedidos/cliente/:telefone
 * Lista pedidos de um cliente
 */
router.get('/cliente/:telefone', pedidoController.listarPorCliente.bind(pedidoController));

export default router;
