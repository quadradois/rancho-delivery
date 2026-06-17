import { Router, type Router as ExpressRouter } from 'express';
import leadController from '../controllers/lead.controller';
import { pedidoLimiter } from '../middlewares/rateLimit.middleware';

const router: ExpressRouter = Router();

// Público — captura do formulário do site institucional (foodflow.ia.br).
router.post('/', pedidoLimiter, leadController.criar.bind(leadController));

export default router;
