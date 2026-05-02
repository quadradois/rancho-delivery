'use client';

import { AdminPedidoDetalhe } from '@/lib/api';
import { CrmButton, CrmModal } from '@/components/crm';
import { CANCEL_MOTIVOS } from './_utils';
import api from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoDetalhe: AdminPedidoDetalhe | null;
  motivoCancelamento: string;
  onMotivoChange: (v: string) => void;
  onConfirmar: () => void;
  onEstornoRealizado: () => void;
}

export function ModalCancelar({
  open,
  onClose,
  pedidoDetalhe,
  motivoCancelamento,
  onMotivoChange,
  onConfirmar,
  onEstornoRealizado,
}: Props) {
  return (
    <CrmModal open={open} onClose={onClose} title="Cancelar pedido">
      <select
        value={motivoCancelamento}
        onChange={(e) => onMotivoChange(e.target.value)}
        className="mb-3 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-2 text-sm"
      >
        {CANCEL_MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      {pedidoDetalhe?.statusPagamento === 'CONFIRMADO' && (
        <p className="mb-3 text-sm text-[var(--color-warning-text)]">Pagamento confirmado: estorno será marcado como necessário.</p>
      )}
      {pedidoDetalhe?.estornoNecessario && (
        <div className="mb-3">
          <CrmButton
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (!pedidoDetalhe) return;
              await api.adminPedidos.marcarEstorno(pedidoDetalhe.id);
              onEstornoRealizado();
            }}
          >
            Marcar estorno realizado
          </CrmButton>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <CrmButton variant="ghost" onClick={onClose}>Fechar</CrmButton>
        <CrmButton variant="danger" onClick={onConfirmar}>Confirmar</CrmButton>
      </div>
    </CrmModal>
  );
}
