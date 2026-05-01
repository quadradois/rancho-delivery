import { Router, type Router as ExpressRouter } from 'express';
import adminDecisaoController from '../controllers/admin.decisao.controller';

const router: ExpressRouter = Router();

router.get('/', adminDecisaoController.listar.bind(adminDecisaoController));
router.get('/metricas', adminDecisaoController.metricas.bind(adminDecisaoController));
router.post('/recalcular', adminDecisaoController.recalcular.bind(adminDecisaoController));
router.patch('/:id/status', adminDecisaoController.atualizarStatus.bind(adminDecisaoController));
router.patch('/:id/resolver', adminDecisaoController.resolver.bind(adminDecisaoController));
router.get('/:id', adminDecisaoController.buscarPorId.bind(adminDecisaoController));

export default router;
