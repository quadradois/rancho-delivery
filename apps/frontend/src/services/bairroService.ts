/**
 * Serviço de Bairros
 * Gerencia operações relacionadas a bairros e taxas de entrega
 */

import { apiClient } from '@/lib/http-client';
import { Bairro, ValidarBairroRequest, ValidarBairroResponse } from '@/types/domain.types';

/**
 * Serviço de bairros
 */
export const bairroService = {
  /**
   * Lista todos os bairros ativos
   * @returns Array de bairros ativos
   * 
   * @example
   * ```ts
   * const bairros = await bairroService.listar();
   * ```
   */
  async listar(): Promise<Bairro[]> {
    return apiClient.get<Bairro[]>('/bairros');
  },

  /**
   * Valida se bairro está ativo e retorna taxa de entrega
   * @param nome - Nome do bairro
   * @returns Objeto com validação e taxa de entrega
   * @throws ApiException com código BAIRRO_OBRIGATORIO ou BAIRRO_NAO_ATENDIDO
   * 
   * @example
   * ```ts
   * try {
   *   const resultado = await bairroService.validar('Centro');
   *   console.log(`Taxa de entrega: R$ ${resultado.taxa}`);
   * } catch (error) {
   *   if (error.code === 'BAIRRO_NAO_ATENDIDO') {
   *     console.log('Bairro não atendido');
   *   }
   * }
   * ```
   */
  async validar(nome: string): Promise<ValidarBairroResponse> {
    const payload: ValidarBairroRequest = { nome };
    return apiClient.post<ValidarBairroResponse>('/bairros/validar', payload);
  },

  /**
   * Busca taxa de entrega por nome do bairro
   * Wrapper conveniente para validar() que retorna apenas a taxa
   * @param nome - Nome do bairro
   * @returns Taxa de entrega em reais
   * @throws ApiException se bairro não for atendido
   * 
   * @example
   * ```ts
   * const taxa = await bairroService.buscarTaxa('Centro');
   * console.log(`Taxa: R$ ${taxa}`);
   * ```
   */
  async buscarTaxa(nome: string): Promise<number> {
    const resultado = await this.validar(nome);
    return resultado.taxa;
  },
};

export default bairroService;
