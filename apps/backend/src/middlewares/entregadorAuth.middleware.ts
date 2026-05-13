import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function getSecret() {
  return process.env.JWT_SECRET || 'rancho-secret';
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export interface EntregadorJwtPayload {
  motoboyId: string;
  nome: string;
  telefone: string;
}

declare global {
  namespace Express {
    interface Request {
      entregador?: EntregadorJwtPayload;
    }
  }
}

export function gerarTokenEntregador(payload: EntregadorJwtPayload): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT', aud: 'entregador' }));
  const body64 = base64Url(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS }));
  const unsigned = `${header}.${body64}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function decodificarTokenEntregador(token?: string): EntregadorJwtPayload | null {
  if (!token) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const expected = sign(`${header}.${payload}`);
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    // Verifica audience
    const headerDecoded = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (headerDecoded.aud !== 'entregador') return null;
    if (typeof decoded.exp === 'number' && Date.now() > decoded.exp) return null;
    if (!decoded.motoboyId || !decoded.nome || !decoded.telefone) return null;
    return { motoboyId: decoded.motoboyId, nome: decoded.nome, telefone: decoded.telefone };
  } catch {
    return null;
  }
}

export function refreshTokenEntregador(req: Request, res: Response): Response {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const decoded = decodificarTokenEntregador(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: { message: 'Token inválido ou expirado', code: 'UNAUTHORIZED' } });
  }
  return res.json({
    success: true,
    data: { token: gerarTokenEntregador(decoded), expiresIn: TOKEN_TTL_MS / 1000 },
  });
}

export function autenticarEntregador(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { message: 'Token obrigatório', code: 'UNAUTHORIZED' } });
  }
  const decoded = decodificarTokenEntregador(header.slice(7));
  if (!decoded) {
    return res.status(401).json({ success: false, error: { message: 'Token inválido ou expirado', code: 'UNAUTHORIZED' } });
  }
  req.entregador = decoded;
  return next();
}
