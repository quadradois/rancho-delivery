import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Middleware de tratamento de erros global
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Erro não tratado:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: {
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
};

/**
 * Middleware para rotas não encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.path}`);
  
  return res.status(404).json({
    success: false,
    error: {
      message: 'Rota não encontrada',
      code: 'NOT_FOUND',
    },
  });
};

/**
 * Middleware de log de requisições
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip,
  });
  next();
};
