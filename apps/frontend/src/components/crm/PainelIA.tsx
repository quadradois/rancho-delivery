'use client';

import React from 'react';
import { SugestaoIA } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';

interface PainelIAProps {
  sugestoes: SugestaoIA[];
  carregando: boolean;
  onAtualizar: () => void;
  onAcao: (sugestao: SugestaoIA) => void;
}

const TIPO_CONFIG: Record<SugestaoIA['tipo'], { icone: string; cor: string }> = {
  PREPARO_ACIMA_MEDIA:      { icone: '🍳', cor: 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]' },
  AGRUPAR_ENTREGAS:         { icone: '📦', cor: 'border-[var(--color-info)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]' },
  CLIENTE_INATIVO:          { icone: '💤', cor: 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]' },
  CANCELAMENTOS_ITEM:       { icone: '⚠️', cor: 'border-[var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]' },
  TODOS_MOTOBOYS_OCUPADOS:  { icone: '🛵', cor: 'border-[var(--color-warning)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]' },
  WHATSAPP_ACUMULADO:       { icone: '💬', cor: 'border-[var(--color-info)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]' },
};

const ACAO_LABEL: Partial<Record<SugestaoIA['tipo'], string>> = {
  CLIENTE_INATIVO:    'Ver clientes',
  WHATSAPP_ACUMULADO: 'Abrir WhatsApp',
  AGRUPAR_ENTREGAS:   'Ver pedidos',
};

export default function PainelIA({ sugestoes, carregando, onAtualizar, onAcao }: PainelIAProps) {
  return (
    <CrmCard className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <p className="font-sora text-sm font-bold text-[var(--color-text-primary)]">
            Sugestões IA
          </p>
          {sugestoes.length > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {sugestoes.length}
            </span>
          )}
        </div>
        <CrmButton size="sm" variant="ghost" onClick={onAtualizar} disabled={carregando}>
          {carregando ? '...' : 'Atualizar'}
        </CrmButton>
      </div>

      {sugestoes.length === 0 ? (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {carregando ? 'Analisando operação...' : 'Nenhuma sugestão no momento. Operação saudável!'}
        </p>
      ) : (
        <div className="space-y-2">
          {sugestoes.map((s) => {
            const cfg = TIPO_CONFIG[s.tipo];
            const acaoLabel = ACAO_LABEL[s.tipo];
            return (
              <div
                key={s.id}
                className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 ${cfg.cor}`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-sm">{cfg.icone}</span>
                  <p className="text-xs leading-relaxed">{s.texto}</p>
                </div>
                {acaoLabel && (
                  <CrmButton size="sm" variant="ghost" className="shrink-0" onClick={() => onAcao(s)}>
                    {acaoLabel}
                  </CrmButton>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CrmCard>
  );
}
