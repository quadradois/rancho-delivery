export type LabelEndereco = 'Casa' | 'Trabalho' | 'Outro';

export interface EnderecoSalvo {
  id: string;
  label: LabelEndereco;
  labelCustom?: string;
  cep: string;
  rua: string;
  bairro: string;
  numero?: string;
  complemento?: string;
  quadra?: string;
  lote?: string;
  ultimoUso: string;
}

export interface CustomerProfile {
  nome: string;
  telefone: string;
  email?: string;
  enderecos: EnderecoSalvo[];
  atualizadoEm: string;
}

const PROFILE_KEY = 'rancho:customer:profile:v2';
const PROFILE_KEY_LEGACY = 'rancho:customer:profile';

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
}

function safeSet(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
  window.sessionStorage.setItem(key, value);
}

function migrarLegado(): CustomerProfile | null {
  const raw = safeGet(PROFILE_KEY_LEGACY);
  if (!raw) return null;
  try {
    const legado = JSON.parse(raw) as any;
    if (!legado?.nome || !legado?.telefone) return null;
    const profile: CustomerProfile = {
      nome: legado.nome,
      telefone: legado.telefone,
      email: legado.email,
      enderecos: [],
      atualizadoEm: legado.atualizadoEm || new Date().toISOString(),
    };
    if (legado.cep || legado.bairro) {
      profile.enderecos.push({
        id: crypto.randomUUID(),
        label: 'Casa',
        cep: legado.cep || '',
        rua: legado.rua || '',
        bairro: legado.bairro || '',
        ultimoUso: legado.atualizadoEm || new Date().toISOString(),
      });
    }
    return profile;
  } catch {
    return null;
  }
}

export function getCustomerProfile(): CustomerProfile | null {
  try {
    const raw = safeGet(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CustomerProfile;
      if (parsed?.nome && parsed?.telefone) return parsed;
    }
    // tenta migrar do formato legado
    const migrado = migrarLegado();
    if (migrado) {
      safeSet(PROFILE_KEY, JSON.stringify(migrado));
    }
    return migrado;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(dados: { nome: string; telefone: string; email?: string }) {
  const atual = getCustomerProfile();
  const profile: CustomerProfile = {
    nome: dados.nome,
    telefone: dados.telefone,
    email: dados.email,
    enderecos: atual?.enderecos ?? [],
    atualizadoEm: new Date().toISOString(),
  };
  safeSet(PROFILE_KEY, JSON.stringify(profile));
}

export function salvarEndereco(endereco: Omit<EnderecoSalvo, 'id' | 'ultimoUso'>) {
  const profile = getCustomerProfile();
  if (!profile) return;

  const existente = profile.enderecos.findIndex(
    (e) => e.cep === endereco.cep && e.numero === endereco.numero,
  );

  const novo: EnderecoSalvo = {
    ...endereco,
    id: existente >= 0 ? profile.enderecos[existente].id : crypto.randomUUID(),
    ultimoUso: new Date().toISOString(),
  };

  if (existente >= 0) {
    profile.enderecos[existente] = novo;
  } else {
    profile.enderecos.unshift(novo);
  }

  // Mantém no máximo 5 endereços
  profile.enderecos = profile.enderecos.slice(0, 5);
  profile.atualizadoEm = new Date().toISOString();
  safeSet(PROFILE_KEY, JSON.stringify(profile));
}

export function nomeExibicaoEndereco(e: EnderecoSalvo): string {
  return e.label === 'Outro' && e.labelCustom ? e.labelCustom : e.label;
}
