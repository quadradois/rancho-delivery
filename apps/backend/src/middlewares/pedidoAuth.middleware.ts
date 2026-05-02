import { NextFunction, Request, Response } from 'express';

/**
 * Verifica que a requisição tem acesso ao pedido via:
 *   - JWT de admin (req.adminUser preenchido por autenticarAdmin), OU
 *   - query param ?token=<tokenAcesso> que baterá contra o banco no controller
 *
 * Este middleware apenas injeta `req.pedidoToken` para uso no controller.
 * A validação real do token contra o banco fica no controller para evitar
 * uma query extra desnecessária (o controller já busca o pedido).
 */
export function verificarAcessoPedido(req: Request, res: Response, next: NextFunction) {
  // Admin autenticado tem acesso irrestrito
  if (req.adminUser) return next();

  const token = typeof req.query.token === 'string' ? req.query.token.trim() : undefined;
  if (token) {
    req.pedidoToken = token;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: {
      message: 'Token de acesso necessário. Passe ?token=<seu_token>',
      code: 'PEDIDO_TOKEN_REQUIRED',
    },
  });
}

// Extensão do tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      pedidoToken?: string;
    }
  }
}
