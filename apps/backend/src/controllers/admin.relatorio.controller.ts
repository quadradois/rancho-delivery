import { Request, Response } from 'express';
import relatorioService from '../services/relatorio.service';
import { logger } from '../config/logger';

export class AdminRelatorioController {
  async gerar(req: Request, res: Response) {
    try {
      const data = req.query.data ? new Date(String(req.query.data)) : undefined;
      const relatorio = await relatorioService.gerarRelatorioDia(data);
      return res.json({ success: true, data: relatorio });
    } catch (error) {
      logger.error('Erro ao gerar relatorio:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao gerar relatório' } });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const limite = Number(req.query.limite) || 30;
      const data = await relatorioService.listarRelatorios(limite);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar relatorios:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar relatórios' } });
    }
  }
}

export default new AdminRelatorioController();
