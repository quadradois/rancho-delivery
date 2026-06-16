import { Router, type Router as ExpressRouter } from 'express';
import superAdminController from '../controllers/superadmin.controller';
import { autenticarSuperAdmin } from '../middlewares/adminAuth.middleware';
import { adminLimiter } from '../middlewares/rateLimit.middleware';

const router: ExpressRouter = Router();

// Control plane do FoodFlow — todas as rotas exigem o super-admin (sem escopo de tenant).
router.use(adminLimiter);
router.use(autenticarSuperAdmin);

router.get('/restaurantes', superAdminController.listarRestaurantes.bind(superAdminController));
router.post('/restaurantes', superAdminController.criarRestaurante.bind(superAdminController));
router.get('/restaurantes/:id', superAdminController.obterRestaurante.bind(superAdminController));
router.patch('/restaurantes/:id', superAdminController.atualizarRestaurante.bind(superAdminController));

export default router;
