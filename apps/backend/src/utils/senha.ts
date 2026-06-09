import crypto from 'crypto';

// Parâmetros do scrypt. N elevado o suficiente para hash de senha; assíncrono
// (roda no threadpool, não bloqueia o event loop). maxmem cobre 128*N*r bytes.
const PARAMS = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const KEYLEN = 64;

function scrypt(senha: crypto.BinaryLike, salt: crypto.BinaryLike, keylen: number, opts: crypto.ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(senha, salt, keylen, opts, (err, dk) => (err ? reject(err) : resolve(dk)));
  });
}

/**
 * Hash de senha com scrypt (nativo, sem dependência externa).
 * Formato versionado: `scrypt$<N>$<r>$<p>$<salt_hex>$<hash_hex>` — permite
 * recalibrar parâmetros no futuro sem invalidar hashes antigos.
 */
export async function hashSenha(senha: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(senha, salt, KEYLEN, PARAMS)).toString('hex');
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt}$${hash}`;
}

/** Verifica a senha contra o hash armazenado (timing-safe, parâmetros lidos do próprio hash). */
export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const p = armazenado.split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  const N = Number(p[1]);
  const r = Number(p[2]);
  const paralel = Number(p[3]);
  const salt = p[4];
  const esperado = Buffer.from(p[5], 'hex');
  if (!N || !r || !paralel || esperado.length === 0) return false;

  const tentativa = await scrypt(senha, salt, esperado.length, { N, r, p: paralel, maxmem: PARAMS.maxmem });
  return esperado.length === tentativa.length && crypto.timingSafeEqual(esperado, tentativa);
}
