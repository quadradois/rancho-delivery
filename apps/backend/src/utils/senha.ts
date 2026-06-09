import crypto from 'crypto';

const KEYLEN = 64;

/**
 * Hash de senha com scrypt (nativo do Node — sem dependência externa).
 * Formato armazenado: `scrypt$<salt_hex>$<hash_hex>`.
 */
export function hashSenha(senha: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/** Verifica a senha contra o hash armazenado (comparação timing-safe). */
export function verificarSenha(senha: string, armazenado: string): boolean {
  const partes = armazenado.split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const [, salt, hashHex] = partes;
  const esperado = Buffer.from(hashHex, 'hex');
  const tentativa = crypto.scryptSync(senha, salt, KEYLEN);
  return esperado.length === tentativa.length && crypto.timingSafeEqual(esperado, tentativa);
}
