import { describe, it, expect } from 'vitest';
import {
  slaByStatus,
  labelStatus,
  ctaStatus,
  motivoBloqueioAcao,
  toBadgeVariant,
} from './_utils';

// ─── slaByStatus ─────────────────────────────────────────────────────────────

describe('slaByStatus', () => {
  it('retorna thresholds corretos para CONFIRMADO', () => {
    expect(slaByStatus('CONFIRMADO')).toEqual({ warningAt: 180, dangerAt: 300 });
  });

  it('retorna thresholds corretos para PREPARANDO', () => {
    expect(slaByStatus('PREPARANDO')).toEqual({ warningAt: 1500, dangerAt: 2100 });
  });

  it('retorna thresholds corretos para PRONTO', () => {
    expect(slaByStatus('PRONTO')).toEqual({ warningAt: 900, dangerAt: 1500 });
  });

  it('retorna thresholds corretos para SAIU_ENTREGA', () => {
    expect(slaByStatus('SAIU_ENTREGA')).toEqual({ warningAt: 3000, dangerAt: 3600 });
  });

  it.each(['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'])(
    'retorna Infinity para status final %s (BX-03)',
    (status) => {
      const sla = slaByStatus(status);
      expect(sla.warningAt).toBe(Infinity);
      expect(sla.dangerAt).toBe(Infinity);
    }
  );

  it('status final nunca dispara SLA mesmo com tempoNoEstagio absurdo', () => {
    const tempoOntem = 86_400; // 24h em segundos
    expect(tempoOntem >= slaByStatus('ENTREGUE').dangerAt).toBe(false);
    expect(tempoOntem >= slaByStatus('EXPIRADO').dangerAt).toBe(false);
    expect(tempoOntem >= slaByStatus('ABANDONADO').dangerAt).toBe(false);
  });

  it('retorna default para status desconhecido', () => {
    expect(slaByStatus('DESCONHECIDO')).toEqual({ warningAt: 300, dangerAt: 600 });
  });
});

// ─── labelStatus ─────────────────────────────────────────────────────────────

describe('labelStatus', () => {
  it.each([
    ['AGUARDANDO_PAGAMENTO', 'Pag. pendente'],
    ['CONFIRMADO',           'Aguard. preparo'],
    ['PREPARANDO',           'Preparando'],
    ['PRONTO',               'Pronto'],
    ['SAIU_ENTREGA',         'Em rota'],
    ['ENTREGUE',             'Entregue'],
    ['CANCELADO',            'Cancelado'],
    ['EXPIRADO',             'Expirado'],
    ['ABANDONADO',           'Abandonado'],
    ['PENDENTE',             'Pendente'],
  ])('label de %s é "%s"', (status, esperado) => {
    expect(labelStatus(status)).toBe(esperado);
  });

  it('não usa fallback para nenhum status do fluxo real', () => {
    const statusesReais = [
      'AGUARDANDO_PAGAMENTO','CONFIRMADO','PREPARANDO','PRONTO',
      'SAIU_ENTREGA','ENTREGUE','CANCELADO','EXPIRADO','ABANDONADO','PENDENTE',
    ];
    for (const s of statusesReais) {
      // fallback seria: s.replace(/_/g, ' ').toLowerCase()
      expect(labelStatus(s)).not.toBe(s.replace(/_/g, ' ').toLowerCase());
    }
  });
});

// ─── ctaStatus ───────────────────────────────────────────────────────────────

describe('ctaStatus', () => {
  it('PRONTO + ENTREGA → "Despachar entrega"', () => {
    expect(ctaStatus('PRONTO', 'ENTREGA')).toBe('Despachar entrega');
  });

  it('PRONTO + RETIRADA → "Confirmar retirada" (BX-05)', () => {
    expect(ctaStatus('PRONTO', 'RETIRADA')).toBe('Confirmar retirada');
  });

  it('PRONTO + CONSUMO_LOCAL → "Confirmar consumo" (BX-05)', () => {
    expect(ctaStatus('PRONTO', 'CONSUMO_LOCAL')).toBe('Confirmar consumo');
  });

  it('PRONTO sem tipoAtendimento → "Despachar entrega" (default)', () => {
    expect(ctaStatus('PRONTO')).toBe('Despachar entrega');
  });

  it.each([
    ['AGUARDANDO_PAGAMENTO', 'Aceitar pedido'],
    ['CONFIRMADO',           'Iniciar preparo'],
    ['PREPARANDO',           'Marcar pronto'],
    ['SAIU_ENTREGA',         'Marcar entregue'],
  ])('CTA de %s é "%s"', (status, esperado) => {
    expect(ctaStatus(status)).toBe(esperado);
  });
});

// ─── motivoBloqueioAcao ───────────────────────────────────────────────────────

describe('motivoBloqueioAcao', () => {
  it.each(['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'])(
    'bloqueia status final %s',
    (status) => {
      expect(motivoBloqueioAcao(status)).toBe('Pedido em status final');
    }
  );

  it('PRONTO com aguardandoEntregador bloqueia', () => {
    expect(motivoBloqueioAcao('PRONTO', 'CONFIRMADO', true)).toBe('Aguardando entregador');
  });

  it('PRONTO sem aguardandoEntregador NÃO bloqueia', () => {
    expect(motivoBloqueioAcao('PRONTO', 'CONFIRMADO', false)).toBeNull();
  });

  it('CONFIRMADO com pagamento confirmado NÃO bloqueia', () => {
    expect(motivoBloqueioAcao('CONFIRMADO', 'CONFIRMADO')).toBeNull();
  });
});

// ─── toBadgeVariant ──────────────────────────────────────────────────────────

describe('toBadgeVariant', () => {
  it.each([
    ['EXPIRADO',  'expired'],
    ['ABANDONADO','expired'],
    ['ENTREGUE',  'delivered'],
    ['CANCELADO', 'cancelled'],
    ['SAIU_ENTREGA', 'on-route'],
  ])('variante de %s é "%s"', (status, esperado) => {
    expect(toBadgeVariant(status)).toBe(esperado);
  });
});
