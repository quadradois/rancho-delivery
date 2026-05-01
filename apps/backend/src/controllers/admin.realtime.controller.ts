import { Request, Response } from 'express';
import realtimeService from '../services/realtime.service';
import { logger } from '../config/logger';

export class AdminRealtimeController {
  /**
   * GET /api/admin/events
   */
  async stream(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    res.write(`event: ready\n`);
    res.write(`data: ${JSON.stringify({ ok: true, timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = realtimeService.subscribe((event) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    const ping = setInterval(() => {
      res.write(`event: ping\n`);
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      unsubscribe();
      logger.info('Cliente SSE desconectado');
    });
  }
}

export default new AdminRealtimeController();
