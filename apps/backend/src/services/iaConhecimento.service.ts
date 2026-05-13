import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import iaContextoService from './iaContexto.service';
import { logger } from '../config/logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface IAConhecimento {
  descricaoNegocio: string | null;
  vozMarca: Record<string, unknown> | null;
  diferenciais: string[] | null;
  horarios: Record<string, unknown> | null;
  politicaFrete: string | null;
  politicaPrimeiroPedido: string | null;
  nomeAtendente: string | null;
}

export async function obterConhecimento(): Promise<IAConhecimento> {
  const config = await prisma.lojaConfiguracao.findUnique({ where: { id: 'loja_principal' } });
  return {
    descricaoNegocio: config?.iaDescricaoNegocio ?? null,
    vozMarca: (config?.iaVozMarca as Record<string, unknown> | null) ?? null,
    diferenciais: (config?.iaDiferenciais as string[] | null) ?? null,
    horarios: (config?.iaHorarios as Record<string, unknown> | null) ?? null,
    politicaFrete: config?.iaPoliticaFrete ?? null,
    politicaPrimeiroPedido: config?.iaPoliticaPrimeiroPedido ?? null,
    nomeAtendente: config?.iaNomeAtendente ?? null,
  };
}

function toJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}

export async function salvarConhecimento(dados: Partial<IAConhecimento>): Promise<IAConhecimento> {
  await prisma.lojaConfiguracao.upsert({
    where: { id: 'loja_principal' },
    create: {
      id: 'loja_principal',
      iaDescricaoNegocio: dados.descricaoNegocio,
      iaVozMarca: toJson(dados.vozMarca),
      iaDiferenciais: toJson(dados.diferenciais),
      iaHorarios: toJson(dados.horarios),
      iaPoliticaFrete: dados.politicaFrete,
      iaPoliticaPrimeiroPedido: dados.politicaPrimeiroPedido,
      iaNomeAtendente: dados.nomeAtendente,
    },
    update: {
      ...(dados.descricaoNegocio !== undefined && { iaDescricaoNegocio: dados.descricaoNegocio }),
      ...(dados.vozMarca !== undefined && { iaVozMarca: toJson(dados.vozMarca) }),
      ...(dados.diferenciais !== undefined && { iaDiferenciais: toJson(dados.diferenciais) }),
      ...(dados.horarios !== undefined && { iaHorarios: toJson(dados.horarios) }),
      ...(dados.politicaFrete !== undefined && { iaPoliticaFrete: dados.politicaFrete }),
      ...(dados.politicaPrimeiroPedido !== undefined && { iaPoliticaPrimeiroPedido: dados.politicaPrimeiroPedido }),
      ...(dados.nomeAtendente !== undefined && { iaNomeAtendente: dados.nomeAtendente }),
    },
  });
  return obterConhecimento();
}

export async function gerarPreview(intencao: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_KEY_AUSENTE');

  const ctx = await iaContextoService.construirContextoIA();

  const systemPrompt = `Você é um especialista em copywriting de WhatsApp para delivery de comida caseira em Goiânia.

${ctx.systemPromptBase}

Gere UMA mensagem curta (máx. 4 linhas) de exemplo para a intenção fornecida.
Use placeholders {{nome}} e {{bairro}} quando adequado.
Responda APENAS com o texto da mensagem, sem explicações adicionais.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Intenção: ${intencao}` }],
  });

  logger.info(`iaConhecimento.preview tokens=${response.usage.input_tokens}in+${response.usage.output_tokens}out`);

  return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
}

export default { obterConhecimento, salvarConhecimento, gerarPreview };
