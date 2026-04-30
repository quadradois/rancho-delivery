/**
 * API Client - Ponto de entrada principal
 * Exporta todos os serviços, tipos e utilitários da API
 */

// Serviços
export { default as produtoService } from './produtoService';
export { default as bairroService } from './bairroService';
export { default as pedidoService } from './pedidoService';

// Cliente HTTP
export { apiClient, httpClient } from '@/lib/http-client';

// Tipos de API
export type { ApiResponse, ApiError } from '@/types/api.types';
export { ApiErrorCode, ApiException } from '@/types/api.types';

// Tipos de domínio
export type {
  Produto,
  ProdutoCardDTO,
  Bairro,
  ValidarBairroRequest,
  ValidarBairroResponse,
  Pedido,
  ItemPedido,
  StatusPedido,
  ClientePedidoDTO,
  ItemPedidoDTO,
  CriarPedidoDTO,
  CarrinhoItem,
  CheckoutDTO,
} from '@/types/domain.types';

/**
 * Objeto API com todos os serviços
 * Permite uso como: api.produtos.listar()
 */
import produtoService from './produtoService';
import bairroService from './bairroService';
import pedidoService from './pedidoService';

export const api = {
  produtos: produtoService,
  bairros: bairroService,
  pedidos: pedidoService,
};

export default api;
