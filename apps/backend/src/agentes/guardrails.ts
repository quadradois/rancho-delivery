import prisma from '../config/database';
import { logger } from '../config/logger';

export type GuardrailResult =
  | { passou: true }
  | { passou: false; motivo: string; resposta?: string };

// Spam: contagem por telefone em janela de 60s
const spamMap = new Map<string, { count: number; windowStart: number }>();
const SPAM_MAX_MSGS = 5;
const SPAM_JANELA_MS = 60_000;

// Limpeza passiva do mapa de spam
setInterval(() => {
  const agora = Date.now();
  for (const [tel, entry] of spamMap) {
    if (agora - entry.windowStart > SPAM_JANELA_MS) spamMap.delete(tel);
  }
}, 60_000);

const PADROES_OPT_OUT = [
  /\bn[aã]o\s+(me\s+)?(mande|envie|manda|envia|ligue|pertube|incomode)\b/i,
  /\bme\s+tira\s+(da\s+lista|disso|daqui)\b/i,
  /\bsair\s+da\s+lista\b/i,
  /\bsai\s+da\s+lista\b/i,
  /\bpara\s+de\s+me\s+(enviar|mandar|ligar|contatar)\b/i,
  /\bn[aã]o\s+quero\s+(mais\s+)?receber\b/i,
  /\bremover\s+(meu\s+)?n[uú]mero\b/i,
  /\bdesinscrever\b/i,
  /\bopt.?out\b/i,
  /\bpare\s+de\s+me\b/i,
];

function verificarOptOut(texto: string): boolean {
  return PADROES_OPT_OUT.some((p) => p.test(texto));
}

function verificarSpam(telefone: string): boolean {
  const agora = Date.now();
  const entry = spamMap.get(telefone);

  if (!entry || agora - entry.windowStart > SPAM_JANELA_MS) {
    spamMap.set(telefone, { count: 1, windowStart: agora });
    return false;
  }

  entry.count += 1;
  return entry.count > SPAM_MAX_MSGS;
}

export async function verificarEntrada(
  telefone: string,
  texto: string,
): Promise<GuardrailResult> {
  // 1. Blacklist
  try {
    const bloqueado = await prisma.blacklistWhatsApp.findUnique({
      where: { telefone },
      select: { telefone: true },
    });
    if (bloqueado) {
      logger.info(`guardrails.blacklist telefone=${telefone}`);
      return { passou: false, motivo: 'BLACKLIST' };
    }
  } catch (err) {
    logger.warn('guardrails: erro ao consultar blacklist:', err);
  }

  // 2. Spam
  if (verificarSpam(telefone)) {
    logger.info(`guardrails.spam telefone=${telefone}`);
    return { passou: false, motivo: 'SPAM' };
  }

  // 3. Opt-out
  if (verificarOptOut(texto)) {
    logger.info(`guardrails.optout telefone=${telefone} texto="${texto.slice(0, 40)}"`);
    return {
      passou: false,
      motivo: 'OPT_OUT',
      resposta: 'Tudo bem! Não vou mais te enviar mensagens. Qualquer dúvida, estamos à disposição! 😊',
    };
  }

  // 4. Comprimento excessivo (possível injeção de prompt longa)
  if (texto.length > 2000) {
    logger.warn(`guardrails.comprimento telefone=${telefone} length=${texto.length}`);
    return { passou: false, motivo: 'TEXTO_MUITO_LONGO' };
  }

  return { passou: true };
}

export function resetarSpam(telefone: string): void {
  spamMap.delete(telefone);
}
