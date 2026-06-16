import { Request, Response } from 'express';
import { z } from 'zod';
import * as restauranteService from '../services/superadmin.service';
import { RestauranteError } from '../services/superadmin.service';
import { logger } from '../config/logger';

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug deve ser minúsculo, alfanumérico e com hífens (ex.: meu-restaurante)');
const dominio = z.string().trim().min(1).max(255);

const schemaCriar = z.object({
  slug,
  nome: z.string().trim().min(1).max(150),
  dominio: dominio.nullish(),
});

const schemaAtualizar = z.object({
  slug: slug.optional(),
  nome: z.string().trim().min(1).max(150).optional(),
  dominio: dominio.nullish(),
  ativo: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nenhum campo para atualizar' });

const HTTP_POR_CODIGO: Record<RestauranteError['code'], number> = {
  NAO_ENCONTRADO: 404,
  SLUG_EM_USO: 409,
  DOMINIO_EM_USO: 409,
};

function tratarErro(error: unknown, res: Response, contexto: string) {
  if (error instanceof RestauranteError) {
    return res.status(HTTP_POR_CODIGO[error.code]).json({ success: false, error: { message: error.message, code: error.code } });
  }
  logger.error(contexto, error);
  return res.status(500).json({ success: false, error: { message: 'Erro ao processar restaurante' } });
}

function validar<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => e.message).join('; ');
    res.status(400).json({ success: false, error: { message: msg } });
    return null;
  }
  return parsed.data;
}

export class SuperAdminController {
  /** Lista TODOS os restaurantes com estado da assinatura e plano. */
  async listarRestaurantes(_req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await restauranteService.listarRestaurantes() });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao listar restaurantes (super-admin):');
    }
  }

  async obterRestaurante(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await restauranteService.obterRestaurante(req.params.id) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao obter restaurante (super-admin):');
    }
  }

  async criarRestaurante(req: Request, res: Response) {
    const dados = validar(schemaCriar, req.body, res);
    if (!dados) return;
    try {
      return res.status(201).json({ success: true, data: await restauranteService.criarRestaurante(dados) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao criar restaurante (super-admin):');
    }
  }

  async atualizarRestaurante(req: Request, res: Response) {
    const dados = validar(schemaAtualizar, req.body, res);
    if (!dados) return;
    try {
      return res.json({ success: true, data: await restauranteService.atualizarRestaurante(req.params.id, dados) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao atualizar restaurante (super-admin):');
    }
  }
}

export default new SuperAdminController();
