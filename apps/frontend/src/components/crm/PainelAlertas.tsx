'use client';

import React from 'react';
import { ConfiguracaoAlerta } from '@/lib/api';
import { CrmCard } from '@/components/crm';

interface PainelAlertasProps {
  alertas: ConfiguracaoAlerta[];
  onAtualizar: (tipo: string, dados: Partial<Pick<ConfiguracaoAlerta, 'ativo' | 'threshold' | 'acao'>>) => Promise<void>;
}

const TIPO_LABEL: Record<string, { label: string; descricao: string; unidade: string }> = {
  PAGAMENTO_SEM_CONFIRMACAO: { label: 'Pagamento sem confirmação', descricao: 'Pedido pago aguardando confirmação do operador', unidade: 'seg' },
  PREPARO_ACIMA_TEMPO:       { label: 'Preparo acima do tempo',    descricao: 'Pedido em preparo além do tempo esperado',         unidade: 'seg' },
  MOTOBOY_SEM_RETORNO:       { label: 'Motoboy sem retorno',       descricao: 'Pedido em rota sem confirmação de entrega',        unidade: 'seg' },
  WHATSAPP_SEM_RESPOSTA:     { label: 'WhatsApp sem resposta',     descricao: 'Mensagem do cliente sem resposta do operador',     unidade: 'seg' },
  LOJA_PAUSADA_MUITO_TEMPO:  { label: 'Loja pausada há muito tempo', descricao: 'Loja em modo pausado por tempo excessivo',       unidade: 'seg' },
  TODOS_MOTOBOYS_OCUPADOS:   { label: 'Todos motoboys ocupados',   descricao: 'Nenhum entregador disponível para novo pedido',    unidade: '' },
  WHATSAPP_DESCONECTADO:     { label: 'WhatsApp desconectado',     descricao: 'Conexão com WhatsApp perdida',                    unidade: '' },
};

const ACOES = ['som+badge', 'som+push', 'badge', 'som+visual', 'silencioso'];

export default function PainelAlertas({ alertas, onAtualizar }: PainelAlertasProps) {
  return (
    <CrmCard className="p-4">
      <p className="mb-4 font-sora text-sm font-bold text-[var(--color-text-primary)]">Configuração de Alertas</p>
      <div className="space-y-3">
        {alertas.map((alerta) => {
          const cfg = TIPO_LABEL[alerta.tipo] || { label: alerta.tipo, descricao: '', unidade: 'seg' };
          return (
            <div key={alerta.tipo} className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{cfg.label}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">{cfg.descricao}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {cfg.unidade && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={alerta.threshold}
                      onChange={(e) => void onAtualizar(alerta.tipo, { threshold: Number(e.target.value) })}
                      className="h-8 w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm"
                    />
                    <span className="text-xs text-[var(--color-text-tertiary)]">{cfg.unidade}</span>
                  </div>
                )}
                <select
                  value={alerta.acao}
                  onChange={(e) => void onAtualizar(alerta.tipo, { acao: e.target.value })}
                  className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-xs"
                >
                  {ACOES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={alerta.ativo}
                    onChange={(e) => void onAtualizar(alerta.tipo, { ativo: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs text-[var(--color-text-secondary)]">Ativo</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </CrmCard>
  );
}
