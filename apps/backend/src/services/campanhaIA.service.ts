import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../config/logger';
import iaContextoService from './iaContexto.service';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INSTRUCOES_VARIACOES = `Seu objetivo: gerar 3 variações curtas e eficazes de mensagem outbound para enviar a proprietários de imóveis da região (leads que ainda não são clientes).

Regras das mensagens:
- Cada mensagem deve ter no máximo 4 linhas
- Tom: conforme a voz da marca acima — sem soar comercial agressivo
- Mencionar o Rancho Delivery sutilmente
- Incluir uma chamada para ação clara (responder, pedir cardápio, fazer pedido)
- Variar o ângulo entre as 3 opções (ex: 1 — apresentação, 2 — promoção, 3 — pergunta intrigante)
- Sem emojis em excesso (máximo 1–2 por mensagem)
- Não usar gatilhos de spam ("URGENTE", "GRÁTIS!!!", caixa alta)
- Tratar o destinatário pelo primeiro nome quando disponível usando o placeholder {{nome}}
- Se o operador pedir personalização por bairro, usar o placeholder {{bairro}}
- Mencione apenas preços e produtos que estão no cardápio atual fornecido acima

Formato de saída obrigatório (JSON apenas, sem markdown fences):
{
  "variacoes": [
    { "titulo": "Apresentação amigável", "mensagem": "..." },
    { "titulo": "Promoção do dia", "mensagem": "..." },
    { "titulo": "Pergunta intrigante", "mensagem": "..." }
  ]
}`;

export interface VariacaoMensagem {
  titulo: string;
  mensagem: string;
}

export async function gerarVariacoesMensagem(input: {
  intencao: string;
  bairro?: string;
  observacoes?: string;
}): Promise<VariacaoMensagem[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY_NAO_CONFIGURADA');
  }

  const contexto = await iaContextoService.construirContextoIA();

  const systemPrompt = `Você é um especialista em copywriting de WhatsApp para delivery de comida caseira em Goiânia.

${contexto.systemPromptBase}

${INSTRUCOES_VARIACOES}`;

  const userPrompt = [
    `Intenção da campanha: ${input.intencao}`,
    input.bairro ? `Bairro alvo: ${input.bairro}` : null,
    input.observacoes ? `Observações: ${input.observacoes}` : null,
    '',
    'Gere as 3 variações em JSON conforme o formato especificado.',
  ].filter(Boolean).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const texto = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

  logger.info(`campanhaIA.variacoes tokens=${response.usage.input_tokens}in+${response.usage.output_tokens}out intencao="${input.intencao.slice(0, 60)}"`);

  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('IA_RESPOSTA_INVALIDA');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { variacoes?: VariacaoMensagem[] };
    if (!Array.isArray(parsed.variacoes) || parsed.variacoes.length === 0) {
      throw new Error('IA_RESPOSTA_SEM_VARIACOES');
    }
    return parsed.variacoes
      .filter((v) => v && typeof v.mensagem === 'string' && v.mensagem.trim())
      .map((v) => ({ titulo: v.titulo || 'Variação', mensagem: v.mensagem.trim() }))
      .slice(0, 3);
  } catch (err) {
    logger.error('Falha ao parsear variações da IA:', err);
    throw new Error('IA_RESPOSTA_INVALIDA');
  }
}

export default { gerarVariacoesMensagem };
