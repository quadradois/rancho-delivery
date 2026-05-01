import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoController from '../controllers/admin.pedido.controller';

const router: ExpressRouter = Router();

router.get('/', adminPedidoController.listar.bind(adminPedidoController));
router.patch('/:id/status', adminPedidoController.atualizarStatus.bind(adminPedidoController));
router.get('/:id', adminPedidoController.buscarPorId.bind(adminPedidoController));

export default router;
