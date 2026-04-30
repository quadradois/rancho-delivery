import { Router, type Router as ExpressRouter } from 'express';
import bairroController from '../controllers/bairro.controller';

const router: ExpressRouter = Router();

// GET /api/bairros — lista bairros ativos (público)
router.get('/', bairroController.listar.bind(bairroController));

// GET /api/bairros/todos — lista todos os bairros (admin)
router.get('/todos', bairroController.listarTodos.bind(bairroController));

// GET /api/bairros/cep/:cep — valida CEP e verifica cobertura (público)
router.get('/cep/:cep', bairroController.validarCep.bind(bairroController));

// GET /api/bairros/viacep/:cep — consulta ViaCEP (admin)
router.get('/viacep/:cep', bairroController.consultarViaCep.bind(bairroController));

// POST /api/bairros — cria bairro (admin)
router.post('/', bairroController.criar.bind(bairroController));

// POST /api/bairros/validar — valida bairro por nome (compatibilidade)
router.post('/validar', bairroController.validar.bind(bairroController));

// PUT /api/bairros/:id — atualiza bairro (admin)
router.put('/:id', bairroController.atualizar.bind(bairroController));

// DELETE /api/bairros/:id — exclui bairro (admin)
router.delete('/:id', bairroController.excluir.bind(bairroController));

export default router;
