import { Request, Response } from 'express';
import bairroService from '../services/bairro.service';
import { logger } from '../config/logger';

export class BairroController {
  /**
   * GET /api/bairros
   * Lista todos os bairros ativos
   */
  async listar(_req: Request, res: Response) {
    try {
      const bairros = await bairroService.listarBairrosAtivos();
      return res.json({ success: true, data: bairros });
    } catch (error) {
      logger.error('Erro no controller de bairros:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao buscar bairros' } });
    }
  }

  /**
   * GET /api/bairros/todos
   * Lista todos os bairros (admin)
   */
  async listarTodos(_req: Request, res: Response) {
    try {
      const bairros = await bairroService.listarTodos();
      return res.json({ success: true, data: bairros });
    } catch (error) {
      logger.error('Erro ao listar todos os bairros:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao buscar bairros' } });
    }
  }

  /**
   * GET /api/bairros/cep/:cep
   * Valida CEP via ViaCEP e verifica se é atendido
   */
  async validarCep(req: Request, res: Response) {
    try {
      const { cep } = req.params;

      if (!cep || cep.replace(/\D/g, '').length !== 8) {
        return res.status(400).json({
          success: false,
          error: { message: 'CEP inválido', code: 'CEP_INVALIDO' },
        });
      }

      const resultado = await bairroService.validarCep(cep);

      if (resultado.erro) {
        return res.status(404).json({
          success: false,
          error: { message: resultado.erro, code: 'CEP_NAO_ENCONTRADO' },
        });
      }

      return res.json({ success: true, data: resultado });
    } catch (error) {
      logger.error('Erro ao validar CEP:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao validar CEP' } });
    }
  }

  /**
   * GET /api/bairros/viacep/:cep
   * Consulta ViaCEP e retorna dados do endereço (para admin)
   */
  async consultarViaCep(req: Request, res: Response) {
    try {
      const { cep } = req.params;
      const dados = await bairroService.consultarViaCep(cep);

      if (!dados) {
        return res.status(404).json({
          success: false,
          error: { message: 'CEP não encontrado', code: 'CEP_NAO_ENCONTRADO' },
        });
      }

      return res.json({ success: true, data: dados });
    } catch (error) {
      logger.error('Erro ao consultar ViaCEP:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao consultar CEP' } });
    }
  }

  /**
   * POST /api/bairros
   * Cria bairro
   */
  async criar(req: Request, res: Response) {
    try {
      const { nome, cep, taxa, ativo, linkIfood, link99food, linkOutro, nomeOutro } = req.body;

      if (!nome || taxa === undefined) {
        return res.status(400).json({
          success: false,
          error: { message: 'Nome e taxa são obrigatórios' },
        });
      }

      const bairro = await bairroService.criar({
        nome,
        cep: cep || undefined,
        taxa: Number(taxa),
        ativo: ativo !== false,
        linkIfood: linkIfood || undefined,
        link99food: link99food || undefined,
        linkOutro: linkOutro || undefined,
        nomeOutro: nomeOutro || undefined,
      });

      return res.status(201).json({ success: true, data: bairro });
    } catch (error) {
      logger.error('Erro ao criar bairro:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao criar bairro' } });
    }
  }

  /**
   * PUT /api/bairros/:id
   * Atualiza bairro
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, cep, taxa, ativo, linkIfood, link99food, linkOutro, nomeOutro } = req.body;

      const bairro = await bairroService.atualizar(id, {
        nome,
        cep: cep || undefined,
        taxa: taxa !== undefined ? Number(taxa) : undefined,
        ativo,
        linkIfood: linkIfood ?? null,
        link99food: link99food ?? null,
        linkOutro: linkOutro ?? null,
        nomeOutro: nomeOutro ?? null,
      });

      return res.json({ success: true, data: bairro });
    } catch (error) {
      logger.error('Erro ao atualizar bairro:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar bairro' } });
    }
  }

  /**
   * DELETE /api/bairros/:id
   * Exclui bairro
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await bairroService.excluir(id);
      return res.json({ success: true, message: 'Bairro excluído com sucesso' });
    } catch (error) {
      logger.error('Erro ao excluir bairro:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao excluir bairro' } });
    }
  }

  /**
   * POST /api/bairros/validar (compatibilidade)
   */
  async validar(req: Request, res: Response) {
    try {
      const { nome } = req.body;
      if (!nome) {
        return res.status(400).json({
          success: false,
          error: { message: 'Nome do bairro é obrigatório', code: 'BAIRRO_OBRIGATORIO' },
        });
      }

      const resultado = await bairroService.validarBairro(nome);

      if (!resultado.valido) {
        return res.status(404).json({
          success: false,
          error: { message: 'Bairro não atendido', code: 'BAIRRO_NAO_ATENDIDO' },
        });
      }

      return res.json({ success: true, data: { valido: true, taxa: resultado.taxa } });
    } catch (error) {
      logger.error('Erro ao validar bairro:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao validar bairro' } });
    }
  }
}

export default new BairroController();
