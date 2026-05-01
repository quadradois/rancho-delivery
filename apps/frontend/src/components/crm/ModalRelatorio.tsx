'use client';

import React from 'react';
import { RelatorioDia } from '@/lib/api';
import { CrmButton, CrmModal } from '@/components/crm';

interface ModalRelatorioProps {
  open: boolean;
  onClose: () => void;
  relatorio: RelatorioDia | null;
  carregando: boolean;
  onGerar: () => void;
  historico: RelatorioDia[];
  onVerHistorico: (data: string) => void;
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ModalRelatorio({
  open,
  onClose,
  relatorio,
  carregando,
  onGerar,
  historico,
  onVerHistorico,
}: ModalRelatorioProps) {
  return (
    <CrmModal open={open} onClose={onClose} title="Relatório do Dia">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">Resumo operacional do dia atual</p>
          <CrmButton size="sm" onClick={onGerar} disabled={carregando}>
            {carregando ? 'Gerando...' : 'Gerar agora'}
          </CrmButton>
        </div>

        {relatorio && (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Pedidos recebidos</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{relatorio.pedidosRecebidos}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Entregues</p>
                <p className="text-lg font-bold text-[var(--color-success-text)]">{relatorio.pedidosEntregues}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Cancelados</p>
                <p className="text-lg font-bold text-[var(--color-danger-text)]">{relatorio.pedidosCancelados}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Receita bruta</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatCurrency(relatorio.receitaBruta)}</p>
                {relatorio.receitaOntem !== null && relatorio.receitaOntem !== undefined && relatorio.receitaOntem > 0 && (
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    {relatorio.receitaBruta >= relatorio.receitaOntem ? '+' : ''}
                    {Math.round(((relatorio.receitaBruta - relatorio.receitaOntem) / relatorio.receitaOntem) * 100)}% vs ontem
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Ticket médio</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatCurrency(relatorio.ticketMedio)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">WhatsApp</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                  {relatorio.mensagensRespondidas}/{relatorio.mensagensTotal}
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">respondidas</p>
              </div>
            </div>

            {relatorio.piorHorario && (
              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Pior horário: <span className="font-semibold text-[var(--color-text-primary)]">{relatorio.piorHorario}</span>
                  {relatorio.produtoMaisVendido && (
                    <> · Mais vendido: <span className="font-semibold text-[var(--color-text-primary)]">{relatorio.produtoMaisVendido}</span></>
                  )}
                </p>
              </div>
            )}

            {relatorio.motivosCancelamento && Object.keys(relatorio.motivosCancelamento).length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Motivos de cancelamento</p>
                {Object.entries(relatorio.motivosCancelamento).map(([motivo, qtd]) => (
                  <p key={motivo} className="text-xs text-[var(--color-text-secondary)]">
                    {motivo}: <span className="font-semibold">{qtd}x</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {historico.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Histórico (últimos 30 dias)</p>
            <div className="max-h-40 overflow-auto rounded-md border border-[var(--color-border)]">
              {historico.map((r) => (
                <button
                  key={r.data}
                  type="button"
                  onClick={() => onVerHistorico(r.data)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)]"
                >
                  <span className="text-[var(--color-text-primary)]">{formatData(r.data)}</span>
                  <span className="text-[var(--color-text-secondary)]">{formatCurrency(r.receitaBruta)} · {r.pedidosEntregues} entregas</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </CrmModal>
  );
}
