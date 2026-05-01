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
  tempoPreparo?: number;
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

export interface AdminPedidoListaItem {
  id: string;
  numero: string;
  status: string;
  statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'EXPIRADO';
  clienteNome: string;
  clienteTelefone: string;
  bairro: string;
  itensResumo: string[];
  total: number;
  createdAt: string;
  tempoNoEstagio: number;
}

export interface AdminPedidoDetalhe {
  id: string;
  numero: string;
  status: string;
  statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'EXPIRADO';
  pagamentoId?: string | null;
  observacao?: string | null;
  subtotal: number;
  taxaEntrega: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  tempoNoEstagio: number;
  cliente: {
    nome: string;
    telefone: string;
    endereco: string;
    bairro: string;
  };
  itens: Array<{
    id: string;
    quantidade: number;
    precoUnit: number;
    subtotal: number;
    observacao?: string | null;
    produto: {
      id: string;
      nome: string;
      categoria: string;
      preco: number;
    } | null;
  }>;
  motoboy: null;
  timeline: Array<{
    timestamp: string;
    ator: string;
    acao: string;
  }>;
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

export const adminPedidoService = {
  async listar(params?: { status?: string; busca?: string }): Promise<AdminPedidoListaItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.busca) query.set('busca', params.busca);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<AdminPedidoListaItem[]>(`/admin/pedidos${suffix}`);
  },

  async buscarPorId(id: string): Promise<AdminPedidoDetalhe> {
    return apiClient.get<AdminPedidoDetalhe>(`/admin/pedidos/${id}`);
  },

  async atualizarStatus(id: string, status: string): Promise<{ id: string; status: string; atualizadoEm: string }> {
    return apiClient.patch<{ id: string; status: string; atualizadoEm: string }>(`/admin/pedidos/${id}/status`, { status });
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
  adminPedidos: adminPedidoService,
  bairros: bairroService,
};

export default api;
