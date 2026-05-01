'use client';

import React, { useState } from 'react';
import { MotoboyStatusAdmin } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';

interface PainelMotoboyProps {
  motoboys: MotoboyStatusAdmin[];
  pedidoSemMotoboyId: string | null;
  onAtribuir: (motoboyId: string, pedidoId: string) => void;
  onVerPedido: (pedidoId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  DISPONIVEL: { label: 'Livre', cor: 'text-[var(--color-success-text)] bg-[var(--color-success-muted)]' },
  EM_ENTREGA: { label: 'Em rota', cor: 'text-[var(--color-info-text)] bg-[var(--color-info-muted)]' },
  INATIVO:    { label: 'Pausado', cor: 'text-[var(--color-text-tertiary)] bg-[var(--color-surface-raised)]' },
};

export default function PainelMotoboys({
  motoboys,
  pedidoSemMotoboyId,
  onAtribuir,
  onVerPedido,
}: PainelMotoboyProps) {
  const [aberto, setAberto] = useState(true);

  const totalOcupados = motoboys.filter((m) => m.status === 'EM_ENTREGA').length;
  const todosOcupados = motoboys.length > 0 && totalOcupados === motoboys.filter((m) => m.status !== 'INATIVO').length;

  return (
    <CrmCard className={`mb-4 p-3 ${todosOcupados && pedidoSemMotoboyId ? 'border-[var(--color-warning)]' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-sora text-sm font-bold text-[var(--color-text-primary)]">
            Entregadores ({motoboys.length})
          </p>
          {todosOcupados && pedidoSemMotoboyId && (
            <span className="rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning-text)]">
              Todos ocupados · pedido aguardando
            </span>
          )}
        </div>
        <CrmButton size="sm" variant="ghost" onClick={() => setAberto((v) => !v)}>
          {aberto ? 'Recolher' : 'Expandir'}
        </CrmButton>
      </div>

      {aberto && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                <th className="pb-1 text-left font-semibold">Nome</th>
                <th className="pb-1 text-left font-semibold">Status</th>
                <th className="pb-1 text-center font-semibold">Rotas</th>
                <th className="pb-1 text-center font-semibold">Hoje</th>
                <th className="pb-1 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {motoboys.map((m) => {
                const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.INATIVO;
                return (
                  <tr key={m.id} className="py-1">
                    <td className="py-1.5 pr-3 font-medium text-[var(--color-text-primary)]">{m.nome}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cor}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-center text-[var(--color-text-secondary)]">
                      {m.rotasAtivas > 0 ? (
                        <button
                          type="button"
                          className="text-[var(--color-accent)] underline"
                          onClick={() => m.pedidosAtivos[0] && onVerPedido(m.pedidosAtivos[0])}
                        >
                          {m.rotasAtivas}
                        </button>
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">0</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-center text-[var(--color-text-secondary)]">
                      {m.entregasHoje}
                    </td>
                    <td className="py-1.5 text-right">
                      {m.status !== 'INATIVO' && pedidoSemMotoboyId && (
                        <CrmButton
                          size="sm"
                          variant={m.status === 'DISPONIVEL' ? 'primary' : 'ghost'}
                          onClick={() => onAtribuir(m.id, pedidoSemMotoboyId)}
                        >
                          Atribuir
                        </CrmButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CrmCard>
  );
}