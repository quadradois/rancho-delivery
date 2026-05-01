import { Request, Response } from 'express';
import pedidoService from '../services/pedido.service';
import realtimeService from '../services/realtime.service';
import { logger } from '../config/logger';

export class LojaController {
  /**
   * GET /api/loja/status
   */
  async status(_req: Request, res: Response) {
    try {
      const data = await pedidoService.obterStatusLoja();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter status publico da loja:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter status da loja' },
      });
    }
  }

  /**
   * GET /api/loja/events
   */
  async stream(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    req.socket.setTimeout(0);
    res.flushHeaders?.();

    res.write(`event: ready\n`);
    res.write(`data: ${JSON.stringify({ ok: true, timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'loja:status') return;
      res.write(`event: loja:status\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const ping = setInterval(() => {
      res.write(`event: ping\n`);
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      unsubscribe();
      logger.info('Cliente SSE da loja desconectado');
    });
  }
}

export default new LojaController();
