import apiClient from './api-client';

/**
 * Tipos de dados da API
 */
export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel?: boolean;
  midia?: string;
  imagemUrl?: string;
  ordem?: number;
  tempoPreparoMin?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemPedido {
  produtoId: string;
  quantidade: number;
  observacao?: string;
}

export interface CriarPedidoDTO {
  cliente: {
    nome: string;
    telefone: string;
    endereco: string;
    bairro: string;
  };
  itens: ItemPedido[];
  observacao?: string;
}

export interface Pedido {
  id: string;
  numero?: number | string;
  clienteTelefone: string;
  clienteNome: string;
  formaPagamento: string;
  trocoParaValor?: number;
  cliente?: {
    nome: string;
    telefone: string;
    endereco: string;
    bairro: string;
  };
  itens: Array<{
    id: string;
    produtoId: string;
    produto: Produto;
    quantidade: number;
    precoUnit: number;
    precoUnitario: number;
    subtotal: number;
    observacao?: string;
    observacoes?: string;
  }>;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  status:
    | 'PENDENTE'
    | 'CONFIRMADO'
    | 'PREPARANDO'
    | 'SAIU_ENTREGA'
    | 'ENTREGUE'
    | 'CANCELADO'
    | 'pendente'
    | 'confirmado'
    | 'preparando'
    | 'saiu_entrega'
    | 'entregue'
    | 'cancelado';
  observacao?: string;
  observacoes?: string;
  pagamentoId?: string;
  linkPagamento?: string;
  endereco: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cep: string;
    pontoReferencia?: string;
  };
  clienteEmail: string;
  tempoEstimadoMin: number;
  createdAt: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Bairro {
  id: string;
  nome: string;
  taxa: number;
  taxaEntrega: number;
  tempoEntregaMin: number;
  ativo: boolean;
}

/**
 * Serviço de Produtos
 */
export const produtoService = {
  /**
   * Lista todos os produtos
   * @param categoria - Filtro opcional por categoria
   */
  async listar(categoria?: string): Promise<Produto[]> {
    const query = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    return apiClient.get<Produto[]>(`/produtos${query}`);
  },

  /**
   * Busca produto por ID
   */
  async buscarPorId(id: string): Promise<Produto> {
    return apiClient.get<Produto>(`/produtos/${id}`);
  },
};

/**
 * Serviço de Pedidos
 */
export const pedidoService = {
  /**
   * Cria novo pedido
   */
  async criar(dados: CriarPedidoDTO): Promise<Pedido> {
    return apiClient.post<Pedido>('/pedidos', dados);
  },

  /**
   * Busca pedido por ID
   */
  async buscarPorId(id: string): Promise<Pedido> {
    return apiClient.get<Pedido>(`/pedidos/${id}`);
  },

  /**
   * Lista pedidos de um cliente
   */
  async listarPorCliente(telefone: string): Promise<Pedido[]> {
    return apiClient.get<Pedido[]>(`/pedidos/cliente/${telefone}`);
  },
};

/**
 * Serviço de Bairros
 */
export const bairroService = {
  /**
   * Lista todos os bairros ativos
   */
  async listar(): Promise<Bairro[]> {
    return apiClient.get<Bairro[]>('/bairros');
  },

  /**
   * Valida bairro e retorna taxa oficial do backend
   */
  async validar(nome: string): Promise<{ valido: boolean; taxa: number }> {
    return apiClient.post<{ valido: boolean; taxa: number }>('/bairros/validar', { nome });
  },
};

/**
 * Exportação padrão com todos os serviços
 */
const api = {
  produtos: produtoService,
  pedidos: pedidoService,
  bairros: bairroService,
};

export default api;
