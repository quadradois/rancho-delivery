'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { ClienteResumoAdmin, MensagemClienteAdmin } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import { CrmButton, CrmCard, CrmModal } from '@/components/crm';

interface Props { params: { telefone: string } }

/* ── helpers ─────────────────────────────────────────────────────────── */
function initials(nome: string) {
  const p = nome.trim().split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nome.slice(0, 2).toUpperCase();
}

const SEG_PILL: Record<string, string> = {
  NOVO:     'bg-[var(--color-info-muted)]    text-[var(--color-info-text)]    border-[var(--color-info-subtle)]',
  ATIVO:    'bg-[var(--color-success-muted)] text-[var(--color-success-text)] border-[var(--color-success-subtle)]',
  EM_RISCO: 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)] border-[var(--color-warning-subtle)]',
  INATIVO:  'bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] border-[var(--color-border)]',
  VIP:      'bg-[var(--color-accent-muted)]  text-[var(--color-accent)]       border-[var(--color-accent-subtle)]',
};
const SEG_DOT: Record<string, string> = {
  NOVO: 'bg-[var(--color-info)]', ATIVO: 'bg-[var(--color-success)]',
  EM_RISCO: 'bg-[var(--color-warning)]', INATIVO: 'bg-[var(--color-text-tertiary)]', VIP: 'bg-[var(--color-accent)]',
};
const SEG_LABEL: Record<string, string> = {
  NOVO: 'Novo', ATIVO: 'Ativo', EM_RISCO: 'Em risco', INATIVO: 'Inativo', VIP: 'VIP',
};

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: 'Pag. pendente', CONFIRMADO: 'Aguard. preparo',
  PREPARANDO: 'Preparando', PRONTO: 'Pronto', SAIU_ENTREGA: 'Em rota',
  ENTREGUE: 'Entregue', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado',
};
const STATUS_COLOR: Record<string, string> = {
  ENTREGUE: 'text-[var(--color-success-text)] bg-[var(--color-success-muted)]',
  CANCELADO: 'text-[var(--color-danger-text)] bg-[var(--color-danger-muted)]',
  SAIU_ENTREGA: 'text-[var(--color-info-text)] bg-[var(--color-info-muted)]',
  PREPARANDO: 'text-[var(--color-warning-text)] bg-[var(--color-warning-muted)]',
};
const PAG_LABEL: Record<string, string> = {
  PIX: 'PIX', CARTAO_CREDITO: 'Crédito', CARTAO_DEBITO: 'Débito', DINHEIRO: 'Dinheiro',
};

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtTelefone(tel: string) {
  const d = tel.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return tel;
}

/* ── templates ───────────────────────────────────────────────────────── */
function buildTemplates(resumo: ClienteResumoAdmin) {
  return [
    { key: 'sugerida', label: 'Estratégia sugerida', texto: resumo.mensagemSugerida },
    { key: 'boasvindas', label: 'Boas-vindas', texto: `Olá ${resumo.nome}! 👋 Seja bem-vindo(a) ao Rancho Comida Caseira! Temos pratos deliciosos te esperando. Quer fazer seu pedido?` },
    { key: 'reativacao', label: 'Reativação', texto: `Oi ${resumo.nome}! Sentimos sua falta 😊 Faz um tempo que você não visita o Rancho. Temos novidades especiais! Que tal pedir hoje?` },
    { key: 'personalizada', label: 'Personalizada', texto: '' },
  ];
}

/* ── kebab ───────────────────────────────────────────────────────────── */
function KebabMenu({ items }: { items: { label: string; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-raised)]">
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
          {items.map((item, i) => (
            <button key={i} type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={`flex w-full px-4 py-2 text-sm ${item.danger ? 'font-semibold text-[var(--color-danger-text)]' : 'text-[var(--color-text-secondary)]'} hover:bg-[var(--color-surface-raised)]`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function ClienteDetalhePage({ params }: Props) {
  const telefone = useMemo(() => decodeURIComponent(params.telefone || ''), [params.telefone]);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [resumo, setResumo] = useState<ClienteResumoAdmin | null>(null);
  const [mensagens, setMensagens] = useState<MensagemClienteAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [templateAtivo, setTemplateAtivo] = useState<string>('sugerida');
  const mensagensRef = useRef<HTMLDivElement>(null);

  // modais
  const [blacklistModal, setBlacklistModal] = useState(false);
  const [blacklistMotivo, setBlacklistMotivo] = useState('Bloqueio manual pelo atendente');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (marcarLidas = false) => {
    if (!telefone) return;
    try {
      const [r, m] = await Promise.all([
        api.adminClientes.obterResumo(telefone),
        api.adminClientes.listarMensagens(telefone, marcarLidas),
      ]);
      setResumo(r);
      setMensagens(m);
      if (marcarLidas) {
        setNovaMensagem(prev => prev || r.mensagemSugerida);
      }
    } catch (error: any) {
      showError('Falha ao carregar cliente', error?.message || 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [telefone, showError]);

  useEffect(() => {
    void carregar(true);
  }, [carregar]);

  // Pre-fill on first load
  useEffect(() => {
    if (resumo && !novaMensagem) setNovaMensagem(resumo.mensagemSugerida);
  }, [resumo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh messages every 30s
  useEffect(() => {
    const id = setInterval(() => void carregar(false), 30_000);
    return () => clearInterval(id);
  }, [carregar]);

  // Scroll messages to bottom on new messages
  useEffect(() => {
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight;
    }
  }, [mensagens]);

  function aplicarTemplate(key: string) {
    if (!resumo) return;
    const tpl = buildTemplates(resumo).find(t => t.key === key);
    if (!tpl) return;
    setTemplateAtivo(key);
    setNovaMensagem(tpl.texto);
  }

  async function enviarMensagem() {
    const texto = novaMensagem.trim();
    if (!texto || !telefone) return;
    setSending(true);
    try {
      const enviada = await api.adminClientes.enviarMensagem(telefone, texto);
      setMensagens(prev => [...prev, enviada]);
      setNovaMensagem('');
      showSuccess('Mensagem enviada', 'Cliente acionado no WhatsApp.');
    } catch (error: any) {
      showError('Falha ao enviar', error?.message || 'Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  async function handleDesativar() {
    if (!resumo) return;
    try {
      await api.adminClientes.atualizarAtivo(resumo.telefone, !resumo.ativo);
      showSuccess('Status atualizado', `${resumo.nome} ${resumo.ativo ? 'desativado' : 'reativado'}.`);
      void carregar(false);
    } catch (error: any) { showError('Falha', error?.message || ''); }
  }

  async function handleBlacklist() {
    if (!resumo || !blacklistMotivo.trim()) return;
    setSalvando(true);
    try {
      if (resumo.emListaNegra) {
        await api.adminClientes.removerListaNegra(resumo.telefone);
        showSuccess('Blacklist removida', `${resumo.nome} saiu da blacklist.`);
      } else {
        await api.adminClientes.adicionarListaNegra(resumo.telefone, blacklistMotivo.trim());
        showSuccess('Blacklist atualizada', `${resumo.nome} adicionado.`);
      }
      setBlacklistModal(false);
      void carregar(false);
    } catch (error: any) { showError('Falha', error?.message || ''); }
    finally { setSalvando(false); }
  }

  async function handleDelete() {
    if (!resumo) return;
    setSalvando(true);
    try {
      await api.adminClientes.excluir(resumo.telefone);
      showSuccess('Cliente excluído', `${resumo.nome} removido do cadastro.`);
      router.push('/admin/clientes');
    } catch (error: any) {
      showError('Falha ao excluir', error?.message || 'Se já tem pedidos, desative em vez de excluir.');
      setSalvando(false);
    }
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="p-5 md:p-6 space-y-4">

      {/* Breadcrumb + ações */}
      <div className="flex items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link href="/admin/clientes" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">Clientes</Link>
          <span className="text-[var(--color-text-tertiary)]">/</span>
          <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[200px]">
            {loading ? '…' : (resumo?.nome ?? telefone)}
          </span>
        </nav>
        {resumo && (
          <KebabMenu items={[
            { label: resumo.ativo ? 'Desativar cadastro' : 'Reativar cadastro', onClick: () => void handleDesativar() },
            { label: resumo.emListaNegra ? 'Remover da blacklist' : 'Adicionar à blacklist', onClick: () => { setBlacklistMotivo('Bloqueio manual pelo atendente'); setBlacklistModal(true); } },
            { label: 'Excluir cliente', danger: true, onClick: () => { setDeleteInput(''); setConfirmDelete(true); } },
          ]} />
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]" />
          ))}
        </div>
      ) : !resumo ? (
        <CrmCard className="p-4 text-sm text-[var(--color-text-secondary)]">Cliente não encontrado.</CrmCard>
      ) : (
        <>
          {/* ── Card principal ─────────────────────────────────────────── */}
          <CrmCard className="p-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className={`h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white ${SEG_DOT[resumo.segmento] ?? 'bg-[var(--color-text-tertiary)]'}`}>
                {initials(resumo.nome)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-sora text-xl font-bold text-[var(--color-text-primary)]">{resumo.nome}</h1>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SEG_PILL[resumo.segmento] ?? ''}`}>
                    {SEG_LABEL[resumo.segmento] ?? resumo.segmento}
                  </span>
                  {resumo.ativo
                    ? <span className="rounded-full border border-[var(--color-success-subtle)] bg-[var(--color-success-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-success-text)]">● Ativo</span>
                    : <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-tertiary)]">Desativado</span>
                  }
                  {resumo.emListaNegra && (
                    <span className="rounded-full border border-[var(--color-danger-subtle)] bg-[var(--color-danger-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-danger-text)]">⛔ Blacklist</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                  {fmtTelefone(resumo.telefone)} · {resumo.endereco || resumo.bairro}
                </p>
                {resumo.diaFavorito && (
                  <p className="text-xs text-[var(--color-text-tertiary)]">Dia favorito: {resumo.diaFavorito}</p>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Pedidos</p>
                <p className="mt-0.5 text-2xl font-bold text-[var(--color-text-primary)]">{resumo.totalPedidos}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">{resumo.totalPedidos === 0 ? 'Nenhum ainda' : resumo.totalPedidos === 1 ? '1 pedido' : `${resumo.totalPedidos} pedidos`}</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Total gasto</p>
                <p className="mt-0.5 text-2xl font-bold text-[var(--color-text-primary)]">{formatCurrency(resumo.valorGasto)}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">{formatCurrency(resumo.ticketMedio)} ticket médio</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Dias sem pedir</p>
                <p className={`mt-0.5 text-2xl font-bold ${(resumo.diasSemPedir ?? 0) > 14 ? 'text-[var(--color-danger-text)]' : (resumo.diasSemPedir ?? 0) > 7 ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-text-primary)]'}`}>
                  {resumo.diasSemPedir ?? '—'}
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                  {resumo.ultimoPedido ? `Último: ${fmtData(resumo.ultimoPedido)}` : 'Nunca pediu'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Top produto</p>
                <p className="mt-0.5 text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                  {resumo.topProdutos[0]?.nome ?? '—'}
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                  {resumo.topProdutos[0] ? `${resumo.topProdutos[0].quantidade}× pedido` : 'Sem pedidos'}
                </p>
              </div>
            </div>
          </CrmCard>

          {/* ── Histórico de pedidos ───────────────────────────────────── */}
          {resumo.pedidosRecentes.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Pedidos ({resumo.totalPedidos})
              </h2>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {resumo.pedidosRecentes.map(p => (
                  <Link
                    key={p.id}
                    href={`/admin/pedidos#${p.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-[var(--color-text-primary)]">#{p.numero}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLOR[p.status] ?? 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">{PAG_LABEL[p.formaPagamento] ?? p.formaPagamento}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">{fmtData(p.criadoEm)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                        {p.itens.map(i => `${i.quantidade}× ${i.nome}`).join(' · ')}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-bold text-[var(--color-text-primary)]">{formatCurrency(p.total)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <CrmCard className="p-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Este contato ainda não realizou pedidos. Use a Ação de relacionamento abaixo para iniciar uma conversa.
              </p>
            </CrmCard>
          )}

          {/* ── Relacionamento + Mensagens ─────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Ação de relacionamento */}
            <CrmCard className="p-4 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Ação de relacionamento</h2>

              {/* Template buttons */}
              <div className="flex flex-wrap gap-1.5">
                {buildTemplates(resumo).map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => aplicarTemplate(t.key)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      templateAtivo === t.key
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-subtle)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <textarea
                value={novaMensagem}
                onChange={(e) => { setNovaMensagem(e.target.value); setTemplateAtivo('personalizada'); }}
                rows={6}
                placeholder="Digite a mensagem…"
                className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 py-2 text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{novaMensagem.length} caracteres</span>
                <CrmButton size="sm" onClick={() => void enviarMensagem()} disabled={sending || !novaMensagem.trim()}>
                  {sending ? 'Enviando…' : 'Enviar WhatsApp'}
                </CrmButton>
              </div>
            </CrmCard>

            {/* Histórico de mensagens — chat bubbles */}
            <CrmCard className="flex flex-col p-4" style={{ maxHeight: '420px' }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Mensagens</h2>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">Atualiza a cada 30s</span>
              </div>

              <div ref={mensagensRef} className="flex-1 overflow-auto space-y-2 pr-1">
                {mensagens.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <span className="text-2xl">💬</span>
                    <p className="text-sm text-[var(--color-text-tertiary)]">Nenhuma mensagem ainda.</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Use a Ação de relacionamento ao lado →</p>
                  </div>
                ) : (
                  [...mensagens].sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()).map(msg => {
                    const isCliente = msg.origem === 'HUMANO';
                    return (
                      <div key={msg.id} className={`flex ${isCliente ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                          isCliente
                            ? 'rounded-tl-sm bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]'
                            : 'rounded-tr-sm bg-[var(--color-accent)] text-white'
                        }`}>
                          <p>{msg.texto}</p>
                          <p className={`mt-1 text-[10px] ${isCliente ? 'text-[var(--color-text-tertiary)]' : 'text-white/70'}`}>
                            {isCliente ? 'Cliente' : msg.origem === 'IA' ? 'IA' : 'Operador'} · {fmtHora(msg.criadoEm)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CrmCard>
          </div>
        </>
      )}

      {/* Modal blacklist */}
      <CrmModal
        open={blacklistModal}
        onClose={() => setBlacklistModal(false)}
        title={resumo?.emListaNegra ? 'Remover da blacklist' : `Blacklist — ${resumo?.nome ?? ''}`}
      >
        <div className="space-y-3">
          {resumo?.emListaNegra ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Confirmar remoção de <strong>{resumo?.nome}</strong> da blacklist?
              {resumo?.motivoListaNegra && <> Motivo atual: <em>{resumo.motivoListaNegra}</em></>}
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">Informe o motivo do bloqueio.</p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">Motivo</label>
                <input
                  value={blacklistMotivo}
                  onChange={e => setBlacklistMotivo(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <CrmButton size="sm" variant="ghost" onClick={() => setBlacklistModal(false)}>Cancelar</CrmButton>
            <CrmButton size="sm" variant="danger" onClick={() => void handleBlacklist()} disabled={salvando}>
              {salvando ? 'Salvando…' : resumo?.emListaNegra ? 'Remover blacklist' : 'Confirmar blacklist'}
            </CrmButton>
          </div>
        </div>
      </CrmModal>

      {/* Modal exclusão */}
      <CrmModal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Excluir cliente">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Ação <strong>irreversível</strong>. Só é permitida para clientes sem pedidos. Digite o nome para confirmar:
          </p>
          <p className="rounded-lg bg-[var(--color-surface-raised)] px-3 py-2 text-sm font-semibold">{resumo?.nome}</p>
          <input
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            placeholder="Digite o nome exato"
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <CrmButton size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</CrmButton>
            <CrmButton size="sm" variant="danger" onClick={() => void handleDelete()}
              disabled={salvando || deleteInput.trim() !== resumo?.nome}>
              {salvando ? 'Excluindo…' : 'Excluir permanentemente'}
            </CrmButton>
          </div>
        </div>
      </CrmModal>
    </div>
  );
}
