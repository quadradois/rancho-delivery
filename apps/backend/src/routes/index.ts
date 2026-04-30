import { Router, type Router as ExpressRouter } from 'express';
import produtoRoutes from './produto.routes';
import bairroRoutes from './bairro.routes';
import pedidoRoutes from './pedido.routes';

const router: ExpressRouter = Router();

// Rotas da API
router.use('/produtos', produtoRoutes);
router.use('/bairros', bairroRoutes);
router.use('/pedidos', pedidoRoutes);

export default router;
