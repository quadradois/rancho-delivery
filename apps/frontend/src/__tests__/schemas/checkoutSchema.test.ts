/**
 * Testes unitários para o schema Zod do checkout
 */
import { describe, it, expect } from 'vitest';
import { checkoutAddressSchema, checkoutPaymentSchema } from '../../schemas/checkoutSchema';

describe('checkoutAddressSchema', () => {
  const validAddress = {
    nome: 'João Silva',
    telefone: '(11) 99999-9999',
    email: 'joao@email.com',
    cep: '01310-100',
    rua: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Apto 42',
    bairro: 'Bela Vista',
    pontoReferencia: 'Próximo ao metrô',
  };

  it('deve validar endereço completo e válido', () => {
    const result = checkoutAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar nome com menos de 3 caracteres', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, nome: 'Jo' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('3 caracteres');
    }
  });

  it('deve rejeitar telefone com formato inválido', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, telefone: '11999999999' });
    expect(result.success).toBe(false);
  });

  it('deve aceitar telefone com formato correto (9 dígitos)', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, telefone: '(11) 99999-9999' });
    expect(result.success).toBe(true);
  });

  it('deve aceitar telefone com formato correto (8 dígitos)', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, telefone: '(11) 9999-9999' });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar CEP com formato inválido', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, cep: '01310100' });
    expect(result.success).toBe(false);
  });

  it('deve aceitar CEP com formato correto', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, cep: '01310-100' });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar e-mail inválido', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, email: 'nao-e-email' });
    expect(result.success).toBe(false);
  });

  it('deve aceitar e-mail vazio (campo opcional)', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, email: '' });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar rua vazia', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, rua: '' });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar número vazio', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, numero: '' });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar bairro com menos de 3 caracteres', () => {
    const result = checkoutAddressSchema.safeParse({ ...validAddress, bairro: 'AB' });
    expect(result.success).toBe(false);
  });

  it('deve aceitar complemento e ponto de referência vazios (opcionais)', () => {
    const result = checkoutAddressSchema.safeParse({
      ...validAddress,
      complemento: undefined,
      pontoReferencia: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe('checkoutPaymentSchema', () => {
  it('deve validar pagamento PIX', () => {
    const result = checkoutPaymentSchema.safeParse({ formaPagamento: 'pix' });
    expect(result.success).toBe(true);
  });

  it('deve validar pagamento em dinheiro com troco', () => {
    const result = checkoutPaymentSchema.safeParse({
      formaPagamento: 'dinheiro',
      trocoParaValor: 50,
    });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar forma de pagamento inválida', () => {
    const result = checkoutPaymentSchema.safeParse({ formaPagamento: 'boleto' });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar troco negativo', () => {
    const result = checkoutPaymentSchema.safeParse({
      formaPagamento: 'dinheiro',
      trocoParaValor: -10,
    });
    expect(result.success).toBe(false);
  });

  it('deve aceitar cartão de crédito', () => {
    const result = checkoutPaymentSchema.safeParse({ formaPagamento: 'cartao_credito' });
    expect(result.success).toBe(true);
  });

  it('deve aceitar cartão de débito', () => {
    const result = checkoutPaymentSchema.safeParse({ formaPagamento: 'cartao_debito' });
    expect(result.success).toBe(true);
  });
});
