'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { type LeadEngajado, type LeadConversa } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';
import { useCockpitSocket } from '@/hooks/useCockpitSocket';

function formatRelative(iso?: string | null) {
  if (!iso) return '-';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function origemLabel(origem: string) {
  return origem === 'IA' ? '🤖 IA' : origem === 'HUMANO' ? '👤 Lead' : 'Sistema';
}

function origemBubble(origem: string) {
  return origem === 'IA'
    ? 'bg-[var(--color-info-muted)] text-[var(--color-info-text)] ml-auto'
    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]';
}

export default function EngajamentoPage() {
  const [leads, setLeads] = useState<LeadEngajado[]>([]);
  const [conversa, setConversa] = useState<LeadConversa | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversa, setLoadingConversa] = useState(false);

  const carregarLista = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.adminMineracao.listarLeadsEngajados(100);
      setLeads(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarConversa = useCallback(async (leadId: string) => {
    setLoadingConversa(true);
    try {
      const data = await api.adminMineracao.obterConversaLead(leadId);
      setConversa(data);
    } finally {
      setLoadingConversa(false);
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useCockpitSocket({
    onLeadMensagem: (payload) => {
      // Recarrega lista sempre que chega mensagem nova
      void carregarLista();
      // Se a conversa aberta é desta, recarrega ela também
      if (conversa && conversa.id === payload.leadId) {
        void carregarConversa(payload.leadId);
      }
    },
  });

  const naoLidos = leads.filter((l) => l.ultimaMensagem?.origem === 'HUMANO' && !conversa).length;
  const aguardandoHumano = leads.filter((l) => l.humanRequired).length;

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Engajamento do Agente IA</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Conversas em andamento dos leads que responderam às campanhas
          </p>
        </div>
        <div className="flex gap-2">
          <CrmCard className="px-4 py-2">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Engajados</p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{leads.length}</p>
          </CrmCard>
          <CrmCard className="px-4 py-2">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Pedindo humano</p>
            <p className="text-xl font-bold text-[var(--color-warning-text)]">{aguardandoHumano}</p>
          </CrmCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Lista de leads */}
        <CrmCard className="max-h-[calc(100vh-220px)] overflow-y-auto p-2">
          {loading && <p className="p-3 text-sm text-[var(--color-text-secondary)]">Carregando...</p>}
          {!loading && leads.length === 0 && (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">
              Nenhum lead respondeu ainda. Dispare uma campanha para começar.
            </p>
          )}
          <ul className="space-y-1">
            {leads.map((l) => {
              const isActive = conversa?.id === l.id;
              const m = l.ultimaMensagem;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => void carregarConversa(l.id)}
                    className={`flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors ${
                      isActive ? 'bg-[var(--color-accent)]/15' : 'hover:bg-[var(--color-surface-raised)]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-xs font-bold text-[var(--color-text-primary)]">
                      {(l.nome || l.telefone).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                          {l.nome || l.telefone}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                          {formatRelative(l.ultimaInteracaoEm)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        {m ? `${m.origem === 'IA' ? '🤖 ' : ''}${m.texto.slice(0, 60)}` : 'Sem mensagens'}
                      </p>
                      <div className="mt-1 flex gap-1">
                        {l.bairro && (
                          <span className="rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                            {l.bairro}
                          </span>
                        )}
                        {l.humanRequired && (
                          <span className="rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] text-[var(--color-warning-text)]">
                            ⚠️ Pediu humano
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </CrmCard>

        {/* Conversa */}
        <CrmCard className="flex max-h-[calc(100vh-220px)] flex-col p-0">
          {!conversa ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-secondary)]">
              Selecione um lead à esquerda para ver a conversa
            </div>
          ) : (
            <>
              <div className="border-b border-[var(--color-border)] p-4">
                <p className="font-semibold text-[var(--color-text-primary)]">{conversa.nome || conversa.telefone}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {conversa.telefone}{conversa.bairro ? ` · ${conversa.bairro}` : ''}
                  {conversa.humanRequired && (
                    <span className="ml-2 rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning-text)]">
                      ⚠️ Pediu atendimento humano
                    </span>
                  )}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingConversa && <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>}
                <div className="space-y-2">
                  {conversa.mensagens.map((m) => (
                    <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${origemBubble(m.origem)}`}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {origemLabel(m.origem)} · {formatRelative(m.criadoEm)}
                      </p>
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                    </div>
                  ))}
                  {conversa.mensagens.length === 0 && (
                    <p className="text-sm text-[var(--color-text-secondary)]">Sem mensagens ainda.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CrmCard>
      </div>
    </div>
  );
}
