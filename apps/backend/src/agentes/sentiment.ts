export type SentimentClass = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO' | 'IRRITADO';

export interface SentimentResult {
  classe: SentimentClass;
  confianca: number; // 0–1
  sinais: string[];
}

// Padrões avaliados em ordem de prioridade (mais específico primeiro)
const PADROES_IRRITADO = [
  /\bpara\s+de\s+(me\s+)?enviar\b/i,
  /\bn[aã]o\s+me\s+(mande|envie|chame|manda|envia)\b/i,
  /\bme\s+tira\b/i,
  /\bsai\s+da\s+lista\b/i,
  /\bpara\s+de\s+me\s+ligar\b/i,
  /\bsair\s+da\s+lista\b/i,
  /\bbloquear\b/i,
  /\bdenunciar\b/i,
  /\bspam\b/i,
  /\bgolpe\b/i,
  /\bfraude\b/i,
  /\bprocesso\b/i,
  /\bprocon\b/i,
  /\banojo\b/i,
  /\bidiota\b/i,
  /\bimbecil\b/i,
  /\bhorr[íi]vel\b/i,
  /!!!+/,
  /[\u{1F621}\u{1F620}\u{1F92C}\u{1F4A2}\u{1F595}]/u, // emojis raiva
];

const PADROES_NEGATIVO = [
  /\bn[aã]o\s+quero\b/i,
  /\bn[aã]o\s+tenho\s+interesse\b/i,
  /\bmuito\s+caro\b/i,
  /\bcaro\s+demais\b/i,
  /\bn[aã]o\s+funciona\b/i,
  /\bn[aã]o\s+abre\b/i,
  /\bsite\s+(n[aã]o\s+abre|fora\s+do\s+ar|quebrado)\b/i,
  /\bruim\b/i,
  /\bpessimo\b/i,
  /\bP[eé]ssimo\b/i,
  /\bdemorou\b/i,
  /\bdesistir\b/i,
  /[\u{1F614}\u{1F612}\u{1F615}\u{1F641}\u{1F44E}]/u, // emojis negativos
];

const PADROES_POSITIVO = [
  /\bsim\b/i,
  /\bquero\s+sim\b/i,      // "quero sim" (não apenas "quero" — muito genérico)
  /\bsim\s+quero\b/i,
  /[oó]timo/i,             // sem \b pois ó não é palavra ASCII
  /\bperfeito\b/i,
  /maravilhoso/i,
  /\bexcelente\b/i,
  /\bamo\b/i,
  /\badorei\b/i,
  /delicioso/i,
  /\bgostei\b/i,
  /obrigad[ao]/i,
  /\bpor\s+favor\b/i,
  /\bpode\s+ser\b/i,
  /[\u{1F60D}\u{1F60A}\u{1F44D}\u{2764}\u{1F496}\u{1F917}]/u, // emojis positivos
];

function contarSinais(texto: string, padroes: RegExp[]): string[] {
  const sinais: string[] = [];
  for (const p of padroes) {
    const match = texto.match(p);
    if (match) sinais.push(match[0]);
  }
  return sinais;
}

export function analisarSentimento(texto: string): SentimentResult {
  const irritadoSinais = contarSinais(texto, PADROES_IRRITADO);
  if (irritadoSinais.length > 0) {
    return {
      classe: 'IRRITADO',
      confianca: Math.min(0.6 + irritadoSinais.length * 0.15, 1),
      sinais: irritadoSinais,
    };
  }

  const negativoSinais = contarSinais(texto, PADROES_NEGATIVO);
  const positivoSinais = contarSinais(texto, PADROES_POSITIVO);

  if (negativoSinais.length > 0 && negativoSinais.length >= positivoSinais.length) {
    return {
      classe: 'NEGATIVO',
      confianca: Math.min(0.5 + negativoSinais.length * 0.15, 1),
      sinais: negativoSinais,
    };
  }

  if (positivoSinais.length > 0) {
    return {
      classe: 'POSITIVO',
      confianca: Math.min(0.5 + positivoSinais.length * 0.15, 1),
      sinais: positivoSinais,
    };
  }

  return { classe: 'NEUTRO', confianca: 0.5, sinais: [] };
}
