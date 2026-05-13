'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export type TipoFaixa = 'GRATIS' | 'FIXO' | 'POR_KM';

export interface FaixaEntrega {
  ateKm: number;
  tipo: TipoFaixa;
  valor: number;
}

const TIPO_LABELS: Record<TipoFaixa, string> = {
  GRATIS: 'Grátis',
  FIXO: 'Valor fixo (R$)',
  POR_KM: 'Por km (R$/km)',
};

function FaixaRow({
  faixa,
  index,
  onChange,
  onRemove,
}: {
  faixa: FaixaEntrega;
  index: number;
  onChange: (f: FaixaEntrega) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-input)] border border-[var(--color-border)]">
      <span className="text-xs text-[var(--color-text-secondary)] w-5 shrink-0">{index + 1}</span>

      <div className="flex flex-col gap-1 w-28">
        <label className="text-[10px] text-[var(--color-text-secondary)]">Até (km)</label>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={faixa.ateKm}
          onChange={(e) => onChange({ ...faixa, ateKm: Number(e.target.value) })}
          className="h-8 px-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] w-full"
        />
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[10px] text-[var(--color-text-secondary)]">Tipo</label>
        <select
          value={faixa.tipo}
          onChange={(e) => onChange({ ...faixa, tipo: e.target.value as TipoFaixa, valor: e.target.value === 'GRATIS' ? 0 : faixa.valor })}
          className="h-8 px-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] w-full"
        >
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {faixa.tipo !== 'GRATIS' && (
        <div className="flex flex-col gap-1 w-28">
          <label className="text-[10px] text-[var(--color-text-secondary)]">
            {faixa.tipo === 'FIXO' ? 'Valor (R$)' : 'R$/km'}
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={faixa.valor}
            onChange={(e) => onChange({ ...faixa, valor: Number(e.target.value) })}
            className="h-8 px-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] w-full"
          />
        </div>
      )}

      <button
        onClick={onRemove}
        className="ml-auto text-red-400 hover:text-red-300 text-lg leading-none shrink-0"
        title="Remover faixa"
      >
        ×
      </button>
    </div>
  );
}

function simularTaxa(faixas: FaixaEntrega[], km: number): string {
  const ordenadas = [...faixas].sort((a, b) => a.ateKm - b.ateKm);
  const raioMax = ordenadas[ordenadas.length - 1]?.ateKm ?? 0;
  if (km > raioMax) return 'Fora da área';
  const faixa = ordenadas.find((f) => km <= f.ateKm);
  if (!faixa) return 'Fora da área';
  if (faixa.tipo === 'GRATIS') return 'Grátis';
  if (faixa.tipo === 'FIXO') return `R$ ${faixa.valor.toFixed(2)}`;
  return `R$ ${(km * faixa.valor).toFixed(2)}`;
}

export default function FaixasEntrega({ faixasIniciais }: { faixasIniciais: FaixaEntrega[] }) {
  const { showSuccess, showError } = useToast();
  const [faixas, setFaixas] = useState<FaixaEntrega[]>(faixasIniciais);
  const [saving, setSaving] = useState(false);

  const addFaixa = () => {
    const ultimoKm = faixas[faixas.length - 1]?.ateKm ?? 0;
    setFaixas((prev) => [...prev, { ateKm: ultimoKm + 3, tipo: 'FIXO', valor: 5 }]);
  };

  const updateFaixa = (i: number, f: FaixaEntrega) => {
    setFaixas((prev) => prev.map((x, idx) => (idx === i ? f : x)));
  };

  const removeFaixa = (i: number) => {
    setFaixas((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      await api.adminPedidos.salvarFaixasEntrega(faixas);
      showSuccess('Faixas salvas', 'Configuração de taxa de entrega atualizada.');
    } catch {
      showError('Erro', 'Não foi possível salvar as faixas de entrega.');
    } finally {
      setSaving(false);
    }
  };

  const simulacoes = [1, 2, 3, 5, 8, 12, 15];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Define faixas de distância (em km) para calcular automaticamente a taxa de entrega. Quando configurado, substitui a taxa manual por bairro.
      </p>

      <div className="space-y-2">
        {faixas.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] italic">Nenhuma faixa configurada — usando taxa por bairro.</p>
        )}
        {faixas.map((f, i) => (
          <FaixaRow key={i} faixa={f} index={i} onChange={(nf) => updateFaixa(i, nf)} onRemove={() => removeFaixa(i)} />
        ))}
      </div>

      <button
        onClick={addFaixa}
        className="w-full h-9 rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
      >
        + Adicionar faixa
      </button>

      {faixas.length > 0 && (
        <div className="rounded-lg bg-[var(--color-surface-input)] border border-[var(--color-border)] p-3">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">Simulação de taxas</p>
          <div className="flex flex-wrap gap-2">
            {simulacoes.map((km) => (
              <div key={km} className="text-xs px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span className="text-[var(--color-text-secondary)]">{km}km → </span>
                <span className="text-[var(--color-text-primary)] font-medium">{simularTaxa(faixas, km)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSalvar}
        disabled={saving}
        className="h-9 px-5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? 'Salvando...' : 'Salvar faixas'}
      </button>
    </div>
  );
}
