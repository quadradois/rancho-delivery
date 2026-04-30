/**
 * Serviço de Pedidos
 * Gerencia operações relacionadas a pedidos
 */

import { apiClient } from '@/lib/http-client';
import { Pedido, CriarPedidoDTO } from '@/types/domain.types';

/**
 * Serviço de pedidos
 */
export const pedidoService = {
  /**
   * Cria novo pedido
   * @param dados - Dados do pedido (cliente, itens, observação)
   * @returns Pedido criado com ID e informações de pagamento
   * @throws ApiException com códigos:
   *   - VALIDACAO_ERRO: Dados inválidos
   *   - BAIRRO_NAO_ATENDIDO: Bairro não está na área de entrega
   *   - PRODUTO_NAO_ENCONTRADO: Produto não existe
   *   - PRODUTO_INDISPONIVEL: Produto está indisponível
   * 
   * @example
   * ```ts
   * const pedido = await pedidoService.criar({
   *   cliente: {
   *     telefone: '11999999999',
   *     nome: 'João Silva',
   *     endereco: 'Rua das Flores, 123',
   *     bairro: 'Centro'
   *   },
   *   itens: [
   *     { produtoId: '123', quantidade: 2, observacao: 'Sem cebola' }
   *   ],
   *   observacao: 'Entregar no portão'
   * });
   * 
   * // Redirecionar para pagamento
   * if (pedido.pagamentoId) {
   *   window.location.href = `https://asaas.com/pay/${pedido.pagamentoId}`;
   * }
   * ```
   */
  async criar(dados: CriarPedidoDTO): Promise<Pedido> {
    return apiClient.post<Pedido>('/pedidos', dados);
  },

  /**
   * Busca pedido por ID
   * @param id - ID do pedido
   * @returns Pedido encontrado com todos os detalhes
   * @throws ApiException com código PEDIDO_NAO_ENCONTRADO
   * 
   * @example
   * ```ts
   * const pedido = await pedidoService.buscarPorId('abc123');
   * console.log(`Status: ${pedido.status}`);
   * ```
   */
  async buscarPorId(id: string): Promise<Pedido> {
    return apiClient.get<Pedido>(`/pedidos/${id}`);
  },

  /**
   * Lista todos os pedidos de um cliente
   * @param telefone - Telefone do cliente
   * @returns Array de pedidos do cliente
   * 
   * @example
   * ```ts
   * const pedidos = await pedidoService.listarPorCliente('11999999999');
   * console.log(`Cliente tem ${pedidos.length} pedidos`);
   * ```
   */
  async listarPorCliente(telefone: string): Promise<Pedido[]> {
    return apiClient.get<Pedido[]>(`/pedidos/cliente/${telefone}`);
  },

  /**
   * Calcula o total do pedido
   * Método auxiliar para calcular subtotal e total com taxa de entrega
   * @param itens - Itens do pedido com preço e quantidade
   * @param taxaEntrega - Taxa de entrega do bairro
   * @returns Objeto com subtotal e total
   * 
   * @example
   * ```ts
   * const totais = pedidoService.calcularTotal(
   *   [{ precoUnit: 25.00, quantidade: 2 }],
   *   5.00
   * );
   * console.log(`Subtotal: R$ ${totais.subtotal}`);
   * console.log(`Total: R$ ${totais.total}`);
   * ```
   */
  calcularTotal(
    itens: Array<{ precoUnit: number; quantidade: number }>,
    taxaEntrega: number
  ): { subtotal: number; total: number } {
    const subtotal = itens.reduce((acc, item) => acc + item.precoUnit * item.quantidade, 0);
    const total = subtotal + taxaEntrega;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  },
};

export default pedidoService;
