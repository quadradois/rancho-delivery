'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, {
  AdminMetricas,
  AdminPedidoDetalhe,
  AdminPedidoListaItem,
  ClienteResumoAdmin,
  ConversaNaoLida,
  FilaUrgenteItem,
  LojaStatusAdmin,
  MensagemClienteAdmin,
  MotoboyAdmin,
  MotoboyStatusAdmin,
  Produto,
  RelatorioDia,
  SugestaoIA,
} from '@/lib/api';
import { formatCurrency, formatTime } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import useCockpitSocket from '@/hooks/useCockpitSocket';
import useCockpitAudio from '@/hooks/useCockpitAudio';
import {
  CentralWhatsApp,
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmInput,
  CrmModal,
  CrmTab,
  CrmTabList,
  CrmTabPanel,
  CrmTabTrigger,
  CrmTimer,
  FilaUrgente,
  ModalPedidoManual,
  ModalRelatorio,
  PainelIA,
  PainelMotoboys,
} from '@/components/crm';

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'AGUARDANDO_PAGAMENTO', label: 'Pag. Pendente' },
  { value: 'CONFIRMADO', label: 'Aprovação' },
  { value: 'PREPARANDO', label: 'Preparo' },
  { value: 'SAIU_ENTREGA', label: 'Em rota' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];
const STATUS_FLOW = ['AGUARDANDO_PAGAMENTO', 'CONFIRMADO', 'PREPARANDO', 'SAIU_ENTREGA', 'ENTREGUE'] as const;
const CANCEL_MOTIVOS = ['Cliente desistiu', 'Sem entregador disponível', 'Fora de área', 'Item indisponível', 'Pagamento não aprovado', 'Erro operacional'];

function toBadgeVariant(status: string) {
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO':
    case 'PENDENTE':
      return 'pending' as const;
    case 'CONFIRMADO':
      return 'waiting' as const;
    case 'PREPARANDO':
      return 'preparing' as const;
    case 'SAIU_ENTREGA':
      return 'on-route' as const;
    case 'ENTREGUE':
      return 'delivered' as const;
    case 'CANCELADO':
      return 'cancelled' as const;
    case 'EXPIRADO':
    case 'ABANDONADO':
      return 'expired' as const;
    default:
      return 'unpaid' as const;
  }
}

function labelStatus(status: string) {
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO':
      return 'Aguard. pagamento';
    case 'SAIU_ENTREGA':
      return 'Em rota';
    default:
      return status.replace('_', ' ').toLowerCase();
  }
}

function paymentIcon(statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'EXPIRADO') {
  if (statusPagamento === 'CONFIRMADO') return '🔒';
  if (statusPagamento === 'EXPIRADO') return '❌';
  return '⏳';
}

function slaByStatus(status: string) {
  switch (status) {
    case 'CONFIRMADO':
      return { warningAt: 180, dangerAt: 300 };
    case 'PREPARANDO':
      return { warningAt: 1500, dangerAt: 2100 };
    case 'SAIU_ENTREGA':
      return { warningAt: 3000, dangerAt: 3600 };
    default:
      return { warningAt: 300, dangerAt: 600 };
  }
}

function actorClass(ator: string) {
  switch (ator) {
    case 'OPERADOR':
      return 'border-[var(--color-info-subtle)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]';
    case 'SISTEMA':
      return 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]';
    case 'CLIENTE':
      return 'border-[var(--color-success-subtle)] bg-[var(--color-success-muted)] text-[var(--color-success-text)]';
    case 'IA':
      return 'border-[var(--color-warning-subtle)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]';
  }
}

function flowBadgeClass(flowStatus: string, currentStatus: string) {
  if (flowStatus === currentStatus) {
    return 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-surface)]';
  }
  return 'opacity-70';
}

export default function AdminPedidosPage() {
  const { showSuccess, showError } = useToast();
  const { muted, setMuted, playNewOrder, playMessage, playSla } = useCockpitAudio();
  const knownPedidoIdsRef = useRef<Set<string> | null>(null);
  const unreadTotalRef = useRef<number | null>(null);
  const [filaUrgente, setFilaUrgente] = useState<FilaUrgenteItem[]>([]);
  const [motoboyStatus, setMotoboyStatus] = useState<MotoboyStatusAdmin[]>([]);
  const [conversas, setConversas] = useState<ConversaNaoLida[]>([]);
  const [whatsappConectado, setWhatsappConectado] = useState(true);
  const [abaCockpit, setAbaCockpit] = useState<'pedidos' | 'whatsapp'>('pedidos');
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioDia | null>(null);
  const [relatorioHistorico, setRelatorioHistorico] = useState<RelatorioDia[]>([]);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [sugestoesIA, setSugestoesIA] = useState<SugestaoIA[]>([]);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [modoPico, setModoPico] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('rancho:cockpit:modo-pico') === 'true';
    }
    return false;
  });

  const toggleModoPico = useCallback(() => {
    setModoPico((prev) => {
      const next = !prev;
      window.localStorage.setItem('rancho:cockpit:modo-pico', String(next));
      return next;
    });
  }, []);

  // Auto-ativar modo pico quando há muitos pedidos ativos
  useEffect(() => {
    const ativos = pedidos.filter((p) =>
      !['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'].includes(p.status)
    ).length;
    if (ativos >= 8 && !modoPico) {
      setModoPico(true);
      window.localStorage.setItem('rancho:cockpit:modo-pico', 'true');
    }
  }, [pedidos, modoPico]);

  const [pedidos, setPedidos] = useState<AdminPedidoListaItem[]>([]);
  const [metricas, setMetricas] = useState<AdminMetricas | null>(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<AdminPedidoDetalhe | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [pageSize] = useState(50);
  const [mensagens, setMensagens] = useState<MensagemClienteAdmin[]>([]);
  const [clienteResumo, setClienteResumo] = useState<ClienteResumoAdmin | null>(null);
  const [textoMensagem, setTextoMensagem] = useState('');
  const [motivoListaNegra, setMotivoListaNegra] = useState('');
  const [motoboys, setMotoboys] = useState<MotoboyAdmin[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState('');
  const [observacaoEntrega, setObservacaoEntrega] = useState('');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [bairroEntrega, setBairroEntrega] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [manualPixLink, setManualPixLink] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState(CANCEL_MOTIVOS[0]);
  const [lojaStatus, setLojaStatus] = useState<LojaStatusAdmin | null>(null);
  const [mensagemPausa, setMensagemPausa] = useState('');
  const [manualForm, setManualForm] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cep: '',
    produtoId: '',
    quantidade: 1,
    pagamentoMetodo: 'PIX' as 'PIX' | 'DINHEIRO',
    valorDinheiro: '',
    observacao: '',
  });

  const carregarFilaUrgente = useCallback(async () => {
    try {
      const data = await api.adminPedidos.obterFilaUrgente();
      setFilaUrgente(data);
    } catch {
      // silencioso
    }
  }, []);

  const carregarMotoboyStatus = useCallback(async () => {
    try {
      const data = await api.adminPedidos.obterStatusMotoboys();
      setMotoboyStatus(data);
    } catch {
      // silencioso
    }
  }, []);

  const carregarConversas = useCallback(async () => {
    try {
      const data = await api.adminClientes.obterConversasNaoLidas();
      setConversas(data);
    } catch {
      // silencioso
    }
  }, []);

  const carregarStatusWhatsApp = useCallback(async () => {
    try {
      const data = await api.adminClientes.statusWhatsApp();
      setWhatsappConectado(data.conectado);
    } catch {
      setWhatsappConectado(false);
    }
  }, []);

  const carregarSugestoesIA = useCallback(async () => {
    setCarregandoIA(true);
    try {
      const data = await api.adminIa.obterSugestoes();
      setSugestoesIA(data);
    } catch {
      // silencioso
    } finally {
      setCarregandoIA(false);
    }
  }, []);

  const carregarLista = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingList(true);
    try {
      const response = await api.adminPedidos.listar({
        status: statusFiltro !== 'todos' ? statusFiltro : undefined,
        busca: buscaDebounced || undefined,
        page,
        limit: pageSize,
      });
      const data = response.data;
      setPedidos(data);
      setTotalPedidos(response.pagination.total);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (error: any) {
      showError('Falha ao carregar pedidos', error?.message || 'Tente novamente.');
    } finally {
      if (!opts?.silent) setLoadingList(false);
    }
  }, [statusFiltro, buscaDebounced, page, pageSize, selectedId, showError]);

  const carregarDetalhe = useCallback(async (id: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingDetail(true);
    try {
      const data = await api.adminPedidos.buscarPorId(id);
      setPedidoDetalhe(data);
      setSelectedMotoboyId(data.motoboy?.id || '');
      setObservacaoEntrega(data.observacaoEntrega || '');
      setEnderecoEntrega(data.cliente.endereco || '');
      setBairroEntrega(data.cliente.bairro || '');
    } catch (error: any) {
      showError('Falha ao carregar detalhe', error?.message || 'Tente novamente.');
    } finally {
      if (!opts?.silent) setLoadingDetail(false);
    }
  }, [showError]);

  const carregarResumoCliente = useCallback(async (telefone: string) => {
    try {
      const data = await api.adminClientes.obterResumo(telefone);
      setClienteResumo(data);
    } catch (error: any) {
      showError('Falha ao carregar cliente', error?.message || 'Tente novamente.');
    }
  }, [showError]);

  const carregarMensagens = useCallback(async (telefone: string, marcarComoLida = false) => {
    try {
      const data = await api.adminClientes.listarMensagens(telefone, marcarComoLida);
      setMensagens(data);
    } catch (error: any) {
      showError('Falha ao carregar mensagens', error?.message || 'Tente novamente.');
    }
  }, [showError]);

  const carregarMotoboys = useCallback(async () => {
    try {
      const data = await api.adminPedidos.listarMotoboys();
      setMotoboys(data);
    } catch (error: any) {
      showError('Falha ao carregar motoboys', error?.message || 'Tente novamente.');
    }
  }, [showError]);

  const carregarProdutos = useCallback(async () => {
    try {
      const data = await api.produtos.listar();
      const ativos = data.filter((produto) => produto.disponivel !== false);
      setProdutos(ativos);
      setManualForm((state) => {
        if (state.produtoId || ativos.length === 0) return state;
        return { ...state, produtoId: ativos[0].id };
      });
    } catch (error: any) {
      showError('Falha ao carregar produtos', error?.message || 'Tente novamente.');
    }
  }, [showError]);

  const carregarStatusLoja = useCallback(async () => {
    try {
      const data = await api.adminPedidos.obterStatusLoja();
      setLojaStatus(data);
      setMensagemPausa(data.mensagem || '');
    } catch (error: any) {
      showError('Falha ao carregar status da loja', error?.message || 'Tente novamente.');
    }
  }, [showError]);

  const carregarMetricas = useCallback(async () => {
    try {
      const data = await api.adminPedidos.obterMetricas();
      setMetricas(data);
    } catch (error: any) {
      showError('Falha ao carregar métricas', error?.message || 'Tente novamente.');
    }
  }, [showError]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setBuscaDebounced(busca.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    setPage(1);
  }, [statusFiltro]);

  useEffect(() => {
    void carregarLista();
    void carregarMotoboys();
    void carregarProdutos();
    void carregarStatusLoja();
    void carregarMetricas();
    void carregarFilaUrgente();
    void carregarMotoboyStatus();
    void carregarConversas();
    void carregarStatusWhatsApp();
    void carregarSugestoesIA();
  }, [carregarLista, carregarMotoboys, carregarProdutos, carregarStatusLoja, carregarMetricas, carregarFilaUrgente, carregarMotoboyStatus, carregarConversas, carregarStatusWhatsApp, carregarSugestoesIA]);

  useEffect(() => {
    if (selectedId) void carregarDetalhe(selectedId);
  }, [selectedId, carregarDetalhe]);

  useEffect(() => {
    if (!pedidoDetalhe?.cliente?.telefone) return;
    void carregarResumoCliente(pedidoDetalhe.cliente.telefone);
  }, [pedidoDetalhe?.cliente?.telefone, carregarResumoCliente]);

  useCockpitSocket({
    onPedidoNovo: () => {
      void carregarLista({ silent: true });
      void carregarMetricas();
      void carregarFilaUrgente();
      void carregarMotoboyStatus();
    },
    onPedidoAtualizado: (payload) => {
      void carregarLista({ silent: true });
      void carregarMetricas();
      void carregarFilaUrgente();
      void carregarMotoboyStatus();
      if (selectedId && payload?.id === selectedId) {
        void carregarDetalhe(selectedId, { silent: true });
      }
    },
    onMensagemNova: async (payload) => {
      if (pedidoDetalhe?.cliente?.telefone && payload?.telefone === pedidoDetalhe.cliente.telefone) {
        await carregarMensagens(pedidoDetalhe.cliente.telefone, false);
      }
      void carregarLista({ silent: true });
      void carregarMetricas();
      void carregarFilaUrgente();
      void carregarConversas();
    },
    onMetricasAtualizadas: (payload) => {
      setMetricas(payload as AdminMetricas);
    },
    onLojaStatus: (payload) => {
      setLojaStatus(payload as LojaStatusAdmin);
    },
    onFallbackPoll: () => {
      void carregarLista({ silent: true });
      void carregarMetricas();
      void carregarFilaUrgente();
      void carregarMotoboyStatus();
      if (selectedId) {
        void carregarDetalhe(selectedId, { silent: true });
      }
    },
  });

  const resumo = useMemo(
    () => ({
      total: pedidos.length,
      aprovacao: pedidos.filter((p) => p.status === 'CONFIRMADO').length,
      preparo: pedidos.filter((p) => p.status === 'PREPARANDO').length,
    }),
    [pedidos]
  );

  const unreadTotal = useMemo(
    () => pedidos.reduce((total, pedido) => total + pedido.mensagensNaoLidas, 0),
    [pedidos]
  );

  const hasSlaDanger = useMemo(
    () => pedidos.some((pedido) => {
      if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') return false;
      const sla = slaByStatus(pedido.status);
      return pedido.tempoNoEstagio >= sla.dangerAt;
    }),
    [pedidos]
  );

  const pedidoSemMotoboy = useMemo(
    () => pedidos.find((p) =>
      (p.status === 'PREPARANDO' || p.status === 'SAIU_ENTREGA') &&
      !motoboyStatus.some((m) => m.pedidosAtivos.includes(p.id))
    )?.id ?? null,
    [pedidos, motoboyStatus]
  );

  const metricItems = useMemo(() => {
    const d = metricas || {
      aguardandoPagamento: pedidos.filter((p) => p.statusPagamento === 'PENDENTE').length,
      aguardandoAprovacao: resumo.aprovacao,
      emPreparo: resumo.preparo,
      emRota: pedidos.filter((p) => p.status === 'SAIU_ENTREGA').length,
      mensagensNaoLidas: unreadTotal,
      receitaDia: pedidos.reduce((acc, p) => acc + p.total, 0),
      receitaOntem: 0,
      variacaoReceita: null as number | null,
      taxaCancelamento: 0,
      tempoMedioPreparo: null as number | null,
    };

    // semáforo: retorna classe CSS baseada em thresholds
    const semaforo = (valor: number, warn: number, danger: number) => {
      if (valor >= danger) return 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]';
      if (valor >= warn)  return 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]';
      return 'border-[var(--color-success-subtle)] bg-[var(--color-success-muted)] text-[var(--color-success-text)]';
    };

    const variacaoStr = d.variacaoReceita !== null && d.variacaoReceita !== undefined
      ? `${d.variacaoReceita >= 0 ? '+' : ''}${d.variacaoReceita}% vs ontem`
      : null;

    return [
      {
        label: 'Pagamento',
        value: d.aguardandoPagamento,
        sub: d.aguardandoPagamento > 0 ? 'aguardando confirmação' : 'em dia',
        className: d.aguardandoPagamento >= 3
          ? 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]'
          : d.aguardandoPagamento >= 1
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]',
        pulse: d.aguardandoPagamento >= 3,
      },
      {
        label: 'Aprovação',
        value: d.aguardandoAprovacao,
        sub: d.aguardandoAprovacao > 0 ? 'pedidos pagos esperando' : 'em dia',
        className: d.aguardandoAprovacao >= 2
          ? 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]'
          : d.aguardandoAprovacao >= 1
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]',
        pulse: d.aguardandoAprovacao >= 1,
      },
      {
        label: 'Preparo',
        value: d.emPreparo,
        sub: d.tempoMedioPreparo !== null && d.tempoMedioPreparo !== undefined ? `${d.tempoMedioPreparo}min médio` : 'na cozinha',
        className: semaforo(d.emPreparo, 5, 10),
        pulse: false,
      },
      {
        label: 'Em rota',
        value: d.emRota,
        sub: 'motoboys na rua',
        className: 'border-[var(--color-info-subtle)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]',
        pulse: false,
      },
      {
        label: 'WhatsApp',
        value: d.mensagensNaoLidas,
        sub: d.mensagensNaoLidas > 0 ? 'sem resposta' : 'em dia',
        className: d.mensagensNaoLidas >= 5
          ? 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]'
          : d.mensagensNaoLidas >= 2
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]',
        pulse: d.mensagensNaoLidas >= 5,
      },
      {
        label: 'Receita hoje',
        value: formatCurrency(d.receitaDia),
        sub: variacaoStr,
        className: d.variacaoReceita !== null && d.variacaoReceita !== undefined && d.variacaoReceita < -10
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]',
        pulse: false,
      },
      {
        label: 'Cancelamentos',
        value: `${d.taxaCancelamento ?? 0}%`,
        sub: 'do dia',
        className: (d.taxaCancelamento ?? 0) >= 15
          ? 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]'
          : (d.taxaCancelamento ?? 0) >= 8
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]',
        pulse: false,
      },
    ];
  }, [metricas, pedidos, resumo.aprovacao, resumo.preparo, unreadTotal]);

  useEffect(() => {
    const currentIds = new Set(pedidos.map((pedido) => pedido.id));
    if (!knownPedidoIdsRef.current) {
      knownPedidoIdsRef.current = currentIds;
      return;
    }

    const hasNewOrder = [...currentIds].some((id) => !knownPedidoIdsRef.current?.has(id));
    knownPedidoIdsRef.current = currentIds;
    if (hasNewOrder) playNewOrder();
  }, [pedidos, playNewOrder]);

  useEffect(() => {
    if (unreadTotalRef.current === null) {
      unreadTotalRef.current = unreadTotal;
      return;
    }
    if (unreadTotal > unreadTotalRef.current) {
      playMessage();
    }
    unreadTotalRef.current = unreadTotal;
  }, [playMessage, unreadTotal]);

  useEffect(() => {
    if (!hasSlaDanger || muted) return;
    playSla();
    const id = window.setInterval(() => {
      playSla();
    }, 30000);
    return () => window.clearInterval(id);
  }, [hasSlaDanger, muted, playSla]);

  const temBebida = useMemo(() => {
    if (!pedidoDetalhe) return false;
    return pedidoDetalhe.itens.some((item) => (item.produto?.categoria || '').toUpperCase().includes('BEBIDA'));
  }, [pedidoDetalhe]);

  const avancarStatus = useCallback(async () => {
    if (!pedidoDetalhe || savingStatus) return;
    if (pedidoDetalhe.status === 'PENDENTE') {
      showError('Aguardando confirmação de pagamento');
      return;
    }
    if (pedidoDetalhe.status === 'AGUARDANDO_PAGAMENTO' && pedidoDetalhe.statusPagamento !== 'CONFIRMADO') {
      showError('Aguardando confirmação de pagamento');
      return;
    }
    const atual = pedidoDetalhe.status;
    const idx = STATUS_FLOW.indexOf(atual as (typeof STATUS_FLOW)[number]);
    if (idx < 0 || idx === STATUS_FLOW.length - 1) return;
    const proximo = STATUS_FLOW[idx + 1];
    setSavingStatus(true);
    try {
      await api.adminPedidos.atualizarStatus(pedidoDetalhe.id, proximo);
      await Promise.all([carregarLista(), carregarDetalhe(pedidoDetalhe.id)]);
      showSuccess('Status atualizado', `Pedido #${pedidoDetalhe.numero} movido para ${labelStatus(proximo)}.`);
    } catch (error: any) {
      showError('Falha ao atualizar status', error?.message || 'Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  }, [pedidoDetalhe, savingStatus, carregarLista, carregarDetalhe, showSuccess, showError]);

  const salvarEntrega = useCallback(async () => {
    if (!pedidoDetalhe) return;
    try {
      await api.adminPedidos.atribuirMotoboy(pedidoDetalhe.id, selectedMotoboyId || null, observacaoEntrega || undefined);
      await carregarDetalhe(pedidoDetalhe.id);
      showSuccess('Entrega atualizada');
    } catch (error: any) {
      showError('Falha ao atualizar entrega', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, selectedMotoboyId, observacaoEntrega, carregarDetalhe, showSuccess, showError]);

  const salvarEnderecoEntrega = useCallback(async () => {
    if (!pedidoDetalhe) return;
    try {
      await api.adminPedidos.atualizarEnderecoEntrega(pedidoDetalhe.id, enderecoEntrega, bairroEntrega);
      await carregarDetalhe(pedidoDetalhe.id);
      showSuccess('Endereço de entrega atualizado');
    } catch (error: any) {
      showError('Falha ao atualizar endereço', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, enderecoEntrega, bairroEntrega, carregarDetalhe, showSuccess, showError]);

  const enviarMensagem = useCallback(async () => {
    if (!pedidoDetalhe?.cliente?.telefone) return;
    const texto = textoMensagem.trim();
    if (!texto) return;
    try {
      await api.adminClientes.enviarMensagem(pedidoDetalhe.cliente.telefone, texto, pedidoDetalhe.id);
      setTextoMensagem('');
      await carregarMensagens(pedidoDetalhe.cliente.telefone, true);
      showSuccess('Mensagem enviada');
    } catch (error: any) {
      if (error?.code === 'WHATSAPP_ENVIO_FALHOU') {
        showError('WhatsApp desconectado', 'Acesse Configurações para reconectar.');
        return;
      }
      showError('Falha ao enviar mensagem', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, textoMensagem, carregarMensagens, showSuccess, showError]);

  const adicionarListaNegra = useCallback(async () => {
    if (!pedidoDetalhe?.cliente?.telefone) return;
    const motivo = motivoListaNegra.trim();
    if (!motivo) return showError('Informe o motivo');
    try {
      await api.adminClientes.adicionarListaNegra(pedidoDetalhe.cliente.telefone, motivo);
      await carregarResumoCliente(pedidoDetalhe.cliente.telefone);
      setMotivoListaNegra('');
      showSuccess('Cliente adicionado na lista negra');
    } catch (error: any) {
      showError('Falha ao atualizar lista negra', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, motivoListaNegra, carregarResumoCliente, showSuccess, showError]);

  const removerListaNegra = useCallback(async () => {
    if (!pedidoDetalhe?.cliente?.telefone) return;
    try {
      await api.adminClientes.removerListaNegra(pedidoDetalhe.cliente.telefone);
      await carregarResumoCliente(pedidoDetalhe.cliente.telefone);
      showSuccess('Cliente removido da lista negra');
    } catch (error: any) {
      showError('Falha ao remover da lista negra', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, carregarResumoCliente, showSuccess, showError]);

  const cancelarPedido = useCallback(async () => {
    if (!pedidoDetalhe) return;
    try {
      await api.adminPedidos.cancelar(pedidoDetalhe.id, motivoCancelamento);
      setShowCancelModal(false);
      await Promise.all([carregarLista(), carregarDetalhe(pedidoDetalhe.id)]);
      showSuccess('Pedido cancelado');
    } catch (error: any) {
      showError('Falha ao cancelar pedido', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, motivoCancelamento, carregarLista, carregarDetalhe, showSuccess, showError]);

  const confirmarPedido = useCallback(async (id: string) => {
    try {
      await api.adminPedidos.atualizarStatus(id, 'CONFIRMADO');
      await Promise.all([carregarLista(), selectedId === id ? carregarDetalhe(id) : Promise.resolve()]);
      showSuccess('Pedido confirmado');
    } catch (error: any) {
      showError('Falha ao confirmar pedido', error?.message || 'Tente novamente.');
    }
  }, [carregarLista, carregarDetalhe, selectedId, showSuccess, showError]);

  const criarPedidoManual = useCallback(async () => {
    try {
      const data = await api.adminPedidos.criarManual({
        cliente: {
          nome: manualForm.nome,
          telefone: manualForm.telefone,
          endereco: manualForm.endereco,
          bairro: manualForm.bairro,
          cep: manualForm.cep || undefined,
        },
        itens: [{ produtoId: manualForm.produtoId, quantidade: Number(manualForm.quantidade || 1) }],
        observacao: manualForm.observacao || undefined,
        pagamentoMetodo: manualForm.pagamentoMetodo,
        valorDinheiro: manualForm.pagamentoMetodo === 'DINHEIRO' ? Number(manualForm.valorDinheiro || 0) : undefined,
      });
      setShowManualModal(false);
      setManualPixLink(data?.linkPagamento || null);
      await carregarLista();
      showSuccess('Pedido manual criado com sucesso');
    } catch (error: any) {
      showError('Falha ao criar pedido manual', error?.message || 'Tente novamente.');
    }
  }, [manualForm, carregarLista, showSuccess, showError]);

  const atualizarStatusLoja = useCallback(async (status: 'ABERTO' | 'FECHADO' | 'PAUSADO') => {
    try {
      const data = await api.adminPedidos.atualizarStatusLoja(status, status === 'PAUSADO' ? mensagemPausa : undefined);
      setLojaStatus(data);
      showSuccess('Status da loja atualizado');
    } catch (error: any) {
      showError('Falha ao atualizar status da loja', error?.message || 'Tente novamente.');
    }
  }, [mensagemPausa, showSuccess, showError]);

  const handleAtribuirMotoboy = useCallback(async (motoboyId: string, pedidoId: string) => {
    try {
      await api.adminPedidos.atribuirMotoboy(pedidoId, motoboyId);
      await Promise.all([carregarMotoboyStatus(), carregarLista({ silent: true })]);
      showSuccess('Motoboy atribuído');
    } catch (error: any) {
      showError('Falha ao atribuir motoboy', error?.message || 'Tente novamente.');
    }
  }, [carregarMotoboyStatus, carregarLista, showSuccess, showError]);

  const handleAbrirRelatorio = useCallback(async () => {
    setShowRelatorioModal(true);
    setCarregandoRelatorio(true);
    try {
      const [rel, hist] = await Promise.all([
        api.adminRelatorios.gerar(),
        api.adminRelatorios.listar(30),
      ]);
      setRelatorio(rel);
      setRelatorioHistorico(hist);
    } catch {
      // silencioso
    } finally {
      setCarregandoRelatorio(false);
    }
  }, []);

  const fecharLojaComConfirmacao = useCallback(async () => {
    const confirmar = window.confirm('Tem certeza que deseja fechar a loja agora?');
    if (!confirmar) return;
    await atualizarStatusLoja('FECHADO');
  }, [atualizarStatusLoja]);

  const handleFilaAceitar = useCallback(async (id: string) => {
    try {
      await api.adminPedidos.atualizarStatus(id, 'CONFIRMADO');
      await Promise.all([carregarLista(), carregarFilaUrgente(), carregarMetricas()]);
      showSuccess('Pedido confirmado');
    } catch (error: any) {
      showError('Falha ao confirmar pedido', error?.message || 'Tente novamente.');
    }
  }, [carregarLista, carregarFilaUrgente, carregarMetricas, showSuccess, showError]);

  const handleFilaVer = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleFilaResponder = useCallback((id: string) => {
    setSelectedId(id);
    // A aba WhatsApp será aberta pelo usuário após selecionar o pedido
  }, []);

  const handleFilaEstorno = useCallback(async (id: string) => {
    try {
      await api.adminPedidos.marcarEstorno(id);
      await Promise.all([carregarFilaUrgente(), selectedId === id ? carregarDetalhe(id) : Promise.resolve()]);
      showSuccess('Estorno marcado como realizado');
    } catch (error: any) {
      showError('Falha ao marcar estorno', error?.message || 'Tente novamente.');
    }
  }, [carregarFilaUrgente, carregarDetalhe, selectedId, showSuccess, showError]);

  return (
    <div className="p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Cockpit de Pedidos</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {totalPedidos} pedidos · {resumo.aprovacao} aguardando aprovação · {resumo.preparo} em preparo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
            <button
              type="button"
              onClick={() => setAbaCockpit('pedidos')}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors ${abaCockpit === 'pedidos' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
            >
              Pedidos
            </button>
            <button
              type="button"
              onClick={() => { setAbaCockpit('whatsapp'); void carregarConversas(); }}
              className={`relative px-3 py-1.5 text-sm font-semibold transition-colors ${abaCockpit === 'whatsapp' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
            >
              WhatsApp
              {conversas.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger)] text-[9px] font-bold text-white">
                  {conversas.length > 9 ? '9+' : conversas.length}
                </span>
              )}
            </button>
          </div>
          <CrmButton size="sm" onClick={() => void handleAbrirRelatorio()}>Relatório</CrmButton>
          <CrmButton
            size="sm"
            variant={modoPico ? 'danger' : 'ghost'}
            onClick={toggleModoPico}
            title={modoPico ? 'Desativar Modo Pico' : 'Ativar Modo Pico'}
          >
            {modoPico ? '⚡ Pico ON' : '⚡ Pico'}
          </CrmButton>
          <CrmButton size="sm" variant={muted ? 'ghost' : 'primary'} onClick={() => setMuted(!muted)}>
            {muted ? 'Ligar som' : 'Desligar som'}
          </CrmButton>
          <CrmButton size="sm" onClick={() => setShowManualModal(true)}>Pedido manual</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'ABERTO' ? 'primary' : 'ghost'} onClick={() => void atualizarStatusLoja('ABERTO')}>Abrir</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'PAUSADO' ? 'danger' : 'ghost'} onClick={() => void atualizarStatusLoja('PAUSADO')}>Pausar</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'FECHADO' ? 'danger' : 'ghost'} onClick={() => void fecharLojaComConfirmacao()}>Fechar</CrmButton>
          <CrmButton variant="ghost" onClick={() => void carregarLista()}>Atualizar</CrmButton>
        </div>
      </div>

      <FilaUrgente
        itens={filaUrgente}
        onAceitar={(id) => void handleFilaAceitar(id)}
        onVer={handleFilaVer}
        onResponder={handleFilaResponder}
        onEstorno={(id) => void handleFilaEstorno(id)}
      />

      {motoboyStatus.length > 0 && (
        <PainelMotoboys
          motoboys={motoboyStatus}
          pedidoSemMotoboyId={pedidoSemMotoboy}
          onAtribuir={(motoboyId, pedidoId) => void handleAtribuirMotoboy(motoboyId, pedidoId)}
          onVerPedido={handleFilaVer}
        />
      )}

      <PainelIA
        sugestoes={sugestoesIA}
        carregando={carregandoIA}
        onAtualizar={() => void carregarSugestoesIA()}
        onAcao={(sugestao) => {
          if (sugestao.tipo === 'WHATSAPP_ACUMULADO') {
            setAbaCockpit('whatsapp');
          } else if (sugestao.tipo === 'CLIENTE_INATIVO' && sugestao.dados?.telefones?.[0]) {
            // navegar para o cliente — por ora apenas seleciona o primeiro pedido ativo
          }
        }}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {metricItems.map((item) => (
          <div
            key={item.label}
            className={`rounded-md border px-3 py-2 ${item.className} ${item.pulse ? 'animate-pulse' : ''}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
            <p className="mt-1 font-sora text-lg font-bold">{item.value}</p>
            {item.sub && (
              <p className="mt-0.5 text-[10px] opacity-70">{item.sub}</p>
            )}
          </div>
        ))}
      </div>

      {lojaStatus?.status === 'PAUSADO' && (
        <div className="mb-4 flex gap-2">
          <input value={mensagemPausa} onChange={(e) => setMensagemPausa(e.target.value)} className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <CrmButton size="sm" onClick={() => void atualizarStatusLoja('PAUSADO')}>Salvar pausa</CrmButton>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="md:w-80">
          <CrmInput placeholder="Buscar cliente, telefone ou ID..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <CrmButton key={opt.value} variant={statusFiltro === opt.value ? 'primary' : 'ghost'} size="sm" onClick={() => setStatusFiltro(opt.value)}>
              {opt.label}
            </CrmButton>
          ))}
        </div>
      </div>

      {abaCockpit === 'whatsapp' ? (
        <div className="min-h-[72vh]">
          <CentralWhatsApp
            conversas={conversas}
            whatsappConectado={whatsappConectado}
            onVerPedido={(pedidoId) => { setSelectedId(pedidoId); setAbaCockpit('pedidos'); }}
            onCarregarMensagens={(telefone) => api.adminClientes.listarMensagens(telefone, true)}
            onEnviarMensagem={async (telefone, texto, pedidoId) => {
              await api.adminClientes.enviarMensagem(telefone, texto, pedidoId);
              void carregarConversas();
              void carregarMetricas();
            }}
          />
        </div>
      ) : (

      <div className={`grid gap-4 ${modoPico ? 'min-h-[80vh] grid-cols-1 xl:grid-cols-[1fr_minmax(0,1fr)]' : 'min-h-[72vh] grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]'}`}>
        <CrmCard className={`flex flex-col p-3 ${modoPico ? 'max-h-[80vh] min-h-[80vh]' : 'max-h-[72vh] min-h-[72vh]'}`}>
          <div className="flex-1 overflow-auto">
            {loadingList ? (
              <p className="p-3 text-sm text-[var(--color-text-secondary)]">Carregando pedidos...</p>
            ) : pedidos.length === 0 ? (
              <p className="p-3 text-sm text-[var(--color-text-secondary)]">Sem pedidos para os filtros atuais.</p>
            ) : (
              <div className={`space-y-2 ${modoPico ? 'space-y-3' : ''}`}>
                {pedidos.map((pedido) => {
                  const sla = slaByStatus(pedido.status);
                  return (
                    <button
                      key={pedido.id}
                      type="button"
                      onClick={() => setSelectedId(pedido.id)}
                      className={`w-full rounded-md border text-left transition-colors ${modoPico ? 'p-4' : 'p-3'} ${
                        selectedId === pedido.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`font-mono-crm font-semibold text-[var(--color-text-secondary)] ${modoPico ? 'text-sm' : 'text-xs'}`}>#{pedido.numero}</span>
                        <CrmTimer elapsedSeconds={pedido.tempoNoEstagio} warningAt={sla.warningAt} dangerAt={sla.dangerAt} blinkOnDanger />
                      </div>
                      <p className={`truncate font-semibold text-[var(--color-text-primary)] ${modoPico ? 'text-base' : 'text-sm'}`}>{pedido.clienteNome}</p>
                      {!modoPico && <p className="truncate text-xs text-[var(--color-text-secondary)]">{pedido.bairro}</p>}
                      <p className={`mt-1 truncate text-[var(--color-text-tertiary)] ${modoPico ? 'text-sm' : 'text-xs'}`}>{pedido.itensResumo.join(' + ')}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <CrmBadge variant={pedido.statusPagamento === 'CONFIRMADO' ? 'paid' : pedido.statusPagamento === 'EXPIRADO' ? 'expired' : 'unpaid'}>
                          {paymentIcon(pedido.statusPagamento)} {pedido.statusPagamento}
                        </CrmBadge>
                        <span className="text-sm font-semibold text-[var(--color-accent)]">{formatCurrency(pedido.total)}</span>
                      </div>
                      {pedido.mensagensNaoLidas > 0 && (
                        <div className="mt-2"><CrmBadge variant="waiting">{pedido.mensagensNaoLidas} msg</CrmBadge></div>
                      )}
                      <div className="mt-2">
                        <CrmButton
                          size="sm"
                          className="w-full"
                          disabled={pedido.statusPagamento !== 'CONFIRMADO' || pedido.status !== 'AGUARDANDO_PAGAMENTO'}
                          title={pedido.statusPagamento !== 'CONFIRMADO' ? 'Aguardando pagamento' : 'Confirmar pedido'}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void confirmarPedido(pedido.id);
                          }}
                        >
                          Confirmar
                        </CrmButton>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Página {page} · {pedidos.length} de {totalPedidos}
            </p>
            <div className="flex gap-2">
              <CrmButton size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </CrmButton>
              <CrmButton size="sm" variant="ghost" disabled={page * pageSize >= totalPedidos} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </CrmButton>
            </div>
          </div>
        </CrmCard>

        <CrmCard className="p-5">
          {!selectedId ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Selecione um pedido.</p>
          ) : loadingDetail || !pedidoDetalhe ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Carregando detalhes...</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-sora text-xl font-bold text-[var(--color-text-primary)]">Pedido #{pedidoDetalhe.numero}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">{pedidoDetalhe.cliente.nome} · {pedidoDetalhe.cliente.telefone}</p>
                </div>
                <CrmBadge variant={toBadgeVariant(pedidoDetalhe.status)}>{labelStatus(pedidoDetalhe.status)}</CrmBadge>
              </div>

              <CrmTab defaultValue="pedido">
                <CrmTabList>
                  <CrmTabTrigger value="pedido">Pedido</CrmTabTrigger>
                  <CrmTabTrigger value="entrega">Entrega</CrmTabTrigger>
                  <CrmTabTrigger value="whatsapp" onClick={async () => {
                    await carregarMensagens(pedidoDetalhe.cliente.telefone, true);
                    await carregarLista();
                    await carregarMetricas();
                  }}>WhatsApp</CrmTabTrigger>
                  {!modoPico && (
                    <CrmTabTrigger value="cliente" onClick={() => void carregarResumoCliente(pedidoDetalhe.cliente.telefone)}>Cliente</CrmTabTrigger>
                  )}
                  {!modoPico && (
                    <CrmTabTrigger value="timeline">Timeline</CrmTabTrigger>
                  )}
                  {!modoPico && (
                    <CrmTabTrigger value="ia" onClick={() => void carregarSugestoesIA()}>IA</CrmTabTrigger>
                  )}
                </CrmTabList>

                <CrmTabPanel value="pedido">
                  <div className="space-y-4">
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Fluxo de status</p>
                      {clienteResumo?.emListaNegra && (
                        <div className="mb-2 rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-muted)] p-2 text-xs text-[var(--color-danger-text)]">
                          Lista negra · Nível {clienteResumo.nivelListaNegra} · {clienteResumo.motivoListaNegra}
                        </div>
                      )}
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {STATUS_FLOW.map((status) => (
                          <CrmBadge
                            key={status}
                            variant={toBadgeVariant(status)}
                            className={flowBadgeClass(status, pedidoDetalhe.status)}
                          >
                            {labelStatus(status)}
                          </CrmBadge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <CrmButton
                          size="sm"
                          onClick={() => void avancarStatus()}
                          disabled={
                            savingStatus ||
                            !STATUS_FLOW.includes(pedidoDetalhe.status as (typeof STATUS_FLOW)[number]) ||
                            pedidoDetalhe.status === 'ENTREGUE' ||
                            pedidoDetalhe.status === 'PENDENTE' ||
                            (pedidoDetalhe.status === 'AGUARDANDO_PAGAMENTO' && pedidoDetalhe.statusPagamento !== 'CONFIRMADO')
                          }
                          title={
                            pedidoDetalhe.status === 'PENDENTE' ||
                            (pedidoDetalhe.status === 'AGUARDANDO_PAGAMENTO' && pedidoDetalhe.statusPagamento !== 'CONFIRMADO')
                              ? 'Aguardando confirmação de pagamento'
                              : 'Avançar status'
                          }
                        >
                          {savingStatus ? 'Atualizando...' : 'Avançar status'}
                        </CrmButton>
                        <CrmButton size="sm" variant="danger" onClick={() => setShowCancelModal(true)}>Cancelar</CrmButton>
                      </div>
                    </div>
                    {temBebida && <div className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-3"><p className="text-sm font-semibold text-[var(--color-warning-text)]">Não esqueça as bebidas</p></div>}
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Pagamento</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{pedidoDetalhe.statusPagamento}</p>
                    </div>
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Endereço</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{pedidoDetalhe.cliente.endereco} · {pedidoDetalhe.cliente.bairro}</p>
                    </div>
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Itens</p>
                      <div className="space-y-1">
                        {pedidoDetalhe.itens.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-[var(--color-text-primary)]">{item.quantidade}x {item.produto?.nome || 'Produto'}</span>
                            <span className="text-[var(--color-text-secondary)]">{formatCurrency(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-[var(--color-border)] pt-2">
                        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]"><span>Subtotal</span><span>{formatCurrency(pedidoDetalhe.subtotal)}</span></div>
                        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]"><span>Entrega</span><span>{formatCurrency(pedidoDetalhe.taxaEntrega)}</span></div>
                        <div className="mt-1 flex items-center justify-between text-sm font-semibold text-[var(--color-text-primary)]"><span>Total</span><span>{formatCurrency(pedidoDetalhe.total)}</span></div>
                      </div>
                    </div>
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="entrega">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input value={enderecoEntrega} onChange={(e) => setEnderecoEntrega(e.target.value)} placeholder="Endereço" className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
                      <input value={bairroEntrega} onChange={(e) => setBairroEntrega(e.target.value)} placeholder="Bairro" className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
                    </div>
                    {clienteResumo?.endereco && clienteResumo.endereco !== enderecoEntrega && <div className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-2 text-xs text-[var(--color-warning-text)]">Endereço atual diferente do histórico do cliente.</div>}
                    <select value={selectedMotoboyId} onChange={(e) => setSelectedMotoboyId(e.target.value)} className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm">
                      <option value="">Sem motoboy</option>
                      {motoboys.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.status}</option>)}
                    </select>
                    <textarea value={observacaoEntrega} onChange={(e) => setObservacaoEntrega(e.target.value)} rows={3} className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <CrmButton size="sm" onClick={() => void salvarEnderecoEntrega()}>Salvar endereço</CrmButton>
                      <CrmButton size="sm" onClick={() => void salvarEntrega()}>Salvar entrega</CrmButton>
                    </div>
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="timeline">
                  <div className="space-y-2">
                    {pedidoDetalhe.timeline.map((item, index) => (
                      <div key={`${item.timestamp}-${index}`} className={`rounded-md border p-3 ${actorClass(item.ator)}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          {formatTime(item.timestamp)} · {item.ator} · {item.acao}
                        </p>
                      </div>
                    ))}
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="whatsapp">
                  <div className="space-y-3">
                    <div className="max-h-80 space-y-2 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      {mensagens.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)]">Sem mensagens.</p>
                      ) : (
                        mensagens.map((msg) => (
                          <div key={msg.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                            <p className="text-xs text-[var(--color-text-tertiary)]">{formatTime(msg.criadoEm)} · {msg.origem === 'SISTEMA' ? '[AUTO]' : 'HUMANO'}</p>
                            <p className="text-sm text-[var(--color-text-primary)]">{msg.texto}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input value={textoMensagem} onChange={(e) => setTextoMensagem(e.target.value)} placeholder="Digite uma mensagem..." className="h-10 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]" />
                      <CrmButton onClick={() => void enviarMensagem()}>Enviar</CrmButton>
                    </div>
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="cliente">
                  {clienteResumo ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-sm">
                        <p><strong>{clienteResumo.nome}</strong></p>
                        <p className="text-[var(--color-text-secondary)]">{clienteResumo.telefone}</p>
                        <p className="text-[var(--color-text-secondary)]">{clienteResumo.endereco} · {clienteResumo.bairro}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <CrmCard className="p-2">Pedidos: {clienteResumo.totalPedidos}</CrmCard>
                        <CrmCard className="p-2">Gasto: {formatCurrency(clienteResumo.valorGasto)}</CrmCard>
                        <CrmCard className="p-2">Dia favorito: {clienteResumo.diaFavorito || '-'}</CrmCard>
                        <CrmCard className="p-2">Sem pedir: {clienteResumo.diasSemPedir ?? '-'} dias</CrmCard>
                      </div>
                      <CrmCard className="p-3 text-sm">
                        <p className="mb-1 font-semibold">Top produtos</p>
                        {clienteResumo.topProdutos.length === 0 ? (
                          <p className="text-[var(--color-text-secondary)]">Sem histórico</p>
                        ) : (
                          clienteResumo.topProdutos.map((p) => <p key={p.nome} className="text-[var(--color-text-secondary)]">{p.nome} · {p.quantidade}x</p>)
                        )}
                      </CrmCard>
                      {clienteResumo.emListaNegra ? (
                        <CrmCard className="border-[var(--color-danger)] bg-[var(--color-danger-muted)] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[var(--color-danger-text)]">
                              Lista negra · Nível {clienteResumo.nivelListaNegra}/3
                            </p>
                            <span className="text-[10px] text-[var(--color-danger-text)] opacity-70">
                              {clienteResumo.totalOcorrencias} ocorrência{clienteResumo.totalOcorrencias !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-danger-text)]">{clienteResumo.motivoListaNegra}</p>
                          <div className="flex gap-1">
                            {[1, 2, 3].map((n) => (
                              <CrmButton
                                key={n}
                                size="sm"
                                variant={clienteResumo.nivelListaNegra === n ? 'danger' : 'ghost'}
                                onClick={async () => {
                                  await api.adminClientes.atualizarNivelListaNegra(pedidoDetalhe.cliente.telefone, n);
                                  await carregarResumoCliente(pedidoDetalhe.cliente.telefone);
                                  showSuccess(`Nível atualizado para ${n}`);
                                }}
                              >
                                N{n}
                              </CrmButton>
                            ))}
                            <CrmButton variant="ghost" size="sm" className="ml-auto" onClick={() => void removerListaNegra()}>
                              Remover
                            </CrmButton>
                          </div>
                        </CrmCard>
                      ) : (
                        <CrmCard className="p-3">
                          <p className="mb-2 text-sm font-semibold">Adicionar à lista negra</p>
                          <div className="flex gap-2">
                            <input value={motivoListaNegra} onChange={(e) => setMotivoListaNegra(e.target.value)} placeholder="Motivo obrigatório" className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
                            <CrmButton variant="danger" size="sm" onClick={() => void adicionarListaNegra()}>Adicionar</CrmButton>
                          </div>
                        </CrmCard>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">Carregando cliente...</p>
                  )}
                </CrmTabPanel>

                <CrmTabPanel value="ia">
                  <PainelIA
                    sugestoes={sugestoesIA}
                    carregando={carregandoIA}
                    onAtualizar={() => void carregarSugestoesIA()}
                    onAcao={(sugestao) => {
                      if (sugestao.tipo === 'WHATSAPP_ACUMULADO') {
                        setAbaCockpit('whatsapp');
                      }
                    }}
                  />
                </CrmTabPanel>
              </CrmTab>
            </>
          )}
        </CrmCard>
      </div>
      )}
      <CrmModal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancelar pedido">
        <select value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} className="mb-3 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm">
          {CANCEL_MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {pedidoDetalhe?.statusPagamento === 'CONFIRMADO' && <p className="mb-3 text-sm text-[var(--color-warning-text)]">Pagamento confirmado: estorno será marcado como necessário.</p>}
        {pedidoDetalhe?.estornoNecessario && (
          <div className="mb-3">
            <CrmButton size="sm" variant="ghost" onClick={async () => {
              await api.adminPedidos.marcarEstorno(pedidoDetalhe.id);
              await carregarDetalhe(pedidoDetalhe.id);
              showSuccess('Estorno marcado como realizado');
            }}>Marcar estorno realizado</CrmButton>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <CrmButton variant="ghost" onClick={() => setShowCancelModal(false)}>Fechar</CrmButton>
          <CrmButton variant="danger" onClick={() => void cancelarPedido()}>Confirmar</CrmButton>
        </div>
      </CrmModal>

      <ModalRelatorio
        open={showRelatorioModal}
        onClose={() => setShowRelatorioModal(false)}
        relatorio={relatorio}
        carregando={carregandoRelatorio}
        historico={relatorioHistorico}
        onGerar={async () => {
          setCarregandoRelatorio(true);
          try {
            const rel = await api.adminRelatorios.gerar();
            setRelatorio(rel);
          } finally {
            setCarregandoRelatorio(false);
          }
        }}
        onVerHistorico={async (data) => {
          setCarregandoRelatorio(true);
          try {
            const rel = await api.adminRelatorios.gerar(data);
            setRelatorio(rel);
          } finally {
            setCarregandoRelatorio(false);
          }
        }}
      />

      <ModalPedidoManual
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        produtos={produtos}
        onBuscarCliente={(telefone) => api.adminClientes.buscarClienteRapido(telefone)}
        onCriar={async (dados) => {
          const result = await api.adminPedidos.criarManual({
            cliente: dados.cliente,
            itens: dados.itens,
            pagamentoMetodo: dados.pagamentoMetodo,
            valorDinheiro: dados.valorDinheiro,
            observacao: dados.observacao,
            origem: 'WHATSAPP',
          });
          await Promise.all([carregarLista(), carregarMetricas(), carregarFilaUrgente()]);
          showSuccess('Pedido criado');
          if (result?.linkPagamento) setManualPixLink(result.linkPagamento);
        }}
      />

      {manualPixLink && (
        <CrmModal open={Boolean(manualPixLink)} onClose={() => setManualPixLink(null)} title="Link PIX gerado">
          <p className="mb-2 text-sm text-[var(--color-text-secondary)]">Compartilhe este link com o cliente:</p>
          <input readOnly value={manualPixLink} className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <div className="mt-3 flex justify-end">
            <CrmButton size="sm" onClick={() => void navigator.clipboard.writeText(manualPixLink)}>Copiar link</CrmButton>
          </div>
        </CrmModal>
      )}
    </div>
  );
}
