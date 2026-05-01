import { Router, type Router as ExpressRouter } from 'express';
import adminRelatorioController from '../controllers/admin.relatorio.controller';

const router: ExpressRouter = Router();

router.get('/', adminRelatorioController.listar.bind(adminRelatorioController));
router.get('/gerar', adminRelatorioController.gerar.bind(adminRelatorioController));

export default router;
