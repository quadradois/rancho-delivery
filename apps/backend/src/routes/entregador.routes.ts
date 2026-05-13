import { Router, type Router as ExpressRouter } from 'express';
import entregadorController from '../controllers/entregador.controller';
import { autenticarEntregador, refreshTokenEntregador } from '../middlewares/entregadorAuth.middleware';

const router: ExpressRouter = Router();

router.post('/auth', entregadorController.login.bind(entregadorController));
router.post('/auth/refresh', refreshTokenEntregador);
router.get('/events', entregadorController.events.bind(entregadorController));
router.get('/fila', autenticarEntregador, entregadorController.fila.bind(entregadorController));
router.get('/historico', autenticarEntregador, entregadorController.historico.bind(entregadorController));
router.patch('/localizacao', autenticarEntregador, entregadorController.atualizarLocalizacao.bind(entregadorController));
router.post('/entregas/:id/confirmar', autenticarEntregador, entregadorController.confirmar.bind(entregadorController));

export default router;
