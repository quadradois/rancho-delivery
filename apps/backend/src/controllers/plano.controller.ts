import { Request, Response } from 'express';
import { z } from 'zod';
import { CicloCobranca } from '@prisma/client';
import * as planoService from '../services/plano.service';
import { PlanoError } from '../services/plano.service';
import { logger } from '../config/logger';

const chaveModulo = z.string().trim().min(1);
const ciclo = z.nativeEnum(CicloCobranca);
const diasTeste = z.number().int().min(0).max(365);
const beneficios = z.array(z.string().trim().min(1).max(200)).max(20);

const schemaCriar = z.object({
  nome: z.string().trim().min(1).max(100),
  descricao: z.string().trim().max(2000).nullish(),
  preco: z.number().min(0),
  ciclo: ciclo.optional(),
  diasTeste: diasTeste.optional(),
  beneficios: beneficios.optional(),
  publico: z.boolean().optional(),
  ativo: z.boolean().optional(),
  modulos: z.array(chaveModulo).optional(),
});

const schemaAtualizar = z.object({
  nome: z.string().trim().min(1).max(100).optional(),
  descricao: z.string().trim().max(2000).nullish(),
  preco: z.number().min(0).optional(),
  ciclo: ciclo.optional(),
  diasTeste: diasTeste.optional(),
  beneficios: beneficios.optional(),
  publico: z.boolean().optional(),
  ativo: z.boolean().optional(),
  modulos: z.array(chaveModulo).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Nenhum campo para atualizar' });

const HTTP_POR_CODIGO: Record<PlanoError['code'], number> = {
  NAO_ENCONTRADO: 404,
  MODULO_INVALIDO: 422,
};

function tratarErro(error: unknown, res: Response, contexto: string) {
  if (error instanceof PlanoError) {
    return res.status(HTTP_POR_CODIGO[error.code]).json({ success: false, error: { message: error.message, code: error.code } });
  }
  logger.error(contexto, error);
  return res.status(500).json({ success: false, error: { message: 'Erro ao processar plano' } });
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

export class PlanoController {
  async listarModulos(_req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await planoService.listarModulos() });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao listar módulos (super-admin):');
    }
  }

  async listarPlanos(_req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await planoService.listarPlanos() });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao listar planos (super-admin):');
    }
  }

  /** Público (site institucional): só planos visíveis (público + ativo). */
  async listarPublicos(_req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await planoService.listarPlanosPublicos() });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao listar planos públicos:');
    }
  }

  async obterPlano(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await planoService.obterPlano(req.params.id) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao obter plano (super-admin):');
    }
  }

  async criarPlano(req: Request, res: Response) {
    const dados = validar(schemaCriar, req.body, res);
    if (!dados) return;
    try {
      return res.status(201).json({ success: true, data: await planoService.criarPlano(dados) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao criar plano (super-admin):');
    }
  }

  async atualizarPlano(req: Request, res: Response) {
    const dados = validar(schemaAtualizar, req.body, res);
    if (!dados) return;
    try {
      return res.json({ success: true, data: await planoService.atualizarPlano(req.params.id, dados) });
    } catch (error) {
      return tratarErro(error, res, 'Erro ao atualizar plano (super-admin):');
    }
  }
}

export default new PlanoController();
