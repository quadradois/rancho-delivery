import { Request, Response } from 'express';
import { z } from 'zod';
import { EstadoConta } from '@prisma/client';
import * as assinaturaService from '../services/assinatura.service';
import { AssinaturaError } from '../services/assinatura.service';
import { logger } from '../config/logger';

const schemaDefinir = z.object({
  estado: z.nativeEnum(EstadoConta),
  planoId: z.string().trim().min(1).nullable(),
});

const HTTP_POR_CODIGO: Record<AssinaturaError['code'], number> = {
  RESTAURANTE_NAO_ENCONTRADO: 404,
  PLANO_NAO_ENCONTRADO: 422,
};

function tratarErro(error: unknown, res: Response, contexto: string) {
  if (error instanceof AssinaturaError) {
    return res.status(HTTP_POR_CODIGO[error.code]).json({ success: false, error: { message: error.message, code: error.code } });
  }
  logger.error(contexto, error);
  return res.status(500).json({ success: false, error: { message: 'Erro ao processar assinatura' } });
}

export class AssinaturaController {
  async obter(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await assinaturaService.obterAssinatura(req.params.id) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao obter assinatura (super-admin):');
    }
  }

  async definir(req: Request, res: Response) {
    const parsed = schemaDefinir.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      return res.status(400).json({ success: false, error: { message: msg } });
    }
    try {
      return res.json({ success: true, data: await assinaturaService.definirAssinatura(req.params.id, parsed.data) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao definir assinatura (super-admin):');
    }
  }
}

export default new AssinaturaController();
