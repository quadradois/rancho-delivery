import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoController from '../controllers/admin.pedido.controller';

const router: ExpressRouter = Router();

router.get('/', adminPedidoController.listar.bind(adminPedidoController));
router.post('/manual', adminPedidoController.criarManual.bind(adminPedidoController));
router.patch('/:id/status', adminPedidoController.atualizarStatus.bind(adminPedidoController));
router.patch('/:id/motoboy', adminPedidoController.atribuirMotoboy.bind(adminPedidoController));
router.patch('/:id/endereco', adminPedidoController.atualizarEnderecoEntrega.bind(adminPedidoController));
router.post('/:id/cancelar', adminPedidoController.cancelar.bind(adminPedidoController));
router.patch('/:id/estorno', adminPedidoController.marcarEstorno.bind(adminPedidoController));
router.get('/:id', adminPedidoController.buscarPorId.bind(adminPedidoController));

export default router;
