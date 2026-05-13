import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CampanhaStatus, LeadStatus } from '@prisma/client';
import mineracaoService from '../services/mineracao.service';
import { enfileirar, obterJob } from '../services/mineracao.queue';
import { logger } from '../config/logger';
import { executarCargaGeo360, executarEnriquecimentoIncremental } from '../jobs/cargaGeo360.job';
import prisma from '../config/database';
import geo360Service from '../services/geo360.service';
import campanhaIAService from '../services/campanhaIA.service';

export class AdminMineracaoController {
  async executar(req: Request, res: Response) {
    const modo = String(req.body?.modo || 'bairro') as any;
    const termo = String(req.body?.termo || '').trim();
    if (!termo) return res.status(400).json({ success: false, error: { message: 'termo é obrigatório' } });

    const runId = randomUUID();
    const criadoPor = req.adminUser?.username;
    const filtros = req.body?.filtros || {};

    enfileirar(runId, () =>
      mineracaoService.executarMineracao({ modo, termo, filtros, criadoPor }, runId),
    );

    return res.status(202).json({ success: true, data: { runId } });
  }

  async obterStatusJob(req: Request, res: Response) {
    const { runId } = req.params;
    const job = obterJob(runId);
    if (!job) {
      return res.status(404).json({ success: false, error: { message: 'Job não encontrado', code: 'JOB_NAO_ENCONTRADO' } });
    }
    return res.json({ success: true, data: job });
  }

  async listarExecucoes(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit || 30);
      const data = await mineracaoService.listarExecucoes(limit);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar execuções de mineração:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar execuções' } });
    }
  }

  async sincronizarPrefeitura(req: Request, res: Response) {
    try {
      const limite = req.body?.limite ? Number(req.body.limite) : undefined;
      const lote = req.body?.lote ? Number(req.body.lote) : undefined;
      const data = await mineracaoService.sincronizarImoveisPrefeitura({ limite, lote });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao sincronizar imóveis da prefeitura:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao sincronizar imóveis da prefeitura' } });
    }
  }

  async enriquecerGeo360(req: Request, res: Response) {
    try {
      const cidades: string[] = req.body?.cidades ?? ['aparecidadegoiania', 'goiania'];
      const runId = randomUUID();

      enfileirar(runId, async () => {
        for (const cidade of cidades) {
          logger.info(`Geo360 enriquecimento incremental iniciado: ${cidade}`);
          const total = await executarEnriquecimentoIncremental(cidade);
          logger.info(`Geo360 enriquecimento incremental concluído: ${cidade} — ${total} registros`);
        }
      });

      return res.status(202).json({ success: true, data: { runId, cidades } });
    } catch (error) {
      logger.error('Erro ao iniciar enriquecimento Geo360:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao iniciar enriquecimento' } });
    }
  }

  async sincronizarGeo360(req: Request, res: Response) {
    try {
      const cidades: string[] | undefined = req.body?.cidades;
      const runId = randomUUID();

      // Dispara em background e retorna imediatamente
      enfileirar(runId, () =>
        executarCargaGeo360(cidades, (cidade, fase, processados, total) => {
          logger.info(`Geo360 [${runId}] ${cidade} [${fase}]: ${processados}${total > 0 ? `/${total}` : ''}`);
        }),
      );

      return res.status(202).json({
        success: true,
        data: {
          runId,
          mensagem: `Carga Geo360 iniciada para: ${cidades?.join(', ') ?? 'todas as cidades'}`,
          cidades: cidades ?? geo360Service.cidadesDisponiveis(),
        },
      });
    } catch (error) {
      logger.error('Erro ao iniciar sincronização Geo360:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao iniciar sincronização Geo360' } });
    }
  }

  async statusGeo360(_req: Request, res: Response) {
    try {
      const cidades = geo360Service.cidadesDisponiveis();
      const stats = await Promise.all(
        cidades.map(async (cidade) => {
          const total = await (prisma as any).imovelGeo360.count({ where: { cidade } });
          const comCpf = await (prisma as any).imovelGeo360.count({
            where: { cidade, cpfCnpj: { not: null } },
          });
          const ultima = await (prisma as any).imovelGeo360.findFirst({
            where: { cidade },
            orderBy: { sincronizadoEm: 'desc' },
            select: { sincronizadoEm: true },
          });
          return {
            cidade,
            total,
            comCpf,
            semCpf: total - comCpf,
            ultimaSincronizacao: ultima?.sincronizadoEm ?? null,
          };
        }),
      );
      return res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Erro ao obter status Geo360:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter status Geo360' } });
    }
  }

  async listarLeadsEngajados(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit || 50);
      const data = await mineracaoService.listarLeadsEngajados(limit);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar leads engajados:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar leads engajados' } });
    }
  }

  async obterConversaLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.obterConversaLead(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'LEAD_NAO_ENCONTRADO') {
        return res.status(404).json({ success: false, error: { message: 'Lead não encontrado' } });
      }
      logger.error('Erro ao obter conversa do lead:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter conversa' } });
    }
  }

  async listarLeads(req: Request, res: Response) {
    try {
      const status = req.query.status ? String(req.query.status).toUpperCase() as LeadStatus : undefined;
      const origem = req.query.origem ? String(req.query.origem) : undefined;
      const q = req.query.q ? String(req.query.q) : undefined;
      const data = await mineracaoService.listarLeads({ status, origem, q });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar leads de mineração:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar leads' } });
    }
  }

  async buscarLocais(req: Request, res: Response) {
    try {
      const modo = String(req.query.modo || 'condominio') as any;
      const termo = String(req.query.q || req.query.termo || '').trim();
      if (!termo) return res.status(400).json({ success: false, error: { message: 'termo é obrigatório' } });
      const data = await mineracaoService.buscarLocais({ modo, termo });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar locais de mineração:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao buscar locais' } });
    }
  }

  async listarIptus(req: Request, res: Response) {
    try {
      const modo = String(req.query.modo || 'condominio') as any;
      const nome = String(req.query.nome || '').trim();
      const bairro = req.query.bairro ? String(req.query.bairro) : undefined;
      const logradouro = req.query.logradouro ? String(req.query.logradouro) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      if (!nome) return res.status(400).json({ success: false, error: { message: 'nome é obrigatório' } });
      const data = await mineracaoService.listarIptusLocal({ modo, nome, bairro, logradouro, limit });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar IPTUs de mineração:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar IPTUs' } });
    }
  }

  async gerarVariacoesMensagem(req: Request, res: Response) {
    try {
      const intencao = String(req.body?.intencao || '').trim();
      if (!intencao) return res.status(400).json({ success: false, error: { message: 'intencao é obrigatória' } });
      const bairro = req.body?.bairro ? String(req.body.bairro).trim() : undefined;
      const observacoes = req.body?.observacoes ? String(req.body.observacoes).trim() : undefined;
      const variacoes = await campanhaIAService.gerarVariacoesMensagem({ intencao, bairro, observacoes });
      return res.json({ success: true, data: { variacoes } });
    } catch (error: any) {
      if (error?.message === 'ANTHROPIC_API_KEY_NAO_CONFIGURADA') {
        return res.status(500).json({ success: false, error: { message: 'IA não configurada', code: 'IA_NAO_CONFIGURADA' } });
      }
      if (['IA_RESPOSTA_INVALIDA', 'IA_RESPOSTA_SEM_VARIACOES'].includes(error?.message)) {
        return res.status(502).json({ success: false, error: { message: 'IA não retornou variações válidas — tente novamente', code: error.message } });
      }
      logger.error('Erro ao gerar variações de mensagem:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao gerar variações' } });
    }
  }

  async criarCampanha(req: Request, res: Response) {
    try {
      const nome = String(req.body?.nome || '').trim();
      const mensagem = String(req.body?.mensagem || '').trim();
      if (!nome || !mensagem) return res.status(400).json({ success: false, error: { message: 'nome e mensagem são obrigatórios' } });
      const data = await mineracaoService.criarCampanha({ nome, mensagem, filtro: req.body?.filtro || {}, criadoPor: req.adminUser?.username });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_SEM_LEADS') {
        return res.status(424).json({ success: false, error: { message: 'CAMPANHA_SEM_LEADS', code: 'CAMPANHA_SEM_LEADS' } });
      }
      logger.error('Erro ao criar campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao criar campanha' } });
    }
  }

  async listarCampanhas(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit || 50);
      const data = await mineracaoService.listarCampanhas(limit);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar campanhas:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar campanhas' } });
    }
  }

  async obterMetricasCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.obterMetricasCampanha(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      logger.error('Erro ao obter métricas de campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter métricas' } });
    }
  }

  async obterCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.obterCampanha(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      logger.error('Erro ao obter campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter campanha' } });
    }
  }

  async agendarCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agendadaParaISO = String(req.body?.agendadaPara || '');
      if (!agendadaParaISO) return res.status(400).json({ success: false, error: { message: 'agendadaPara é obrigatório' } });
      const data = new Date(agendadaParaISO);
      if (Number.isNaN(data.getTime())) {
        return res.status(400).json({ success: false, error: { message: 'Data inválida' } });
      }
      const result = await mineracaoService.agendarCampanha(id, data);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (['CAMPANHA_EM_ENVIO', 'CAMPANHA_CONCLUIDA', 'AGENDAMENTO_PASSADO'].includes(error?.message)) {
        return res.status(409).json({ success: false, error: { message: error.message, code: error.message } });
      }
      logger.error('Erro ao agendar campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao agendar campanha' } });
    }
  }

  async cancelarAgendamentoCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.cancelarAgendamento(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (error?.message === 'CAMPANHA_NAO_AGENDADA') {
        return res.status(409).json({ success: false, error: { message: 'CAMPANHA_NAO_AGENDADA', code: 'CAMPANHA_NAO_AGENDADA' } });
      }
      logger.error('Erro ao cancelar agendamento:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao cancelar agendamento' } });
    }
  }

  async atualizarMensagemCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const mensagem = String(req.body?.mensagem || '').trim();
      const data = await mineracaoService.atualizarMensagemCampanha(id, mensagem);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (['CAMPANHA_EM_ENVIO', 'CAMPANHA_CONCLUIDA', 'MENSAGEM_VAZIA'].includes(error?.message)) {
        return res.status(409).json({ success: false, error: { message: error.message, code: error.message } });
      }
      logger.error('Erro ao atualizar mensagem da campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar mensagem' } });
    }
  }

  async atualizarStatusCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const status = String(req.body?.status || '').toUpperCase() as CampanhaStatus;
      const data = await mineracaoService.atualizarStatusCampanha(id, status);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (['CAMPANHA_EM_ENVIO', 'STATUS_CAMPANHA_INVALIDO'].includes(error?.message)) {
        return res.status(409).json({ success: false, error: { message: error.message, code: error.message } });
      }
      logger.error('Erro ao atualizar status da campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar status da campanha' } });
    }
  }

  async excluirCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.excluirCampanha(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (error?.message === 'CAMPANHA_EM_ENVIO') {
        return res.status(409).json({ success: false, error: { message: 'CAMPANHA_EM_ENVIO', code: 'CAMPANHA_EM_ENVIO' } });
      }
      logger.error('Erro ao excluir campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao excluir campanha' } });
    }
  }

  async sincronizarCoordenadas(_req: Request, res: Response) {
    const runId = randomUUID();
    enfileirar(runId, () => mineracaoService.sincronizarCoordenadas(runId));
    return res.status(202).json({ success: true, data: { runId } });
  }

  async coberturaMapa(_req: Request, res: Response) {
    try {
      const data = await mineracaoService.coberturaMapa();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter cobertura do mapa:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter cobertura do mapa' } });
    }
  }

  async analytics(req: Request, res: Response) {
    try {
      const periodo = (['30d', '90d', 'all'].includes(String(req.query.periodo)) ? String(req.query.periodo) : '30d') as '30d' | '90d' | 'all';
      const data = await mineracaoService.analytics(periodo);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter analytics:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter analytics' } });
    }
  }

  async removerDestinatarioCampanha(req: Request, res: Response) {
    try {
      const { id, destinatarioId } = req.params;
      const data = await mineracaoService.removerDestinatarioCampanha(id, destinatarioId);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA' || error?.message === 'DESTINATARIO_NAO_ENCONTRADO') {
        return res.status(404).json({ success: false, error: { message: error.message } });
      }
      if (['CAMPANHA_EM_ENVIO', 'CAMPANHA_CONCLUIDA', 'DESTINATARIO_JA_ENVIADO'].includes(error?.message)) {
        return res.status(409).json({ success: false, error: { message: error.message, code: error.message } });
      }
      logger.error('Erro ao remover destinatário:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao remover destinatário' } });
    }
  }

  async adicionarLeadManualCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const telefone = String(req.body?.telefone || '').trim();
      const nome = req.body?.nome ? String(req.body.nome).trim() : undefined;
      const bairro = req.body?.bairro ? String(req.body.bairro).trim() : undefined;
      if (!telefone) return res.status(400).json({ success: false, error: { message: 'telefone é obrigatório' } });
      const data = await mineracaoService.adicionarLeadManualCampanha(id, { telefone, nome, bairro });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (['CAMPANHA_EM_ENVIO', 'CAMPANHA_CONCLUIDA', 'TELEFONE_INVALIDO'].includes(error?.message)) {
        return res.status(409).json({ success: false, error: { message: error.message, code: error.message } });
      }
      logger.error('Erro ao adicionar lead manual:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao adicionar lead' } });
    }
  }

  async reenviarFalhasCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.reenviarFalhas(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (error?.message === 'CAMPANHA_EM_ENVIO') {
        return res.status(409).json({ success: false, error: { message: 'CAMPANHA_EM_ENVIO', code: 'CAMPANHA_EM_ENVIO' } });
      }
      logger.error('Erro ao reenviar falhas:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao reenviar falhas' } });
    }
  }

  async dispararCampanha(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await mineracaoService.dispararCampanha(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error?.message === 'CAMPANHA_NAO_ENCONTRADA') {
        return res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
      }
      if (['CAMPANHA_DESATIVADA', 'CAMPANHA_SEM_DESTINATARIOS'].includes(error?.message)) {
        return res.status(409).json({ success: false, error: { message: error.message, code: error.message } });
      }
      logger.error('Erro ao disparar campanha:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao disparar campanha' } });
    }
  }
}

export default new AdminMineracaoController();
