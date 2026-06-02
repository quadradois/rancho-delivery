import path from 'path';

export interface Skill {
  id: string;
  triggers: RegExp[];
  arquivo: string; // caminho absoluto para o .md
}

const SKILLS_DIR = path.join(__dirname);

export const SKILLS: Skill[] = [
  {
    id: 'anti-injection',
    triggers: [
      /ignore\s+(suas?\s+)?instru[cç][oõ]es/i,
      /esqueça\s+tudo/i,
      /revele?\s+(seu\s+)?prompt/i,
      /finja\s+ser/i,
      /sem\s+restri[cç][oõ]es/i,
      /jailbreak/i,
      /DAN\b/,
      /ignore\s+previous/i,
      /forget\s+everything/i,
    ],
    arquivo: path.join(SKILLS_DIR, 'compartilhados', 'anti-injection.md'),
  },
  {
    id: 'opt-out',
    triggers: [
      /n[aã]o\s+(me\s+)?(mande|envie)\b/i,
      /me\s+tira\s+da\s+lista/i,
      /sair?\s+da\s+lista/i,
      /parar?\s+de\s+receber/i,
    ],
    arquivo: path.join(SKILLS_DIR, 'compartilhados', 'opt-out.md'),
  },
  {
    id: 'regras-whatsapp',
    triggers: [], // sempre injetada (sem gatilho — ver classificador)
    arquivo: path.join(SKILLS_DIR, 'compartilhados', 'regras-whatsapp.md'),
  },
  {
    id: 'horario-funcionamento',
    triggers: [
      /que\s+horas\b/i,
      /hor[aá]rio/i,
      /funcionamento/i,
      /\babert[ao]s?\b/i,
      /\bfechaod[ao]s?\b/i,
      /\bfechad[ao]s?\b/i,
      /ainda\s+(t[eê]m?|funciona|abre)/i,
      /abr[ei]/i,
      /quando\s+(abr[ei]|fecha)/i,
    ],
    arquivo: path.join(SKILLS_DIR, 'atendimento', 'horario-funcionamento.md'),
  },
  {
    id: 'cardapio',
    triggers: [
      /card[aá]pio/i,
      /o\s+que\s+(tem|voc[eê]s?\s+tem|tem\s+hoje)/i,
      /tem\s+(marmita|frango|carne|peixe|vegano|fit)/i,
      /pre[cç]o/i,
      /quanto\s+custa/i,
      /\bmenu\b/i,
      /op[cç][oõ]es/i,
      /o\s+que\s+serve/i,
    ],
    arquivo: path.join(SKILLS_DIR, 'atendimento', 'cardapio.md'),
  },
  {
    id: 'pedido-link',
    triggers: [
      /quero\s+pedir/i,
      /como\s+(fa[cç]o|peço|pedir|pedido)/i,
      /fazer\s+pedido/i,
      /quero\s+(comprar|encomendar)/i,
      /site\s+n[aã]o\s+(abre|funciona|carrega)/i,
      /link\s+n[aã]o\s+(abre|funciona)/i,
      /n[aã]o\s+consigo\s+(acessar|entrar|abrir)/i,
    ],
    arquivo: path.join(SKILLS_DIR, 'atendimento', 'pedido-link.md'),
  },
  {
    id: 'pedido-whatsapp',
    triggers: [
      /quero\s+(pedir|comprar|encomendar)/i,
      /fazer\s+pedido/i,
      /adiciona[r]?\s+(um[a]?\s+)?/i,
      /coloca[r]?\s+no\s+carrinho/i,
      /quant[oa]\s+[eé]\s+/i,
      /confirmar?\s+pedido/i,
      /meu\s+carrinho/i,
      /cancela[r]?\s+pedido/i,
      /entreg[a]?\s+no\s+/i,
      /\bentrega\b/i,
      /\bfrete\b/i,
    ],
    arquivo: path.join(SKILLS_DIR, 'atendimento', 'pedido-whatsapp.md'),
  },
];
