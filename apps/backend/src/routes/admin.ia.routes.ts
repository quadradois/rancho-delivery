import { Router, type Router as ExpressRouter } from 'express';
import adminIaController from '../controllers/admin.ia.controller';

const router: ExpressRouter = Router();

router.get('/sugestoes', adminIaController.sugestoes.bind(adminIaController));

export default router;
