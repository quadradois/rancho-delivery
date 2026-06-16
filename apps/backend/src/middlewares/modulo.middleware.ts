import { Request, Response, NextFunction } from 'express';
import { temModulo } from '../services/entitlements.service';
import { logger } from '../config/logger';

/**
 * Gating por módulo: exige que a loja atual tenha o módulo `chave` ativo
 * (entitlements = core ∪ plano ∪ avulsos). Responde 403 se não tiver.
 *
 * Em erro de verificação (ex.: falha transitória no banco) faz **fail-open**
 * (libera + loga) — não derruba a feature por um problema de infra.
 *
 * IMPORTANTE: usar SEMPRE depois da autenticação (que fixa o tenant do JWT no
 * contexto via runWithTenant). Antes disso, o tenant seria o resolvido por host
 * (errado para o painel admin).
 */
export function exigirModulo(chave: string) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      if (await temModulo(chave)) return next();
      return res.status(403).json({
        success: false,
        error: { message: 'Módulo não disponível no seu plano', code: 'MODULO_INDISPONIVEL', modulo: chave },
      });
    } catch (err) {
      logger.error(`Falha ao verificar módulo '${chave}' — liberando p/ não derrubar:`, err);
      return next();
    }
  };
}
