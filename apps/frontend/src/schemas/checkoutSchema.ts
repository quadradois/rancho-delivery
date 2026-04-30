import { z } from 'zod';

const telefoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
const cepRegex = /^\d{5}-\d{3}$/;

export const checkoutAddressSchema = z.object({
  nome: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome muito longo'),

  telefone: z
    .string()
    .regex(telefoneRegex, 'Telefone inválido. Use o formato (11) 99999-9999'),

  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),

  cep: z
    .string()
    .regex(cepRegex, 'CEP inválido. Use o formato 00000-000'),

  rua: z
    .string()
    .min(3, 'Rua é obrigatória'),

  numero: z
    .string()
    .min(1, 'Número é obrigatório'),

  complemento: z.string().optional(),

  bairro: z
    .string()
    .min(3, 'Bairro é obrigatório'),

  pontoReferencia: z.string().optional(),
});

export const checkoutPaymentSchema = z.object({
  formaPagamento: z.enum(
    ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix'],
    { required_error: 'Selecione uma forma de pagamento' }
  ),
  trocoParaValor: z
    .number()
    .positive('Valor do troco deve ser positivo')
    .optional(),
});

export type CheckoutAddressData = z.infer<typeof checkoutAddressSchema>;
export type CheckoutPaymentData = z.infer<typeof checkoutPaymentSchema>;
