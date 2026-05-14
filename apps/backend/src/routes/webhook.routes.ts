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
// Evolution API com webhookByEvents=true envia para /whatsapp/:event (ex: /whatsapp/messages-upsert)
router.post('/whatsapp', webhookController.whatsapp.bind(webhookController));
router.post('/whatsapp/:event', webhookController.whatsapp.bind(webhookController));

export default router;
