import Anthropic from '@anthropic-ai/sdk';
import { OrigemMensagem } from '@prisma/client';
import prisma from '../config/database';
import { getLojaConfig } from './lojaConfig.service';
import evolutionService from './evolution.service';
import realtimeService from './realtime.service';
import { logger } from '../config/logger';
import iaContextoService from './iaContexto.service';
import { conversationCache, CachedMessage } from '../agentes/cache';
import { analisarSentimento } from '../agentes/sentiment';
import { verificarEntrada } from '../agentes/guardrails';
import { sanitizarResposta } from '../agentes/sanitizer';
import { classificarSkills, carregarConteudoSkills } from '../agentes/classificador-skills';
import { PEDIDO_TOOLS } from '../agentes/tools/pedido.tools';
import { executarToolCall, montarToolResults } from '../agentes/tools/executor';
import { obterSessaoAtiva } from '../agentes/tools/sessao';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function montarSystemPrompt(skillsExtra: string, modoToolUse = false): Promise<string> {
  const ctx = await iaContextoService.construirContextoIA();
  const regrasAtendimento = modoToolUse
    ? `- Seja curta e objetiva (máx. 3 linhas por mensagem)
- Nunca invente preços, produtos ou disponibilidade — use SEMPRE as tools disponíveis
- NUNCA envie o link https://rancho.delivery quando o cliente quer fazer o pedido aqui
- Use as tools para buscar cardápio, adicionar itens, validar entrega e confirmar pedido
- Se reclamar ou ficar irritado: encerre com "Vou chamar um atendente humano para te ajudar"
- Nunca diga que é uma IA`
    : `- Seja curta e objetiva (máx. 3 linhas por mensagem)
- Nunca invente preços ou horários que não estão no contexto acima
- Se o cliente quiser pedir: informe o link do cardápio (https://rancho.delivery)
- Se reclamar ou ficar irritado: encerre com "Vou chamar um atendente humano para te ajudar"
- Nunca diga que é uma IA`;

  return `Você é ${ctx.nomeAtendente}, atendente virtual do Rancho Delivery.

${ctx.systemPromptBase}

Seu objetivo: ${modoToolUse ? 'conduzir o cliente pelo fluxo de pedido — buscar cardápio, adicionar itens, validar entrega e confirmar o pedido usando as tools disponíveis.' : 'apresentar o Rancho de forma amigável, responder dúvidas e direcionar o cliente para fazer o primeiro pedido via link.'}

Regras:
${regrasAtendimento}${skillsExtra}`;
}

const MAX_MENSAGENS_POR_CONVERSA = 20;
const MAX_TOOL_ITERATIONS = 10;
const THROTTLE_MS = 30_000;
const THROTTLE_TOOL_MS = 3_000; // throttle reduzido para fluxo de pedido
const throttleMap = new Map<string, number>();

export interface RespostaIA {
  mensagem: string;
  humanRequired: boolean;
}

async function eLojaAberta(): Promise<{ aberto: boolean; mensagemFechado?: string }> {
  const loja = await getLojaConfig();
  if (!loja || loja.status === 'ABERTO') return { aberto: true };
  const msg = loja.mensagemPausado || 'Estamos fechados no momento. Voltamos em breve! 😊';
  return { aberto: false, mensagemFechado: msg };
}

function estaThrottled(telefone: string, modoRapido = false): boolean {
  const ultima = throttleMap.get(telefone);
  if (!ultima) return false;
  return Date.now() - ultima < (modoRapido ? THROTTLE_TOOL_MS : THROTTLE_MS);
}

function cacheKey(lead: { id: string } | null, telefone: string): string {
  return lead ? `lead:${lead.id}` : `cliente:${telefone}`;
}

export async function responderLead(
  telefone: string,
  mensagemRecebida: string,
  rawJid: string,
): Promise<RespostaIA | null> {
  // Ignorar grupos WhatsApp
  if (rawJid.includes('@g.us')) return null;

  // Throttle: 30s normal; 3s se há sessão de pedido ativa (cliente pode mandar mensagens rápidas)
  const sessaoPrecheck = await obterSessaoAtiva(telefone).catch(() => null);
  if (estaThrottled(telefone, !!sessaoPrecheck)) {
    logger.info(`conversacao.throttled telefone=${telefone}`);
    return null;
  }

  try {
    // --- Entry Guardrails ---
    const guardrail = await verificarEntrada(telefone, mensagemRecebida);
    if (!guardrail.passou) {
      logger.info(`conversacao.guardrail motivo=${guardrail.motivo} telefone=${telefone}`);
      throttleMap.set(telefone, Date.now());
      if (guardrail.resposta) {
        return { mensagem: guardrail.resposta, humanRequired: false };
      }
      return null;
    }

    // --- Análise de sentimento ---
    const sentimento = analisarSentimento(mensagemRecebida);
    logger.info(`conversacao.sentiment classe=${sentimento.classe} confianca=${sentimento.confianca.toFixed(2)} telefone=${telefone}`);

    if (sentimento.classe === 'IRRITADO') {
      throttleMap.set(telefone, Date.now());
      return {
        mensagem: 'Vou chamar um atendente humano para te ajudar! 😊',
        humanRequired: true,
      };
    }

    const lojaStatus = await eLojaAberta();
    logger.info(`conversacao.lojaStatus aberto=${lojaStatus.aberto} telefone=${telefone}`);
    if (!lojaStatus.aberto) {
      throttleMap.set(telefone, Date.now());
      return {
        mensagem: lojaStatus.mensagemFechado!,
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

    logger.info(`conversacao.lookup telefone=${telefone} lead=${lead?.id ?? 'null'} cliente=${cliente?.nome ?? 'null'}`);

    if (!lead && !cliente) return null;
    if (lead?.status === 'CONVERTIDO') return null;

    // Persiste mensagem recebida do lead (para painel e realtime)
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

    // --- Histórico via cache (Redis ou Map) ---
    const key = cacheKey(lead, telefone);
    let historico = await conversationCache.getHistory(key);

    // Cache miss: busca do banco
    if (historico.length === 0) {
      const dbMsgs = cliente
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

      historico = dbMsgs.map((m) => ({
        origem: m.origem === OrigemMensagem.IA ? 'IA' : 'HUMANO',
        texto: m.texto,
      }));
    }

    // Limite de mensagens: transfere para humano
    if (historico.length >= MAX_MENSAGENS_POR_CONVERSA) {
      throttleMap.set(telefone, Date.now());
      return {
        mensagem: 'Vou chamar um atendente humano para te ajudar com mais detalhes! 😊',
        humanRequired: true,
      };
    }

    // --- Classificação de skills ---
    const skillsAtivas = classificarSkills(mensagemRecebida);
    if (skillsAtivas.length > 0) {
      logger.info(`conversacao.skills ativas=${skillsAtivas.map((s) => s.id).join(',')} telefone=${telefone}`);
    }

    // Detecta se está em modo pedido:
    // 1. Sessão de carrinho ativa no banco (reutiliza o precheck feito antes do throttle)
    // 2. Mensagem atual ativou skill pedido-whatsapp
    // 3. Histórico recente indica fluxo de pedido em andamento (IA citou produto/preço)
    const sessaoAtiva = sessaoPrecheck;
    const historicoTemPedido = historico.some(
      (m) => m.origem === 'IA' && /r\$\s*\d|marmita|produto|carrinho|entrega|bairro|cep|confirmar/i.test(m.texto),
    );
    const usaToolUse = !!sessaoAtiva || skillsAtivas.some((s) => s.id === 'pedido-whatsapp') || historicoTemPedido;

    // Em modo tool-use, remove skill pedido-link (conflita com o fluxo de pedido por tools)
    const skillsFiltradas = usaToolUse ? skillsAtivas.filter((s) => s.id !== 'pedido-link') : skillsAtivas;
    const skillsConteudo = carregarConteudoSkills(skillsFiltradas);
    const basePrompt = await montarSystemPrompt(skillsConteudo, usaToolUse);

    const messages: Anthropic.MessageParam[] = historico.map((m) => ({
      role: m.origem === 'IA' ? ('assistant' as const) : ('user' as const),
      content: m.texto,
    }));

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: mensagemRecebida });
    }

    const contextualSystem = `${basePrompt}
${lead ? `\nContexto: você está falando com ${lead.nome || 'um proprietário'} do bairro ${lead.bairro || 'Goiânia'}.` : ''}
${cliente ? `\nContexto: este cliente já comprou conosco antes.` : ''}`;

    let texto: string;

    if (usaToolUse) {
      // Modo tool-use: loop até stop_reason !== 'tool_use' (máx 10 iterações)
      const toolMessages: Anthropic.MessageParam[] = [...messages];
      let response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        tools: PEDIDO_TOOLS,
        tool_choice: { type: 'auto' },
        system: contextualSystem,
        messages: toolMessages,
      });

      let iteracoes = 0;
      while (response.stop_reason === 'tool_use' && iteracoes < MAX_TOOL_ITERATIONS) {
        iteracoes++;
        const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        const results = await Promise.all(toolUses.map((tu) => executarToolCall(tu, telefone)));
        const toolResults = montarToolResults(toolUses, results);

        logger.info(`conversacao.toolUse iter=${iteracoes} tools=${toolUses.map((t) => t.name).join(',')} telefone=${telefone}`);

        toolMessages.push({ role: 'assistant', content: response.content });
        toolMessages.push({ role: 'user', content: toolResults });

        response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          tools: PEDIDO_TOOLS,
          tool_choice: { type: 'auto' },
          system: contextualSystem,
          messages: toolMessages,
        });
      }

      logger.info(`conversacao.ia modo=tool-use iteracoes=${iteracoes} telefone=${telefone} tokens=${response.usage.input_tokens}in+${response.usage.output_tokens}out`);
      const textoRaw = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text.trim() ?? '';
      texto = sanitizarResposta(textoRaw);
    } else {
      // Modo normal: sem tools
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        system: contextualSystem,
        messages,
      });

      logger.info(`conversacao.ia modo=normal telefone=${telefone} tokens=${response.usage.input_tokens}in+${response.usage.output_tokens}out skills=${skillsAtivas.map((s) => s.id).join(',') || 'nenhuma'}`);
      const textoRaw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      texto = sanitizarResposta(textoRaw);
    }
    const humanRequired = /atendente humano/i.test(texto);

    throttleMap.set(telefone, Date.now());

    // Atualiza cache com nova troca
    const historicoAtualizado: CachedMessage[] = [
      ...historico,
      { origem: 'HUMANO' as const, texto: mensagemRecebida },
      { origem: 'IA' as const, texto },
    ].slice(-MAX_MENSAGENS_POR_CONVERSA);
    await conversationCache.setHistory(key, historicoAtualizado);

    // Salva resposta no banco
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
  localizacao?: { lat: number; lng: number },
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;

  // Se o cliente compartilhou localização, cria uma mensagem de texto sintética
  // para o Claude poder acionar validar_entrega com lat/lng
  const textoEfetivo = localizacao
    ? `[LOCALIZAÇÃO GPS: lat=${localizacao.lat} lng=${localizacao.lng}] ${mensagemRecebida || 'Estou aqui'}`
    : mensagemRecebida;

  const resposta = await responderLead(telefone, textoEfetivo, rawJid);
  if (!resposta) return;

  // Envia sempre — inclusive a mensagem de despedida quando humanRequired=true
  await evolutionService.enviarMensagem({
    numero: telefone,
    mensagem: resposta.mensagem,
  });
}
