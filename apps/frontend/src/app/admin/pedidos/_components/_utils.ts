export const FINAL_STATUSES = ['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'] as const;
export type FinalStatus = (typeof FINAL_STATUSES)[number];
export const isFinalStatus = (status: string): boolean =>
  (FINAL_STATUSES as readonly string[]).includes(status);

export const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'AGUARDANDO_PAGAMENTO', label: 'Pag. Pendente' },
  { value: 'CONFIRMADO', label: 'Aguardando preparo' },
  { value: 'PREPARANDO', label: 'Preparo' },
  { value: 'PRONTO', label: 'Pronto' },
  { value: 'SAIU_ENTREGA', label: 'Em rota' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const STATUS_FLOW = ['AGUARDANDO_PAGAMENTO', 'CONFIRMADO', 'PREPARANDO', 'PRONTO', 'SAIU_ENTREGA', 'ENTREGUE'] as const;

export const CANCEL_MOTIVOS = [
  'Cliente desistiu',
  'Sem entregador disponível',
  'Fora de área',
  'Item indisponível',
  'Pagamento não aprovado',
  'Erro operacional',
];

export function toBadgeVariant(status: string) {
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO':
    case 'PENDENTE':
      return 'pending' as const;
    case 'CONFIRMADO':
      return 'waiting' as const;
    case 'PREPARANDO':
      return 'preparing' as const;
    case 'PRONTO':
      return 'waiting' as const;
    case 'SAIU_ENTREGA':
      return 'on-route' as const;
    case 'ENTREGUE':
      return 'delivered' as const;
    case 'CANCELADO':
      return 'cancelled' as const;
    case 'EXPIRADO':
    case 'ABANDONADO':
      return 'expired' as const;
    default:
      return 'unpaid' as const;
  }
}

export function labelStatus(status: string) {
  const labels: Record<string, string> = {
    AGUARDANDO_PAGAMENTO: 'Pag. pendente',
    CONFIRMADO:           'Aguard. preparo',
    PREPARANDO:           'Preparando',
    PRONTO:               'Pronto',
    SAIU_ENTREGA:         'Em rota',
    ENTREGUE:             'Entregue',
    CANCELADO:            'Cancelado',
    EXPIRADO:             'Expirado',
    ABANDONADO:           'Abandonado',
    PENDENTE:             'Pendente',
  };
  return labels[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

export function ctaStatus(status: string, tipoAtendimento?: string) {
  if (status === 'PRONTO') {
    if (tipoAtendimento === 'RETIRADA')      return 'Confirmar retirada';
    if (tipoAtendimento === 'CONSUMO_LOCAL') return 'Confirmar consumo';
    return 'Despachar entrega';
  }
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO': return 'Aceitar pedido';
    case 'CONFIRMADO':           return 'Iniciar preparo';
    case 'PREPARANDO':           return 'Marcar pronto';
    case 'SAIU_ENTREGA':         return 'Marcar entregue';
    default:                     return 'Ação indisponível';
  }
}

export function motivoBloqueioAcao(status: string, statusPagamento?: string, aguardandoEntregador?: boolean) {
  if (['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'].includes(status)) return 'Pedido em status final';
  if (status === 'PENDENTE' || (status === 'AGUARDANDO_PAGAMENTO' && statusPagamento !== 'CONFIRMADO')) return 'Aguardando pagamento confirmado';
  if (status === 'PRONTO' && aguardandoEntregador) return 'Aguardando entregador';
  return null;
}

export function paymentIcon(statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'A_RECEBER' | 'EXPIRADO') {
  if (statusPagamento === 'CONFIRMADO') return '🔒';
  if (statusPagamento === 'EXPIRADO') return '❌';
  return '⏳';
}

export function slaByStatus(status: string) {
  switch (status) {
    case 'CONFIRMADO':   return { warningAt: 180,      dangerAt: 300      };
    case 'PREPARANDO':   return { warningAt: 1500,     dangerAt: 2100     };
    case 'PRONTO':       return { warningAt: 900,      dangerAt: 1500     };
    case 'SAIU_ENTREGA': return { warningAt: 3000,     dangerAt: 3600     };
    // Status finais nunca disparam SLA — tempoNoEstagio nunca alcançará Infinity
    case 'ENTREGUE':
    case 'CANCELADO':
    case 'EXPIRADO':
    case 'ABANDONADO':   return { warningAt: Infinity, dangerAt: Infinity };
    default:             return { warningAt: 300,      dangerAt: 600      };
  }
}

export function actorClass(ator: string) {
  switch (ator) {
    case 'OPERADOR':
      return 'border-[var(--color-info-subtle)] bg-[var(--color-info-muted)] text-[var(--color-info-text)]';
    case 'SISTEMA':
      return 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]';
    case 'CLIENTE':
      return 'border-[var(--color-success-subtle)] bg-[var(--color-success-muted)] text-[var(--color-success-text)]';
    case 'IA':
      return 'border-[var(--color-warning-subtle)] bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]';
  }
}

export function flowBadgeClass(flowStatus: string, currentStatus: string) {
  if (flowStatus === currentStatus) {
    return 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-surface)]';
  }
  return 'opacity-70';
}
