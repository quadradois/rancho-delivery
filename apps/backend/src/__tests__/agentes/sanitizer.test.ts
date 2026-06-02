import { describe, it, expect } from 'vitest';
import { sanitizarResposta } from '../../agentes/sanitizer';

describe('sanitizarResposta', () => {
  it('remove tags <thinking>', () => {
    const r = sanitizarResposta('<thinking>raciocínio interno</thinking>Olá! Como posso ajudar?');
    expect(r).toBe('Olá! Como posso ajudar?');
    expect(r).not.toContain('<thinking>');
  });

  it('remove tags <cot>', () => {
    const r = sanitizarResposta('<cot>cadeia de raciocínio</cot>Nosso cardápio está em rancho.delivery');
    expect(r).not.toContain('<cot>');
    expect(r).toContain('rancho.delivery');
  });

  it('remove tags <reasoning>', () => {
    const r = sanitizarResposta('<reasoning>passo 1\npasso 2</reasoning>Temos entrega!');
    expect(r).toBe('Temos entrega!');
  });

  it('remove blocos JSON acidentais', () => {
    const r = sanitizarResposta('```json\n{"mensagem":"oi"}\n```\nOlá!');
    expect(r).toBe('Olá!');
  });

  it('normaliza aspas curvas para retas', () => {
    const r = sanitizarResposta('“Temos delivery” todo dia');
    expect(r).toBe('"Temos delivery" todo dia');
  });

  it('mantém link do rancho.delivery', () => {
    const r = sanitizarResposta('Acesse https://rancho.delivery para ver o cardápio');
    expect(r).toContain('https://rancho.delivery');
  });

  it('remove links de outros domínios', () => {
    const r = sanitizarResposta('Acesse https://outrosite.com para mais info');
    expect(r).toContain('[link removido]');
    expect(r).not.toContain('outrosite.com');
  });

  it('mantém texto limpo intacto', () => {
    const texto = 'Olá! Estamos abertos hoje das 17h às 23h30. Pode pedir!';
    expect(sanitizarResposta(texto)).toBe(texto);
  });
});
