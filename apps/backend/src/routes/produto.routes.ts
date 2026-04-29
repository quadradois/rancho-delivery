import { Router } from 'express';
import produtoController from '../controllers/produto.controller';

const router = Router();

/**
 * GET /api/produtos
 * Lista todos os produtos disponíveis
 * Query params: categoria (opcional)
 */
router.get('/', produtoController.listar.bind(produtoController));

/**
 * GET /api/produtos/:id
 * Busca produto por ID
 */
router.get('/:id', produtoController.buscarPorId.bind(produtoController));

export default router;
