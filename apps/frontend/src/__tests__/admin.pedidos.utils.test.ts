import { describe, expect, it } from 'vitest';
import { ctaStatus, labelStatus, motivoBloqueioAcao } from '@/app/admin/pedidos/_components/_utils';

describe('admin pedidos utils', () => {
  it('exibe label operacional de CONFIRMADO', () => {
    expect(labelStatus('CONFIRMADO')).toBe('Aguard. preparo');
  });

  it('retorna CTA contextual por status', () => {
    expect(ctaStatus('AGUARDANDO_PAGAMENTO')).toBe('Aceitar pedido');
    expect(ctaStatus('CONFIRMADO')).toBe('Iniciar preparo');
    expect(ctaStatus('PREPARANDO')).toBe('Marcar pronto');
    expect(ctaStatus('PRONTO')).toBe('Despachar entrega');           // default sem tipoAtendimento
    expect(ctaStatus('PRONTO', 'ENTREGA')).toBe('Despachar entrega');
    expect(ctaStatus('PRONTO', 'RETIRADA')).toBe('Confirmar retirada');
    expect(ctaStatus('PRONTO', 'CONSUMO_LOCAL')).toBe('Confirmar consumo');
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
