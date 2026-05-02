import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminRole = 'admin' | 'operador' | 'viewer';

export type Permissao =
  | 'pedidos:ler'
  | 'pedidos:criar_manual'
  | 'pedidos:status'
  | 'pedidos:motoboy'
  | 'pedidos:endereco'
  | 'pedidos:cancelar'
  | 'pedidos:estorno'
  | 'loja:gerenciar'
  | 'metricas:ler'
  | 'relatorios:ler'
  | 'clientes:gerenciar';

const PERMISSOES_POR_ROLE: Record<AdminRole, Permissao[]> = {
  admin: [
    'pedidos:ler', 'pedidos:criar_manual', 'pedidos:status',
    'pedidos:motoboy', 'pedidos:endereco', 'pedidos:cancelar',
    'pedidos:estorno', 'loja:gerenciar', 'metricas:ler',
    'relatorios:ler', 'clientes:gerenciar',
  ],
  operador: [
    'pedidos:ler', 'pedidos:status', 'pedidos:motoboy',
    'pedidos:endereco', 'metricas:ler', 'clientes:gerenciar',
  ],
  viewer: ['pedidos:ler', 'metricas:ler'],
};

// Extensão do tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      adminUser?: { username: string; role: AdminRole };
    }
  }
}

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

export function criarAdminToken(username: string, role: AdminRole = 'admin') {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: username,
    role,
    exp: Date.now() + TOKEN_TTL_MS,
  }));
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

function decodificarToken(token?: string): { username: string; role: AdminRole } | null {
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
    const rolesValidas: AdminRole[] = ['admin', 'operador', 'viewer'];
    const role: AdminRole = rolesValidas.includes(decoded?.role) ? decoded.role : 'admin';

    if (typeof decoded?.exp !== 'number' || decoded.exp <= Date.now()) return null;

    return { username: decoded.sub ?? 'admin', role };
  } catch {
    return null;
  }
}

export function autenticarAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  const user = decodificarToken(bearerToken);
  if (user) {
    req.adminUser = user;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: { message: 'Acesso admin nao autorizado', code: 'UNAUTHORIZED' },
  });
}

export function autorizarAdmin(permissao: Permissao) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.adminUser?.role ?? 'viewer';
    if (PERMISSOES_POR_ROLE[role].includes(permissao)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: {
        message: `Permissao insuficiente: ${permissao} requer role acima de '${role}'`,
        code: 'FORBIDDEN',
      },
    });
  };
}

/**
 * Middleware opcional: tenta autenticar como admin mas não bloqueia se falhar.
 * Útil em rotas acessíveis tanto por admin (JWT) quanto por cliente (token de pedido).
 */
export function tryAutenticarAdmin(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  const user = decodificarToken(bearerToken);
  if (user) req.adminUser = user;
  return next();
}

export function loginAdmin(req: Request, res: Response) {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin');
  const role = (process.env.ADMIN_ROLE ?? 'admin') as AdminRole;

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
      token: criarAdminToken(username, role),
      role,
      expiresIn: TOKEN_TTL_MS / 1000,
    },
  });
}
