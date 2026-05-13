'use client';

import dynamic from 'next/dynamic';
import { MotoboyLocalizacao } from '@/hooks/useCockpitSocket';
import { CrmModal } from '@/components/crm';

const MapaRastreio = dynamic(() => import('./MapaRastreio'), { ssr: false });

interface Props {
  open: boolean;
  onClose: () => void;
  posicoes: MotoboyLocalizacao[];
  lojaLat?: number | null;
  lojaLng?: number | null;
}

export function ModalRastreio({ open, onClose, posicoes, lojaLat, lojaLng }: Props) {
  return (
    <CrmModal open={open} onClose={onClose} title="Rastreio em tempo real" className="max-w-2xl">
      <div className="flex flex-col gap-4">
        {posicoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--color-text-secondary)]">
            <span className="mb-3 text-4xl">🛵</span>
            <p className="font-medium">Nenhum entregador compartilhando localização</p>
            <p className="text-sm mt-1">A posição aparece automaticamente quando o entregador abre a fila no celular.</p>
          </div>
        ) : (
          <>
            {/* Mapa */}
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)]" style={{ height: 380 }}>
              <MapaRastreio posicoes={posicoes} lojaLat={lojaLat} lojaLng={lojaLng} />
            </div>

            {/* Lista de entregadores */}
            <div className="space-y-2">
              {posicoes.map((p) => (
                <div key={p.motoboyId} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {p.nome.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium">{p.nome}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        Atualizado {formatAgo(p.ts)}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </CrmModal>
  );
}

function formatAgo(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 10) return 'agora';
  if (secs < 60) return `há ${secs}s`;
  return `há ${Math.round(secs / 60)}min`;
}
