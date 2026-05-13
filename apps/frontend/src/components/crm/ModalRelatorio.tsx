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

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return sec > 0 ? `${m}min ${sec}s` : `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

const STAGE_LABELS: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: 'Pag. pendente',
  CONFIRMADO:           'Aguard. preparo',
  PREPARANDO:           'Preparando',
  PRONTO:               'Pronto p/ desp.',
  SAIU_ENTREGA:         'Em rota',
  ENTREGUE:             'Entregue',
};

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
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Entregas realizadas</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{relatorio.entregasRealizadas}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Taxa de entrega</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatCurrency(relatorio.taxaEntregaTotal)}</p>
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

            {relatorio.entregasPorResponsavel && relatorio.entregasPorResponsavel.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Entregas por responsável</p>
                {relatorio.entregasPorResponsavel.map((item) => (
                  <p key={item.responsavel} className="text-xs text-[var(--color-text-secondary)]">
                    {item.responsavel}: <span className="font-semibold">{item.quantidade} entrega(s)</span> · {formatCurrency(item.taxaTotal)}
                  </p>
                ))}
              </div>
            )}

            {relatorio.tempoMedioPorEtapa && relatorio.tempoMedioPorEtapa.length > 0 && (() => {
              const etapas = relatorio.tempoMedioPorEtapa!;
              const maxSeg = Math.max(...etapas.map(e => e.mediaSegundos));
              const gargalo = etapas.reduce((a, b) => a.mediaSegundos > b.mediaSegundos ? a : b);
              return (
                <div className="border-t border-[var(--color-border)] pt-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">Tempo médio por etapa</p>
                    <span className="text-[10px] text-[var(--color-danger-text)] font-semibold">
                      Gargalo: {STAGE_LABELS[gargalo.status] ?? gargalo.status} ({fmtDuration(gargalo.mediaSegundos)})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {etapas.map(etapa => {
                      const pct = Math.round((etapa.mediaSegundos / maxSeg) * 100);
                      const isGargalo = etapa.status === gargalo.status;
                      return (
                        <div key={etapa.status}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs ${isGargalo ? 'font-bold text-[var(--color-danger-text)]' : 'text-[var(--color-text-secondary)]'}`}>
                              {STAGE_LABELS[etapa.status] ?? etapa.status}
                              {isGargalo && ' ⚠'}
                            </span>
                            <span className={`text-xs font-semibold ${isGargalo ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-text-primary)]'}`}>
                              {fmtDuration(etapa.mediaSegundos)}
                              <span className="ml-1 font-normal text-[var(--color-text-tertiary)]">({etapa.amostras})</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                            <div
                              className={`h-1.5 rounded-full ${isGargalo ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-info)]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {relatorio.entregasPorHora && relatorio.entregasPorHora.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Quando as entregas foram feitas</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {relatorio.entregasPorHora.map((h) => `${h.hora}: ${h.quantidade}`).join(' · ')}
                </p>
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
