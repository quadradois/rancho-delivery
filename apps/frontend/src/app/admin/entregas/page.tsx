'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import api, { AcertoMotoboy, MotoboyAdmin, RelatorioDia } from '@/lib/api';
import FaixasEntrega, { FaixaEntrega } from '../configuracoes/_FaixasEntrega';

type Aba = 'cadastro' | 'taxas' | 'relatorio';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatarSegundos(s: number | null): string {
  if (!s) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min`;
}

function dataLocalBR(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

// ─── Aba Cadastro ───────────────────────────────────────────────────────────

const EMPRESA_LABELS: Record<string, string> = { PROPRIO: 'Próprio', IFOOD: 'iFood', MUVE: 'Muve', FOOD99: '99Food' };
const STATUS_LABELS: Record<string, string> = { DISPONIVEL: 'Disponível', EM_ENTREGA: 'Em entrega', INATIVO: 'Inativo' };
const STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: 'bg-green-100 text-green-800',
  EM_ENTREGA: 'bg-blue-100 text-blue-800',
  INATIVO: 'bg-gray-100 text-gray-500',
};

function RemuneracaoInline({ motoboy, onSaved }: { motoboy: MotoboyAdmin; onSaved: (m: MotoboyAdmin) => void }) {
  const { showSuccess, showError } = useToast();
  const [tipo, setTipo] = useState<'FIXO_POR_ENTREGA' | 'PERCENTUAL_TAXA'>(motoboy.tipoRemuneracao ?? 'FIXO_POR_ENTREGA');
  const [valor, setValor] = useState(String(motoboy.valorFixoPorEntrega ?? motoboy.percentualEntregas ?? ''));
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const payload = tipo === 'FIXO_POR_ENTREGA'
        ? { tipoRemuneracao: tipo, valorFixoPorEntrega: Number(valor), percentualEntregas: null }
        : { tipoRemuneracao: tipo, percentualEntregas: Number(valor), valorFixoPorEntrega: null };
      const updated = await api.adminPedidos.atualizarMotoboy(motoboy.id, payload);
      onSaved(updated);
      showSuccess('Remuneração salva');
    } catch {
      showError('Erro ao salvar remuneração');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={tipo}
        onChange={(e) => { setTipo(e.target.value as any); setValor(''); }}
        className="h-8 rounded border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-xs text-[var(--color-text-primary)]"
      >
        <option value="FIXO_POR_ENTREGA">R$ fixo/entrega</option>
        <option value="PERCENTUAL_TAXA">% da taxa</option>
      </select>
      <input
        type="number"
        min={0}
        step={0.5}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={tipo === 'FIXO_POR_ENTREGA' ? 'Ex: 5.00' : 'Ex: 80'}
        className="h-8 w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-xs text-[var(--color-text-primary)]"
      />
      <span className="text-xs text-[var(--color-text-secondary)]">{tipo === 'FIXO_POR_ENTREGA' ? 'R$' : '%'}</span>
      <button
        onClick={handleSalvar}
        disabled={saving || !valor}
        className="h-8 rounded bg-[var(--color-accent)] px-3 text-xs font-semibold text-[var(--color-text-on-accent)] disabled:opacity-50"
      >
        {saving ? '...' : 'Salvar'}
      </button>
    </div>
  );
}

function AbaCadastro() {
  const { showSuccess, showError } = useToast();
  const [motoboys, setMotoboys] = useState<MotoboyAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [novoMotoboy, setNovoMotoboy] = useState({
    nome: '',
    telefone: '',
    empresa: 'PROPRIO' as 'PROPRIO' | 'IFOOD' | 'MUVE' | 'FOOD99',
    status: 'DISPONIVEL' as 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO',
  });

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setMotoboys(await api.adminPedidos.listarMotoboys());
    } catch {
      showError('Erro ao carregar entregadores', 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { void carregar(); }, [carregar]);

  const handleCriar = async () => {
    if (!novoMotoboy.nome.trim() || !novoMotoboy.telefone.trim()) {
      showError('Preencha nome e telefone');
      return;
    }
    try {
      await api.adminPedidos.criarMotoboy(novoMotoboy);
      setNovoMotoboy((p) => ({ ...p, nome: '', telefone: '' }));
      await carregar();
      showSuccess('Entregador cadastrado');
    } catch {
      showError('Erro ao cadastrar entregador', 'Verifique os dados.');
    }
  };

  const handleSavedRemuneracao = (updated: MotoboyAdmin) => {
    setMotoboys((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
  };

  return (
    <div className="space-y-5">
      {/* Formulário de cadastro */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Novo entregador</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={novoMotoboy.nome}
            onChange={(e) => setNovoMotoboy((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Nome"
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]"
          />
          <input
            value={novoMotoboy.telefone}
            onChange={(e) => setNovoMotoboy((p) => ({ ...p, telefone: e.target.value }))}
            placeholder="Telefone"
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]"
          />
          <select
            value={novoMotoboy.empresa}
            onChange={(e) => setNovoMotoboy((p) => ({ ...p, empresa: e.target.value as any }))}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]"
          >
            <option value="PROPRIO">Próprio</option>
            <option value="IFOOD">iFood</option>
            <option value="MUVE">Muve</option>
            <option value="FOOD99">99Food</option>
          </select>
          <button onClick={handleCriar} className="h-9 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-on-accent)]">
            Cadastrar
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>
      ) : motoboys.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] italic">Nenhum entregador cadastrado.</p>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          {motoboys.map((m) => {
            const remuneracao = m.tipoRemuneracao === 'PERCENTUAL_TAXA'
              ? `${m.percentualEntregas ?? '—'}% da taxa`
              : m.valorFixoPorEntrega != null
                ? `${formatCurrency(m.valorFixoPorEntrega)}/entrega`
                : 'Não configurado';

            return (
              <div key={m.id} className="border-b border-[var(--color-border)] last:border-0">
                <button
                  type="button"
                  onClick={() => setExpandido(expandido === m.id ? null : m.id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--color-text-primary)]">{m.nome}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{m.telefone} · {EMPRESA_LABELS[m.empresa]}</p>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)] hidden sm:block">{remuneracao}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${STATUS_COLORS[m.status]}`}>
                    {STATUS_LABELS[m.status]}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{expandido === m.id ? '▲' : '▼'}</span>
                </button>

                {expandido === m.id && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
                    <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Remuneração</p>
                    <RemuneracaoInline motoboy={m} onSaved={handleSavedRemuneracao} />
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      <strong>Fixo por entrega:</strong> valor pago a cada entrega concluída. &nbsp;
                      <strong>% da taxa:</strong> percentual sobre a taxa cobrada do cliente.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Aba Taxas ──────────────────────────────────────────────────────────────

function AbaTaxas() {
  const { showError } = useToast();
  const [faixas, setFaixas] = useState<FaixaEntrega[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminPedidos.obterFaixasEntrega()
      .then((data) => setFaixas(data as FaixaEntrega[]))
      .catch(() => showError('Erro ao carregar faixas', 'Tente novamente.'))
      .finally(() => setLoading(false));
  }, [showError]);

  if (loading) return <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>;

  return <FaixasEntrega faixasIniciais={faixas} />;
}

// ─── Acerto por entregador ──────────────────────────────────────────────────

function AcertoEntregador({ motoboys }: { motoboys: MotoboyAdmin[] }) {
  const { showError } = useToast();
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = hoje.slice(0, 8) + '01';
  const [motoboyId, setMotoboyId] = useState('');
  const [inicio, setInicio] = useState(inicioMes);
  const [fim, setFim] = useState(hoje);
  const [acerto, setAcerto] = useState<AcertoMotoboy | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandirLista, setExpandirLista] = useState(false);

  const proprios = motoboys.filter((m) => m.empresa === 'PROPRIO');

  const buscar = async () => {
    if (!motoboyId) { showError('Selecione um entregador'); return; }
    setLoading(true);
    setAcerto(null);
    try {
      setAcerto(await api.adminPedidos.acertoMotoboy(motoboyId, inicio, fim));
    } catch {
      showError('Erro ao calcular acerto', 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="bg-[var(--color-surface-raised)] px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Acerto financeiro por entregador</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Calcula o valor a pagar conforme a remuneração configurada</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Entregador</label>
            <select
              value={motoboyId}
              onChange={(e) => setMotoboyId(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)] min-w-[180px]"
            >
              <option value="">Selecione...</option>
              {proprios.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">De</label>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Até</label>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]" />
          </div>
          <button onClick={buscar} disabled={loading}
            className="h-9 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-on-accent)] disabled:opacity-50">
            {loading ? 'Calculando...' : 'Calcular'}
          </button>
        </div>

        {acerto && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Entregas', value: String(acerto.totalEntregas) },
                { label: 'Taxas arrecadadas', value: formatCurrency(acerto.totalTaxas) },
                { label: 'Volume de pedidos', value: formatCurrency(acerto.totalPedidos) },
                { label: 'Total a pagar', value: formatCurrency(acerto.valorAcerto), destaque: true },
              ].map((k) => (
                <div key={k.label} className={`rounded-xl border p-4 ${k.destaque ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface-raised)]'}`}>
                  <p className="text-xs text-[var(--color-text-secondary)]">{k.label}</p>
                  <p className={`mt-1 text-xl font-bold ${k.destaque ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Regra aplicada */}
            <p className="text-xs text-[var(--color-text-secondary)]">
              Regra: {acerto.motoboy.tipoRemuneracao === 'FIXO_POR_ENTREGA'
                ? `${formatCurrency(acerto.motoboy.valorFixoPorEntrega ?? 0)} × ${acerto.totalEntregas} entrega(s)`
                : `${acerto.motoboy.percentualEntregas ?? 0}% de ${formatCurrency(acerto.totalTaxas)} em taxas`}
              {' '}· Período: {new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>

            {/* Detalhamento */}
            {acerto.entregas.length > 0 && (
              <div>
                <button onClick={() => setExpandirLista((v) => !v)}
                  className="text-xs text-[var(--color-accent)] hover:underline">
                  {expandirLista ? 'Ocultar' : 'Ver'} {acerto.entregas.length} entrega(s) detalhadas
                </button>
                {expandirLista && (
                  <div className="mt-2 overflow-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                          <th className="px-3 py-2 text-left text-[var(--color-text-secondary)]">Pedido</th>
                          <th className="px-3 py-2 text-left text-[var(--color-text-secondary)]">Data/hora</th>
                          <th className="px-3 py-2 text-right text-[var(--color-text-secondary)]">Taxa</th>
                          <th className="px-3 py-2 text-right text-[var(--color-text-secondary)]">Total pedido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acerto.entregas.map((e) => (
                          <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0">
                            <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">#{e.numero ?? '—'}</td>
                            <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                              {new Date(e.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-2 text-right text-[var(--color-text-primary)]">{formatCurrency(e.taxaEntrega)}</td>
                            <td className="px-3 py-2 text-right text-[var(--color-text-primary)]">{formatCurrency(e.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {proprios.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] italic">
            Nenhum entregador próprio cadastrado. Acerto só se aplica a entregadores da empresa.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Aba Relatório ──────────────────────────────────────────────────────────

function AbaRelatorio() {
  const { showError } = useToast();
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [relatorio, setRelatorio] = useState<RelatorioDia | null>(null);
  const [loading, setLoading] = useState(false);
  const [motoboys, setMotoboys] = useState<MotoboyAdmin[]>([]);

  const buscar = useCallback(async (d: string) => {
    setLoading(true);
    setRelatorio(null);
    try {
      const result = await api.adminRelatorios.gerar(d);
      setRelatorio(result);
    } catch {
      showError('Erro ao gerar relatório', 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { void buscar(data); }, [buscar, data]);

  useEffect(() => {
    api.adminPedidos.listarMotoboys().then(setMotoboys).catch(() => {});
  }, []);

  const tempoEntregaMin = relatorio?.tempoMedioEntrega
    ? Math.round(relatorio.tempoMedioEntrega / 60)
    : null;

  return (
    <div className="space-y-5">
      {/* Seletor de data */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">Data:</label>
        <input
          type="date"
          value={data}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setData(e.target.value)}
          className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]"
        />
        <button onClick={() => buscar(data)} disabled={loading}
          className="h-9 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-on-accent)] disabled:opacity-50">
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-secondary)]">Gerando relatório...</p>}

      {relatorio && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Entregas realizadas', value: relatorio.entregasRealizadas },
              { label: 'Taxa arrecadada', value: formatCurrency(relatorio.taxaEntregaTotal) },
              { label: 'Tempo médio entrega', value: tempoEntregaMin !== null ? `${tempoEntregaMin} min` : '—' },
              { label: 'Ticket médio', value: formatCurrency(relatorio.ticketMedio) },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                <p className="text-xs text-[var(--color-text-secondary)]">{kpi.label}</p>
                <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{String(kpi.value)}</p>
              </div>
            ))}
          </div>

          {/* Por entregador */}
          {relatorio.entregasPorResponsavel && relatorio.entregasPorResponsavel.length > 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="bg-[var(--color-surface-raised)] px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Desempenho por entregador</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Entregador</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Entregas</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Taxa total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.entregasPorResponsavel.map((e) => (
                    <tr key={e.responsavel} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{e.responsavel}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">{e.quantidade}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">{formatCurrency(e.taxaTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Nenhuma entrega realizada em {dataLocalBR(new Date(data + 'T12:00:00'))}.
              </p>
            </div>
          )}

          {/* Por hora */}
          {relatorio.entregasPorHora && relatorio.entregasPorHora.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="bg-[var(--color-surface-raised)] px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Entregas por horário</h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {relatorio.entregasPorHora.map((h) => (
                  <div key={h.hora} className="flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 min-w-[56px]">
                    <span className="text-xs text-[var(--color-text-secondary)]">{h.hora}</span>
                    <span className="text-base font-bold text-[var(--color-text-primary)]">{h.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tempo médio por etapa */}
          {relatorio.tempoMedioPorEtapa && relatorio.tempoMedioPorEtapa.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="bg-[var(--color-surface-raised)] px-4 py-3 border-b border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Tempo médio por etapa</h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {relatorio.tempoMedioPorEtapa.map((e) => {
                  const ETAPA_LABELS: Record<string, string> = {
                    CONFIRMADO: 'Confirmação', PREPARANDO: 'Preparo',
                    PRONTO: 'Aguardando despacho', SAIU_ENTREGA: 'Em rota',
                  };
                  return (
                    <div key={e.status} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-[var(--color-text-secondary)]">{ETAPA_LABELS[e.status] ?? e.status}</span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatarSegundos(e.mediaSegundos)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Acerto financeiro — independente da data do relatório */}
      <AcertoEntregador motoboys={motoboys} />
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

const ABAS: { id: Aba; label: string }[] = [
  { id: 'cadastro', label: 'Cadastro de entregadores' },
  { id: 'taxas', label: 'Taxas de entrega' },
  { id: 'relatorio', label: 'Relatório de entregas' },
];

export default function EntregasPage() {
  const [aba, setAba] = useState<Aba>('cadastro');

  return (
    <div className="p-5 md:p-6">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Entregas</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Central de gestão de entregadores, taxas e desempenho.</p>
      </div>

      {/* Abas */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              aba === a.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {aba === 'cadastro' && <AbaCadastro />}
      {aba === 'taxas' && <AbaTaxas />}
      {aba === 'relatorio' && <AbaRelatorio />}
    </div>
  );
}
