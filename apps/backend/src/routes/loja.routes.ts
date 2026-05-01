import { Router, type Router as ExpressRouter } from 'express';
import lojaController from '../controllers/loja.controller';

const router: ExpressRouter = Router();

router.get('/status', lojaController.status.bind(lojaController));
router.get('/events', lojaController.stream.bind(lojaController));

export default router;
