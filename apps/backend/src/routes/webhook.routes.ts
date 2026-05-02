import { Router, type Router as ExpressRouter } from 'express';
import webhookController from '../controllers/webhook.controller';
import { webhookLimiter } from '../middlewares/rateLimit.middleware';

const router: ExpressRouter = Router();

/**
 * POST /webhook/infinitepay
 * Recebe notificações de pagamento do InfinitePay
 */
router.use(webhookLimiter);
router.post('/infinitepay', webhookController.infinitepay.bind(webhookController));
router.post('/whatsapp', webhookController.whatsapp.bind(webhookController));

export default router;
