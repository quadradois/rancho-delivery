import axios, { AxiosInstance } from 'axios';
import { EstadoConta } from '@prisma/client';
import { logger } from '../config/logger';
import prisma from '../config/database';
import { runSemEscopo } from '../config/tenantContext';
import { getCobrancaConfig } from '../config/cobrancaMercadoPago';

/**
 * Cobrança da assinatura do FoodFlow via Mercado Pago (preapproval / assinatura
 * recorrente). Gera o link que o dono autoriza; o webhook reflete o pagamento
 * no EstadoConta. Roda no contexto do super-admin (sem escopo de tenant).
 */

export class CobrancaError extends Error {
  constructor(
    public code: 'SEM_TOKEN' | 'RESTAURANTE_NAO_ENCONTRADO' | 'SEM_PLANO' | 'MP_ERRO',
    message: string,
  ) {
    super(message);
    this.name = 'CobrancaError';
  }
}

function mpApi(): AxiosInstance {
  const cfg = getCobrancaConfig();
  if (!cfg.accessToken) {
    throw new CobrancaError('SEM_TOKEN', 'Token do Mercado Pago da plataforma não configurado (FOODFLOW_MP_ACCESS_TOKEN)');
  }
  return axios.create({
    baseURL: cfg.apiBase,
    timeout: 15000,
    headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
  });
}

/**
 * Cria a assinatura recorrente no Mercado Pago para o restaurante e devolve o
 * link (init_point) que o dono abre pra autorizar. Usa o plano atual da
 * assinatura (precisa ter um plano atribuído). Guarda o id no provedorRef.
 */
export async function gerarLinkAssinatura(
  tenantId: string,
  opts: { email?: string } = {},
): Promise<{ url: string; preapprovalId: string }> {
  const cfg = getCobrancaConfig();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { assinatura: { include: { plano: true } } },
  });
  if (!tenant) throw new CobrancaError('RESTAURANTE_NAO_ENCONTRADO', 'Restaurante não encontrado');

  const plano = tenant.assinatura?.plano;
  if (!plano) throw new CobrancaError('SEM_PLANO', 'Atribua um plano ao restaurante antes de gerar a cobrança');

  const body = {
    reason: `FoodFlow — ${plano.nome} (${tenant.nome})`,
    external_reference: tenantId,
    payer_email: opts.email,
    back_url: `${cfg.adminUrl}/superadmin/restaurantes/${tenantId}`,
    notification_url: `${cfg.adminUrl}/webhook/assinatura`,
    status: 'pending',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: Number(Number(plano.preco).toFixed(2)),
      currency_id: 'BRL',
    },
  };

  const api = mpApi(); // lança SEM_TOKEN antes do try (não vira MP_ERRO)
  let data: { id?: string | number; init_point?: string; sandbox_init_point?: string };
  try {
    const resp = await api.post('/preapproval', body);
    data = resp.data ?? {};
  } catch (error) {
    logger.error('Falha ao criar assinatura no Mercado Pago', {
      tenantId,
      erro: error instanceof Error ? error.message : String(error),
    });
    throw new CobrancaError('MP_ERRO', 'Falha ao criar a assinatura no Mercado Pago');
  }

  const url = data.init_point || data.sandbox_init_point;
  const preapprovalId = data.id != null ? String(data.id) : '';
  if (!url || !preapprovalId) {
    throw new CobrancaError('MP_ERRO', 'Mercado Pago não retornou o link de assinatura');
  }

  await prisma.assinatura.update({ where: { tenantId }, data: { provedorRef: preapprovalId } });
  return { url, preapprovalId };
}

/** Mapeia o status do preapproval do Mercado Pago para o EstadoConta. */
function estadoPorStatusPreapproval(status: string): EstadoConta | null {
  switch (status) {
    case 'authorized':
      return EstadoConta.ATIVA;
    case 'paused':
    case 'cancelled':
      return EstadoConta.INADIMPLENTE; // loja nunca sai do ar; só perde os módulos pagos
    default:
      return null; // pending e demais: não mexe
  }
}

/** Atualiza a assinatura achada por provedorRef (id do preapproval), sem escopo de tenant. */
async function aplicarEstado(preapprovalId: string, estado: EstadoConta, proximaCobranca?: Date | null) {
  await runSemEscopo(async () => {
    const assinatura = await prisma.assinatura.findFirst({ where: { provedorRef: preapprovalId }, select: { id: true } });
    if (!assinatura) {
      logger.warn('Webhook de assinatura sem assinatura correspondente', { preapprovalId });
      return;
    }
    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: { estado, ...(proximaCobranca !== undefined ? { proximaCobranca } : {}) },
    });
    logger.info('Assinatura atualizada via webhook', { preapprovalId, estado });
  });
}

/**
 * Processa a notificação do Mercado Pago (assinatura). Dois tipos relevantes:
 * - subscription_preapproval: mudou o status da assinatura → consulta /preapproval/{id}.
 * - subscription_authorized_payment: uma cobrança recorrente → consulta /authorized_payments/{id}.
 */
export async function processarWebhookAssinatura(body: {
  type?: string; topic?: string; action?: string; data?: { id?: string | number }; id?: string | number;
}): Promise<void> {
  const tipo = String(body?.type || body?.topic || body?.action || '');
  const id = body?.data?.id ?? body?.id;
  if (!id) return;
  const idStr = String(id);

  try {
    if (tipo.includes('authorized_payment')) {
      const { data } = await mpApi().get(`/authorized_payments/${encodeURIComponent(idStr)}`);
      const preapprovalId = data?.preapproval_id ? String(data.preapproval_id) : '';
      const status = String(data?.status || '');
      if (!preapprovalId) return;
      if (status === 'approved') {
        const prox = data?.next_payment_date ? new Date(data.next_payment_date) : undefined;
        await aplicarEstado(preapprovalId, EstadoConta.ATIVA, prox);
      } else if (status === 'rejected') {
        await aplicarEstado(preapprovalId, EstadoConta.INADIMPLENTE);
      }
      return;
    }

    if (tipo.includes('preapproval')) {
      const { data } = await mpApi().get(`/preapproval/${encodeURIComponent(idStr)}`);
      const estado = estadoPorStatusPreapproval(String(data?.status || ''));
      if (!estado) return;
      const prox = data?.next_payment_date ? new Date(data.next_payment_date) : undefined;
      await aplicarEstado(idStr, estado, prox);
    }
  } catch (error) {
    logger.error('Erro ao processar webhook de assinatura do Mercado Pago', {
      tipo,
      id: idStr,
      erro: error instanceof Error ? error.message : String(error),
    });
  }
}
