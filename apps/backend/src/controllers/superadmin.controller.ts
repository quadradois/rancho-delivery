import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';

export class SuperAdminController {
  /**
   * Lista TODOS os restaurantes (tenants) da plataforma, com o estado da
   * assinatura e o plano atual. Roda sem escopo de tenant (super-admin).
   */
  async listarRestaurantes(_req: Request, res: Response) {
    try {
      const tenants = await prisma.tenant.findMany({
        orderBy: { criadoEm: 'asc' },
        include: { assinatura: { include: { plano: true } } },
      });

      const data = tenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        nome: t.nome,
        dominio: t.dominio,
        ativo: t.ativo,
        criadoEm: t.criadoEm,
        assinatura: t.assinatura
          ? {
              estado: t.assinatura.estado,
              plano: t.assinatura.plano?.nome ?? null,
              proximaCobranca: t.assinatura.proximaCobranca,
            }
          : null,
      }));

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar restaurantes (super-admin):', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar restaurantes' } });
    }
  }
}

export default new SuperAdminController();
