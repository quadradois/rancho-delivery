import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { logger } from '../config/logger';

// 5 tentativas de login por IP a cada 15 minutos
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_LOGIN',
  },
});

// Rotas admin fazem polling frequente (cockpit + métricas + fila + status).
// Limite ajustado para evitar 429 em uso normal sem remover a proteção.
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
    return ipKeyGenerator(ip);
  },
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
  handler: (req, res) => {
    logger.warn('Rate limit admin excedido', {
      ip: req.ip,
      rota: req.originalUrl,
      metodo: req.method,
    });
    return res.status(429).json({
      error: 'Muitas requisições. Tente novamente em instantes.',
      code: 'RATE_LIMIT_ADMIN',
    });
  },
  message: {
    error: 'Muitas requisições. Tente novamente em instantes.',
    code: 'RATE_LIMIT_ADMIN',
  },
});

// 5 pedidos por IP a cada minuto (proteção contra flood de pedidos)
export const pedidoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawTelefone = typeof req.body?.cliente?.telefone === 'string'
      ? req.body.cliente.telefone
      : 'anon';
    const telefone = rawTelefone.replace(/\D/g, '').slice(-11) || 'anon';
    const ip = req.ip || req.socket?.remoteAddress || '0.0.0.0';
    return `${ipKeyGenerator(ip)}:${telefone}`;
  },
  // Desabilita em ambiente de teste para não interferir em suites de integração
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    const rawTelefone = typeof req.body?.cliente?.telefone === 'string'
      ? req.body.cliente.telefone
      : '';
    const telefone = rawTelefone.replace(/\D/g, '');
    const telefoneMascarado = telefone.length >= 4
      ? `${'*'.repeat(Math.max(0, telefone.length - 4))}${telefone.slice(-4)}`
      : 'anon';

    logger.warn('Rate limit de criação de pedido excedido', {
      ip: req.ip,
      telefone: telefoneMascarado,
      rota: req.originalUrl,
      metodo: req.method,
    });

    return res.status(429).json({
      success: false,
      error: {
        message: 'Muitas tentativas. Aguarde 1 minuto antes de criar outro pedido.',
        code: 'RATE_LIMIT_PEDIDO',
      },
    });
  },
  message: {
    success: false,
    error: {
      message: 'Muitas tentativas. Aguarde 1 minuto antes de criar outro pedido.',
      code: 'RATE_LIMIT_PEDIDO',
    },
  },
});

// 60 requisições por IP a cada minuto para webhooks (proteção contra flood)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições ao webhook.',
    code: 'RATE_LIMIT_WEBHOOK',
  },
});
