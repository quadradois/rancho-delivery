'use client';

import { CrmButton, CrmInput } from '@/components/crm';
import { STATUS_OPTIONS } from './_utils';

interface Props {
  busca: string;
  onBuscaChange: (v: string) => void;
  statusFiltro: string;
  onStatusChange: (v: string) => void;
}

export function FiltrosBusca({ busca, onBuscaChange, statusFiltro, onStatusChange }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row">
      <div className="md:w-80">
        <CrmInput
          placeholder="Buscar cliente, telefone ou ID..."
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <CrmButton
            key={opt.value}
            variant={statusFiltro === opt.value ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
          </CrmButton>
        ))}
      </div>
    </div>
  );
}
