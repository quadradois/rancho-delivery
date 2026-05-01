import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_AUTH_SECRET precisa estar configurado em producao');
  }

  logger.warn('ADMIN_AUTH_SECRET nao configurado; usando segredo local de desenvolvimento');
  return 'dev-admin-secret';
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function criarAdminToken(username: string) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: username,
    role: 'admin',
    exp: Date.now() + TOKEN_TTL_MS,
  }));
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

export function validarAdminToken(token?: string) {
  if (!token) return false;

  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return false;

  const expected = sign(`${header}.${payload}`);
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded?.role === 'admin' && typeof decoded?.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export function autenticarAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

  if (validarAdminToken(bearerToken || queryToken)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: { message: 'Acesso admin nao autorizado', code: 'UNAUTHORIZED' },
  });
}

export function loginAdmin(req: Request, res: Response) {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin');

  if (!expectedPassword) {
    return res.status(500).json({
      success: false,
      error: { message: 'ADMIN_PASSWORD nao configurado', code: 'ADMIN_AUTH_NOT_CONFIGURED' },
    });
  }

  if (username !== expectedUser || password !== expectedPassword) {
    return res.status(401).json({
      success: false,
      error: { message: 'Credenciais invalidas', code: 'INVALID_CREDENTIALS' },
    });
  }

  return res.json({
    success: true,
    data: {
      token: criarAdminToken(username),
      expiresIn: TOKEN_TTL_MS / 1000,
    },
  });
}
