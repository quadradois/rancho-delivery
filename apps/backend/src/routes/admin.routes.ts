import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoRoutes from './admin.pedido.routes';
import adminRealtimeRoutes from './admin.realtime.routes';
import adminClienteRoutes from './admin.cliente.routes';

const router: ExpressRouter = Router();

router.use('/pedidos', adminPedidoRoutes);
router.use('/', adminRealtimeRoutes);
router.use('/', adminClienteRoutes);

export default router;
