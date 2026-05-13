import { Router, type Router as ExpressRouter } from 'express';
import adminIaController from '../controllers/admin.ia.controller';

const router: ExpressRouter = Router();

router.get('/sugestoes', adminIaController.sugestoes.bind(adminIaController));
router.get('/conhecimento', adminIaController.obterConhecimento.bind(adminIaController));
router.patch('/conhecimento', adminIaController.salvarConhecimento.bind(adminIaController));
router.post('/conhecimento/preview', adminIaController.previewConhecimento.bind(adminIaController));

export default router;
