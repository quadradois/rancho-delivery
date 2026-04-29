import { Router } from 'express';
import webhookController from '../controllers/webhook.controller';

const router = Router();

/**
 * POST /webhook/asaas
 * Recebe notificações de pagamento do Asaas
 */
router.post('/asaas', webhookController.asaas.bind(webhookController));

export default router;
