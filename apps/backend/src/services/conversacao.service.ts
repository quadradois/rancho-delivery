import Anthropic from '@anthropic-ai/sdk';
import { OrigemMensagem } from '@prisma/client';
import prisma from '../config/database';
import evolutionService from './evolution.service';
import realtimeService from './realtime.service';
import { logger } from '../config/logger';
import iaContextoService from './iaContexto.service';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function montarSystemPrompt(): Promise<string> {
  const ctx = await iaContextoService.construirContextoIA();
  return `Você é ${ctx.nomeAtendente}, atendente virtual do Rancho Delivery.

${ctx.systemPromptBase}

Seu objetivo: apresentar o Rancho de forma amigável, responder dúvidas e
direcionar o cliente para fazer o primeiro pedido via link.

Regras:
- Seja curta e objetiva (máx. 3 linhas por mensagem)
- Nunca invente preços ou horários que não estão no contexto acima
- Se o cliente quiser pedir: informe o link do cardápio (https://ranchodelivery.com.br)
- Se reclamar ou ficar irritado: encerre com "Vou chamar um atendente humano para te ajudar"
  e pare de responder
- Nunca diga que é uma IA`;
}

const MAX_MENSAGENS_POR_CONVERSA = 20;
const THROTTLE_MS = 30_000;
const throttleMap = new Map<string, number>();

export interface RespostaIA {
  mensagem: string;
  humanRequired: boolean;
}

function eHorarioFuncionamento(): { aberto: boolean; reabreAs?: string } {
  // BRT = UTC-3
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const dia = agora.getUTCDay(); // 0=Dom, 1=Seg ... 6=Sáb
  const hora = agora.getUTCHours();

  const domingo = dia === 0;
  const abertura = domingo ? 11 : 10;
  const fechamento = domingo ? 21 : 22;

  if (hora >= abertura && hora < fechamento) return { aberto: true };
  const reabre = hora < abertura ? `${abertura}h` : `${domingo ? 11 : 10}h de amanhã`;
  return { aberto: false, reabreAs: reabre };
}

function estaThrottled(telefone: string): boolean {
  const ultima = throttleMap.get(telefone);
  if (!ultima) return false;
  return Date.now() - ultima < THROTTLE_MS;
}

export async function responderLead(
  telefone: string,
  mensagemRecebida: string,
  rawJid: string,
): Promise<RespostaIA | null> {
  // Ignorar grupos WhatsApp
  if (rawJid.includes('@g.us')) return null;

  // Throttle: 1 resposta a cada 30s por número
  if (estaThrottled(telefone)) return null;

  try {
    const horario = eHorarioFuncionamento();
    if (!horario.aberto) {
      throttleMap.set(telefone, Date.now());
      return {
        mensagem: `Olá! Estamos fechados no momento. Voltamos às ${horario.reabreAs} 😊`,
        humanRequired: false,
      };
    }

    const [cliente, lead] = await Promise.all([
      prisma.cliente.findUnique({ where: { telefone }, select: { nome: true } }),
      prisma.leadMarketing.findFirst({
        where: { telefone },
        select: { id: true, nome: true, bairro: true, status: true },
      }),
    ]);

    // Ignora se não tem relação com o sistema
    if (!lead && !cliente) return null;
    // Lead já convertido: não precisa de prospecção
    if (lead?.status === 'CONVERTIDO') return null;

    // Persiste mensagem recebida (lead OU cliente)
    if (lead) {
      await prisma.mensagemLead.create({
        data: { leadId: lead.id, origem: OrigemMensagem.HUMANO, texto: mensagemRecebida, lida: false },
      }).catch(() => {});
      await prisma.leadMarketing.update({
        where: { id: lead.id },
        data: { ultimaInteracaoEm: new Date() },
      }).catch(() => {});
      realtimeService.emit('lead:mensagem', {
        leadId: lead.id,
        telefone,
        nome: lead.nome,
        bairro: lead.bairro,
        origem: 'HUMANO',
        texto: mensagemRecebida,
      });
    }

    // Histórico para contexto da IA
    const historico = cliente
      ? await prisma.mensagemCliente.findMany({
          where: {
            clienteTelefone: telefone,
            origem: { in: [OrigemMensagem.HUMANO, OrigemMensagem.IA] },
          },
          orderBy: { criadoEm: 'asc' },
          take: MAX_MENSAGENS_POR_CONVERSA,
          select: { origem: true, texto: true },
        })
      : lead
        ? await prisma.mensagemLead.findMany({
            where: { leadId: lead.id },
            orderBy: { criadoEm: 'asc' },
            take: MAX_MENSAGENS_POR_CONVERSA,
            select: { origem: true, texto: true },
          })
        : [];

    // Limite de mensagens por conversa: transfere para humano
    if (historico.length >= MAX_MENSAGENS_POR_CONVERSA) {
      throttleMap.set(telefone, Date.now());
      return {
        mensagem: 'Vou chamar um atendente humano para te ajudar com mais detalhes! 😊',
        humanRequired: true,
      };
    }

    const messages: Anthropic.MessageParam[] = historico.map((m) => ({
      role: m.origem === OrigemMensagem.IA ? ('assistant' as const) : ('user' as const),
      content: m.texto,
    }));

    // Garante que a mensagem atual é a última como user
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: mensagemRecebida });
    }

    const basePrompt = await montarSystemPrompt();
    const contextualSystem = `${basePrompt}
${lead ? `\nContexto: você está falando com ${lead.nome || 'um proprietário'} do bairro ${lead.bairro || 'Goiânia'}.` : ''}
${cliente ? `\nContexto: este cliente já comprou conosco antes.` : ''}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: contextualSystem,
      messages,
    });

    logger.info(`conversacao.ia telefone=${telefone} tokens=${response.usage.input_tokens}in+${response.usage.output_tokens}out`);

    const texto = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const humanRequired = /atendente humano/i.test(texto);

    throttleMap.set(telefone, Date.now());

    // Salva resposta da IA no histórico
    if (cliente) {
      await prisma.mensagemCliente.create({
        data: { clienteTelefone: telefone, origem: OrigemMensagem.IA, texto, lida: true },
      }).catch(() => {});
    }
    if (lead) {
      await prisma.mensagemLead.create({
        data: { leadId: lead.id, origem: OrigemMensagem.IA, texto, lida: true },
      }).catch(() => {});
      await prisma.leadMarketing.update({
        where: { id: lead.id },
        data: { ultimaInteracaoEm: new Date(), humanRequired: humanRequired || undefined },
      }).catch(() => {});
      realtimeService.emit('lead:mensagem', {
        leadId: lead.id,
        telefone,
        nome: lead.nome,
        bairro: lead.bairro,
        origem: 'IA',
        texto,
        humanRequired,
      });
    }

    return { mensagem: texto, humanRequired };
  } catch (error) {
    logger.error('Erro na IA de conversação:', error);
    return null;
  }
}

export async function processarRespostaWhatsApp(
  telefone: string,
  mensagemRecebida: string,
  rawJid: string,
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;

  const resposta = await responderLead(telefone, mensagemRecebida, rawJid);
  if (!resposta) return;

  if (!resposta.humanRequired) {
    await evolutionService.enviarMensagem({
      numero: telefone,
      mensagem: resposta.mensagem,
    });
  }
}
