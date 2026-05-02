import { NextFunction, Request, Response } from 'express';

interface CachedResponse {
  status: number;
  body: unknown;
  expiresAt: number;
}

// TTL de 10 minutos — suficiente para cobrir retries de rede sem crescer indefinidamente
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CachedResponse>();

// Limpeza periódica para evitar leak de memória em processos de longa duração
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Middleware de idempotência para POST /api/pedidos.
 * Se o cliente enviar o mesmo Idempotency-Key em < 10 min, retorna a resposta cacheada
 * sem re-executar a lógica de criação de pedido.
 *
 * Header: Idempotency-Key: <uuid ou string opaca, max 128 chars>
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawKey = req.headers['idempotency-key'];
  if (typeof rawKey !== 'string' || !rawKey.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Header Idempotency-Key é obrigatório',
        code: 'IDEMPOTENCY_KEY_REQUIRED',
      },
    });
  }

  const key = rawKey.trim().slice(0, 128);
  const entry = cache.get(key);

  if (entry) {
    if (entry.expiresAt > Date.now()) {
      res.set('Idempotency-Replayed', 'true');
      return res.status(entry.status).json(entry.body);
    }
    cache.delete(key);
  }

  // Intercepta o método json do res para capturar a resposta antes de enviá-la
  const originalJson = res.json.bind(res);
  (res as any).json = function (body: unknown) {
    if (res.statusCode < 500) {
      cache.set(key, { status: res.statusCode, body, expiresAt: Date.now() + TTL_MS });
    }
    return originalJson(body);
  };

  return next();
}
