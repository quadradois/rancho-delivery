import { Request, Response } from 'express';
import clienteService from '../services/cliente.service';
import evolutionService from '../services/evolution.service';
import prisma from '../config/database';
import { logger } from '../config/logger';

export class AdminClienteController {
  async criarManual(req: Request, res: Response) {
    try {
      const data = await clienteService.criarManual({
        telefone: String(req.body?.telefone || ''),
        nome: String(req.body?.nome || ''),
        endereco: String(req.body?.endereco || ''),
        bairro: String(req.body?.bairro || ''),
        origem: req.body?.origem,
      });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'VALIDACAO_ERRO') {
        return res.status(400).json({ success: false, error: { message: 'Telefone, nome, endereço e bairro são obrigatórios' } });
      }
      if (error.message === 'CLIENTE_JA_EXISTE') {
        return res.status(409).json({ success: false, error: { message: 'Já existe cliente com este telefone' } });
      }
      logger.error('Erro ao criar cliente manual:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao criar cliente' } });
    }
  }

  async listarGestao(req: Request, res: Response) {
    try {
      const segmento = typeof req.query.segmento === 'string' ? req.query.segmento : undefined;
      const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;
      const limite = typeof req.query.limite === 'string' ? Number(req.query.limite) : undefined;
      const data = await clienteService.listarClientesGestao({ segmento, busca, limite });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar clientes da gestao:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar clientes' } });
    }
  }

  async metricasGestao(_req: Request, res: Response) {
    try {
      const data = await clienteService.obterMetricasClientesGestao();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter metricas de clientes:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter métricas de clientes' } });
    }
  }

  async buscarClienteRapido(req: Request, res: Response) {
    try {
      const telefone = typeof req.query.telefone === 'string' ? req.query.telefone.trim() : '';
      if (!telefone) {
        return res.json({ success: true, data: null });
      }
      const data = await clienteService.buscarClienteParaPedidoManual(telefone);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar cliente rapido:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar cliente' },
      });
    }
  }

  async listarTodasConversas(req: Request, res: Response) {
    try {
      const limite = typeof req.query.limite === 'string' ? Number(req.query.limite) : 50;
      const data = await clienteService.listarTodasConversas(limite);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar conversas:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar conversas' } });
    }
  }

  async conversasNaoLidas(_req: Request, res: Response) {
    try {
      const data = await clienteService.listarConversasNaoLidas();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar conversas nao lidas:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao listar conversas' },
      });
    }
  }

  async listarMensagens(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const marcarComoLida = String(req.query.marcarComoLida || 'false') === 'true';
      const data = await clienteService.listarMensagens(telefone, marcarComoLida);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar mensagens do cliente:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao listar mensagens do cliente' },
      });
    }
  }

  async listarMensagensLead(req: Request, res: Response) {
    try {
      const { leadId } = req.params;
      const marcarComoLida = String(req.query.marcarComoLida || 'false') === 'true';
      const data = await clienteService.listarMensagensLead(leadId, marcarComoLida);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar mensagens do lead:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar mensagens do lead' } });
    }
  }

  async enviarMensagem(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const texto = String(req.body?.texto || '').trim();
      const pedidoId = req.body?.pedidoId ? String(req.body.pedidoId) : null;

      if (!texto) {
        return res.status(400).json({
          success: false,
          error: { message: 'Texto é obrigatório', code: 'VALIDACAO_ERRO' },
        });
      }

      const data = await clienteService.enviarMensagemHumana(telefone, texto, pedidoId);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'CLIENTE_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Cliente não encontrado', code: 'CLIENTE_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'FALHA_ENVIO_WHATSAPP') {
        return res.status(424).json({
          success: false,
          error: { message: 'Falha ao enviar mensagem no WhatsApp', code: 'WHATSAPP_ENVIO_FALHOU' },
        });
      }

      logger.error('Erro ao enviar mensagem para cliente:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao enviar mensagem para cliente' },
      });
    }
  }

  async statusWhatsApp(_req: Request, res: Response) {
    try {
      const data = await clienteService.obterStatusWhatsApp();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter status do WhatsApp:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter status do WhatsApp' },
      });
    }
  }

  async prepararConexaoWhatsApp(_req: Request, res: Response) {
    try {
      const data = await clienteService.prepararConexaoWhatsApp();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao preparar conexão do WhatsApp:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao preparar conexão do WhatsApp' },
      });
    }
  }

  async atualizarQrCodeWhatsApp(_req: Request, res: Response) {
    try {
      const data = await clienteService.atualizarQrCodeWhatsApp();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao atualizar QR Code do WhatsApp:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar QR Code do WhatsApp' },
      });
    }
  }

  async detalhesWhatsApp(_req: Request, res: Response) {
    try {
      const detalhes = await evolutionService.obterDetalhesInstancia();
      const configs = await evolutionService.obterConfigInstancia();
      return res.json({ success: true, data: { ...detalhes, configs } });
    } catch (error) {
      logger.error('Erro ao obter detalhes do WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter detalhes do WhatsApp' } });
    }
  }

  async desconectarWhatsApp(_req: Request, res: Response) {
    try {
      const ok = await evolutionService.desconectarInstancia();
      if (!ok) {
        return res.status(502).json({ success: false, error: { message: 'Falha ao desconectar instância — verifique conexão com Evolution API' } });
      }
      return res.json({ success: true, data: { desconectado: true } });
    } catch (error) {
      logger.error('Erro ao desconectar WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao desconectar WhatsApp' } });
    }
  }

  async apagarWhatsApp(_req: Request, res: Response) {
    try {
      const ok = await evolutionService.apagarInstancia();
      if (!ok) {
        return res.status(502).json({ success: false, error: { message: 'Falha ao apagar instância — verifique conexão com Evolution API' } });
      }
      return res.json({ success: true, data: { apagado: true } });
    } catch (error) {
      logger.error('Erro ao apagar WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao apagar WhatsApp' } });
    }
  }

  async atualizarConfigWhatsApp(req: Request, res: Response) {
    try {
      const configs = req.body || {};
      const ok = await evolutionService.atualizarConfigInstancia(configs);
      if (!ok) {
        return res.status(502).json({ success: false, error: { message: 'Falha ao atualizar configurações' } });
      }
      return res.json({ success: true, data: { atualizado: true, configs } });
    } catch (error) {
      logger.error('Erro ao atualizar configurações do WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar configurações' } });
    }
  }

  // ───────────────────────── Conexões WhatsApp (multi-instância) ─────────────────────────

  async listarConexoesWhatsApp(_req: Request, res: Response) {
    try {
      const conexoes = await (prisma as any).conexaoWhatsApp.findMany({
        orderBy: [{ principal: 'desc' }, { criadoEm: 'asc' }],
      });
      // enriquece com status ao vivo (em paralelo)
      const data = await Promise.all(
        conexoes.map(async (c: any) => {
          const det = await evolutionService.obterDetalhesInstancia(c.nome).catch(() => null);
          return {
            ...c,
            conectado: det?.conectado ?? c.conectado,
            telefone: det?.telefone ?? c.telefone,
            state: det?.state ?? 'desconhecido',
          };
        }),
      );
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar conexões WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar conexões' } });
    }
  }

  async criarConexaoWhatsApp(req: Request, res: Response) {
    try {
      const nome = String(req.body?.nome || '').trim();
      if (!nome) return res.status(400).json({ success: false, error: { message: 'nome é obrigatório' } });
      if (!/^[a-zA-Z0-9_-]{3,100}$/.test(nome)) {
        return res.status(400).json({ success: false, error: { message: 'nome inválido (use 3-100 caracteres: letras, números, _ e -)' } });
      }
      const existe = await (prisma as any).conexaoWhatsApp.findUnique({ where: { nome } });
      if (existe) return res.status(409).json({ success: false, error: { message: 'Já existe uma conexão com esse nome' } });

      const total = await (prisma as any).conexaoWhatsApp.count();
      const conexao = await (prisma as any).conexaoWhatsApp.create({
        data: { nome, principal: total === 0 }, // a primeira vira principal
      });

      // cria a instância no Evolution Go + webhook + QR
      const qr = await evolutionService.garantirInstanciaEObterQrCode(nome).catch(() => null);
      return res.status(201).json({ success: true, data: { conexao, ...(qr || {}) } });
    } catch (error) {
      logger.error('Erro ao criar conexão WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao criar conexão' } });
    }
  }

  async qrcodeConexaoWhatsApp(req: Request, res: Response) {
    try {
      const { nome } = req.params;
      const data = await evolutionService.garantirInstanciaEObterQrCode(nome);
      await (prisma as any).conexaoWhatsApp
        .update({ where: { nome }, data: { conectado: data.conectado } })
        .catch(() => null);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter QR da conexão WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter QR Code' } });
    }
  }

  async detalhesConexaoWhatsApp(req: Request, res: Response) {
    try {
      const { nome } = req.params;
      const det = await evolutionService.obterDetalhesInstancia(nome);
      const configs = await evolutionService.obterConfigInstancia(nome);
      await (prisma as any).conexaoWhatsApp
        .update({ where: { nome }, data: { conectado: det.conectado, telefone: det.telefone || undefined } })
        .catch(() => null);
      return res.json({ success: true, data: { ...det, configs } });
    } catch (error) {
      logger.error('Erro ao obter detalhes da conexão WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter detalhes' } });
    }
  }

  async desconectarConexaoWhatsApp(req: Request, res: Response) {
    try {
      const { nome } = req.params;
      const ok = await evolutionService.desconectarInstancia(nome);
      await (prisma as any).conexaoWhatsApp.update({ where: { nome }, data: { conectado: false } }).catch(() => null);
      if (!ok) return res.status(502).json({ success: false, error: { message: 'Falha ao desconectar' } });
      return res.json({ success: true, data: { desconectado: true } });
    } catch (error) {
      logger.error('Erro ao desconectar conexão WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao desconectar' } });
    }
  }

  async apagarConexaoWhatsApp(req: Request, res: Response) {
    try {
      const { nome } = req.params;
      const existe = await (prisma as any).conexaoWhatsApp.findUnique({ where: { nome } });
      if (!existe) return res.status(404).json({ success: false, error: { message: 'Conexão não encontrada' } });

      await evolutionService.apagarInstancia(nome).catch(() => null); // apaga no Evolution Go
      await (prisma as any).conexaoWhatsApp.delete({ where: { nome } });

      // se era a principal, promove a próxima conexão
      if (existe.principal) {
        const prox = await (prisma as any).conexaoWhatsApp.findFirst({ orderBy: { criadoEm: 'asc' } });
        if (prox) await (prisma as any).conexaoWhatsApp.update({ where: { id: prox.id }, data: { principal: true } });
      }
      return res.json({ success: true, data: { apagado: true } });
    } catch (error) {
      logger.error('Erro ao apagar conexão WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao apagar conexão' } });
    }
  }

  async definirPrincipalWhatsApp(req: Request, res: Response) {
    try {
      const { nome } = req.params;
      const existe = await (prisma as any).conexaoWhatsApp.findUnique({ where: { nome } });
      if (!existe) return res.status(404).json({ success: false, error: { message: 'Conexão não encontrada' } });

      await (prisma as any).$transaction([
        (prisma as any).conexaoWhatsApp.updateMany({ where: { principal: true }, data: { principal: false } }),
        (prisma as any).conexaoWhatsApp.update({ where: { nome }, data: { principal: true } }),
      ]);
      return res.json({ success: true, data: { nome, principal: true } });
    } catch (error) {
      logger.error('Erro ao definir conexão principal:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao definir principal' } });
    }
  }

  async configConexaoWhatsApp(req: Request, res: Response) {
    try {
      const { nome } = req.params;
      const configs = req.body || {};
      const ok = await evolutionService.atualizarConfigInstancia(configs, nome);
      if (!ok) return res.status(502).json({ success: false, error: { message: 'Falha ao atualizar configurações' } });
      return res.json({ success: true, data: { atualizado: true, configs } });
    } catch (error) {
      logger.error('Erro ao atualizar config da conexão WhatsApp:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar configurações' } });
    }
  }

  async resumoCliente(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const data = await clienteService.obterResumoCliente(telefone);
      if (!data) {
        return res.status(404).json({
          success: false,
          error: { message: 'Cliente não encontrado', code: 'CLIENTE_NAO_ENCONTRADO' },
        });
      }
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter resumo do cliente:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter resumo do cliente' },
      });
    }
  }

  async adicionarListaNegra(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const motivo = String(req.body?.motivo || '').trim();
      if (!motivo) {
        return res.status(400).json({
          success: false,
          error: { message: 'Motivo é obrigatório', code: 'VALIDACAO_ERRO' },
        });
      }
      const data = await clienteService.adicionarListaNegra(telefone, motivo);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'CLIENTE_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Cliente não encontrado', code: 'CLIENTE_NAO_ENCONTRADO' },
        });
      }
      logger.error('Erro ao adicionar cliente na lista negra:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao adicionar cliente na lista negra' },
      });
    }
  }

  async removerListaNegra(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      await clienteService.removerListaNegra(telefone);
      return res.json({ success: true, data: { telefone } });
    } catch (error) {
      logger.error('Erro ao remover cliente da lista negra:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao remover cliente da lista negra' },
      });
    }
  }

  async atualizarAtivo(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const ativo = Boolean(req.body?.ativo);
      const data = await clienteService.atualizarAtivo(telefone, ativo);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'CLIENTE_NAO_ENCONTRADO') {
        return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado' } });
      }
      logger.error('Erro ao atualizar status ativo cliente:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar status do cliente' } });
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      await clienteService.excluir(telefone);
      return res.json({ success: true, data: { telefone } });
    } catch (error: any) {
      if (error.message === 'CLIENTE_NAO_ENCONTRADO') {
        return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado' } });
      }
      if (error.message === 'CLIENTE_COM_PEDIDOS') {
        return res.status(409).json({ success: false, error: { message: 'Cliente possui pedidos e não pode ser excluído. Desative o cadastro.' } });
      }
      logger.error('Erro ao excluir cliente:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao excluir cliente' } });
    }
  }
  async atualizarNivelListaNegra(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const nivel = Number(req.body?.nivel);
      if (!nivel || nivel < 1 || nivel > 3) {
        return res.status(400).json({ success: false, error: { message: 'Nível deve ser 1, 2 ou 3' } });
      }
      const data = await clienteService.atualizarNivelListaNegra(telefone, nivel);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'CLIENTE_NAO_ENCONTRADO_LISTA_NEGRA') {
        return res.status(404).json({ success: false, error: { message: 'Cliente não está na lista negra' } });
      }
      logger.error('Erro ao atualizar nivel lista negra:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar nível' } });
    }
  }

  async listarOcorrencias(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const data = await clienteService.listarOcorrencias(telefone);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar ocorrencias:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar ocorrências' } });
    }
  }
}

export default new AdminClienteController();
