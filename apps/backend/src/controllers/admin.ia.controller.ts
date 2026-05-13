import { Request, Response } from 'express';
import iaService from '../services/ia.service';
import iaConhecimentoService from '../services/iaConhecimento.service';
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

  async obterConhecimento(_req: Request, res: Response) {
    try {
      const data = await iaConhecimentoService.obterConhecimento();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter base de conhecimento IA:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter base de conhecimento' } });
    }
  }

  async salvarConhecimento(req: Request, res: Response) {
    try {
      const dados = req.body || {};
      const data = await iaConhecimentoService.salvarConhecimento(dados);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao salvar base de conhecimento IA:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao salvar base de conhecimento' } });
    }
  }

  async previewConhecimento(req: Request, res: Response) {
    try {
      const intencao = String(req.body?.intencao || '').trim();
      if (!intencao) {
        return res.status(400).json({ success: false, error: { message: 'Intenção é obrigatória' } });
      }
      const mensagem = await iaConhecimentoService.gerarPreview(intencao);
      return res.json({ success: true, data: { mensagem } });
    } catch (error) {
      logger.error('Erro ao gerar preview IA:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao gerar preview' } });
    }
  }
}

export default new AdminIaController();
