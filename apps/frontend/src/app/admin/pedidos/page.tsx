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
import { CrmBadge, CrmButton, CrmCard, CrmInput, CrmModal, CrmTab, CrmTabList, CrmTabPanel, CrmTabTrigger } from '@/components/crm';

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

function labelStatus(status: string) {
  if (status === 'AGUARDANDO_PAGAMENTO') return 'Aguard. pagamento';
  if (status === 'SAIU_ENTREGA') return 'Em rota';
  return status.replace('_', ' ').toLowerCase();
}

export default function AdminPedidosPage() {
  const { showError, showSuccess } = useToast();
  const [pedidos, setPedidos] = useState<AdminPedidoListaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<AdminPedidoDetalhe | null>(null);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mensagens, setMensagens] = useState<MensagemClienteAdmin[]>([]);
  const [clienteResumo, setClienteResumo] = useState<ClienteResumoAdmin | null>(null);
  const [motoboys, setMotoboys] = useState<MotoboyAdmin[]>([]);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState('');
  const [observacaoEntrega, setObservacaoEntrega] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState(CANCEL_MOTIVOS[0]);
  const [lojaStatus, setLojaStatus] = useState<LojaStatusAdmin | null>(null);
  const [mensagemPausa, setMensagemPausa] = useState('');
  const [textoMensagem, setTextoMensagem] = useState('');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [bairroEntrega, setBairroEntrega] = useState('');
  const [manualPixLink, setManualPixLink] = useState<string | null>(null);
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
    const data = await api.adminPedidos.listar({
      status: statusFiltro !== 'todos' ? statusFiltro : undefined,
      busca: busca || undefined,
    });
    setPedidos(data);
    if (!selectedId && data[0]) setSelectedId(data[0].id);
  }, [statusFiltro, busca, selectedId]);

  const carregarDetalhe = useCallback(async (id: string) => {
    const data = await api.adminPedidos.buscarPorId(id);
    setPedidoDetalhe(data);
    setSelectedMotoboyId(data.motoboy?.id || '');
    setObservacaoEntrega(data.observacaoEntrega || '');
    setEnderecoEntrega(data.cliente.endereco || '');
    setBairroEntrega(data.cliente.bairro || '');
  }, []);

  const carregarMotoboys = useCallback(async () => setMotoboys(await api.adminPedidos.listarMotoboys()), []);
  const carregarLojaStatus = useCallback(async () => {
    const data = await api.adminPedidos.obterStatusLoja();
    setLojaStatus(data);
    setMensagemPausa(data.mensagem || '');
  }, []);

  useEffect(() => {
    void carregarLista();
    void carregarMotoboys();
    void carregarLojaStatus();
  }, [carregarLista, carregarMotoboys, carregarLojaStatus]);

  useEffect(() => {
    if (selectedId) void carregarDetalhe(selectedId);
  }, [selectedId, carregarDetalhe]);

  useEffect(() => {
    if (pedidoDetalhe?.cliente?.telefone) {
      void api.adminClientes.obterResumo(pedidoDetalhe.cliente.telefone).then(setClienteResumo).catch(() => null);
    }
  }, [pedidoDetalhe?.cliente?.telefone]);

  useCockpitSocket({
    onPedidoNovo: () => void carregarLista(),
    onPedidoAtualizado: (payload) => {
      void carregarLista();
      if (selectedId && payload?.id === selectedId) void carregarDetalhe(selectedId);
    },
    onMensagemNova: () => void carregarLista(),
  });

  const resumo = useMemo(
    () => ({
      total: pedidos.length,
      aprovacao: pedidos.filter((p) => p.status === 'CONFIRMADO').length,
      preparo: pedidos.filter((p) => p.status === 'PREPARANDO').length,
    }),
    [pedidos]
  );

  const avancarStatus = useCallback(async () => {
    if (!pedidoDetalhe) return;
    const idx = STATUS_FLOW.indexOf(pedidoDetalhe.status as (typeof STATUS_FLOW)[number]);
    if (idx < 0 || idx === STATUS_FLOW.length - 1) return;
    const proximo = STATUS_FLOW[idx + 1];
    await api.adminPedidos.atualizarStatus(pedidoDetalhe.id, proximo);
    await Promise.all([carregarLista(), carregarDetalhe(pedidoDetalhe.id)]);
    showSuccess('Status atualizado');
  }, [pedidoDetalhe, carregarLista, carregarDetalhe, showSuccess]);

  const salvarEntrega = useCallback(async () => {
    if (!pedidoDetalhe) return;
    await api.adminPedidos.atribuirMotoboy(pedidoDetalhe.id, selectedMotoboyId || null, observacaoEntrega || undefined);
    await carregarDetalhe(pedidoDetalhe.id);
    showSuccess('Entrega atualizada');
  }, [pedidoDetalhe, selectedMotoboyId, observacaoEntrega, carregarDetalhe, showSuccess]);

  const salvarEnderecoEntrega = useCallback(async () => {
    if (!pedidoDetalhe) return;
    await api.adminPedidos.atualizarEnderecoEntrega(pedidoDetalhe.id, enderecoEntrega, bairroEntrega);
    await carregarDetalhe(pedidoDetalhe.id);
    showSuccess('Endereço de entrega atualizado');
  }, [pedidoDetalhe, enderecoEntrega, bairroEntrega, carregarDetalhe, showSuccess]);

  const cancelarPedido = useCallback(async () => {
    if (!pedidoDetalhe) return;
    await api.adminPedidos.cancelar(pedidoDetalhe.id, motivoCancelamento);
    setShowCancelModal(false);
    await Promise.all([carregarLista(), carregarDetalhe(pedidoDetalhe.id)]);
    showSuccess('Pedido cancelado');
  }, [pedidoDetalhe, motivoCancelamento, carregarLista, carregarDetalhe, showSuccess]);

  const criarPedidoManual = useCallback(async () => {
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
    showSuccess('Pedido manual criado');
  }, [manualForm, carregarLista, showSuccess]);

  const atualizarStatusLoja = useCallback(async (status: 'ABERTO' | 'FECHADO' | 'PAUSADO') => {
    try {
      const data = await api.adminPedidos.atualizarStatusLoja(status, status === 'PAUSADO' ? mensagemPausa : undefined);
      setLojaStatus(data);
      showSuccess('Status da loja atualizado');
    } catch (e: any) {
      showError('Falha no status da loja', e?.message || 'Tente novamente');
    }
  }, [mensagemPausa, showSuccess, showError]);

  return (
    <div className="p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Cockpit de Pedidos</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{resumo.total} pedidos · {resumo.aprovacao} aprovação · {resumo.preparo} preparo</p>
        </div>
        <div className="flex gap-2">
          <CrmButton size="sm" onClick={() => setShowManualModal(true)}>Pedido manual</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'ABERTO' ? 'primary' : 'ghost'} onClick={() => void atualizarStatusLoja('ABERTO')}>Abrir</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'PAUSADO' ? 'danger' : 'ghost'} onClick={() => void atualizarStatusLoja('PAUSADO')}>Pausar</CrmButton>
          <CrmButton size="sm" variant={lojaStatus?.status === 'FECHADO' ? 'danger' : 'ghost'} onClick={() => void atualizarStatusLoja('FECHADO')}>Fechar</CrmButton>
        </div>
      </div>

      {lojaStatus?.status === 'PAUSADO' && (
        <div className="mb-4 flex gap-2">
          <input value={mensagemPausa} onChange={(e) => setMensagemPausa(e.target.value)} className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
          <CrmButton size="sm" onClick={() => void atualizarStatusLoja('PAUSADO')}>Salvar pausa</CrmButton>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <CrmInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." />
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <CrmButton key={opt.value} size="sm" variant={statusFiltro === opt.value ? 'primary' : 'ghost'} onClick={() => setStatusFiltro(opt.value)}>
              {opt.label}
            </CrmButton>
          ))}
        </div>
      </div>

      <div className="grid min-h-[72vh] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CrmCard className="max-h-[72vh] overflow-auto p-3">
          {pedidos.map((pedido) => (
            <button key={pedido.id} type="button" onClick={() => setSelectedId(pedido.id)} className={`mb-2 w-full rounded-md border p-3 text-left ${selectedId === pedido.id ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}>
              <p className="text-xs text-[var(--color-text-secondary)]">#{pedido.numero}</p>
              <p className="font-semibold">{pedido.clienteNome}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{pedido.bairro}</p>
              <div className="mt-2 flex items-center justify-between">
                <CrmBadge variant={pedido.statusPagamento === 'CONFIRMADO' ? 'paid' : 'unpaid'}>{pedido.statusPagamento}</CrmBadge>
                <span className="text-sm font-semibold">{formatCurrency(pedido.total)}</span>
              </div>
            </button>
          ))}
        </CrmCard>

        <CrmCard className="p-5">
          {!pedidoDetalhe ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Selecione um pedido.</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-sora text-xl font-bold">Pedido #{pedidoDetalhe.numero}</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">{pedidoDetalhe.cliente.nome} · {pedidoDetalhe.cliente.telefone}</p>
                </div>
                <CrmBadge>{labelStatus(pedidoDetalhe.status)}</CrmBadge>
              </div>
              <CrmTab defaultValue="pedido">
                <CrmTabList>
                  <CrmTabTrigger value="pedido">Pedido</CrmTabTrigger>
                  <CrmTabTrigger value="entrega">Entrega</CrmTabTrigger>
                  <CrmTabTrigger value="whatsapp" onClick={async () => {
                    const tel = pedidoDetalhe.cliente.telefone;
                    setMensagens(await api.adminClientes.listarMensagens(tel, true));
                  }}>WhatsApp</CrmTabTrigger>
                  <CrmTabTrigger value="cliente">Cliente</CrmTabTrigger>
                  <CrmTabTrigger value="timeline">Timeline</CrmTabTrigger>
                </CrmTabList>

                <CrmTabPanel value="pedido">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <CrmButton size="sm" onClick={() => void avancarStatus()}>Avançar status</CrmButton>
                      <CrmButton size="sm" variant="danger" onClick={() => setShowCancelModal(true)}>Cancelar</CrmButton>
                    </div>
                    <CrmCard className="p-3 text-sm">
                      <p>Pagamento: {pedidoDetalhe.statusPagamento}</p>
                      <p>Total: {formatCurrency(pedidoDetalhe.total)}</p>
                    </CrmCard>
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="entrega">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input value={enderecoEntrega} onChange={(e) => setEnderecoEntrega(e.target.value)} placeholder="Endereço" className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
                      <input value={bairroEntrega} onChange={(e) => setBairroEntrega(e.target.value)} placeholder="Bairro" className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
                    </div>
                    {clienteResumo?.endereco && clienteResumo.endereco !== enderecoEntrega && (
                      <div className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-2 text-xs text-[var(--color-warning-text)]">
                        Endereço atual diferente do histórico do cliente.
                      </div>
                    )}
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

                <CrmTabPanel value="whatsapp">
                  <div className="space-y-2">
                    {mensagens.map((m) => <p key={m.id} className="rounded-md border border-[var(--color-border)] p-2 text-sm">{formatTime(m.criadoEm)} · {m.texto}</p>)}
                    <div className="flex gap-2">
                      <input value={textoMensagem} onChange={(e) => setTextoMensagem(e.target.value)} className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm" />
                      <CrmButton size="sm" onClick={async () => {
                        await api.adminClientes.enviarMensagem(pedidoDetalhe.cliente.telefone, textoMensagem, pedidoDetalhe.id);
                        setTextoMensagem('');
                        setMensagens(await api.adminClientes.listarMensagens(pedidoDetalhe.cliente.telefone, true));
                      }}>Enviar</CrmButton>
                    </div>
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="cliente">
                  <p className="text-sm">{clienteResumo?.nome || '-'}</p>
                </CrmTabPanel>

                <CrmTabPanel value="timeline">
                  {pedidoDetalhe.timeline.map((t, i) => <p key={`${t.timestamp}-${i}`} className="text-sm">{formatTime(t.timestamp)} · {t.ator} · {t.acao}</p>)}
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
            }}>
              Marcar estorno realizado
            </CrmButton>
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
