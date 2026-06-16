import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import prisma from '../config/database';
import { runWithTenant, runSemEscopo, TENANT_PADRAO } from '../config/tenantContext';
import { hashSenha, verificarSenha } from '../utils/senha';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminRole = 'admin' | 'operador' | 'viewer';
/** Papel carregado no token. `superadmin` = dono do FoodFlow (control plane, cross-tenant). */
export type PapelToken = AdminRole | 'superadmin';

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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUser?: { username: string; role: PapelToken; tenantId?: string };
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

export function criarAdminToken(username: string, role: PapelToken = 'admin', tenantId?: string) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: username,
    role,
    tenantId,
    exp: Date.now() + TOKEN_TTL_MS,
  }));
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

function decodificarToken(token?: string): { username: string; role: PapelToken; tenantId?: string } | null {
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
    const rolesValidas: PapelToken[] = ['admin', 'operador', 'viewer', 'superadmin'];
    const role: PapelToken = rolesValidas.includes(decoded?.role) ? decoded.role : 'admin';

    if (typeof decoded?.exp !== 'number' || decoded.exp <= Date.now()) return null;

    return {
      username: decoded.sub ?? 'admin',
      role,
      tenantId: typeof decoded?.tenantId === 'string' ? decoded.tenantId : undefined,
    };
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
    // o tenant do usuário logado prevalece sobre o resolvido por host
    return runWithTenant(user.tenantId ?? TENANT_PADRAO, () => next());
  }

  return res.status(401).json({
    success: false,
    error: { message: 'Acesso admin nao autorizado', code: 'UNAUTHORIZED' },
  });
}

/**
 * Autentica o **super-admin do FoodFlow** (control plane). Exige role `superadmin`
 * e roda o restante da requisição SEM escopo de tenant (`runSemEscopo`), para
 * enxergar/gerir todos os restaurantes. Use SÓ nas rotas `/superadmin/*`.
 */
export function autenticarSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  const user = decodificarToken(bearerToken);
  if (user && user.role === 'superadmin') {
    req.adminUser = user;
    return runSemEscopo(() => next());
  }

  return res.status(403).json({
    success: false,
    error: { message: 'Acesso restrito ao super-admin do FoodFlow', code: 'FORBIDDEN_SUPERADMIN' },
  });
}

export function autorizarAdmin(permissao: Permissao) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.adminUser?.role ?? 'viewer';
    if (role === 'superadmin') return next(); // super-admin do FoodFlow tem acesso total
    if (PERMISSOES_POR_ROLE[role]?.includes(permissao)) {
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
  if (user) {
    req.adminUser = user;
    return runWithTenant(user.tenantId ?? TENANT_PADRAO, () => next());
  }
  return next();
}

export function refreshAdmin(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  const user = decodificarToken(bearerToken);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Token inválido ou expirado', code: 'UNAUTHORIZED' },
    });
  }

  return res.json({
    success: true,
    data: {
      token: criarAdminToken(user.username, user.role, user.tenantId),
      role: user.role,
      expiresIn: TOKEN_TTL_MS / 1000,
    },
  });
}

// Hash descartável p/ equalizar o tempo quando o e-mail não existe — mitiga
// enumeração de usuário por timing. Calculado sob demanda, uma única vez.
let dummyHashCache: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!dummyHashCache) dummyHashCache = await hashSenha('timing-equalizer-nao-e-senha-real');
  return dummyHashCache;
}

export async function loginAdmin(req: Request, res: Response) {
  const { email, username, password } = (req.body ?? {}) as Record<string, unknown>;
  // rejeita tipos não-string (evita coerção silenciosa de array/objeto)
  for (const v of [email, username, password]) {
    if (v != null && typeof v !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Credenciais invalidas', code: 'INVALID_CREDENTIALS' } });
    }
  }
  const emailNorm = String(email || username || '').trim().toLowerCase();
  const usernameBruto = String(username || email || '').trim();
  const senha = String(password || '');

  try {
    // 1. Usuário no banco — busca cross-tenant por email (raw escapa do guard).
    //    INNER JOIN com tenants exige tenant existente e ATIVO (e barra tenant_id NULL).
    //    Pressupõe email armazenado em lowercase (normalizado na criação).
    if (emailNorm) {
      const rows = await prisma.$queryRaw<
        Array<{ tenant_id: string; senha_hash: string; role: string }>
      >`SELECT u.tenant_id, u.senha_hash, u.role
        FROM usuarios u JOIN tenants t ON t.id = u.tenant_id
        WHERE u.email = ${emailNorm} AND u.ativo = true AND t.ativo = true
        LIMIT 1`;
      const u = rows[0];
      if (u) {
        if (await verificarSenha(senha, u.senha_hash)) {
          const rolesValidas: AdminRole[] = ['admin', 'operador', 'viewer'];
          const role = rolesValidas.includes(u.role as AdminRole) ? (u.role as AdminRole) : 'viewer';
          return res.json({
            success: true,
            data: { token: criarAdminToken(emailNorm, role, u.tenant_id), role, expiresIn: TOKEN_TTL_MS / 1000 },
          });
        }
      } else {
        await verificarSenha(senha, await getDummyHash());
      }
    }

    // 1b. Super-admin do FoodFlow (control plane) — credenciais próprias no .env, sem tenant.
    const superUser = process.env.SUPERADMIN_USERNAME;
    const superPass = process.env.SUPERADMIN_PASSWORD;
    if (superUser && superPass && usernameBruto === superUser && senha === superPass) {
      return res.json({
        success: true,
        data: { token: criarAdminToken(superUser, 'superadmin'), role: 'superadmin', expiresIn: TOKEN_TTL_MS / 1000 },
      });
    }

    // 2. Fallback: credenciais do .env (tenant padrão — Rancho). username comparado SEM lowercase.
    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin');
    const role = (process.env.ADMIN_ROLE ?? 'admin') as AdminRole;
    if (expectedPassword && usernameBruto === expectedUser && senha === expectedPassword) {
      return res.json({
        success: true,
        data: { token: criarAdminToken(expectedUser, role), role, expiresIn: TOKEN_TTL_MS / 1000 },
      });
    }

    return res.status(401).json({
      success: false,
      error: { message: 'Credenciais invalidas', code: 'INVALID_CREDENTIALS' },
    });
  } catch (error) {
    logger.error('Erro no login admin:', error);
    return res.status(500).json({ success: false, error: { message: 'Erro ao autenticar', code: 'AUTH_ERROR' } });
  }
}
