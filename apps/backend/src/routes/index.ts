import { Router, type Router as ExpressRouter } from 'express';
import produtoRoutes from './produto.routes';
import bairroRoutes from './bairro.routes';
import pedidoRoutes from './pedido.routes';
import adminRoutes from './admin.routes';
import lojaRoutes from './loja.routes';

const router: ExpressRouter = Router();

// Rotas da API
router.use('/produtos', produtoRoutes);
router.use('/bairros', bairroRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/loja', lojaRoutes);
router.use('/admin', adminRoutes);

export default router;
