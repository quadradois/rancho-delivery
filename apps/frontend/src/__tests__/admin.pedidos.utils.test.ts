import { describe, expect, it } from 'vitest';
import { ctaStatus, labelStatus, motivoBloqueioAcao } from '@/app/admin/pedidos/_components/_utils';

describe('admin pedidos utils', () => {
  it('exibe label operacional de CONFIRMADO', () => {
    expect(labelStatus('CONFIRMADO')).toBe('Aguardando preparo');
  });

  it('retorna CTA contextual por status', () => {
    expect(ctaStatus('AGUARDANDO_PAGAMENTO')).toBe('Aceitar pedido');
    expect(ctaStatus('CONFIRMADO')).toBe('Iniciar preparo');
    expect(ctaStatus('PREPARANDO')).toBe('Marcar pronto');
    expect(ctaStatus('PRONTO')).toBe('Enviar para entrega');
    expect(ctaStatus('SAIU_ENTREGA')).toBe('Marcar entregue');
  });

  it('bloqueia CTA em status finais', () => {
    expect(ctaStatus('ENTREGUE')).toBe('Ação indisponível');
    expect(ctaStatus('CANCELADO')).toBe('Ação indisponível');
    expect(ctaStatus('EXPIRADO')).toBe('Ação indisponível');
    expect(ctaStatus('ABANDONADO')).toBe('Ação indisponível');
  });

  it('retorna motivo de bloqueio para pronto sem entregador', () => {
    expect(motivoBloqueioAcao('PRONTO', 'CONFIRMADO', true)).toBe('Aguardando entregador');
  });
});
