import { Router } from 'express';
import bairroController from '../controllers/bairro.controller';

const router = Router();

/**
 * GET /api/bairros
 * Lista todos os bairros ativos
 */
router.get('/', bairroController.listar.bind(bairroController));

/**
 * POST /api/bairros/validar
 * Valida se bairro está ativo e retorna taxa
 */
router.post('/validar', bairroController.validar.bind(bairroController));

export default router;
