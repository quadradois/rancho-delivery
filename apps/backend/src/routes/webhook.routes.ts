import { Router, type Router as ExpressRouter } from 'express';
import webhookController from '../controllers/webhook.controller';
import { webhookLimiter } from '../middlewares/rateLimit.middleware';

const router: ExpressRouter = Router();

/**
 * POST /webhook/mercadopago
 * Recebe notificações de pagamento do Mercado Pago
 */
router.use(webhookLimiter);
router.post('/mercadopago', webhookController.mercadopago.bind(webhookController));
router.post('/whatsapp', webhookController.whatsapp.bind(webhookController));

export default router;
