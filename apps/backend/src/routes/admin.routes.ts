import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoRoutes from './admin.pedido.routes';
import adminRealtimeRoutes from './admin.realtime.routes';
import adminClienteRoutes from './admin.cliente.routes';
import adminAlertaRoutes from './admin.alerta.routes';
import adminRelatorioRoutes from './admin.relatorio.routes';
import adminIaRoutes from './admin.ia.routes';
import adminPedidoController from '../controllers/admin.pedido.controller';
import { autenticarAdmin, autorizarAdmin, loginAdmin } from '../middlewares/adminAuth.middleware';
import { loginLimiter, adminLimiter } from '../middlewares/rateLimit.middleware';

const router: ExpressRouter = Router();

router.post('/auth/login', loginLimiter, loginAdmin);
router.use(adminLimiter);
router.use(autenticarAdmin);
router.use('/pedidos', adminPedidoRoutes);
router.use('/', adminRealtimeRoutes);
router.use('/', adminClienteRoutes);
router.use('/alertas', adminAlertaRoutes);
router.use('/relatorios', adminRelatorioRoutes);
router.use('/ia', adminIaRoutes);
router.get('/fila-urgente', autorizarAdmin('pedidos:ler'), adminPedidoController.filaUrgente.bind(adminPedidoController));
router.get('/metricas', autorizarAdmin('metricas:ler'), adminPedidoController.metricas.bind(adminPedidoController));
router.get('/motoboys/status', autorizarAdmin('pedidos:ler'), adminPedidoController.statusMotoboys.bind(adminPedidoController));
router.get('/motoboys', autorizarAdmin('pedidos:ler'), adminPedidoController.listarMotoboys.bind(adminPedidoController));
router.post('/motoboys', autorizarAdmin('pedidos:motoboy'), adminPedidoController.criarMotoboy.bind(adminPedidoController));
router.get('/loja/status', autorizarAdmin('loja:gerenciar'), adminPedidoController.obterStatusLoja.bind(adminPedidoController));
router.patch('/loja/status', autorizarAdmin('loja:gerenciar'), adminPedidoController.atualizarStatusLoja.bind(adminPedidoController));
router.get('/pagamentos/mercadopago', autorizarAdmin('loja:gerenciar'), adminPedidoController.obterConfiguracaoMercadoPago.bind(adminPedidoController));
router.patch('/pagamentos/mercadopago', autorizarAdmin('loja:gerenciar'), adminPedidoController.atualizarConfiguracaoMercadoPago.bind(adminPedidoController));

export default router;
