import { Router, type Router as ExpressRouter } from 'express';
import adminAlertaController from '../controllers/admin.alerta.controller';

const router: ExpressRouter = Router();

router.get('/', adminAlertaController.listar.bind(adminAlertaController));
router.patch('/:tipo', adminAlertaController.atualizar.bind(adminAlertaController));

export default router;
