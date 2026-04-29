import { Router } from 'express';
import produtoRoutes from './produto.routes';
import bairroRoutes from './bairro.routes';

const router = Router();

// Rotas da API
router.use('/produtos', produtoRoutes);
router.use('/bairros', bairroRoutes);

export default router;
