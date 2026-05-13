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
    numero?: string;
    quadra?: string;
    lote?: string;
    complemento?: string;
  };
  itens: ItemPedido[];
  observacao?: string;
  pagamento?: {
    forma: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
    trocoPara?: number;
  };
  tipoAtendimento?: 'ENTREGA' | 'RETIRADA' | 'CONSUMO_LOCAL';
}

export interface Pedido {
  id: string;
  numero?: number | string;
  clienteTelefone: string;
  clienteNome: string;
  formaPagamento: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | string;
  trocoParaValor?: number;
  tipoAtendimento?: 'ENTREGA' | 'RETIRADA' | 'CONSUMO_LOCAL';
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
    | 'AGUARDANDO_PAGAMENTO'
    | 'CONFIRMADO'
    | 'PREPARANDO'
    | 'PRONTO'
    | 'SAIU_ENTREGA'
    | 'ENTREGUE'
    | 'EXPIRADO'
    | 'ABANDONADO'
    | 'CANCELADO'
    | 'pendente'
    | 'aguardando_pagamento'
    | 'confirmado'
    | 'preparando'
    | 'pronto'
    | 'saiu_entrega'
    | 'entregue'
    | 'expirado'
    | 'abandonado'
    | 'cancelado';
  observacao?: string;
  observacoes?: string;
  pagamentoId?: string;
  linkPagamento?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixTicketUrl?: string;
  tokenAcesso?: string;
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

export interface PixCheckoutData {
  pedidoId: string;
  pagamentoId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  expiraEm: string | null;
}

export interface AdminPedidoListaItem {
  id: string;
  numero: string;
  status: string;
  aguardandoEntregador?: boolean;
  statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'A_RECEBER' | 'EXPIRADO';
  formaPagamento?: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
  trocoPara?: number | null;
  tipoAtendimento?: 'ENTREGA' | 'RETIRADA' | 'CONSUMO_LOCAL';
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
  aguardandoEntregador?: boolean;
  statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'A_RECEBER' | 'EXPIRADO';
  formaPagamento?: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
  trocoPara?: number | null;
  tipoAtendimento?: 'ENTREGA' | 'RETIRADA' | 'CONSUMO_LOCAL';
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
  ativo: boolean;
  totalPedidos: number;
  valorGasto: number;
  ticketMedio: number;
  segmento: 'NOVO' | 'ATIVO' | 'EM_RISCO' | 'INATIVO' | 'VIP';
  mensagemSugerida: string;
  primeiroPedido: string | null;
  ultimoPedido: string | null;
  diaFavorito: string | null;
  topProdutos: Array<{ nome: string; quantidade: number }>;
  diasSemPedir: number | null;
  pedidosRecentes: Array<{
    id: string;
    numero: string;
    criadoEm: string;
    status: string;
    total: number;
    formaPagamento: string;
    itens: Array<{ nome: string; quantidade: number }>;
  }>;
  emListaNegra: boolean;
  motivoListaNegra: string | null;
  nivelListaNegra: number | null;
  totalOcorrencias: number;
}

export interface ClienteGestaoItem {
  telefone: string;
  nome: string;
  bairro: string;
  endereco: string;
  ativo: boolean;
  origem: string;
  criadoEm: string;
  ultimoPedidoEm: string | null;
  diasSemPedir: number;
  totalPedidos: number;
  totalGasto: number;
  ticketMedio: number;
  segmento: 'NOVO' | 'ATIVO' | 'EM_RISCO' | 'INATIVO' | 'VIP';
  produtoFavorito: string | null;
  mensagemSugerida: string;
  ultimaMensagemEm: string | null;
  mensagensNaoLidas: number;
}

export interface ClienteGestaoMetricas {
  total: number;
  porSegmento: Record<'NOVO' | 'ATIVO' | 'EM_RISCO' | 'INATIVO' | 'VIP', number>;
  inativos: number;
  emRisco: number;
  potencialRecuperacao: number;
}

export interface WhatsAppStatusAdmin {
  instanceName: string;
  conectado: boolean;
  state: string;
}

export interface WhatsAppSetupAdmin extends WhatsAppStatusAdmin {
  qrCodeBase64: string | null;
}

export interface WhatsAppConfigInstancia {
  rejectCall?: boolean;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export interface WhatsAppDetalhesAdmin extends WhatsAppStatusAdmin {
  existe: boolean;
  telefone: string | null;
  nomePerfil: string | null;
  fotoPerfil: string | null;
  ultimaConexao: string | null;
  configs: WhatsAppConfigInstancia;
}

export interface MotoboyAdmin {
  id: string;
  nome: string;
  telefone: string;
  empresa: 'PROPRIO' | 'IFOOD' | 'MUVE' | 'FOOD99';
  status: 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO';
  tipoRemuneracao?: 'FIXO_POR_ENTREGA' | 'PERCENTUAL_TAXA';
  valorFixoPorEntrega?: number | null;
  percentualEntregas?: number | null;
}

export interface AcertoMotoboy {
  motoboy: MotoboyAdmin;
  periodo: { inicio: string; fim: string };
  totalEntregas: number;
  totalTaxas: number;
  totalPedidos: number;
  valorAcerto: number;
  entregas: Array<{ id: string; numero: number | null; taxaEntrega: number; total: number; data: string }>;
}

export interface MotoboyStatusAdmin extends MotoboyAdmin {
  rotasAtivas: number;
  pedidosAtivos: string[];
  entregasHoje: number;
}

export interface LojaStatusAdmin {
  status: 'ABERTO' | 'FECHADO' | 'PAUSADO';
  mensagem?: string | null;
  entregadoresDisponiveisDia: number;
  atualizadoEm: string;
}

export interface MercadoPagoConfigAdmin {
  ativo: boolean;
  publicKey: string;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  accessTokenConfigured: boolean;
  atualizadoEm: string;
}

export interface SugestaoIA {
  id: string;
  tipo: 'PREPARO_ACIMA_MEDIA' | 'AGRUPAR_ENTREGAS' | 'CLIENTE_INATIVO' | 'CANCELAMENTOS_ITEM' | 'TODOS_MOTOBOYS_OCUPADOS' | 'WHATSAPP_ACUMULADO';
  texto: string;
  acao?: string;
  dados?: Record<string, any>;
  criadaEm: string;
}

export interface MetricasCampanha {
  campanhaId: string;
  nome: string;
  totalDestinatarios: number;
  enviados: number;
  falhas: number;
  conversoes: number;
  taxaConversao: string;
  custoEstimadoPorMensagem: number;
  custoTotal: number;
  receitaGerada: number;
  roiMultiplo: string;
}

export interface MineracaoJobProgresso {
  processados: number;
  total: number;
  fase: 'LOOKUP' | 'SCRAPING' | 'ASSERTIVA' | 'SALVANDO';
  percentual: number;
}

export interface MineracaoJob {
  runId: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHA';
  progresso: MineracaoJobProgresso | null;
  resultado?: ExecucaoMineracao;
  erro?: string;
  criadoEm: string;
}

export interface ExecucaoMineracao {
  id: string;
  runId: string;
  modo: string;
  termo: string;
  filtros?: Record<string, any>;
  status: 'SUCESSO' | 'FALHA' | string;
  erro?: string | null;
  totalImoveis: number;
  totalIptus: number;
  contatosGerados: number;
  contatosUteis: number;
  duracoes?: Record<string, any>;
  criadoPor?: string | null;
  criadoEm: string;
  campanha?: CampanhaMarketing | null;
}

export interface LeadEngajado {
  id: string;
  telefone: string;
  nome?: string | null;
  bairro?: string | null;
  status: string;
  humanRequired: boolean;
  ultimaInteracaoEm: string;
  criadoEm: string;
  ultimaMensagem: { texto: string; origem: 'HUMANO' | 'IA' | 'SISTEMA'; criadoEm: string } | null;
}

export interface MensagemLead {
  id: string;
  origem: 'HUMANO' | 'IA' | 'SISTEMA';
  texto: string;
  lida: boolean;
  criadoEm: string;
}

export interface LeadConversa {
  id: string;
  telefone: string;
  nome?: string | null;
  bairro?: string | null;
  status: string;
  humanRequired: boolean;
  mensagens: MensagemLead[];
}

export interface LeadMarketing {
  id: string;
  telefone: string;
  cpfCnpj?: string | null;
  telefones?: string[] | null;
  nome?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  origemMineracao: string;
  status: 'ATIVO' | 'CONVERTIDO' | 'INVALIDO' | 'OPT_OUT';
  convertidoEm?: string | null;
  clienteTelefone?: string | null;
  criadoEm: string;
}

export interface CampanhaMarketing {
  id: string;
  nome: string;
  mensagem: string;
  status: 'RASCUNHO' | 'AGENDADA' | 'ENVIANDO' | 'CONCLUIDA' | 'FALHA' | 'DESATIVADA';
  filtro?: Record<string, any>;
  criadoEm: string;
  atualizadoEm?: string;
  enviadaEm?: string | null;
  agendadaPara?: string | null;
  erro?: string | null;
  destinatarios?: Array<{
    id: string;
    statusEnvio: string;
    motivoFalha?: string | null;
    enviadoEm?: string | null;
    criadoEm?: string;
    lead?: LeadMarketing;
  }>;
}

export interface LocalMineracao {
  modo: 'bairro' | 'rua' | 'condominio' | 'empreendimento' | 'endereco' | 'iptu';
  nome: string;
  bairro?: string | null;
  logradouro?: string | null;
  tipo: 'BAIRRO' | 'RUA' | 'CONDOMINIO';
  totalIptus: number;
}

export interface IptuMineracao {
  nrinscr: string;
  // campos prefeitura (legado)
  nmbairro?: string | null;
  nmlogradou?: string | null;
  nrimovel?: string | null;
  incompl?: string | null;
  nrquadra?: string | null;
  nrlote?: string | null;
  nmedificio?: string | null;
  // campos Geo360
  inscricaoCartografica?: string | null;
  nomePessoa?: string | null;
  cpfCnpj?: string | null;
  bairro?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  // score de qualidade calculado no servidor
  score?: number;
  telefonesConhecidos?: number | null;
}

export interface RelatorioDia {
  id?: string;
  data: string;
  pedidosRecebidos: number;
  pedidosEntregues: number;
  pedidosCancelados: number;
  motivosCancelamento: Record<string, number> | null;
  tempoMedioPreparo: number | null;
  tempoMedioEntrega: number | null;
  receitaBruta: number;
  ticketMedio: number;
  receitaOntem: number | null;
  mensagensRespondidas: number;
  mensagensTotal: number;
  piorHorario: string | null;
  produtoMaisVendido: string | null;
  entregasRealizadas: number;
  taxaEntregaTotal: number;
  entregasPorResponsavel: Array<{
    responsavel: string;
    quantidade: number;
    taxaTotal: number;
  }> | null;
  entregasPorHora: Array<{
    hora: string;
    quantidade: number;
  }> | null;
  tempoMedioPorEtapa?: Array<{
    status: string;
    mediaSegundos: number;
    amostras: number;
  }> | null;
}

export interface ConfiguracaoAlerta {
  id?: string;
  tipo: string;
  ativo: boolean;
  threshold: number;
  acao: string;
}

export interface ConversaNaoLida {
  telefone: string;
  nome: string;
  mensagensNaoLidas: number;
  ultimaMensagem: string;
  ultimaMensagemEm: string;
  tempoSemRespostaSegundos: number;
  pedidoAtivo: { id: string; status: string } | null;
}

export interface FilaUrgenteItem {
  id: string;
  numero: string;
  clienteNome: string;
  clienteTelefone: string;
  tipo: 'PAGAMENTO_PENDENTE' | 'SLA_ESTOURADO' | 'MENSAGEM_SEM_RESPOSTA' | 'ESTORNO_PENDENTE';
  tempoEsperaSegundos: number;
  status: string;
  itensResumo: string[];
}

export interface AdminMetricas {
  total: number;
  pedidosHoje: number;
  receitaDia: number;
  receitaOntem: number;
  variacaoReceita: number | null;
  mensagensNaoLidas: number;
  aguardandoPagamento: number;
  aguardandoAprovacao: number;
  emPreparo: number;
  aguardandoEntregador: number;
  prontoParaRetirada: number;
  tempoMedioAguardandoEntregadorMs: number | null;
  emRota: number;
  entregues: number;
  entreguesHoje: number;
  cancelados: number;
  canceladosHoje: number;
  taxaCancelamento: number;
  tempoMedioPreparo: number | null;
  expirados: number;
  porStatus: Record<string, number>;
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

export interface RotaPedido {
  id: string;
  clienteTelefone: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairroEntrega: string;
  lat: number | null;
  lng: number | null;
  valorTotal: number;
  motoboyId: string | null;
}

export interface ParadaRota {
  ordem: number;
  pedidoId: string;
  clienteTelefone: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairroEntrega: string;
  lat: number | null;
  lng: number | null;
  valorTotal: number;
  distanciaKm: number;
}

export interface GrupoRota {
  pedidos: ParadaRota[];
  distanciaTotalKm: number;
  estimativaMinutos: number;
  lojaLat: number;
  lojaLng: number;
}

export interface AgruparRotaResult {
  grupo: GrupoRota;
  semCoordenadas: RotaPedido[];
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
  getTokenByPedidoId(id: string): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(`rancho:pedido:token:${id}`);
  },

  setTokenByPedidoId(id: string, token: string) {
    if (typeof window === 'undefined' || !token) return;
    window.localStorage.setItem(`rancho:pedido:token:${id}`, token);
  },

  /**
   * Cria novo pedido
   */
  async criar(dados: CriarPedidoDTO): Promise<Pedido> {
    const key = typeof window !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const pedido = await apiClient.postWithHeaders<Pedido>('/pedidos', dados, {
      'Idempotency-Key': key,
    });
    if ((pedido as any).tokenAcesso) {
      this.setTokenByPedidoId(pedido.id, (pedido as any).tokenAcesso);
    }
    return pedido;
  },

  /**
   * Busca pedido por ID
   */
  async buscarPorId(id: string): Promise<Pedido> {
    const token = this.getTokenByPedidoId(id);
    const endpoint = token
      ? `/pedidos/${id}?token=${encodeURIComponent(token)}`
      : `/pedidos/${id}`;
    return apiClient.get<Pedido>(endpoint);
  },

  /**
   * Lista pedidos de um cliente
   */
  async listarPorCliente(telefone: string): Promise<Pedido[]> {
    return apiClient.get<Pedido[]>(`/pedidos/cliente/${telefone}`);
  },

  async reorder(id: string): Promise<Pedido> {
    const token = this.getTokenByPedidoId(id);
    const endpoint = token
      ? `/pedidos/reorder/${id}?token=${encodeURIComponent(token)}`
      : `/pedidos/reorder/${id}`;
    const key = typeof window !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const novo = await apiClient.postWithHeaders<Pedido>(endpoint, {}, { 'Idempotency-Key': key });
    if ((novo as any).tokenAcesso) {
      this.setTokenByPedidoId(novo.id, (novo as any).tokenAcesso);
    }
    return novo;
  },

  async gerarPagamentoPix(id: string): Promise<PixCheckoutData> {
    const token = this.getTokenByPedidoId(id);
    const endpoint = token
      ? `/pedidos/${id}/pagamento/pix?token=${encodeURIComponent(token)}`
      : `/pedidos/${id}/pagamento/pix`;
    return apiClient.post(endpoint, {});
  },

  async avaliarNps(id: string, nota: number, feedback?: string): Promise<{ id: string; npsNota: number; npsFeedback?: string | null; atualizadoEm: string }> {
    const token = this.getTokenByPedidoId(id);
    const endpoint = token
      ? `/pedidos/${id}/nps?token=${encodeURIComponent(token)}`
      : `/pedidos/${id}/nps`;
    return apiClient.post(endpoint, { nota, feedback });
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

  async obterStatusMotoboys(): Promise<MotoboyStatusAdmin[]> {
    return apiClient.get<MotoboyStatusAdmin[]>('/admin/motoboys/status');
  },

  async listarMotoboys(): Promise<MotoboyAdmin[]> {
    return apiClient.get<MotoboyAdmin[]>('/admin/motoboys');
  },

  async criarMotoboy(payload: { nome: string; telefone: string; empresa?: 'PROPRIO' | 'IFOOD' | 'MUVE' | 'FOOD99'; status?: 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO' }): Promise<MotoboyAdmin> {
    return apiClient.post<MotoboyAdmin>('/admin/motoboys', payload);
  },
  async atualizarMotoboy(id: string, payload: { tipoRemuneracao?: string; valorFixoPorEntrega?: number | null; percentualEntregas?: number | null }): Promise<MotoboyAdmin> {
    return apiClient.patch<MotoboyAdmin>(`/admin/motoboys/${id}`, payload);
  },
  async acertoMotoboy(id: string, inicio: string, fim: string): Promise<AcertoMotoboy> {
    return apiClient.get<AcertoMotoboy>(`/admin/motoboys/${id}/acerto?inicio=${inicio}&fim=${fim}`);
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

  async atualizarStatusLoja(status: 'ABERTO' | 'FECHADO' | 'PAUSADO', mensagem?: string, entregadoresDisponiveisDia?: number): Promise<LojaStatusAdmin> {
    return apiClient.patch<LojaStatusAdmin>('/admin/loja/status', { status, mensagem, entregadoresDisponiveisDia });
  },

  async clientesGeolocalizados(): Promise<Array<{ telefone: string; nome: string; bairro: string; endereco: string; lat: number; lng: number; nrinscr: string | null; totalPedidos: number }>> {
    return apiClient.get('/admin/clientes/geo');
  },

  async obterLocalizacaoLoja(): Promise<{ endereco: string | null; lat: number | null; lng: number | null }> {
    return apiClient.get('/admin/loja/localizacao');
  },

  async atualizarLocalizacaoLoja(endereco: string, lat: number, lng: number): Promise<{ endereco: string | null; lat: number | null; lng: number | null }> {
    return apiClient.patch('/admin/loja/localizacao', { endereco, lat, lng });
  },

  async pedidosProntos(): Promise<RotaPedido[]> {
    return apiClient.get('/admin/entregas/prontos');
  },

  async agruparRota(opts?: { pedidoIds?: string[]; maxPorGrupo?: number; raioKm?: number }): Promise<AgruparRotaResult> {
    return apiClient.post('/admin/entregas/agrupar', opts ?? {});
  },

  async despacharGrupo(pedidoIds: string[], motoboyId: string | null): Promise<{ despachados: number }> {
    return apiClient.post('/admin/entregas/despachar', { pedidoIds, motoboyId });
  },

  async obterFilaUrgente(): Promise<FilaUrgenteItem[]> {
    return apiClient.get<FilaUrgenteItem[]>('/admin/fila-urgente');
  },

  async obterMetricas(): Promise<AdminMetricas> {
    return apiClient.get<AdminMetricas>('/admin/metricas');
  },

  async obterFaixasEntrega(): Promise<Array<{ ateKm: number; tipo: 'GRATIS' | 'FIXO' | 'POR_KM'; valor: number }>> {
    return apiClient.get('/admin/loja/faixas-entrega');
  },

  async salvarFaixasEntrega(faixas: Array<{ ateKm: number; tipo: 'GRATIS' | 'FIXO' | 'POR_KM'; valor: number }>): Promise<void> {
    return apiClient.put('/admin/loja/faixas-entrega', faixas);
  },
};

export const adminClienteService = {
  async criar(payload: {
    telefone: string;
    nome: string;
    endereco: string;
    bairro: string;
    origem?: 'SITE' | 'WHATSAPP' | 'MINERACAO' | 'INDICACAO' | 'CAMPANHA';
  }): Promise<any> {
    return apiClient.post('/admin/clientes', payload);
  },

  async listarGestao(params?: { segmento?: string; busca?: string; limite?: number }): Promise<ClienteGestaoItem[]> {
    const qs = new URLSearchParams();
    if (params?.segmento) qs.set('segmento', params.segmento);
    if (params?.busca) qs.set('busca', params.busca);
    if (params?.limite) qs.set('limite', String(params.limite));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<ClienteGestaoItem[]>(`/admin/clientes${suffix}`);
  },

  async obterMetricasGestao(): Promise<ClienteGestaoMetricas> {
    return apiClient.get<ClienteGestaoMetricas>('/admin/clientes/metricas');
  },

  async obterConversasNaoLidas(): Promise<ConversaNaoLida[]> {
    return apiClient.get<ConversaNaoLida[]>('/admin/conversas/nao-lidas');
  },

  async buscarClienteRapido(telefone: string): Promise<{
    telefone: string;
    nome: string;
    endereco: string;
    bairro: string;
    topProdutos: Array<{ id: string; nome: string; preco: number }>;
  } | null> {
    return apiClient.get(`/admin/clientes/buscar?telefone=${encodeURIComponent(telefone)}`);
  },

  async statusWhatsApp(): Promise<WhatsAppStatusAdmin> {
    return apiClient.get<WhatsAppStatusAdmin>('/admin/whatsapp/status');
  },

  async prepararWhatsApp(): Promise<WhatsAppSetupAdmin> {
    return apiClient.post<WhatsAppSetupAdmin>('/admin/whatsapp/setup', {});
  },

  async atualizarQrCodeWhatsApp(): Promise<WhatsAppSetupAdmin> {
    return apiClient.post<WhatsAppSetupAdmin>('/admin/whatsapp/qrcode', {});
  },
  async detalhesWhatsApp(): Promise<WhatsAppDetalhesAdmin> {
    return apiClient.get<WhatsAppDetalhesAdmin>('/admin/whatsapp/detalhes');
  },
  async desconectarWhatsApp(): Promise<{ desconectado: boolean }> {
    return apiClient.post('/admin/whatsapp/desconectar', {});
  },
  async apagarWhatsApp(): Promise<{ apagado: boolean }> {
    return apiClient.delete('/admin/whatsapp/apagar');
  },
  async atualizarConfigWhatsApp(configs: WhatsAppConfigInstancia): Promise<{ atualizado: boolean }> {
    return apiClient.patch('/admin/whatsapp/config', configs);
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

  async atualizarAtivo(telefone: string, ativo: boolean): Promise<any> {
    return apiClient.patch(`/admin/clientes/${telefone}/ativo`, { ativo });
  },

  async excluir(telefone: string): Promise<any> {
    return apiClient.delete(`/admin/clientes/${telefone}`);
  },

  async adicionarListaNegra(telefone: string, motivo: string): Promise<any> {
    return apiClient.post(`/admin/clientes/${telefone}/lista-negra`, { motivo });
  },

  async atualizarNivelListaNegra(telefone: string, nivel: number): Promise<any> {
    return apiClient.patch(`/admin/clientes/${telefone}/lista-negra/nivel`, { nivel });
  },

  async listarOcorrencias(telefone: string): Promise<Array<{ id: string; motivo: string; registradoPor: string | null; criadoEm: string }>> {
    return apiClient.get(`/admin/clientes/${telefone}/lista-negra/ocorrencias`);
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

export const adminIaService = {
  async obterSugestoes(): Promise<SugestaoIA[]> {
    return apiClient.get<SugestaoIA[]>('/admin/ia/sugestoes');
  },
};

export const adminRelatorioService = {
  async gerar(data?: string): Promise<RelatorioDia> {
    const query = data ? `?data=${encodeURIComponent(data)}` : '';
    return apiClient.get<RelatorioDia>(`/admin/relatorios/gerar${query}`);
  },

  async listar(limite = 30): Promise<RelatorioDia[]> {
    return apiClient.get<RelatorioDia[]>(`/admin/relatorios?limite=${limite}`);
  },
};

export const adminAlertaService = {
  async listar(): Promise<ConfiguracaoAlerta[]> {
    return apiClient.get<ConfiguracaoAlerta[]>('/admin/alertas');
  },

  async atualizar(tipo: string, dados: Partial<Pick<ConfiguracaoAlerta, 'ativo' | 'threshold' | 'acao'>>): Promise<ConfiguracaoAlerta> {
    return apiClient.patch<ConfiguracaoAlerta>(`/admin/alertas/${tipo}`, dados);
  },
};

export const adminPagamentoService = {
  async obterMercadoPago(): Promise<MercadoPagoConfigAdmin> {
    return apiClient.get<MercadoPagoConfigAdmin>('/admin/pagamentos/mercadopago');
  },

  async atualizarMercadoPago(payload: {
    ativo: boolean;
    publicKey?: string;
    accessToken?: string;
    webhookSecret?: string;
    webhookUrl?: string;
  }): Promise<MercadoPagoConfigAdmin> {
    return apiClient.patch<MercadoPagoConfigAdmin>('/admin/pagamentos/mercadopago', payload);
  },
};

export const adminAuthService = {
  async login(username: string, password: string): Promise<AdminLoginResponse> {
    return apiClient.post<AdminLoginResponse>('/admin/auth/login', { username, password });
  },
  async refresh(): Promise<AdminLoginResponse> {
    return apiClient.post<AdminLoginResponse>('/admin/auth/refresh', {});
  },
};

export const adminMineracaoService = {
  async executar(payload: { modo: 'bairro' | 'rua' | 'condominio' | 'empreendimento' | 'endereco' | 'iptu'; termo: string; filtros?: Record<string, unknown> }): Promise<{ runId: string }> {
    return apiClient.post<{ runId: string }>('/admin/mineracao/executar', payload);
  },
  async obterStatusJob(runId: string): Promise<MineracaoJob> {
    return apiClient.get<MineracaoJob>(`/admin/mineracao/jobs/${runId}`);
  },
  async buscarLocais(params: { modo: 'bairro' | 'rua' | 'condominio'; q: string }): Promise<LocalMineracao[]> {
    const query = new URLSearchParams({ modo: params.modo, q: params.q });
    return apiClient.get<LocalMineracao[]>(`/admin/mineracao/locais?${query.toString()}`);
  },
  async listarIptus(params: { modo: string; nome: string; bairro?: string | null; logradouro?: string | null; limit?: number }): Promise<IptuMineracao[]> {
    const query = new URLSearchParams({ modo: params.modo, nome: params.nome });
    if (params.bairro) query.set('bairro', params.bairro);
    if (params.logradouro) query.set('logradouro', params.logradouro);
    if (params.limit) query.set('limit', String(params.limit));
    return apiClient.get<IptuMineracao[]>(`/admin/mineracao/iptus?${query.toString()}`);
  },
  async listarExecucoes(limit = 30): Promise<ExecucaoMineracao[]> {
    return apiClient.get<ExecucaoMineracao[]>(`/admin/mineracao/execucoes?limit=${limit}`);
  },
  async listarLeads(params?: { status?: string; origem?: string; q?: string }): Promise<LeadMarketing[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.origem) query.set('origem', params.origem);
    if (params?.q) query.set('q', params.q);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<LeadMarketing[]>(`/admin/mineracao/leads${suffix}`);
  },
  async criarCampanha(payload: { nome: string; mensagem: string; filtro?: Record<string, unknown> }): Promise<CampanhaMarketing> {
    return apiClient.post<CampanhaMarketing>('/admin/mineracao/campanhas', payload);
  },
  async gerarVariacoesMensagem(payload: { intencao: string; bairro?: string; observacoes?: string }): Promise<{ variacoes: { titulo: string; mensagem: string }[] }> {
    return apiClient.post('/admin/mineracao/campanhas/gerar-mensagem', payload);
  },
  async listarCampanhas(limit = 50): Promise<CampanhaMarketing[]> {
    return apiClient.get<CampanhaMarketing[]>(`/admin/mineracao/campanhas?limit=${limit}`);
  },
  async obterCampanha(id: string): Promise<CampanhaMarketing> {
    return apiClient.get<CampanhaMarketing>(`/admin/mineracao/campanhas/${id}`);
  },
  async obterMetricasCampanha(id: string): Promise<MetricasCampanha> {
    return apiClient.get<MetricasCampanha>(`/admin/mineracao/campanhas/${id}/metricas`);
  },
  async atualizarStatusCampanha(id: string, status: CampanhaMarketing['status']): Promise<CampanhaMarketing> {
    return apiClient.patch<CampanhaMarketing>(`/admin/mineracao/campanhas/${id}/status`, { status });
  },
  async atualizarMensagemCampanha(id: string, mensagem: string): Promise<CampanhaMarketing> {
    return apiClient.patch<CampanhaMarketing>(`/admin/mineracao/campanhas/${id}/mensagem`, { mensagem });
  },
  async agendarCampanha(id: string, agendadaPara: string): Promise<CampanhaMarketing> {
    return apiClient.post<CampanhaMarketing>(`/admin/mineracao/campanhas/${id}/agendar`, { agendadaPara });
  },
  async cancelarAgendamentoCampanha(id: string): Promise<CampanhaMarketing> {
    return apiClient.post<CampanhaMarketing>(`/admin/mineracao/campanhas/${id}/cancelar-agendamento`, {});
  },
  async listarLeadsEngajados(limit = 50): Promise<LeadEngajado[]> {
    return apiClient.get<LeadEngajado[]>(`/admin/mineracao/leads-engajados?limit=${limit}`);
  },
  async obterConversaLead(id: string): Promise<LeadConversa> {
    return apiClient.get<LeadConversa>(`/admin/mineracao/leads/${id}/conversa`);
  },
  async excluirCampanha(id: string): Promise<{ id: string; removida: boolean }> {
    return apiClient.delete<{ id: string; removida: boolean }>(`/admin/mineracao/campanhas/${id}`);
  },
  async dispararCampanha(id: string): Promise<{ campanhaId: string; enviados: number; falhas: number }> {
    return apiClient.post(`/admin/mineracao/campanhas/${id}/disparar`, {});
  },
  async reenviarFalhasCampanha(id: string): Promise<{ reenviados: number; total: number; ignorados: number }> {
    return apiClient.post(`/admin/mineracao/campanhas/${id}/reenviar-falhas`, {});
  },
  async adicionarLeadManualCampanha(id: string, payload: { telefone: string; nome?: string; bairro?: string }): Promise<{ adicionado: boolean; ja_existia?: boolean; leadId: string }> {
    return apiClient.post(`/admin/mineracao/campanhas/${id}/adicionar-lead`, payload);
  },
  async removerDestinatarioCampanha(campanhaId: string, destinatarioId: string): Promise<{ removido: boolean }> {
    return apiClient.delete(`/admin/mineracao/campanhas/${campanhaId}/destinatarios/${destinatarioId}`);
  },
  async sincronizarCoordenadas(): Promise<{ runId: string }> {
    return apiClient.post<{ runId: string }>('/admin/mineracao/prefeitura/sincronizar-coordenadas', {});
  },
  async coberturaMapa() {
    return apiClient.get<any[]>('/admin/mineracao/mapa/cobertura');
  },
  async analytics(periodo: '30d' | '90d' | 'all') {
    return apiClient.get<any>(`/admin/mineracao/analytics?periodo=${periodo}`);
  },
};

export const mineracaoApi = adminMineracaoService;

/**
 * Exportação padrão com todos os serviços
 */
const api = {
  produtos: produtoService,
  pedidos: pedidoService,
  loja: lojaService,
  adminPedidos: adminPedidoService,
  adminClientes: adminClienteService,
  adminAlertas: adminAlertaService,
  adminPagamentos: adminPagamentoService,
  adminRelatorios: adminRelatorioService,
  adminIa: adminIaService,
  adminAuth: adminAuthService,
  adminMineracao: adminMineracaoService,
  bairros: bairroService,
};

export default api;
