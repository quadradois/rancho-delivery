// Tipos compartilhados entre frontend e backend
// Baseado no schema Prisma e planejamento do projeto

export type Origem = 'SITE' | 'WHATSAPP' | 'MINERACAO' | 'INDICACAO' | 'CAMPANHA';

export type StatusPedido = 
  | 'PENDENTE' 
  | 'CONFIRMADO' 
  | 'PREPARANDO' 
  | 'SAIU_ENTREGA' 
  | 'ENTREGUE' 
  | 'CANCELADO';

export interface Cliente {
  telefone: string;
  nome: string;
  endereco: string;
  bairro: string;
  origem: Origem;
  criadoEm: Date;
}

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  midia: string;
  descricao: string;
  categoria: string;
  disponivel: boolean;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Bairro {
  id: string;
  nome: string;
  taxa: number;
  ativo: boolean;
}

export interface ItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  quantidade: number;
  precoUnit: number;
  subtotal: number;
  observacao?: string;
}

export interface Pedido {
  id: string;
  clienteTelefone: string;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  status: StatusPedido;
  pagamentoId?: string;
  observacao?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  itens: ItemPedido[];
}

// DTOs para API

export interface CriarPedidoDTO {
  cliente: {
    telefone: string;
    nome: string;
    endereco: string;
    bairro: string;
  };
  itens: {
    produtoId: string;
    quantidade: number;
    observacao?: string;
  }[];
  observacao?: string;
}

export interface ProdutoCardDTO {
  id: string;
  nome: string;
  preco: number;
  midia: string;
  descricao: string;
  categoria: string;
}

export interface CarrinhoItem {
  produto: ProdutoCardDTO;
  quantidade: number;
  observacao?: string;
}

export interface CheckoutDTO {
  cliente: {
    telefone: string;
    nome: string;
    endereco: string;
    bairro: string;
  };
  itens: CarrinhoItem[];
  subtotal: number;
  taxaEntrega: number;
  total: number;
}

// Webhook Asaas
export interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
    value: number;
    netValue?: number;
    customer?: string;
    dueDate?: string;
    description?: string;
  };
}

// Resposta padrão da API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
