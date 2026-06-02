import { describe, it, expect } from 'vitest';
import { analisarSentimento } from '../../agentes/sentiment';

describe('analisarSentimento', () => {
  describe('IRRITADO', () => {
    it.each([
      'para de me enviar mensagem',
      'não me mande mais nada',
      'me tira da lista',
      'sai da lista',
      'isso é spam',
      'isso é golpe',
      'vou denunciar',
      'imbecil!!!',
    ])('detecta irritação em: "%s"', (texto) => {
      const r = analisarSentimento(texto);
      expect(r.classe).toBe('IRRITADO');
      expect(r.confianca).toBeGreaterThan(0.5);
      expect(r.sinais.length).toBeGreaterThan(0);
    });
  });

  describe('NEGATIVO', () => {
    it.each([
      'não quero mais',
      'muito caro',
      'não funciona',
      'o site não abre',
      'péssimo atendimento',
    ])('detecta negativo em: "%s"', (texto) => {
      const r = analisarSentimento(texto);
      expect(r.classe).toBe('NEGATIVO');
    });
  });

  describe('POSITIVO', () => {
    it.each([
      'sim por favor',
      'quero sim, manda o cardápio',
      'ótimo, pode mandar',
      'adorei, obrigado',
    ])('detecta positivo em: "%s"', (texto) => {
      const r = analisarSentimento(texto);
      expect(r.classe).toBe('POSITIVO');
    });
  });

  describe('NEUTRO', () => {
    it.each([
      'que horas vocês abrem?',
      'tem entrega no meu bairro?',
      'como faço um pedido?',
    ])('retorna NEUTRO para: "%s"', (texto) => {
      const r = analisarSentimento(texto);
      expect(r.classe).toBe('NEUTRO');
    });
  });

  it('IRRITADO tem prioridade sobre NEGATIVO', () => {
    const r = analisarSentimento('spam ruim péssimo me tira da lista');
    expect(r.classe).toBe('IRRITADO');
  });

  it('execução é síncrona e rápida (lexical, sem IA)', () => {
    const inicio = Date.now();
    for (let i = 0; i < 1000; i++) {
      analisarSentimento('que horas vocês abrem?');
    }
    expect(Date.now() - inicio).toBeLessThan(50); // 1000 análises em <50ms
  });
});
