/**
 * Client do control plane FoodFlow (área /superadmin).
 *
 * Isolado do client do app do restaurante (api-client.ts): token próprio
 * (`foodflow:superadmin:token`), para a sessão do super-admin não se misturar
 * com a sessão do admin de um restaurante.
 */
import { ApiException } from '@/types/api.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'foodflow:superadmin:token';
export const SUPERADMIN_UNAUTHORIZED_EVENT = 'foodflow:superadmin:unauthorized';

export function getSuperadminToken(): string | null {
  return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
}
export function setSuperadminToken(token: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearSuperadminToken() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getSuperadminToken();
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401 && typeof window !== 'undefined') {
      clearSuperadminToken();
      window.dispatchEvent(new Event(SUPERADMIN_UNAUTHORIZED_EVENT));
    }
    throw new ApiException(
      body?.error?.message || body?.message || `HTTP ${response.status}`,
      body?.error?.code,
      body?.error?.details,
      response.status,
    );
  }

  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

// ---- Tipos ----
export type EstadoConta = 'TESTE' | 'ATIVA' | 'INADIMPLENTE' | 'CANCELADA';

export interface RestauranteResumo {
  id: string;
  slug: string;
  nome: string;
  dominio: string | null;
  ativo: boolean;
  criadoEm: string;
  assinatura: { estado: EstadoConta; plano: string | null; proximaCobranca: string | null } | null;
}

export interface ModuloPlano {
  chave: string;
  nome: string;
  core: boolean;
}

export interface ModuloItem extends ModuloPlano {
  descricao: string | null;
  ativo: boolean;
  precoAvulso: number | null;
}

export type CicloCobranca = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';

export interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ciclo: CicloCobranca;
  diasTeste: number;
  beneficios: string[];
  publico: boolean;
  ativo: boolean;
  modulos: ModuloPlano[];
}

export interface PlanoInput {
  nome: string;
  descricao?: string | null;
  preco: number;
  ciclo?: CicloCobranca;
  diasTeste?: number;
  beneficios?: string[];
  publico?: boolean;
  ativo?: boolean;
  modulos: string[];
}

export interface AssinaturaInfo {
  estado: EstadoConta;
  plano: { id: string; nome: string } | null;
  proximaCobranca: string | null;
  trialAte: string | null;
  atualizadoEm: string;
}

export interface Lead {
  id: string;
  nome: string;
  restaurante: string;
  contato: string;
  email: string | null;
  mensagem: string | null;
  origem: string;
  criadoEm: string;
}

interface LoginResposta {
  token: string;
  role: string;
  expiresIn: number;
}

// ---- API ----
export const superadminApi = {
  /** Login pelo endpoint admin compartilhado; só aceita o papel super-admin. */
  async login(username: string, password: string): Promise<string> {
    const data = await request<LoginResposta>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.role !== 'superadmin') {
      throw new ApiException('Esta área é exclusiva do super-admin do FoodFlow.', 'NAO_SUPERADMIN', undefined, 403);
    }
    setSuperadminToken(data.token);
    return data.token;
  },

  listarRestaurantes(): Promise<RestauranteResumo[]> {
    return request<RestauranteResumo[]>('/superadmin/restaurantes');
  },
  obterRestaurante(id: string): Promise<RestauranteResumo> {
    return request<RestauranteResumo>(`/superadmin/restaurantes/${id}`);
  },
  criarRestaurante(dados: { slug: string; nome: string; dominio?: string | null }): Promise<RestauranteResumo> {
    return request<RestauranteResumo>('/superadmin/restaurantes', { method: 'POST', body: JSON.stringify(dados) });
  },
  atualizarRestaurante(
    id: string,
    dados: { nome?: string; slug?: string; dominio?: string | null; ativo?: boolean },
  ): Promise<RestauranteResumo> {
    return request<RestauranteResumo>(`/superadmin/restaurantes/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });
  },

  listarModulos(): Promise<ModuloItem[]> {
    return request<ModuloItem[]>('/superadmin/modulos');
  },
  listarPlanos(): Promise<Plano[]> {
    return request<Plano[]>('/superadmin/planos');
  },
  criarPlano(dados: PlanoInput): Promise<Plano> {
    return request<Plano>('/superadmin/planos', { method: 'POST', body: JSON.stringify(dados) });
  },
  atualizarPlano(id: string, dados: Partial<PlanoInput>): Promise<Plano> {
    return request<Plano>(`/superadmin/planos/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });
  },

  obterAssinatura(restauranteId: string): Promise<AssinaturaInfo | null> {
    return request<AssinaturaInfo | null>(`/superadmin/restaurantes/${restauranteId}/assinatura`);
  },
  definirAssinatura(
    restauranteId: string,
    dados: { estado: EstadoConta; planoId: string | null },
  ): Promise<AssinaturaInfo> {
    return request<AssinaturaInfo>(`/superadmin/restaurantes/${restauranteId}/assinatura`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },
  gerarCobranca(restauranteId: string, dados: { email?: string } = {}): Promise<{ url: string; preapprovalId: string }> {
    return request<{ url: string; preapprovalId: string }>(
      `/superadmin/restaurantes/${restauranteId}/assinatura/cobranca`,
      { method: 'POST', body: JSON.stringify(dados) },
    );
  },

  listarLeads(): Promise<Lead[]> {
    return request<Lead[]>('/superadmin/leads');
  },
};
