import { Router, type Router as ExpressRouter } from 'express';
import produtoController from '../controllers/produto.controller';

const router: ExpressRouter = Router();

/**
 * POST /api/produtos
 * Cria produto
 */
router.post('/', produtoController.criar.bind(produtoController));

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

/**
 * PUT /api/produtos/:id
 * Atualiza produto
 */
router.put('/:id', produtoController.atualizar.bind(produtoController));

/**
 * DELETE /api/produtos/:id
 * Remove produto do cardápio
 */
router.delete('/:id', produtoController.excluir.bind(produtoController));

export default router;
