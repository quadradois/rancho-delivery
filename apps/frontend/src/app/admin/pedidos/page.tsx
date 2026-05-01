'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api, {
  AdminPedidoDetalhe,
  AdminPedidoListaItem,
  ClienteResumoAdmin,
  LojaStatusAdmin,
  MensagemClienteAdmin,
  MotoboyAdmin,
} from '@/lib/api';
import { formatCurrency, formatTime } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import useCockpitSocket from '@/hooks/useCockpitSocket';
import {
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
const STATUS_FLOW = ['CONFIRMADO', 'PREPARANDO', 'SAIU_ENTREGA', 'ENTREGUE'] as const;
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

export default function AdminPedidosPage() {
  const { showSuccess, showError } = useToast();
  const [pedidos, setPedidos] = useState<AdminPedidoListaItem[]>([]);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<AdminPedidoDetalhe | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mensagens, setMensagens] = useState<MensagemClienteAdmin[]>([]);
  const [clienteResumo, setClienteResumo] = useState<ClienteResumoAdmin | null>(null);
  const [textoMensagem, setTextoMensagem] = useState('');
  const [motivoListaNegra, setMotivoListaNegra] = useState('');
  const [motoboys, setMotoboys] = useState<MotoboyAdmin[]>([]);
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

  const carregarLista = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.adminPedidos.listar({
        status: statusFiltro !== 'todos' ? statusFiltro : undefined,
        busca: busca || undefined,
      });
      setPedidos(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } finally {
      setLoadingList(false);
    }
  }, [statusFiltro, busca, selectedId]);

  const carregarDetalhe = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.adminPedidos.buscarPorId(id);
      setPedidoDetalhe(data);
      setSelectedMotoboyId(data.motoboy?.id || '');
      setObservacaoEntrega(data.observacaoEntrega || '');
      setEnderecoEntrega(data.cliente.endereco || '');
      setBairroEntrega(data.cliente.bairro || '');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const carregarResumoCliente = useCallback(async (telefone: string) => {
    const data = await api.adminClientes.obterResumo(telefone);
    setClienteResumo(data);
  }, []);

  const carregarMensagens = useCallback(async (telefone: string, marcarComoLida = false) => {
    const data = await api.adminClientes.listarMensagens(telefone, marcarComoLida);
    setMensagens(data);
  }, []);

  const carregarMotoboys = useCallback(async () => {
    const data = await api.adminPedidos.listarMotoboys();
    setMotoboys(data);
  }, []);

  const carregarStatusLoja = useCallback(async () => {
    const data = await api.adminPedidos.obterStatusLoja();
    setLojaStatus(data);
    setMensagemPausa(data.mensagem || '');
  }, []);

  useEffect(() => {
    void carregarLista();
    void carregarMotoboys();
    void carregarStatusLoja();
  }, [carregarLista, carregarMotoboys, carregarStatusLoja]);

  useEffect(() => {
    if (selectedId) void carregarDetalhe(selectedId);
  }, [selectedId, carregarDetalhe]);

  useEffect(() => {
    if (!pedidoDetalhe?.cliente?.telefone) return;
    void carregarResumoCliente(pedidoDetalhe.cliente.telefone);
  }, [pedidoDetalhe?.cliente?.telefone, carregarResumoCliente]);

  useCockpitSocket({
    onPedidoNovo: () => {
      void carregarLista();
    },
    onPedidoAtualizado: (payload) => {
      void carregarLista();
      if (selectedId && payload?.id === selectedId) {
        void carregarDetalhe(selectedId);
      }
    },
    onMensagemNova: async (payload) => {
      if (pedidoDetalhe?.cliente?.telefone && payload?.telefone?.includes(pedidoDetalhe.cliente.telefone)) {
        await carregarMensagens(pedidoDetalhe.cliente.telefone, false);
      }
      void carregarLista();
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

  const temBebida = useMemo(() => {
    if (!pedidoDetalhe) return false;
    return pedidoDetalhe.itens.some((item) => (item.produto?.categoria || '').toUpperCase().includes('BEBIDA'));
  }, [pedidoDetalhe]);

  const avancarStatus = useCallback(async () => {
    if (!pedidoDetalhe || savingStatus) return;
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

  return (
    <div className="p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Cockpit de Pedidos</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {resumo.total} pedidos · {resumo.aprovacao} aguardando aprovação · {resumo.preparo} em preparo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CrmButton size="sm" onClick={() => setShowManualModal(true)}>Pedido manual</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'ABERTO' ? 'primary' : 'ghost'} onClick={() => void atualizarStatusLoja('ABERTO')}>Abrir</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'PAUSADO' ? 'danger' : 'ghost'} onClick={() => void atualizarStatusLoja('PAUSADO')}>Pausar</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'FECHADO' ? 'danger' : 'ghost'} onClick={() => void atualizarStatusLoja('FECHADO')}>Fechar</CrmButton>
          <CrmButton variant="ghost" onClick={() => void carregarLista()}>Atualizar</CrmButton>
        </div>
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

      <div className="grid min-h-[72vh] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CrmCard className="max-h-[72vh] overflow-auto p-3">
          {loadingList ? (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">Carregando pedidos...</p>
          ) : pedidos.length === 0 ? (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">Sem pedidos para os filtros atuais.</p>
          ) : (
            <div className="space-y-2">
              {pedidos.map((pedido) => {
                const sla = slaByStatus(pedido.status);
                return (
                  <button
                    key={pedido.id}
                    type="button"
                    onClick={() => setSelectedId(pedido.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selectedId === pedido.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono-crm text-xs font-semibold text-[var(--color-text-secondary)]">#{pedido.numero}</span>
                      <CrmTimer elapsedSeconds={pedido.tempoNoEstagio} warningAt={sla.warningAt} dangerAt={sla.dangerAt} blinkOnDanger />
                    </div>
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{pedido.clienteNome}</p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">{pedido.bairro}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">{pedido.itensResumo.join(' + ')}</p>
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
                      <CrmButton size="sm" className="w-full" disabled={pedido.statusPagamento !== 'CONFIRMADO'} title={pedido.statusPagamento !== 'CONFIRMADO' ? 'Aguardando pagamento' : 'Confirmar pedido'}>
                        Confirmar
                      </CrmButton>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
                  }}>WhatsApp</CrmTabTrigger>
                  <CrmTabTrigger value="cliente" onClick={() => void carregarResumoCliente(pedidoDetalhe.cliente.telefone)}>Cliente</CrmTabTrigger>
                  <CrmTabTrigger value="timeline">Timeline</CrmTabTrigger>
                  <CrmTabTrigger value="ia" disabled>IA</CrmTabTrigger>
                </CrmTabList>

                <CrmTabPanel value="pedido">
                  <div className="space-y-4">
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Fluxo de status</p>
                      {clienteResumo?.emListaNegra && <div className="mb-2 rounded-md border border-[var(--color-danger)] bg-[var(--color-danger-muted)] p-2 text-xs text-[var(--color-danger-text)]">Cliente em lista negra: {clienteResumo.motivoListaNegra}</div>}
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {STATUS_FLOW.map((status) => <CrmBadge key={status} variant={toBadgeVariant(status)}>{labelStatus(status)}</CrmBadge>)}
                      </div>
                      <div className="flex gap-2">
                        <CrmButton size="sm" onClick={() => void avancarStatus()} disabled={savingStatus || !STATUS_FLOW.includes(pedidoDetalhe.status as (typeof STATUS_FLOW)[number]) || pedidoDetalhe.status === 'ENTREGUE'}>
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
                      <label className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                        <span>Imprimir comanda (em breve)</span>
                        <input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed accent-[var(--color-accent)]" />
                      </label>
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
                      <div key={`${item.timestamp}-${index}`} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                        <p className="text-xs text-[var(--color-text-tertiary)]">{formatTime(item.timestamp)} · {item.ator}</p>
                        <p className="text-sm text-[var(--color-text-primary)]">{item.acao}</p>
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
                        <CrmCard className="border-[var(--color-danger)] bg-[var(--color-danger-muted)] p-3">
                          <p className="text-sm font-semibold text-[var(--color-danger-text)]">Cliente em lista negra</p>
                          <p className="text-sm text-[var(--color-danger-text)]">{clienteResumo.motivoListaNegra}</p>
                          <CrmButton variant="danger" size="sm" className="mt-2" onClick={() => void removerListaNegra()}>Remover da lista negra</CrmButton>
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
              </CrmTab>
            </>
          )}
        </CrmCard>
      </div>

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

      <CrmModal open={showManualModal} onClose={() => setShowManualModal(false)} title="Pedido manual">
        <div className="space-y-2">
          <input placeholder="Nome" value={manualForm.nome} onChange={(e) => setManualForm((s) => ({ ...s, nome: e.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <input placeholder="Telefone" value={manualForm.telefone} onChange={(e) => setManualForm((s) => ({ ...s, telefone: e.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <input placeholder="Endereço" value={manualForm.endereco} onChange={(e) => setManualForm((s) => ({ ...s, endereco: e.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <input placeholder="Bairro" value={manualForm.bairro} onChange={(e) => setManualForm((s) => ({ ...s, bairro: e.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <input placeholder="ID do produto" value={manualForm.produtoId} onChange={(e) => setManualForm((s) => ({ ...s, produtoId: e.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <CrmButton size="sm" variant={manualForm.pagamentoMetodo === 'PIX' ? 'primary' : 'ghost'} onClick={() => setManualForm((s) => ({ ...s, pagamentoMetodo: 'PIX' }))}>PIX</CrmButton>
            <CrmButton size="sm" variant={manualForm.pagamentoMetodo === 'DINHEIRO' ? 'primary' : 'ghost'} onClick={() => setManualForm((s) => ({ ...s, pagamentoMetodo: 'DINHEIRO' }))}>Dinheiro</CrmButton>
          </div>
          {manualForm.pagamentoMetodo === 'DINHEIRO' && <input placeholder="Valor em dinheiro" value={manualForm.valorDinheiro} onChange={(e) => setManualForm((s) => ({ ...s, valorDinheiro: e.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <CrmButton variant="ghost" onClick={() => setShowManualModal(false)}>Fechar</CrmButton>
          <CrmButton onClick={() => void criarPedidoManual()}>Criar</CrmButton>
        </div>
      </CrmModal>

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
