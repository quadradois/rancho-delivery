'use client';

import { ConversaNaoLida, LojaStatusAdmin } from '@/lib/api';
import { CrmButton } from '@/components/crm';

interface Props {
  totalPedidos: number;
  resumo: { aprovacao: number; preparo: number };
  abaCockpit: 'pedidos' | 'whatsapp';
  onAbaChange: (aba: 'pedidos' | 'whatsapp') => void;
  conversas: ConversaNaoLida[];
  onAbrirRelatorio: () => void;
  modoPico: boolean;
  onToggleModoPico: () => void;
  muted: boolean;
  onToggleMuted: () => void;
  onNovoPedidoManual: () => void;
  lojaStatus: LojaStatusAdmin | null;
  onAtualizarStatusLoja: (status: 'ABERTO' | 'FECHADO' | 'PAUSADO') => void;
  onFecharLoja: () => void;
  onAtualizar: () => void;
  onCarregarConversas: () => void;
}

export function CockpitHeader({
  totalPedidos,
  resumo,
  abaCockpit,
  onAbaChange,
  conversas,
  onAbrirRelatorio,
  modoPico,
  onToggleModoPico,
  muted,
  onToggleMuted,
  onNovoPedidoManual,
  lojaStatus,
  onAtualizarStatusLoja,
  onFecharLoja,
  onAtualizar,
  onCarregarConversas,
}: Props) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Cockpit de Pedidos</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {totalPedidos} pedidos · {resumo.aprovacao} aguardando aprovação · {resumo.preparo} em preparo
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => onAbaChange('pedidos')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors ${abaCockpit === 'pedidos' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
          >
            Pedidos
          </button>
          <button
            type="button"
            onClick={() => { onAbaChange('whatsapp'); onCarregarConversas(); }}
            className={`relative px-3 py-1.5 text-sm font-semibold transition-colors ${abaCockpit === 'whatsapp' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}
          >
            WhatsApp
            {conversas.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger)] text-[9px] font-bold text-white">
                {conversas.length > 9 ? '9+' : conversas.length}
              </span>
            )}
          </button>
        </div>
        <CrmButton size="sm" onClick={onAbrirRelatorio}>Relatório</CrmButton>
        <CrmButton
          size="sm"
          variant={modoPico ? 'danger' : 'ghost'}
          onClick={onToggleModoPico}
          title={modoPico ? 'Desativar Modo Pico' : 'Ativar Modo Pico'}
        >
          {modoPico ? '⚡ Pico ON' : '⚡ Pico'}
        </CrmButton>
        <CrmButton size="sm" variant={muted ? 'ghost' : 'primary'} onClick={onToggleMuted}>
          {muted ? 'Ligar som' : 'Desligar som'}
        </CrmButton>
        <CrmButton size="sm" onClick={onNovoPedidoManual}>Pedido manual</CrmButton>
        <CrmButton size="sm" variant={lojaStatus?.status === 'ABERTO' ? 'primary' : 'ghost'} onClick={() => onAtualizarStatusLoja('ABERTO')}>Abrir</CrmButton>
        <CrmButton size="sm" variant={lojaStatus?.status === 'PAUSADO' ? 'danger' : 'ghost'} onClick={() => onAtualizarStatusLoja('PAUSADO')}>Pausar</CrmButton>
        <CrmButton size="sm" variant={lojaStatus?.status === 'FECHADO' ? 'danger' : 'ghost'} onClick={onFecharLoja}>Fechar</CrmButton>
        <CrmButton variant="ghost" onClick={onAtualizar}>Atualizar</CrmButton>
      </div>
    </div>
  );
}
