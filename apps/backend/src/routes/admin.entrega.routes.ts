import { Router, type Router as ExpressRouter } from 'express';
import adminEntregaController from '../controllers/admin.entrega.controller';
import { autorizarAdmin } from '../middlewares/adminAuth.middleware';

const router: ExpressRouter = Router();

router.get('/prontos', autorizarAdmin('pedidos:ler'), adminEntregaController.pedidosProntos.bind(adminEntregaController));
router.post('/agrupar', autorizarAdmin('pedidos:ler'), adminEntregaController.agrupar.bind(adminEntregaController));
router.post('/despachar', autorizarAdmin('pedidos:status'), adminEntregaController.despachar.bind(adminEntregaController));

export default router;
