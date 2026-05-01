/**
 * API Service - Comunicação com o Backend
 * Base URL configurada via variável de ambiente
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Classe base para requisições HTTP
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('rancho:admin:token') : null;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const apiError = errorBody?.error;
        if (response.status === 401 && typeof window !== 'undefined') {
          window.localStorage.removeItem('rancho:admin:token');
          window.dispatchEvent(new Event('rancho:admin:unauthorized'));
        }
        throw new ApiException(
          apiError?.message || errorBody?.message || `HTTP ${response.status}`,
          apiError?.code,
          apiError?.details,
          response.status
        );
      }

      const json = await response.json();
      
      // Se a resposta tem o formato { success: true, data: ... }, extrair o data
      if (json && typeof json === 'object' && 'data' in json) {
        return json.data as T;
      }
      
      return json as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao fazer requisição');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient(`${API_BASE_URL}/api`);

export default apiClient;
import { ApiException } from '@/types/api.types';
