import { Router, type Router as ExpressRouter } from 'express';
import planoController from '../controllers/plano.controller';
import { pedidoLimiter } from '../middlewares/rateLimit.middleware';

const router: ExpressRouter = Router();

// Público — planos exibidos no site institucional (foodflow.ia.br).
router.get('/', pedidoLimiter, planoController.listarPublicos.bind(planoController));

export default router;
