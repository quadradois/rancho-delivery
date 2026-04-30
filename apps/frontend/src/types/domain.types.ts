/**
 * Tipos de domínio da aplicação
 * Correspondem aos modelos do backend
 */

/**
 * Produto
 */
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

/**
 * DTO simplificado de produto para cards
 */
export interface ProdutoCardDTO {
  id: string;
  nome: string;
  preco: number;
  midia: string;
  descricao: string;
  categoria: string;
  ordem?: number;
}

/**
 * Bairro
 */
export interface Bairro {
  id: string;
  nome: string;
  taxa: number;
  ativo: boolean;
}

/**
 * Validação de bairro - Request
 */
export interface ValidarBairroRequest {
  nome: string;
}

/**
 * Validação de bairro - Response
 */
export interface ValidarBairroResponse {
  valido: boolean;
  taxa: number;
}

/**
 * Status do pedido
 */
export type StatusPedido =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'PREPARANDO'
  | 'SAIU_ENTREGA'
  | 'ENTREGUE'
  | 'CANCELADO';

/**
 * Item do pedido
 */
export interface ItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  quantidade: number;
  precoUnit: number;
  subtotal: number;
  observacao?: string;
}

/**
 * Pedido completo
 */
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

/**
 * DTO para criar pedido - Cliente
 */
export interface ClientePedidoDTO {
  telefone: string; // Min 10 caracteres
  nome: string; // Min 3 caracteres
  endereco: string; // Min 10 caracteres
  bairro: string; // Min 3 caracteres
}

/**
 * DTO para criar pedido - Item
 */
export interface ItemPedidoDTO {
  produtoId: string;
  quantidade: number; // Inteiro positivo
  observacao?: string;
}

/**
 * DTO para criar pedido - Request completo
 */
export interface CriarPedidoDTO {
  cliente: ClientePedidoDTO;
  itens: ItemPedidoDTO[]; // Min 1 item
  observacao?: string;
}

/**
 * Item do carrinho (usado no frontend)
 */
export interface CarrinhoItem {
  produto: ProdutoCardDTO;
  quantidade: number;
  observacao?: string;
}

/**
 * DTO de checkout (usado no frontend)
 */
export interface CheckoutDTO {
  cliente: ClientePedidoDTO;
  itens: CarrinhoItem[];
  subtotal: number;
  taxaEntrega: number;
  total: number;
}
