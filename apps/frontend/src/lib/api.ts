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
    cep?: string;
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
  mensagensNaoLidas: number;
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
  observacaoEntrega?: string | null;
  canceladoMotivo?: string | null;
  estornoNecessario?: boolean;
  estornoRealizadoEm?: string | null;
  motoboy: {
    id: string;
    nome: string;
    telefone: string;
    status: 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO';
  } | null;
  timeline: Array<{
    timestamp: string;
    ator: string;
    acao: string;
  }>;
}

export interface MensagemClienteAdmin {
  id: string;
  clienteTelefone: string;
  pedidoId?: string | null;
  origem: 'HUMANO' | 'SISTEMA' | 'IA';
  texto: string;
  lida: boolean;
  criadoEm: string;
}

export interface ClienteResumoAdmin {
  telefone: string;
  nome: string;
  endereco: string;
  bairro: string;
  origem: string;
  totalPedidos: number;
  valorGasto: number;
  primeiroPedido: string | null;
  ultimoPedido: string | null;
  diaFavorito: string | null;
  topProdutos: Array<{ nome: string; quantidade: number }>;
  diasSemPedir: number | null;
  emListaNegra: boolean;
  motivoListaNegra: string | null;
}

export interface WhatsAppStatusAdmin {
  instanceName: string;
  conectado: boolean;
  state: string;
}

export interface WhatsAppSetupAdmin extends WhatsAppStatusAdmin {
  qrCodeBase64: string | null;
}

export interface MotoboyAdmin {
  id: string;
  nome: string;
  telefone: string;
  status: 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO';
}

export interface LojaStatusAdmin {
  status: 'ABERTO' | 'FECHADO' | 'PAUSADO';
  mensagem?: string | null;
  atualizadoEm: string;
}

export interface AdminMetricas {
  total: number;
  pedidosHoje: number;
  receitaDia: number;
  mensagensNaoLidas: number;
  aguardandoPagamento: number;
  aguardandoAprovacao: number;
  emPreparo: number;
  aguardandoEntregador: number;
  emRota: number;
  entregues: number;
  cancelados: number;
  expirados: number;
  porStatus: Record<string, number>;
  atualizadoEm: string;
}

export type TipoAlertaOperacional =
  | 'PEDIDO_PAGO_SEM_CONFIRMACAO'
  | 'CLIENTE_SEM_RESPOSTA'
  | 'PREPARO_ATRASADO'
  | 'PEDIDO_SEM_ENTREGADOR'
  | 'ESTORNO_NECESSARIO'
  | 'WHATSAPP_INDISPONIVEL'
  | 'FALHA_ENVIO_WHATSAPP'
  | 'ENDERECO_DUVIDOSO';

export type SeveridadeAlerta = 'INFO' | 'ATENCAO' | 'CRITICO';
export type StatusAlerta = 'ABERTO' | 'EM_TRATAMENTO' | 'RESOLVIDO' | 'IGNORADO';
export type AcaoRecomendada =
  | 'CONFIRMAR_PEDIDO'
  | 'RESPONDER_CLIENTE'
  | 'VERIFICAR_COZINHA'
  | 'ATRIBUIR_ENTREGADOR'
  | 'MARCAR_ESTORNO'
  | 'RECONECTAR_WHATSAPP'
  | 'REVISAR_ENDERECO'
  | 'ACOMPANHAR';

export interface AdminDecisaoPedidoResumo {
  id: string;
  numero: string;
  status: string;
  statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'EXPIRADO';
  clienteNome: string;
  clienteTelefone: string;
  bairro: string;
  total: number;
  tempoNoEstagio: number;
}

export interface AdminDecisaoItem {
  id: string;
  tipo: TipoAlertaOperacional;
  severidade: SeveridadeAlerta;
  status: StatusAlerta;
  titulo: string;
  descricao: string;
  motivo: string;
  proximaAcao: AcaoRecomendada;
  acaoPayload?: unknown;
  tempoPendenteSegundos: number;
  detectadoEm: string;
  atualizadoEm: string;
  resolvidoEm?: string | null;
  pedido: AdminDecisaoPedidoResumo | null;
  clienteTelefone?: string | null;
}

export interface AdminDecisaoMetricas {
  abertos: number;
  criticos: number;
  atencao: number;
  clientesSemResposta: number;
  pagosSemConfirmacao: number;
  preparoAtrasado: number;
  estornosPendentes: number;
  whatsappDisponivel: boolean | null;
  atualizadoEm: string;
}

export interface Bairro {
  id: string;
  nome: string;
  cep?: string;
  taxa: number;
  taxaEntrega: number;
  tempoEntregaMin: number;
  tempoEntrega?: number;
  ativo: boolean;
  linkIfood?: string | null;
  link99food?: string | null;
  linkOutro?: string | null;
  nomeOutro?: string | null;
}

export interface AdminLoginResponse {
  token: string;
  expiresIn: number;
}

export type ProdutoPayload = {
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  midia?: string;
  disponivel?: boolean;
  ordem?: number;
  tempoPreparo?: number;
};

export type BairroPayload = {
  nome: string;
  cep?: string;
  taxa: number;
  tempoEntrega?: number;
  ativo?: boolean;
  linkIfood?: string;
  link99food?: string;
  linkOutro?: string;
  nomeOutro?: string;
};

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

  async criar(payload: ProdutoPayload): Promise<Produto> {
    return apiClient.post<Produto>('/produtos', payload);
  },

  async atualizar(id: string, payload: ProdutoPayload): Promise<Produto> {
    return apiClient.put<Produto>(`/produtos/${id}`, payload);
  },

  async excluir(id: string): Promise<Produto> {
    return apiClient.delete<Produto>(`/produtos/${id}`);
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

export const lojaService = {
  async obterStatus(): Promise<LojaStatusAdmin> {
    return apiClient.get<LojaStatusAdmin>('/loja/status');
  },
};

export const adminPedidoService = {
  async listar(params?: { status?: string; busca?: string; page?: number; limit?: number }): Promise<{ data: AdminPedidoListaItem[]; pagination: { page: number; limit: number; total: number } }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.busca) query.set('busca', params.busca);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<{ data: AdminPedidoListaItem[]; pagination: { page: number; limit: number; total: number } }>(`/admin/pedidos${suffix}`);
  },

  async buscarPorId(id: string): Promise<AdminPedidoDetalhe> {
    return apiClient.get<AdminPedidoDetalhe>(`/admin/pedidos/${id}`);
  },

  async atualizarStatus(id: string, status: string): Promise<{ id: string; status: string; atualizadoEm: string }> {
    return apiClient.patch<{ id: string; status: string; atualizadoEm: string }>(`/admin/pedidos/${id}/status`, { status });
  },

  async listarMotoboys(): Promise<MotoboyAdmin[]> {
    return apiClient.get<MotoboyAdmin[]>('/admin/motoboys');
  },

  async atribuirMotoboy(id: string, motoboyId: string | null, observacaoEntrega?: string): Promise<any> {
    return apiClient.patch(`/admin/pedidos/${id}/motoboy`, { motoboyId, observacaoEntrega });
  },

  async atualizarEnderecoEntrega(id: string, endereco: string, bairro: string): Promise<any> {
    return apiClient.patch(`/admin/pedidos/${id}/endereco`, { endereco, bairro });
  },

  async criarManual(payload: any): Promise<any> {
    return apiClient.post('/admin/pedidos/manual', payload);
  },

  async cancelar(id: string, motivo: string): Promise<any> {
    return apiClient.post(`/admin/pedidos/${id}/cancelar`, { motivo });
  },

  async marcarEstorno(id: string): Promise<any> {
    return apiClient.patch(`/admin/pedidos/${id}/estorno`, {});
  },

  async obterStatusLoja(): Promise<LojaStatusAdmin> {
    return apiClient.get<LojaStatusAdmin>('/admin/loja/status');
  },

  async atualizarStatusLoja(status: 'ABERTO' | 'FECHADO' | 'PAUSADO', mensagem?: string): Promise<LojaStatusAdmin> {
    return apiClient.patch<LojaStatusAdmin>('/admin/loja/status', { status, mensagem });
  },

  async obterMetricas(): Promise<AdminMetricas> {
    return apiClient.get<AdminMetricas>('/admin/metricas');
  },
};

export const adminDecisaoService = {
  async listar(params?: {
    status?: StatusAlerta;
    severidade?: SeveridadeAlerta;
    tipo?: TipoAlertaOperacional;
    busca?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: AdminDecisaoItem[]; pagination: { page: number; limit: number; total: number } }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.severidade) query.set('severidade', params.severidade);
    if (params?.tipo) query.set('tipo', params.tipo);
    if (params?.busca) query.set('busca', params.busca);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get(`/admin/decisoes${suffix}`);
  },

  async obterMetricas(): Promise<AdminDecisaoMetricas> {
    return apiClient.get<AdminDecisaoMetricas>('/admin/decisoes/metricas');
  },

  async atualizarStatus(id: string, status: StatusAlerta): Promise<AdminDecisaoItem> {
    return apiClient.patch<AdminDecisaoItem>(`/admin/decisoes/${id}/status`, { status });
  },

  async resolver(id: string, status: 'RESOLVIDO' | 'IGNORADO' = 'RESOLVIDO', motivo?: string): Promise<AdminDecisaoItem> {
    return apiClient.patch<AdminDecisaoItem>(`/admin/decisoes/${id}/resolver`, { status, motivo });
  },

  async recalcular(payload: { escopo?: 'ABERTOS' | 'TODOS_ATIVOS' | 'PEDIDO'; pedidoId?: string } = {}): Promise<{ avaliados: number; criados: number; atualizados: number; resolvidos: number }> {
    return apiClient.post('/admin/decisoes/recalcular', payload);
  },
};

export const adminClienteService = {
  async statusWhatsApp(): Promise<WhatsAppStatusAdmin> {
    return apiClient.get<WhatsAppStatusAdmin>('/admin/whatsapp/status');
  },

  async prepararWhatsApp(): Promise<WhatsAppSetupAdmin> {
    return apiClient.post<WhatsAppSetupAdmin>('/admin/whatsapp/setup', {});
  },

  async atualizarQrCodeWhatsApp(): Promise<WhatsAppSetupAdmin> {
    return apiClient.post<WhatsAppSetupAdmin>('/admin/whatsapp/qrcode', {});
  },

  async listarMensagens(telefone: string, marcarComoLida = false): Promise<MensagemClienteAdmin[]> {
    const query = marcarComoLida ? '?marcarComoLida=true' : '';
    return apiClient.get<MensagemClienteAdmin[]>(`/admin/clientes/${telefone}/mensagens${query}`);
  },

  async enviarMensagem(telefone: string, texto: string, pedidoId?: string): Promise<MensagemClienteAdmin> {
    return apiClient.post<MensagemClienteAdmin>(`/admin/clientes/${telefone}/mensagens`, {
      texto,
      pedidoId,
    });
  },

  async obterResumo(telefone: string): Promise<ClienteResumoAdmin> {
    return apiClient.get<ClienteResumoAdmin>(`/admin/clientes/${telefone}`);
  },

  async adicionarListaNegra(telefone: string, motivo: string): Promise<any> {
    return apiClient.post(`/admin/clientes/${telefone}/lista-negra`, { motivo });
  },

  async removerListaNegra(telefone: string): Promise<any> {
    return apiClient.delete(`/admin/clientes/${telefone}/lista-negra`);
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

  async listarTodos(): Promise<Bairro[]> {
    return apiClient.get<Bairro[]>('/bairros/todos');
  },

  async consultarViaCep(cep: string): Promise<{ bairro: string; logradouro: string; localidade: string; uf: string; cep: string }> {
    return apiClient.get(`/bairros/viacep/${cep}`);
  },

  /**
   * Valida bairro e retorna taxa oficial do backend
   */
  async validar(nome: string): Promise<{ valido: boolean; taxa: number }> {
    return apiClient.post<{ valido: boolean; taxa: number }>('/bairros/validar', { nome });
  },

  async criar(payload: BairroPayload): Promise<Bairro> {
    return apiClient.post<Bairro>('/bairros', payload);
  },

  async atualizar(id: string, payload: Partial<BairroPayload>): Promise<Bairro> {
    return apiClient.put<Bairro>(`/bairros/${id}`, payload);
  },

  async excluir(id: string): Promise<Bairro> {
    return apiClient.delete<Bairro>(`/bairros/${id}`);
  },
};

export const adminAuthService = {
  async login(username: string, password: string): Promise<AdminLoginResponse> {
    return apiClient.post<AdminLoginResponse>('/admin/auth/login', { username, password });
  },
};

/**
 * Exportação padrão com todos os serviços
 */
const api = {
  produtos: produtoService,
  pedidos: pedidoService,
  loja: lojaService,
  adminPedidos: adminPedidoService,
  adminDecisoes: adminDecisaoService,
  adminClientes: adminClienteService,
  adminAuth: adminAuthService,
  bairros: bairroService,
};

export default api;
