/**
 * Tipos base da API
 * Correspondem à estrutura de resposta do backend
 */

/**
 * Estrutura padrão de resposta da API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Estrutura de erro da API
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: any; // Para erros de validação Zod
}

/**
 * Códigos de erro conhecidos da API
 */
export enum ApiErrorCode {
  BAIRRO_OBRIGATORIO = 'BAIRRO_OBRIGATORIO',
  BAIRRO_NAO_ATENDIDO = 'BAIRRO_NAO_ATENDIDO',
  PRODUTO_NAO_ENCONTRADO = 'PRODUTO_NAO_ENCONTRADO',
  PRODUTO_INDISPONIVEL = 'PRODUTO_INDISPONIVEL',
  PEDIDO_NAO_ENCONTRADO = 'PEDIDO_NAO_ENCONTRADO',
  VALIDACAO_ERRO = 'VALIDACAO_ERRO',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Classe de erro customizada para erros da API
 */
export class ApiException extends Error {
  public readonly code?: string;
  public readonly details?: any;
  public readonly statusCode?: number;

  constructor(message: string, code?: string, details?: any, statusCode?: number) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}
