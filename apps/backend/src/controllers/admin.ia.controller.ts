import { Request, Response } from 'express';
import iaService from '../services/ia.service';
import { logger } from '../config/logger';

export class AdminIaController {
  async sugestoes(_req: Request, res: Response) {
    try {
      const data = await iaService.gerarSugestoes();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao gerar sugestoes IA:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao gerar sugestões' } });
    }
  }
}

export default new AdminIaController();
