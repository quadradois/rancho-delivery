import { Request, Response } from 'express';
import clienteService from '../services/cliente.service';
import { logger } from '../config/logger';

export class AdminClienteController {
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
        return res.status(502).json({
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
}

export default new AdminClienteController();
