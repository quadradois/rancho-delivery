import { Request, Response } from 'express';
import alertaService from '../services/alerta.service';
import { logger } from '../config/logger';

export class AdminAlertaController {
  async listar(_req: Request, res: Response) {
    try {
      const data = await alertaService.listar();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar alertas:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar alertas' } });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { tipo } = req.params;
      const { ativo, threshold, acao } = req.body;
      const data = await alertaService.atualizar(tipo, { ativo, threshold, acao });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'ALERTA_INVALIDO') {
        return res.status(400).json({ success: false, error: { message: 'Tipo de alerta inválido', code: 'ALERTA_INVALIDO' } });
      }
      logger.error('Erro ao atualizar alerta:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar alerta' } });
    }
  }
}

export default new AdminAlertaController();
