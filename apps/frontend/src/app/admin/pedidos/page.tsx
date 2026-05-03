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
  CrmModal,
  CrmTab,
  CrmTabList,
  CrmTabPanel,
  CrmTabTrigger,
  FilaUrgente,
  ModalPedidoManual,
  ModalRelatorio,
  PainelIA,
  PainelMotoboys,
} from '@/components/crm';
import { CockpitHeader } from './_components/CockpitHeader';
import { MetricasBar } from './_components/MetricasBar';
import { FiltrosBusca } from './_components/FiltrosBusca';
import { ListaPedidos } from './_components/ListaPedidos';
import { ModalCancelar } from './_components/ModalCancelar';
import { PedidoTicket } from './_components/PedidoTicket';
import {
  CANCEL_MOTIVOS,
  FINAL_STATUSES,
  isFinalStatus,
  STATUS_FLOW,
  actorClass,
  labelStatus,
  slaByStatus,
  toBadgeVariant,
  ctaStatus,
  motivoBloqueioAcao,
} from './_components/_utils';

const EMPRESA_LABEL: Record<'PROPRIO' | 'IFOOD' | 'MUVE' | 'FOOD99', string> = {
  PROPRIO: 'Próprio',
  IFOOD: 'iFood',
  MUVE: 'Muve',
  FOOD99: '99Food',
};
const PARCEIRAS = ['IFOOD', 'MUVE', 'FOOD99'] as const;

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
  const [tipoEntregaOperacao, setTipoEntregaOperacao] = useState<'PROPRIA' | 'TERCEIRIZADA'>('PROPRIA');
  const [empresaTerceirizada, setEmpresaTerceirizada] = useState<(typeof PARCEIRAS)[number]>('IFOOD');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState('');
  const [observacaoEntrega, setObservacaoEntrega] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLojaStatusModal, setShowLojaStatusModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Confirmar ação');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmLabel, setConfirmLabel] = useState('Confirmar');
  const [confirmVariant, setConfirmVariant] = useState<'primary' | 'danger'>('primary');
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);
  const [statusLojaModal, setStatusLojaModal] = useState<'ABERTO' | 'FECHADO' | 'PAUSADO'>('ABERTO');
  const [manualPixLink, setManualPixLink] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState(CANCEL_MOTIVOS[0]);
  const [lojaStatus, setLojaStatus] = useState<LojaStatusAdmin | null>(null);
  const [mensagemPausa, setMensagemPausa] = useState('');
  const [entregadoresDisponiveisDia, setEntregadoresDisponiveisDia] = useState(0);
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

  const abrirConfirmacao = useCallback((opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'primary' | 'danger';
    action: () => Promise<void>;
  }) => {
    setConfirmTitle(opts.title);
    setConfirmMessage(opts.message);
    setConfirmLabel(opts.confirmLabel || 'Confirmar');
    setConfirmVariant(opts.variant || 'primary');
    confirmActionRef.current = opts.action;
    setShowConfirmModal(true);
  }, []);

  // Auto-ativar modo pico quando há muitos pedidos ativos
  useEffect(() => {
    const ativos = pedidos.filter((p) =>
      !(FINAL_STATUSES as readonly string[]).includes(p.status)
    ).length;
    if (ativos >= 8 && !modoPico) {
      setModoPico(true);
      window.localStorage.setItem('rancho:cockpit:modo-pico', 'true');
    }
  }, [pedidos, modoPico]);

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
      const obsEntrega = String(data.observacaoEntrega || '');
      if (obsEntrega.startsWith('TERCEIRIZADA:')) {
        setTipoEntregaOperacao('TERCEIRIZADA');
        const parceiro = obsEntrega.replace('TERCEIRIZADA:', '').trim().toUpperCase() as (typeof PARCEIRAS)[number];
        if (PARCEIRAS.includes(parceiro)) setEmpresaTerceirizada(parceiro);
      } else {
        setTipoEntregaOperacao('PROPRIA');
      }
      setObservacaoEntrega(data.observacaoEntrega || '');
    } catch (error: any) {
      showError('Falha ao carregar detalhe', error?.message || 'Tente novamente.');
    } finally {
      if (!opts?.silent) setLoadingDetail(false);
    }
  }, [motoboys, showError]);

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
      setEntregadoresDisponiveisDia(data.entregadoresDisponiveisDia || 0);
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
    if (tipoEntregaOperacao !== 'PROPRIA') return;
    if (!selectedMotoboyId) return;
    const filtrados = motoboys.filter((m) => m.empresa === 'PROPRIO');
    if (!filtrados.some((m) => m.id === selectedMotoboyId)) {
      setSelectedMotoboyId('');
    }
  }, [tipoEntregaOperacao, motoboys, selectedMotoboyId]);

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

  const motoboysProprios = useMemo(
    () => motoboys.filter((m) => m.empresa === 'PROPRIO'),
    [motoboys]
  );

  const unreadTotal = useMemo(
    () => pedidos.reduce((total, pedido) => total + pedido.mensagensNaoLidas, 0),
    [pedidos]
  );

  const hasSlaDanger = useMemo(
    () => pedidos.some((pedido) => {
      if ((FINAL_STATUSES as readonly string[]).includes(pedido.status)) return false;
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
      aguardandoEntregador: pedidos.filter((p) => p.status === 'PRONTO' && p.aguardandoEntregador).length,
      prontoParaRetirada: 0,
      tempoMedioAguardandoEntregadorMs: null as number | null,
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
        label: 'Entregador',
        value: d.aguardandoEntregador,
        sub: (() => {
          const partes: string[] = [];
          if (d.tempoMedioAguardandoEntregadorMs !== null && d.tempoMedioAguardandoEntregadorMs !== undefined) {
            partes.push(`${Math.round(d.tempoMedioAguardandoEntregadorMs / 60_000)} min parado`);
          }
          if (d.prontoParaRetirada > 0) {
            partes.push(`${d.prontoParaRetirada} p/ retirada`);
          }
          return partes.length > 0 ? partes.join(' · ') : 'aguardando despacho';
        })(),
        className: d.aguardandoEntregador >= 3
          ? 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]'
          : d.aguardandoEntregador >= 1
          ? 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]',
        pulse: d.aguardandoEntregador >= 3,
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

    const hasNewOrder = [...currentIds].some((id) => {
      if (knownPedidoIdsRef.current?.has(id)) return false;
      const p = pedidos.find((x) => x.id === id);
      return p && !(FINAL_STATUSES as readonly string[]).includes(p.status);
    });
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
    const ativos = pedidos.filter((p) => !(FINAL_STATUSES as readonly string[]).includes(p.status)).length;
    document.title = ativos > 0 ? `(${ativos}) Pedidos — Rancho` : 'Pedidos — Rancho';
  }, [pedidos]);

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
    const motivoBloqueio = motivoBloqueioAcao(
      pedidoDetalhe.status,
      pedidoDetalhe.statusPagamento,
      pedidoDetalhe.aguardandoEntregador
    );
    const bloqueado = !!motivoBloqueio;
    if (bloqueado) {
      showError('Ação bloqueada', motivoBloqueio || 'Ação indisponível');
      return;
    }
    const atual = pedidoDetalhe.status;
    const idx = STATUS_FLOW.indexOf(atual as (typeof STATUS_FLOW)[number]);
    if (idx < 0 || idx === STATUS_FLOW.length - 1) return;
    const proximo = STATUS_FLOW[idx + 1];
    const executar = async () => {
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
    };
    if (atual === 'SAIU_ENTREGA' && proximo === 'ENTREGUE') {
      abrirConfirmacao({
        title: 'Confirmar entrega',
        message: 'Confirma marcar este pedido como entregue?',
        confirmLabel: 'Marcar entregue',
        variant: 'primary',
        action: executar,
      });
      return;
    }
    await executar();
  }, [pedidoDetalhe, savingStatus, carregarLista, carregarDetalhe, showSuccess, showError, abrirConfirmacao]);

  const salvarEntrega = useCallback(async () => {
    if (!pedidoDetalhe) return;
    try {
      const payloadObservacao = tipoEntregaOperacao === 'TERCEIRIZADA'
        ? `TERCEIRIZADA:${empresaTerceirizada}`
        : (observacaoEntrega || undefined);
      const motoboyId = tipoEntregaOperacao === 'PROPRIA' ? (selectedMotoboyId || null) : null;
      await api.adminPedidos.atribuirMotoboy(pedidoDetalhe.id, motoboyId, payloadObservacao);
      await carregarDetalhe(pedidoDetalhe.id);
      showSuccess('Entrega atualizada');
    } catch (error: any) {
      showError('Falha ao atualizar entrega', error?.message || 'Tente novamente.');
    }
  }, [pedidoDetalhe, tipoEntregaOperacao, empresaTerceirizada, selectedMotoboyId, observacaoEntrega, carregarDetalhe, showSuccess, showError]);

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
    if (isFinalStatus(pedidoDetalhe.status)) {
      showError('Ação bloqueada', 'Pedido em status final');
      return;
    }
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

  const atualizarStatusLoja = useCallback(async (status: 'ABERTO' | 'FECHADO' | 'PAUSADO', capacidade?: number) => {
    try {
      const data = await api.adminPedidos.atualizarStatusLoja(
        status,
        status === 'PAUSADO' ? mensagemPausa : undefined,
        capacidade
      );
      setLojaStatus(data);
      setEntregadoresDisponiveisDia(data.entregadoresDisponiveisDia || 0);
      showSuccess('Status da loja atualizado');
    } catch (error: any) {
      showError('Falha ao atualizar status da loja', error?.message || 'Tente novamente.');
    }
  }, [mensagemPausa, showSuccess, showError]);

  const salvarStatusLojaModal = useCallback(async () => {
    await atualizarStatusLoja(
      statusLojaModal,
      statusLojaModal === 'ABERTO' ? entregadoresDisponiveisDia : undefined
    );
    setShowLojaStatusModal(false);
  }, [atualizarStatusLoja, statusLojaModal, entregadoresDisponiveisDia]);

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
    abrirConfirmacao({
      title: 'Confirmar estorno',
      message: 'Confirma marcar estorno como realizado?',
      confirmLabel: 'Marcar estorno',
      variant: 'danger',
      action: async () => {
        try {
          await api.adminPedidos.marcarEstorno(id);
          await Promise.all([carregarFilaUrgente(), selectedId === id ? carregarDetalhe(id) : Promise.resolve()]);
          showSuccess('Estorno marcado como realizado');
        } catch (error: any) {
          showError('Falha ao marcar estorno', error?.message || 'Tente novamente.');
        }
      },
    });
  }, [carregarFilaUrgente, carregarDetalhe, selectedId, showSuccess, showError, abrirConfirmacao]);

  return (
    <div className="p-5 md:p-6">
      <CockpitHeader
        totalPedidos={totalPedidos}
        resumo={resumo}
        abaCockpit={abaCockpit}
        onAbaChange={setAbaCockpit}
        conversas={conversas}
        onAbrirRelatorio={() => void handleAbrirRelatorio()}
        modoPico={modoPico}
        onToggleModoPico={toggleModoPico}
        muted={muted}
        onToggleMuted={() => setMuted(!muted)}
        onNovoPedidoManual={() => setShowManualModal(true)}
        lojaStatus={lojaStatus}
        onGerenciarLojaStatus={() => {
          setStatusLojaModal(lojaStatus?.status || 'ABERTO');
          setShowLojaStatusModal(true);
        }}
        onAtualizar={() => void carregarLista()}
        onCarregarConversas={() => void carregarConversas()}
      />

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

      <MetricasBar items={metricItems} />

      <FiltrosBusca
        busca={busca}
        onBuscaChange={setBusca}
        statusFiltro={statusFiltro}
        onStatusChange={setStatusFiltro}
      />

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
        <ListaPedidos
          pedidos={pedidos}
          loading={loadingList}
          modoPico={modoPico}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onConfirmar={(id) => void confirmarPedido(id)}
          page={page}
          totalPedidos={totalPedidos}
          pageSize={pageSize}
          onPageChange={setPage}
        />

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
                    {/* Barra de progresso compacta */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2">
                        {/* Dots de progresso */}
                        <div className="flex items-center gap-[5px]">
                          {STATUS_FLOW.map((s, i) => {
                            const currentIdx = STATUS_FLOW.indexOf(pedidoDetalhe.status as (typeof STATUS_FLOW)[number]);
                            const done = i < currentIdx;
                            const current = i === currentIdx;
                            return (
                              <span
                                key={s}
                                title={labelStatus(s)}
                                className={`inline-block h-2.5 w-2.5 rounded-full transition-colors ${
                                  done
                                    ? 'bg-[var(--color-success)]'
                                    : current
                                    ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface-raised)] bg-[var(--color-primary)]'
                                    : 'bg-[var(--color-border)]'
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Status atual */}
                        <CrmBadge variant={toBadgeVariant(pedidoDetalhe.status)}>
                          {labelStatus(pedidoDetalhe.status)}
                        </CrmBadge>

                        {pedidoDetalhe.aguardandoEntregador && (
                          <CrmBadge variant="waiting">Aguard. entregador</CrmBadge>
                        )}

                        {clienteResumo?.emListaNegra && (
                          <span
                            title={`Lista negra · Nível ${clienteResumo.nivelListaNegra} · ${clienteResumo.motivoListaNegra}`}
                            className="cursor-default rounded-full border border-[var(--color-danger)] bg-[var(--color-danger-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-danger-text)]"
                          >
                            ⚠ Lista negra
                          </span>
                        )}

                        {/* Ações */}
                        {(() => {
                          const motivoBloqueio = motivoBloqueioAcao(
                            pedidoDetalhe.status,
                            pedidoDetalhe.statusPagamento,
                            pedidoDetalhe.aguardandoEntregador
                          );
                          const label = ctaStatus(pedidoDetalhe.status, pedidoDetalhe.tipoAtendimento ?? undefined);
                          return (
                            <div className="ml-auto flex items-center gap-1.5 no-print">
                              <CrmButton
                                size="sm"
                                onClick={() => void avancarStatus()}
                                disabled={
                                  savingStatus ||
                                  !STATUS_FLOW.includes(pedidoDetalhe.status as (typeof STATUS_FLOW)[number]) ||
                                  !!motivoBloqueio
                                }
                                title={motivoBloqueio || label}
                              >
                                {savingStatus ? '...' : label}
                              </CrmButton>
                              <CrmButton
                                size="sm"
                                variant="danger"
                                disabled={isFinalStatus(pedidoDetalhe.status)}
                                title={isFinalStatus(pedidoDetalhe.status) ? 'Pedido em status final' : 'Cancelar pedido'}
                                onClick={() => setShowCancelModal(true)}
                              >
                                ✕
                              </CrmButton>
                              <CrmButton
                                size="sm"
                                variant="ghost"
                                title="Imprimir pedido"
                                onClick={() => window.print()}
                              >
                                ⎙
                              </CrmButton>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Atribuição de motoboy — aparece quando PRONTO aguardando entregador */}
                      {pedidoDetalhe.status === 'PRONTO' && pedidoDetalhe.aguardandoEntregador && (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] px-3 py-2">
                          <span className="text-xs font-medium text-[var(--color-warning-text)]">Entregador:</span>
                          <select
                            value={tipoEntregaOperacao}
                            onChange={(e) => setTipoEntregaOperacao(e.target.value as any)}
                            className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-xs"
                          >
                            <option value="PROPRIA">Própria</option>
                            <option value="TERCEIRIZADA">Terceirizada</option>
                          </select>
                          {tipoEntregaOperacao === 'PROPRIA' ? (
                            <select
                              value={selectedMotoboyId}
                              onChange={(e) => setSelectedMotoboyId(e.target.value)}
                              className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-xs"
                            >
                              <option value="">Selecione o entregador</option>
                              {motoboysProprios.map((m) => (
                                <option key={m.id} value={m.id}>{m.nome} · {m.status}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={empresaTerceirizada}
                              onChange={(e) => setEmpresaTerceirizada(e.target.value as any)}
                              className="h-8 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-xs"
                            >
                              {PARCEIRAS.map((emp) => (
                                <option key={emp} value={emp}>{EMPRESA_LABEL[emp]}</option>
                              ))}
                            </select>
                          )}
                          <CrmButton size="sm" onClick={() => void salvarEntrega()}>Despachar</CrmButton>
                        </div>
                      )}
                    </div>
                    {temBebida && <div className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-3"><p className="text-sm font-semibold text-[var(--color-warning-text)]">Não esqueça as bebidas</p></div>}
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Pagamento</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Status: {pedidoDetalhe.statusPagamento}</p>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        Forma: {(pedidoDetalhe.formaPagamento || 'PIX').replace('_', ' ')}
                      </p>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        Atendimento: {
                          pedidoDetalhe.tipoAtendimento === 'RETIRADA' ? 'Retirada' :
                          pedidoDetalhe.tipoAtendimento === 'CONSUMO_LOCAL' ? 'Consumo local' :
                          'Entrega'
                        }
                      </p>
                      {pedidoDetalhe.trocoPara !== null && pedidoDetalhe.trocoPara !== undefined && (
                        <p className="text-sm text-[var(--color-text-primary)]">
                          Troco para: {formatCurrency(Number(pedidoDetalhe.trocoPara))}
                        </p>
                      )}
                    </div>
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Endereço</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{pedidoDetalhe.cliente.endereco} · {pedidoDetalhe.cliente.bairro}</p>
                    </div>
                    <PedidoTicket pedido={pedidoDetalhe} />
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
      <ModalCancelar
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        pedidoDetalhe={pedidoDetalhe}
        motivoCancelamento={motivoCancelamento}
        onMotivoChange={setMotivoCancelamento}
        onConfirmar={() => void cancelarPedido()}
        onEstornoRealizado={async () => {
          if (!pedidoDetalhe) return;
          abrirConfirmacao({
            title: 'Confirmar estorno',
            message: 'Confirma marcar estorno como realizado?',
            confirmLabel: 'Marcar estorno',
            variant: 'danger',
            action: async () => {
              await api.adminPedidos.marcarEstorno(pedidoDetalhe.id);
              await carregarDetalhe(pedidoDetalhe.id);
              showSuccess('Estorno marcado como realizado');
            },
          });
        }}
      />
      <CrmModal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          confirmActionRef.current = null;
        }}
        title={confirmTitle}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">{confirmMessage}</p>
          <div className="flex justify-end gap-2">
            <CrmButton
              variant="ghost"
              onClick={() => {
                setShowConfirmModal(false);
                confirmActionRef.current = null;
              }}
            >
              Cancelar
            </CrmButton>
            <CrmButton
              variant={confirmVariant}
              onClick={async () => {
                const action = confirmActionRef.current;
                setShowConfirmModal(false);
                confirmActionRef.current = null;
                if (action) await action();
              }}
            >
              {confirmLabel}
            </CrmButton>
          </div>
        </div>
      </CrmModal>
      <CrmModal
        open={showLojaStatusModal}
        onClose={() => setShowLojaStatusModal(false)}
        title="Status da loja"
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">Defina o status operacional da loja para este turno.</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Status</label>
            <select
              value={statusLojaModal}
              onChange={(e) => setStatusLojaModal(e.target.value as any)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
            >
              <option value="ABERTO">Aberto</option>
              <option value="PAUSADO">Pausado</option>
              <option value="FECHADO">Fechado</option>
            </select>
          </div>
          {statusLojaModal === 'PAUSADO' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Mensagem de pausa</label>
              <input
                value={mensagemPausa}
                onChange={(e) => setMensagemPausa(e.target.value)}
                placeholder="Ex.: Voltamos às 14:00"
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
              />
            </div>
          )}
          {statusLojaModal === 'ABERTO' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
              Entregadores disponíveis hoje
            </label>
            <input
              type="number"
              min={0}
              value={Number.isFinite(entregadoresDisponiveisDia) ? entregadoresDisponiveisDia : 0}
              onChange={(e) => setEntregadoresDisponiveisDia(Math.max(0, Number(e.target.value || 0)))}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
            />
          </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <CrmButton variant="ghost" onClick={() => setShowLojaStatusModal(false)}>Cancelar</CrmButton>
            <CrmButton onClick={() => void salvarStatusLojaModal()}>Salvar status</CrmButton>
          </div>
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
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-ticket {
            border: 0 !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
