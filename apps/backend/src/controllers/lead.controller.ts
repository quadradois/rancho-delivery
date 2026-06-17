import { Request, Response } from 'express';
import { z } from 'zod';
import * as leadService from '../services/lead.service';
import { logger } from '../config/logger';

const schemaCriar = z.object({
  nome: z.string().trim().min(1).max(150),
  restaurante: z.string().trim().min(1).max(150),
  contato: z.string().trim().min(3).max(150),
  email: z.string().trim().email().max(150).optional().or(z.literal('')),
  mensagem: z.string().trim().max(2000).optional(),
});

export class LeadController {
  /** Público: captura o lead vindo do formulário do site institucional. */
  async criar(req: Request, res: Response) {
    const parsed = schemaCriar.safeParse(req.body ?? {});
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      return res.status(400).json({ success: false, error: { message: msg } });
    }
    try {
      const { email, ...resto } = parsed.data;
      const lead = await leadService.criarLead({ ...resto, email: email || null });
      return res.status(201).json({ success: true, data: { id: lead.id } });
    } catch (error) {
      logger.error('Erro ao registrar lead:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao registrar contato' } });
    }
  }

  /** Super-admin: lista os leads recebidos. */
  async listar(_req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await leadService.listarLeads() });
    } catch (error) {
      logger.error('Erro ao listar leads (super-admin):', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar leads' } });
    }
  }
}

export default new LeadController();
