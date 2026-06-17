/**
 * Configuração ISOLADA da cobrança de assinatura do FoodFlow (control plane).
 *
 * É o ÚNICO lugar que lê as credenciais da conta Mercado Pago da PLATAFORMA
 * (onde caem as mensalidades) — separado do pagamento de PEDIDO, que usa a
 * conta de cada restaurante (ver mercadopago.service.ts + lojaConfig). Amanhã,
 * trocar de gateway de assinatura mexe só aqui.
 */
export interface CobrancaConfig {
  accessToken: string;
  webhookSecret: string;
  adminUrl: string;
  apiBase: string;
}

export function getCobrancaConfig(): CobrancaConfig {
  return {
    accessToken: process.env.FOODFLOW_MP_ACCESS_TOKEN?.trim() || '',
    webhookSecret: process.env.FOODFLOW_MP_WEBHOOK_SECRET?.trim() || '',
    adminUrl: process.env.FOODFLOW_ADMIN_URL?.trim() || 'https://admin.foodflow.ia.br',
    apiBase: 'https://api.mercadopago.com',
  };
}
