/**
 * Cliente HTTP configurado com Axios
 * Inclui interceptors para tratamento de erros, timeout e retry
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, ApiException } from '@/types/api.types';

/**
 * Configuração do cliente HTTP
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_TIMEOUT = 30000; // 30 segundos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

/**
 * Cria instância do Axios configurada
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Contador de tentativas para retry
  let retryCount = 0;

  /**
   * Interceptor de Request
   * Adiciona logs e configurações adicionais
   */
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Log da requisição em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  /**
   * Interceptor de Response
   * Trata erros e extrai dados da resposta
   */
  instance.interceptors.response.use(
    (response) => {
      // Log da resposta em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
      }

      // Extrai dados da estrutura ApiResponse<T>
      const apiResponse = response.data as ApiResponse<any>;
      
      if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse) {
        if (apiResponse.success && apiResponse.data !== undefined) {
          // Retorna apenas os dados se sucesso
          response.data = apiResponse.data;
        } else if (!apiResponse.success && apiResponse.error) {
          // Lança exceção se erro
          throw new ApiException(
            apiResponse.error.message,
            apiResponse.error.code,
            apiResponse.error.details,
            response.status
          );
        }
      }

      // Reset retry count em caso de sucesso
      retryCount = 0;

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Log do erro
      console.error('[API Response Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
      });

      // Tratamento de erro de timeout
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // Retry em caso de timeout
        if (retryCount < MAX_RETRIES && !originalRequest._retry) {
          retryCount++;
          originalRequest._retry = true;

          console.log(`[API Retry] Tentativa ${retryCount}/${MAX_RETRIES}`);

          // Aguarda antes de tentar novamente
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * retryCount));

          return instance(originalRequest);
        }

        throw new ApiException(
          'Tempo de resposta excedido. Tente novamente.',
          'TIMEOUT',
          undefined,
          408
        );
      }

      // Tratamento de erro de rede
      if (!error.response) {
        throw new ApiException(
          'Erro de conexão. Verifique sua internet.',
          'NETWORK_ERROR',
          undefined,
          0
        );
      }

      // Extrai erro da resposta da API
      const apiResponse = error.response.data as ApiResponse<any>;

      if (apiResponse && apiResponse.error) {
        throw new ApiException(
          apiResponse.error.message,
          apiResponse.error.code,
          apiResponse.error.details,
          error.response.status
        );
      }

      // Erro genérico baseado no status HTTP
      const statusMessages: Record<number, string> = {
        400: 'Requisição inválida',
        401: 'Não autorizado',
        403: 'Acesso negado',
        404: 'Recurso não encontrado',
        500: 'Erro interno do servidor',
        502: 'Serviço temporariamente indisponível',
        503: 'Serviço temporariamente indisponível',
      };

      const message = statusMessages[error.response.status] || 'Erro ao processar requisição';

      throw new ApiException(
        message,
        `HTTP_${error.response.status}`,
        undefined,
        error.response.status
      );
    }
  );

  return instance;
};

/**
 * Instância global do cliente HTTP
 */
export const httpClient = createAxiosInstance();

/**
 * Wrapper de métodos HTTP com tipagem
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await httpClient.get<T>(url, { params });
    return response.data;
  },

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await httpClient.post<T>(url, data);
    return response.data;
  },

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await httpClient.put<T>(url, data);
    return response.data;
  },

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await httpClient.patch<T>(url, data);
    return response.data;
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await httpClient.delete<T>(url);
    return response.data;
  },
};

export default apiClient;
