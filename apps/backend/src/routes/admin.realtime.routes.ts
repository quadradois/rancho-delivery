import { Router, type Router as ExpressRouter } from 'express';
import adminRealtimeController from '../controllers/admin.realtime.controller';

const router: ExpressRouter = Router();

router.get('/events', adminRealtimeController.stream.bind(adminRealtimeController));

export default router;
