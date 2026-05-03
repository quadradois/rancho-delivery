export interface CustomerProfile {
  nome: string;
  telefone: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  atualizadoEm: string;
}

const PROFILE_KEY = 'rancho:customer:profile';

function safeStorageGet(key: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
  window.sessionStorage.setItem(key, value);
}

export function getCustomerProfile(): CustomerProfile | null {
  try {
    const raw = safeStorageGet(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerProfile;
    if (!parsed?.nome || !parsed?.telefone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(profile: Omit<CustomerProfile, 'atualizadoEm'>) {
  const data: CustomerProfile = {
    ...profile,
    atualizadoEm: new Date().toISOString(),
  };
  safeStorageSet(PROFILE_KEY, JSON.stringify(data));
}

