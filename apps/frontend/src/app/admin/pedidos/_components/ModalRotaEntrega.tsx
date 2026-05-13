'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import api, { AgruparRotaResult, GrupoRota, MotoboyAdmin, ParadaRota } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CrmButton, CrmModal } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

// Leaflet importado dinamicamente (sem SSR)
const MapaRota = dynamic(() => import('./MapaRota'), { ssr: false });

interface Props {
  open: boolean;
  onClose: () => void;
  motoboys: MotoboyAdmin[];
  onDespachado: () => void;
}

export function ModalRotaEntrega({ open, onClose, motoboys, onDespachado }: Props) {
  const { showSuccess, showError } = useToast();
  const [carregando, setCarregando] = useState(false);
  const [despachando, setDespachando] = useState(false);
  const [resultado, setResultado] = useState<AgruparRotaResult | null>(null);
  const [motoboyId, setMotoboyId] = useState('');
  const [maxPorGrupo, setMaxPorGrupo] = useState(4);
  const [raioKm, setRaioKm] = useState(3);
  const carregouRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setResultado(null);
      carregouRef.current = false;
      return;
    }
    if (carregouRef.current) return;
    carregouRef.current = true;
    agrupar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function agrupar() {
    setCarregando(true);
    try {
      const data = await api.adminPedidos.agruparRota({ maxPorGrupo, raioKm });
      setResultado(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao agrupar rotas';
      showError('Erro ao agrupar rotas', msg);
    } finally {
      setCarregando(false);
    }
  }

  async function despachar() {
    if (!resultado?.grupo.pedidos.length) return;
    setDespachando(true);
    try {
      const ids = resultado.grupo.pedidos.map((p) => p.pedidoId);
      await api.adminPedidos.despacharGrupo(ids, motoboyId || null);
      showSuccess('Rota despachada!', `${ids.length} pedido(s) em rota.`);
      onDespachado();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao despachar';
      showError('Erro ao despachar', msg);
    } finally {
      setDespachando(false);
    }
  }

  const grupo: GrupoRota | null = resultado?.grupo ?? null;
  const motoboysProprios = motoboys.filter((m) => m.empresa === 'PROPRIO' && m.status !== 'INATIVO');

  return (
    <CrmModal open={open} onClose={onClose} title="Agrupar Entregas" className="max-w-2xl">
      <div className="flex flex-col gap-4">
        {/* Controles */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1">
              Máx. pedidos por rota
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxPorGrupo}
              onChange={(e) => setMaxPorGrupo(Number(e.target.value))}
              className="w-24 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1">
              Raio (km)
            </label>
            <input
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              value={raioKm}
              onChange={(e) => setRaioKm(Number(e.target.value))}
              className="w-24 px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
            />
          </div>
          <CrmButton variant="ghost" size="sm" onClick={() => { carregouRef.current = false; agrupar(); }} disabled={carregando}>
            {carregando ? 'Calculando...' : 'Recalcular'}
          </CrmButton>
        </div>

        {carregando && (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            Calculando rota otimizada...
          </div>
        )}

        {!carregando && grupo && (
          <>
            {/* Resumo */}
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="font-medium">{grupo.pedidos.length} entrega(s)</span>
              <span className="text-[var(--color-text-secondary)]">~{grupo.distanciaTotalKm} km</span>
              <span className="text-[var(--color-text-secondary)]">~{grupo.estimativaMinutos} min</span>
              <span className="font-medium text-[var(--color-success)]">
                {formatCurrency(grupo.pedidos.reduce((s, p) => s + p.valorTotal, 0))}
              </span>
            </div>

            {/* Mapa */}
            <div className="rounded overflow-hidden border border-[var(--color-border)]" style={{ height: 320 }}>
              <MapaRota grupo={grupo} />
            </div>

            {/* Lista de paradas */}
            <ol className="flex flex-col gap-2">
              {grupo.pedidos.map((parada) => (
                <ParadaItem key={parada.pedidoId} parada={parada} />
              ))}
            </ol>

            {resultado?.semCoordenadas && resultado.semCoordenadas.length > 0 && (
              <div className="text-xs text-[var(--color-warning)] bg-[var(--color-warning-muted)] rounded p-2">
                {resultado.semCoordenadas.length} pedido(s) sem coordenadas foram adicionados ao final da rota.
              </div>
            )}

            {/* Atribuição de motoboy */}
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1">
                Entregador (opcional)
              </label>
              <select
                value={motoboyId}
                onChange={(e) => setMotoboyId(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
              >
                <option value="">Sem entregador atribuído</option>
                {motoboysProprios.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            {/* Botão despachar */}
            <div className="flex justify-end gap-2 pt-2">
              <CrmButton variant="ghost" onClick={onClose} disabled={despachando}>
                Cancelar
              </CrmButton>
              <CrmButton
                variant="primary"
                onClick={despachar}
                disabled={despachando || grupo.pedidos.length === 0}
              >
                {despachando ? 'Despachando...' : `Despachar ${grupo.pedidos.length} pedido(s)`}
              </CrmButton>
            </div>
          </>
        )}

        {!carregando && grupo && grupo.pedidos.length === 0 && (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            Nenhum pedido PRONTO encontrado para entrega no raio configurado.
          </div>
        )}
      </div>
    </CrmModal>
  );
}

function ParadaItem({ parada }: { parada: ParadaRota }) {
  return (
    <li className="flex items-start gap-3 p-2 rounded bg-[var(--color-surface-secondary)]">
      <span className="flex-none w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
        {parada.ordem}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{parada.clienteNome}</div>
        <div className="text-xs text-[var(--color-text-secondary)] truncate">{parada.enderecoEntrega}, {parada.bairroEntrega}</div>
      </div>
      <div className="flex-none text-right">
        <div className="text-xs text-[var(--color-text-secondary)]">
          {parada.distanciaKm > 0 ? `+${parada.distanciaKm} km` : 'sem coord.'}
        </div>
        <div className="text-xs font-medium">{formatCurrency(parada.valorTotal)}</div>
      </div>
    </li>
  );
}
