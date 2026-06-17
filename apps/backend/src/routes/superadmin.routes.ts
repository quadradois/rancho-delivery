import { Router, type Router as ExpressRouter } from 'express';
import superAdminController from '../controllers/superadmin.controller';
import planoController from '../controllers/plano.controller';
import assinaturaController from '../controllers/assinatura.controller';
import leadController from '../controllers/lead.controller';
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

// Estado da conta do restaurante (atribuir plano + EstadoConta).
router.get('/restaurantes/:id/assinatura', assinaturaController.obter.bind(assinaturaController));
router.put('/restaurantes/:id/assinatura', assinaturaController.definir.bind(assinaturaController));
router.post('/restaurantes/:id/assinatura/cobranca', assinaturaController.gerarCobranca.bind(assinaturaController));

// Catálogo de módulos + construtor de planos (combos de módulos).
router.get('/modulos', planoController.listarModulos.bind(planoController));
router.get('/planos', planoController.listarPlanos.bind(planoController));
router.post('/planos', planoController.criarPlano.bind(planoController));
router.get('/planos/:id', planoController.obterPlano.bind(planoController));
router.patch('/planos/:id', planoController.atualizarPlano.bind(planoController));

// Leads capturados no site institucional.
router.get('/leads', leadController.listar.bind(leadController));

export default router;
