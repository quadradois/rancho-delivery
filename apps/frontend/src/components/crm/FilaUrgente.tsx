'use client';

import React from 'react';
import { FilaUrgenteItem } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';

interface FilaUrgenteProps {
  itens: FilaUrgenteItem[];
  onAceitar: (id: string) => void;
  onVer: (id: string) => void;
  onResponder: (id: string) => void;
  onEstorno: (id: string) => void;
}

const TIPO_CONFIG: Record<
  FilaUrgenteItem['tipo'],
  { label: string; cor: string; icone: string }
> = {
  PAGAMENTO_PENDENTE: {
    label: 'Pago · aguardando confirmação',
    cor: 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]',
    icone: '💳',
  },
  SLA_ESTOURADO: {
    label: 'SLA estourado',
    cor: 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]',
    icone: '⏰',
  },
  MENSAGEM_SEM_RESPOSTA: {
    label: 'Mensagem sem resposta',
    cor: 'border-[var(--color-info)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]',
    icone: '💬',
  },
  ESTORNO_PENDENTE: {
    label: 'Estorno pendente',
    cor: 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]',
    icone: '↩️',
  },
};

function formatTempo(segundos: number) {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${String(m).padStart(2, '0')}min`;
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function FilaUrgente({
  itens,
  onAceitar,
  onVer,
  onResponder,
  onEstorno,
}: FilaUrgenteProps) {
  if (itens.length === 0) return null;

  return (
    <CrmCard className="mb-4 border-[var(--color-danger)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="animate-pulse text-base">🔴</span>
        <p className="font-sora text-sm font-bold text-[var(--color-danger-text)]">
          AÇÃO NECESSÁRIA AGORA ({itens.length})
        </p>
      </div>
      <div className="space-y-2">
        {itens.map((item) => {
          const cfg = TIPO_CONFIG[item.tipo];
          return (
            <div
              key={`${item.id}-${item.tipo}`}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${cfg.cor}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-base">{cfg.icone}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    #{item.numero} · {item.clienteNome}
                  </p>
                  <p className="truncate text-[11px] opacity-80">
                    {cfg.label}
                    {item.itensResumo.length > 0 && ` · ${item.itensResumo.join(' + ')}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono-crm text-xs font-bold">
                  {formatTempo(item.tempoEsperaSegundos)}
                </span>
                {item.tipo === 'PAGAMENTO_PENDENTE' && (
                  <CrmButton size="sm" onClick={() => onAceitar(item.id)}>
                    Aceitar
                  </CrmButton>
                )}
                {item.tipo === 'SLA_ESTOURADO' && (
                  <CrmButton size="sm" variant="ghost" onClick={() => onVer(item.id)}>
                    Ver
                  </CrmButton>
                )}
                {item.tipo === 'MENSAGEM_SEM_RESPOSTA' && (
                  <CrmButton size="sm" variant="ghost" onClick={() => onResponder(item.id)}>
                    Responder
                  </CrmButton>
                )}
                {item.tipo === 'ESTORNO_PENDENTE' && (
                  <CrmButton size="sm" variant="danger" onClick={() => onEstorno(item.id)}>
                    Estorno
                  </CrmButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CrmCard>
  );
}