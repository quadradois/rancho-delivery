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

      return res.json({
        success: true,
        data: bairros,
      });
    } catch (error) {
      logger.error('Erro no controller de bairros:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar bairros',
        },
      });
    }
  }

  /**
   * POST /api/bairros/validar
   * Valida se bairro está ativo e retorna taxa
   */
  async validar(req: Request, res: Response) {
    try {
      const { nome } = req.body;

      if (!nome) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Nome do bairro é obrigatório',
            code: 'BAIRRO_OBRIGATORIO',
          },
        });
      }

      const resultado = await bairroService.validarBairro(nome);

      if (!resultado.valido) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Bairro não atendido',
            code: 'BAIRRO_NAO_ATENDIDO',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          valido: true,
          taxa: resultado.taxa,
        },
      });
    } catch (error) {
      logger.error('Erro ao validar bairro:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao validar bairro',
        },
      });
    }
  }
}

export default new BairroController();
