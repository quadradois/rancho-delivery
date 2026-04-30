import { Router, type Router as ExpressRouter } from 'express';
import webhookController from '../controllers/webhook.controller';

const router: ExpressRouter = Router();

/**
 * POST /webhook/infinitepay
 * Recebe notificações de pagamento do InfinitePay
 */
router.post('/infinitepay', webhookController.infinitepay.bind(webhookController));

export default router;
