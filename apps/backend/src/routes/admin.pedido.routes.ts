import { Router, type Router as ExpressRouter } from 'express';
import adminPedidoController from '../controllers/admin.pedido.controller';
import { autorizarAdmin } from '../middlewares/adminAuth.middleware';

const router: ExpressRouter = Router();

router.get('/', autorizarAdmin('pedidos:ler'), adminPedidoController.listar.bind(adminPedidoController));
router.get('/:id', autorizarAdmin('pedidos:ler'), adminPedidoController.buscarPorId.bind(adminPedidoController));
router.post('/manual', autorizarAdmin('pedidos:criar_manual'), adminPedidoController.criarManual.bind(adminPedidoController));
router.patch('/:id/status', autorizarAdmin('pedidos:status'), adminPedidoController.atualizarStatus.bind(adminPedidoController));
router.patch('/:id/motoboy', autorizarAdmin('pedidos:motoboy'), adminPedidoController.atribuirMotoboy.bind(adminPedidoController));
router.patch('/:id/endereco', autorizarAdmin('pedidos:endereco'), adminPedidoController.atualizarEnderecoEntrega.bind(adminPedidoController));
router.post('/:id/cancelar', autorizarAdmin('pedidos:cancelar'), adminPedidoController.cancelar.bind(adminPedidoController));
router.patch('/:id/estorno', autorizarAdmin('pedidos:estorno'), adminPedidoController.marcarEstorno.bind(adminPedidoController));

export default router;
