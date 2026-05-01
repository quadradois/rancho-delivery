import { Request, Response } from 'express';
import { SeveridadeAlerta, StatusAlerta, TipoAlertaOperacional } from '@prisma/client';
import decisaoService from '../services/decisao.service';
import { logger } from '../config/logger';

function enumValue<T extends Record<string, string>>(source: T, value: unknown): T[keyof T] | undefined {
  if (typeof value !== 'string') return undefined;
  const upper = value.toUpperCase();
  return Object.values(source).includes(upper) ? (upper as T[keyof T]) : undefined;
}

export class AdminDecisaoController {
  async listar(req: Request, res: Response) {
    try {
      const data = await decisaoService.listarDecisoes({
        status: enumValue(StatusAlerta, req.query.status),
        severidade: enumValue(SeveridadeAlerta, req.query.severidade),
        tipo: enumValue(TipoAlertaOperacional, req.query.tipo),
        busca: typeof req.query.busca === 'string' ? req.query.busca : undefined,
        page: typeof req.query.page === 'string' ? Number(req.query.page) : undefined,
        limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
      });

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar decisoes admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao listar decisoes operacionais' },
      });
    }
  }

  async metricas(_req: Request, res: Response) {
    try {
      const data = await decisaoService.obterMetricas();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter metricas de decisoes:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter metricas de decisoes' },
      });
    }
  }

  async buscarPorId(req: Request, res: Response) {
    try {
      const data = await decisaoService.buscarPorId(req.params.id);
      if (!data) {
        return res.status(404).json({
          success: false,
          error: { message: 'Decisao nao encontrada', code: 'DECISAO_NAO_ENCONTRADA' },
        });
      }

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar decisao:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar decisao' },
      });
    }
  }

  async atualizarStatus(req: Request, res: Response) {
    try {
      const status = enumValue(StatusAlerta, req.body?.status);
      if (!status) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status de decisao invalido', code: 'STATUS_DECISAO_INVALIDO' },
        });
      }

      const data = await decisaoService.atualizarStatusAlerta(req.params.id, status);
      return res.json({ success: true, data });
    } catch (error: any) {
      return this.handleError(error, res);
    }
  }

  async resolver(req: Request, res: Response) {
    try {
      const status = enumValue(StatusAlerta, req.body?.status);
      if (status && status !== StatusAlerta.RESOLVIDO && status !== StatusAlerta.IGNORADO) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status de resolucao invalido', code: 'STATUS_DECISAO_INVALIDO' },
        });
      }

      const data = await decisaoService.resolverAlerta(req.params.id, {
        status,
        motivo: typeof req.body?.motivo === 'string' ? req.body.motivo : undefined,
        resolvidoPor: 'admin',
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      return this.handleError(error, res);
    }
  }

  async recalcular(req: Request, res: Response) {
    try {
      const escopo = String(req.body?.escopo || 'ABERTOS').toUpperCase();

      if (escopo === 'PEDIDO') {
        const pedidoId = typeof req.body?.pedidoId === 'string' ? req.body.pedidoId : '';
        if (!pedidoId) {
          return res.status(400).json({
            success: false,
            error: { message: 'pedidoId e obrigatorio para escopo PEDIDO', code: 'PEDIDO_ID_OBRIGATORIO' },
          });
        }

        const data = await decisaoService.avaliarPedido(pedidoId);
        return res.json({ success: true, data });
      }

      const data = await decisaoService.recalcularAbertos();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao recalcular decisoes:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao recalcular decisoes' },
      });
    }
  }

  private handleError(error: any, res: Response) {
    if (error?.message === 'DECISAO_NAO_ENCONTRADA') {
      return res.status(404).json({
        success: false,
        error: { message: 'Decisao nao encontrada', code: 'DECISAO_NAO_ENCONTRADA' },
      });
    }

    if (error?.message === 'DECISAO_JA_RESOLVIDA') {
      return res.status(409).json({
        success: false,
        error: { message: 'Decisao ja resolvida', code: 'DECISAO_JA_RESOLVIDA' },
      });
    }

    if (error?.message === 'MOTIVO_OBRIGATORIO') {
      return res.status(400).json({
        success: false,
        error: { message: 'Motivo obrigatorio', code: 'MOTIVO_OBRIGATORIO' },
      });
    }

    if (error?.message === 'TRANSICAO_DECISAO_INVALIDA') {
      return res.status(400).json({
        success: false,
        error: { message: 'Transicao de decisao invalida', code: 'TRANSICAO_DECISAO_INVALIDA' },
      });
    }

    logger.error('Erro em decisao admin:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Erro ao processar decisao' },
    });
  }
}

export default new AdminDecisaoController();
