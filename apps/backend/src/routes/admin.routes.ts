import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoRoutes from './admin.pedido.routes';
import adminRealtimeRoutes from './admin.realtime.routes';
import adminClienteRoutes from './admin.cliente.routes';
import adminAlertaRoutes from './admin.alerta.routes';
import adminRelatorioRoutes from './admin.relatorio.routes';
import adminIaRoutes from './admin.ia.routes';
import adminPedidoController from '../controllers/admin.pedido.controller';
import { autenticarAdmin, loginAdmin } from '../middlewares/adminAuth.middleware';

const router: ExpressRouter = Router();

router.post('/auth/login', loginAdmin);
router.use(autenticarAdmin);
router.use('/pedidos', adminPedidoRoutes);
router.use('/', adminRealtimeRoutes);
router.use('/', adminClienteRoutes);
router.use('/alertas', adminAlertaRoutes);
router.use('/relatorios', adminRelatorioRoutes);
router.use('/ia', adminIaRoutes);
router.get('/fila-urgente', adminPedidoController.filaUrgente.bind(adminPedidoController));
router.get('/metricas', adminPedidoController.metricas.bind(adminPedidoController));
router.get('/motoboys/status', adminPedidoController.statusMotoboys.bind(adminPedidoController));
router.get('/motoboys', adminPedidoController.listarMotoboys.bind(adminPedidoController));
router.get('/loja/status', adminPedidoController.obterStatusLoja.bind(adminPedidoController));
router.patch('/loja/status', adminPedidoController.atualizarStatusLoja.bind(adminPedidoController));

export default router;
