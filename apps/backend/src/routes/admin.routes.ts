import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoRoutes from './admin.pedido.routes';
import adminRealtimeRoutes from './admin.realtime.routes';

const router: ExpressRouter = Router();

router.use('/pedidos', adminPedidoRoutes);
router.use('/', adminRealtimeRoutes);

export default router;
