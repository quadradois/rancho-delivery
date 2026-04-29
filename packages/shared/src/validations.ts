import { z } from 'zod';

// Validação de telefone brasileiro
export const telefoneSchema = z.string()
  .regex(/^55\d{10,11}$/, 'Telefone deve estar no formato 55DDNNNNNNNNN')
  .or(z.string().regex(/^\d{10,11}$/, 'Telefone inválido'));

// Validação de cliente
export const clienteSchema = z.object({
  telefone: telefoneSchema,
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(255),
  endereco: z.string().min(10, 'Endereço deve ter no mínimo 10 caracteres'),
  bairro: z.string().min(3, 'Bairro inválido'),
});

// Validação de item do pedido
export const itemPedidoSchema = z.object({
  produtoId: z.string().cuid(),
  quantidade: z.number().int().positive('Quantidade deve ser maior que zero'),
  observacao: z.string().max(500).optional(),
});

// Validação de criação de pedido
export const criarPedidoSchema = z.object({
  cliente: clienteSchema,
  itens: z.array(itemPedidoSchema).min(1, 'Pedido deve ter pelo menos 1 item'),
  observacao: z.string().max(1000).optional(),
});

// Validação de produto
export const produtoSchema = z.object({
  nome: z.string().min(3).max(255),
  preco: z.number().positive('Preço deve ser maior que zero'),
  midia: z.string().url('URL da mídia inválida'),
  descricao: z.string().min(10),
  categoria: z.string().min(3).max(100),
  disponivel: z.boolean().default(true),
  ordem: z.number().int().default(0),
});

// Validação de bairro
export const bairroSchema = z.object({
  nome: z.string().min(3).max(100),
  taxa: z.number().nonnegative('Taxa não pode ser negativa'),
  ativo: z.boolean().default(true),
});

// Validação de webhook Asaas
export const asaasWebhookSchema = z.object({
  event: z.string(),
  payment: z.object({
    id: z.string(),
    status: z.enum([
      'PENDING',
      'CONFIRMED',
      'RECEIVED',
      'OVERDUE',
      'REFUNDED',
      'RECEIVED_IN_CASH',
      'REFUND_REQUESTED',
      'CHARGEBACK_REQUESTED',
      'CHARGEBACK_DISPUTE',
      'AWAITING_CHARGEBACK_REVERSAL',
      'DUNNING_REQUESTED',
      'DUNNING_RECEIVED',
      'AWAITING_RISK_ANALYSIS',
    ]),
    value: z.number(),
    netValue: z.number().optional(),
    customer: z.string().optional(),
    dueDate: z.string().optional(),
    description: z.string().optional(),
  }),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
export type ItemPedidoInput = z.infer<typeof itemPedidoSchema>;
export type CriarPedidoInput = z.infer<typeof criarPedidoSchema>;
export type ProdutoInput = z.infer<typeof produtoSchema>;
export type BairroInput = z.infer<typeof bairroSchema>;
export type AsaasWebhookInput = z.infer<typeof asaasWebhookSchema>;
