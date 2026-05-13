'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { ClienteGestaoItem, ClienteGestaoMetricas } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { CrmButton, CrmModal } from '@/components/crm';

const SEGMENTOS = [
  { key: 'TODOS',   label: 'Todos'     },
  { key: 'NOVO',    label: 'Novos'     },
  { key: 'ATIVO',   label: 'Ativos'    },
  { key: 'EM_RISCO',label: 'Em risco'  },
  { key: 'INATIVO', label: 'Inativos'  },
  { key: 'VIP',     label: 'VIP'       },
] as const;

const SEG_PILL: Record<string, string> = {
  NOVO:     'bg-[var(--color-info-muted)]    text-[var(--color-info-text)]    border-[var(--color-info-subtle)]',
  ATIVO:    'bg-[var(--color-success-muted)] text-[var(--color-success-text)] border-[var(--color-success-subtle)]',
  EM_RISCO: 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)] border-[var(--color-warning-subtle)]',
  INATIVO:  'bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] border-[var(--color-border)]',
  VIP:      'bg-[var(--color-accent-muted)]  text-[var(--color-accent)]       border-[var(--color-accent-subtle)]',
};

const SEG_DOT: Record<string, string> = {
  NOVO:     'bg-[var(--color-info)]',
  ATIVO:    'bg-[var(--color-success)]',
  EM_RISCO: 'bg-[var(--color-warning)]',
  INATIVO:  'bg-[var(--color-text-tertiary)]',
  VIP:      'bg-[var(--color-accent)]',
};

const SEG_LABEL: Record<string, string> = {
  NOVO: 'Novo', ATIVO: 'Ativo', EM_RISCO: 'Em risco', INATIVO: 'Inativo', VIP: 'VIP',
};

function initials(nome: string) {
  const parts = nome.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

function fmtRelativo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'agora';
  if (diffH < 24) return `${diffH}h atrás`;
  const d = Math.floor(diffH / 24);
  return `${d}d atrás`;
}

function ConversaStatus({ c }: { c: ClienteGestaoItem }) {
  if (c.mensagensNaoLidas > 0) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-danger-text)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)] animate-pulse" />
        {c.mensagensNaoLidas} não lida{c.mensagensNaoLidas > 1 ? 's' : ''}
      </span>
    );
  }
  if (!c.ultimaMensagemEm) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" />
        Sem contato
      </span>
    );
  }
  const diffH = Math.floor((Date.now() - new Date(c.ultimaMensagemEm).getTime()) / 3_600_000);
  const isRecente = diffH < 24;
  return (
    <span className={`flex items-center gap-1 text-[10px] ${isRecente ? 'text-[var(--color-success-text)]' : 'text-[var(--color-warning-text)]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isRecente ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`} />
      {fmtRelativo(c.ultimaMensagemEm)}
    </span>
  );
}

interface KebabMenuProps {
  cliente: ClienteGestaoItem;
  onDesativar: () => void;
  onBlacklist: () => void;
  onExcluir: () => void;
}

function KebabMenu({ cliente, onDesativar, onBlacklist, onExcluir }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
        aria-label="Mais ações"
      >
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
          <button
            type="button"
            onClick={() => { setOpen(false); onDesativar(); }}
            className="flex w-full items-center px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
          >
            {cliente.ativo ? 'Desativar cadastro' : 'Reativar cadastro'}
          </button>
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            type="button"
            onClick={() => { setOpen(false); onBlacklist(); }}
            className="flex w-full items-center px-3 py-2 text-xs text-[var(--color-warning-text)] hover:bg-[var(--color-surface-raised)]"
          >
            Adicionar à blacklist
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onExcluir(); }}
            className="flex w-full items-center px-3 py-2 text-xs font-semibold text-[var(--color-danger-text)] hover:bg-[var(--color-surface-raised)]"
          >
            Excluir cliente
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminClientesPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [segmento, setSegmento] = useState<(typeof SEGMENTOS)[number]['key']>('TODOS');
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<ClienteGestaoItem[]>([]);
  const [metricas, setMetricas] = useState<ClienteGestaoMetricas | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', endereco: '', bairro: '' });
  const [salvando, setSalvando] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<ClienteGestaoItem | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deletando, setDeletando] = useState(false);

  const [blacklistModal, setBlacklistModal] = useState<ClienteGestaoItem | null>(null);
  const [blacklistMotivo, setBlacklistMotivo] = useState('Bloqueio manual pelo atendente');
  const [salvandoBlacklist, setSalvandoBlacklist] = useState(false);

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

  useEffect(() => { void carregar(); }, [carregar]);

  async function handleCriar() {
    setSalvando(true);
    try {
      await api.adminClientes.criar(novoCliente);
      setNovoCliente({ nome: '', telefone: '', endereco: '', bairro: '' });
      setModalNovoCliente(false);
      showSuccess('Cliente criado', 'Cadastro manual concluído.');
      void carregar();
    } catch (error: any) {
      showError('Falha ao criar cliente', error?.message || 'Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleDesativar(c: ClienteGestaoItem) {
    try {
      await api.adminClientes.atualizarAtivo(c.telefone, !c.ativo);
      showSuccess('Status atualizado', `${c.nome} ${!c.ativo ? 'reativado' : 'desativado'}.`);
      void carregar();
    } catch (error: any) {
      showError('Falha ao atualizar', error?.message || 'Tente novamente.');
    }
  }

  async function handleBlacklist() {
    if (!blacklistModal || !blacklistMotivo.trim()) return;
    setSalvandoBlacklist(true);
    try {
      await api.adminClientes.adicionarListaNegra(blacklistModal.telefone, blacklistMotivo.trim());
      showSuccess('Blacklist atualizada', `${blacklistModal.nome} adicionado à blacklist.`);
      setBlacklistModal(null);
      setBlacklistMotivo('Bloqueio manual pelo atendente');
    } catch (error: any) {
      showError('Falha ao adicionar blacklist', error?.message || 'Tente novamente.');
    } finally {
      setSalvandoBlacklist(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeletando(true);
    try {
      await api.adminClientes.excluir(confirmDelete.telefone);
      showSuccess('Cliente excluído', `${confirmDelete.nome} removido do cadastro.`);
      setConfirmDelete(null);
      setDeleteInput('');
      void carregar();
    } catch (error: any) {
      showError('Falha ao excluir', error?.message || 'Se já tem pedidos, desative em vez de excluir.');
    } finally {
      setDeletando(false);
    }
  }

  async function handleEnviarWhatsApp(c: ClienteGestaoItem) {
    if (c.mensagensNaoLidas > 0) {
      router.push(`/admin/clientes/${encodeURIComponent(c.telefone)}`);
      return;
    }
    try {
      await api.adminClientes.enviarMensagem(c.telefone, c.mensagemSugerida);
      showSuccess('Mensagem enviada', `${c.nome} foi acionado no WhatsApp.`);
      void carregar();
    } catch (error: any) {
      showError('Falha ao enviar mensagem', error?.message || 'Tente novamente.');
    }
  }

  return (
    <div className="p-5 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Gestão de Clientes</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Recuperação inteligente, retenção e relacionamento</p>
        </div>
        <CrmButton size="sm" onClick={() => setModalNovoCliente(true)}>+ Novo cliente</CrmButton>
      </div>

      {/* KPI pills */}
      {metricas && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total',     value: metricas.total,               cls: '' },
            { label: 'Novos',     value: metricas.porSegmento.NOVO,    cls: 'border-[var(--color-info-subtle)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]' },
            { label: 'Ativos',   value: metricas.porSegmento.ATIVO,   cls: 'border-[var(--color-success-subtle)] bg-[var(--color-success-muted)] text-[var(--color-success-text)]' },
            { label: 'Em risco', value: metricas.emRisco,             cls: metricas.emRisco > 0 ? 'border-[var(--color-warning-subtle)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]' : '' },
            { label: 'Inativos', value: metricas.inativos,            cls: metricas.inativos > 0 ? 'border-[var(--color-danger-subtle)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]' : '' },
            { label: 'VIP',      value: metricas.porSegmento.VIP,     cls: metricas.porSegmento.VIP > 0 ? 'border-[var(--color-accent-subtle)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]' : '' },
            { label: 'Potencial',value: formatCurrency(metricas.potencialRecuperacao), cls: '' },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${item.cls || 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'}`}>
              <span className="opacity-70">{item.label}</span>
              <span className="font-sora font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + busca */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
          {SEGMENTOS.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSegmento(s.key)}
              className={`whitespace-nowrap px-4 pb-2 text-sm font-semibold border-b-2 transition-colors ${
                segmento === s.key
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {s.label}
              {s.key === 'EM_RISCO' && metricas && metricas.emRisco > 0 && (
                <span className="ml-1.5 rounded-full bg-[var(--color-warning)] px-1.5 py-0.5 text-[10px] font-bold text-white">{metricas.emRisco}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou bairro…"
            className="h-9 min-w-[260px] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
          />
          <CrmButton size="sm" variant="ghost" onClick={() => void carregar()}>
            Atualizar
          </CrmButton>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-tertiary)]">
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          {segmento !== 'TODOS' && ` · ${SEGMENTOS.find(s => s.key === segmento)?.label}`}
        </div>

        {loading ? (
          <div className="divide-y divide-[var(--color-border)]">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-[var(--color-border)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-[var(--color-border)]" />
                  <div className="h-2.5 w-64 rounded bg-[var(--color-border)]" />
                </div>
              </div>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {clientes.map((c) => (
              <div
                key={c.telefone}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {/* Avatar */}
                <div className={`h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${SEG_DOT[c.segmento] ?? 'bg-[var(--color-text-tertiary)]'}`}>
                  {initials(c.nome)}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/admin/clientes/${encodeURIComponent(c.telefone)}`}
                      className="text-sm font-semibold text-[var(--color-text-primary)] hover:underline truncate"
                    >
                      {c.nome}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SEG_PILL[c.segmento] ?? ''}`}>
                      {SEG_LABEL[c.segmento] ?? c.segmento}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                      {c.diasSemPedir >= 9999 ? 'Nunca pediu' : `${c.diasSemPedir}d sem pedir`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
                    <span>{c.bairro}</span>
                    <span>·</span>
                    <span>{c.totalPedidos} pedido{c.totalPedidos !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{formatCurrency(c.ticketMedio)} ticket</span>
                    {c.produtoFavorito && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{c.produtoFavorito}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status conversacional */}
                <div className="hidden sm:block flex-shrink-0 w-28 text-right">
                  <ConversaStatus c={c} />
                </div>

                {/* Ações */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <CrmButton
                    size="sm"
                    onClick={() => void handleEnviarWhatsApp(c)}
                  >
                    {c.mensagensNaoLidas > 0 ? 'Ver conversa' : 'WhatsApp'}
                  </CrmButton>
                  <KebabMenu
                    cliente={c}
                    onDesativar={() => void handleDesativar(c)}
                    onBlacklist={() => { setBlacklistModal(c); setBlacklistMotivo('Bloqueio manual pelo atendente'); }}
                    onExcluir={() => { setConfirmDelete(c); setDeleteInput(''); }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal — novo cliente */}
      <CrmModal open={modalNovoCliente} onClose={() => setModalNovoCliente(false)} title="Novo cliente">
        <div className="space-y-3">
          {[
            { field: 'nome' as const,     label: 'Nome completo',  placeholder: 'João Silva'     },
            { field: 'telefone' as const, label: 'Telefone / WhatsApp', placeholder: '62 9 9900-0001' },
            { field: 'bairro' as const,   label: 'Bairro',         placeholder: 'Residencial Eli Forte' },
            { field: 'endereco' as const, label: 'Endereço',        placeholder: 'Rua EF5, nº 15' },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">{label}</label>
              <input
                value={novoCliente[field]}
                onChange={(e) => setNovoCliente(p => ({ ...p, [field]: e.target.value }))}
                placeholder={placeholder}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <CrmButton size="sm" variant="ghost" onClick={() => setModalNovoCliente(false)}>Cancelar</CrmButton>
            <CrmButton size="sm" onClick={() => void handleCriar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Adicionar cliente'}
            </CrmButton>
          </div>
        </div>
      </CrmModal>

      {/* Modal — blacklist */}
      <CrmModal
        open={!!blacklistModal}
        onClose={() => setBlacklistModal(null)}
        title={`Blacklist — ${blacklistModal?.nome ?? ''}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Informe o motivo do bloqueio. O cliente não conseguirá fazer novos pedidos.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Motivo</label>
            <input
              value={blacklistMotivo}
              onChange={(e) => setBlacklistMotivo(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <CrmButton size="sm" variant="ghost" onClick={() => setBlacklistModal(null)}>Cancelar</CrmButton>
            <CrmButton size="sm" variant="danger" onClick={() => void handleBlacklist()} disabled={salvandoBlacklist || !blacklistMotivo.trim()}>
              {salvandoBlacklist ? 'Salvando…' : 'Confirmar blacklist'}
            </CrmButton>
          </div>
        </div>
      </CrmModal>

      {/* Modal — confirmar exclusão */}
      <CrmModal
        open={!!confirmDelete}
        onClose={() => { setConfirmDelete(null); setDeleteInput(''); }}
        title="Excluir cliente"
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Esta ação é <strong>irreversível</strong>. Para confirmar, digite o nome do cliente abaixo:
          </p>
          <p className="rounded-lg bg-[var(--color-surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]">
            {confirmDelete?.nome}
          </p>
          <input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder="Digite o nome para confirmar"
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <CrmButton size="sm" variant="ghost" onClick={() => { setConfirmDelete(null); setDeleteInput(''); }}>Cancelar</CrmButton>
            <CrmButton
              size="sm"
              variant="danger"
              onClick={() => void handleDelete()}
              disabled={deletando || deleteInput.trim() !== confirmDelete?.nome}
            >
              {deletando ? 'Excluindo…' : 'Excluir permanentemente'}
            </CrmButton>
          </div>
        </div>
      </CrmModal>

    </div>
  );
}
