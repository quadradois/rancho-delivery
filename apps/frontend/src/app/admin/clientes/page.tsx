'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { ClienteGestaoItem, ClienteGestaoMetricas } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { CrmButton, CrmCard } from '@/components/crm';

const SEGMENTOS = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'NOVO', label: 'Novos' },
  { key: 'ATIVO', label: 'Ativos' },
  { key: 'EM_RISCO', label: 'Em risco' },
  { key: 'INATIVO', label: 'Inativos' },
  { key: 'VIP', label: 'VIP' },
] as const;

export default function AdminClientesPage() {
  const { showError, showSuccess } = useToast();
  const [segmento, setSegmento] = useState<(typeof SEGMENTOS)[number]['key']>('TODOS');
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<ClienteGestaoItem[]>([]);
  const [metricas, setMetricas] = useState<ClienteGestaoMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    bairro: '',
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [lista, m] = await Promise.all([
        api.adminClientes.listarGestao({ segmento, busca: busca.trim() || undefined, limite: 200 }),
        api.adminClientes.obterMetricasGestao(),
      ]);
      setClientes(lista);
      setMetricas(m);
    } catch (error: any) {
      showError('Falha ao carregar clientes', error?.message || 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }, [segmento, busca, showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tituloSegmento = useMemo(() => SEGMENTOS.find((s) => s.key === segmento)?.label || 'Todos', [segmento]);

  return (
    <div className="p-5 md:p-6 space-y-4">
      <div>
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Gestão de Clientes</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Recuperação inteligente, retenção e relacionamento</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <CrmCard className="p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Total</p><p className="text-xl font-bold">{metricas?.total ?? 0}</p></CrmCard>
        <CrmCard className="p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Inativos</p><p className="text-xl font-bold">{metricas?.inativos ?? 0}</p></CrmCard>
        <CrmCard className="p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Em risco</p><p className="text-xl font-bold">{metricas?.emRisco ?? 0}</p></CrmCard>
        <CrmCard className="p-3"><p className="text-xs text-[var(--color-text-tertiary)]">VIP</p><p className="text-xl font-bold">{metricas?.porSegmento?.VIP ?? 0}</p></CrmCard>
        <CrmCard className="p-3"><p className="text-xs text-[var(--color-text-tertiary)]">Potencial recuperação</p><p className="text-xl font-bold">{formatCurrency(metricas?.potencialRecuperacao ?? 0)}</p></CrmCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {SEGMENTOS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSegmento(s.key)}
            className={`h-9 rounded-md px-3 text-sm font-semibold ${segmento === s.key ? 'bg-[var(--color-accent)] text-white' : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}
          >
            {s.label}
          </button>
        ))}
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, telefone ou bairro"
          className="h-9 min-w-[280px] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
        />
        <CrmButton size="sm" onClick={() => void carregar()}>Atualizar</CrmButton>
      </div>

      <CrmCard className="p-4 space-y-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Cadastro manual de cliente</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input value={novoCliente.nome} onChange={(e) => setNovoCliente((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
          <input value={novoCliente.telefone} onChange={(e) => setNovoCliente((p) => ({ ...p, telefone: e.target.value }))} placeholder="Telefone" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
          <input value={novoCliente.bairro} onChange={(e) => setNovoCliente((p) => ({ ...p, bairro: e.target.value }))} placeholder="Bairro" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
          <input value={novoCliente.endereco} onChange={(e) => setNovoCliente((p) => ({ ...p, endereco: e.target.value }))} placeholder="Endereço" className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm" />
        </div>
        <div>
          <CrmButton
            size="sm"
            onClick={async () => {
              try {
                await api.adminClientes.criar(novoCliente);
                setNovoCliente({ nome: '', telefone: '', endereco: '', bairro: '' });
                showSuccess('Cliente criado', 'Cadastro manual concluído.');
                void carregar();
              } catch (error: any) {
                showError('Falha ao criar cliente', error?.message || 'Tente novamente.');
              }
            }}
          >
            Adicionar cliente
          </CrmButton>
        </div>
      </CrmCard>

      <CrmCard className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
          Segmento: <span className="font-semibold text-[var(--color-text-primary)]">{tituloSegmento}</span> · {clientes.length} clientes
        </div>
        {loading ? (
          <div className="p-4 text-sm text-[var(--color-text-secondary)]">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="p-4 text-sm text-[var(--color-text-secondary)]">Nenhum cliente encontrado.</div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {clientes.map((c) => (
              <div key={c.telefone} className="p-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr_auto] items-start">
                <div>
                  <Link href={`/admin/clientes/${encodeURIComponent(c.telefone)}`} className="font-semibold text-[var(--color-text-primary)] hover:underline">
                    {c.nome}
                  </Link>
                  <p className="text-xs text-[var(--color-text-secondary)]">{c.telefone} · {c.bairro}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Último pedido: {c.ultimoPedidoEm ? new Date(c.ultimoPedidoEm).toLocaleString('pt-BR') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Segmento</p>
                  <p className="text-sm font-semibold">{c.segmento}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Dias sem pedir</p>
                  <p className="text-sm font-semibold">{c.diasSemPedir}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Estratégia sugerida</p>
                  <p className="text-sm text-[var(--color-text-primary)]">{c.mensagemSugerida}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-text-tertiary)]">{c.totalPedidos} pedidos · {formatCurrency(c.ticketMedio)} ticket</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Status: {c.ativo ? 'Ativo' : 'Desativado'}</p>
                  <CrmButton
                    size="sm"
                    onClick={async () => {
                      try {
                        await api.adminClientes.enviarMensagem(c.telefone, c.mensagemSugerida);
                        showSuccess('Mensagem enviada', `${c.nome} foi acionado no WhatsApp.`);
                      } catch (error: any) {
                        showError('Falha ao enviar mensagem', error?.message || 'Tente novamente.');
                      }
                    }}
                  >
                    Enviar WhatsApp
                  </CrmButton>
                  <div className="flex gap-2 flex-wrap">
                    <CrmButton
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await api.adminClientes.atualizarAtivo(c.telefone, !c.ativo);
                          showSuccess('Status atualizado', `${c.nome} agora está ${!c.ativo ? 'ativo' : 'desativado'}.`);
                          void carregar();
                        } catch (error: any) {
                          showError('Falha ao atualizar status', error?.message || 'Tente novamente.');
                        }
                      }}
                    >
                      {c.ativo ? 'Desativar' : 'Reativar'}
                    </CrmButton>
                    <CrmButton
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        const motivo = window.prompt(`Motivo da blacklist para ${c.nome}:`, 'Bloqueio manual pelo atendente');
                        if (!motivo) return;
                        try {
                          await api.adminClientes.adicionarListaNegra(c.telefone, motivo);
                          showSuccess('Blacklist atualizada', `${c.nome} foi adicionado à blacklist.`);
                        } catch (error: any) {
                          showError('Falha ao adicionar blacklist', error?.message || 'Tente novamente.');
                        }
                      }}
                    >
                      Blacklist
                    </CrmButton>
                    <CrmButton
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        const ok = window.confirm(`Excluir cliente ${c.nome}?`);
                        if (!ok) return;
                        try {
                          await api.adminClientes.excluir(c.telefone);
                          showSuccess('Cliente excluído', `${c.nome} removido do cadastro.`);
                          void carregar();
                        } catch (error: any) {
                          showError('Falha ao excluir cliente', error?.message || 'Se já tem pedidos, desative em vez de excluir.');
                        }
                      }}
                    >
                      Excluir
                    </CrmButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CrmCard>
    </div>
  );
}
