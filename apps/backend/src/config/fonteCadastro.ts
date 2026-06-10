// ─────────────────────────────────────────────────────────────────────────────
// Fonte externa — cadastro imobiliário municipal (plataforma pública de terceiro).
// ESTE É O ÚNICO arquivo do projeto que referencia o domínio/credenciais do
// fornecedor. Não espalhar esses valores pelo código; importe daqui.
// ─────────────────────────────────────────────────────────────────────────────

export const FONTE_AUTH_URL = 'https://plataforma.geo360.com.br';
export const FONTE_CADASTRO_URL = 'https://cadastro.geo360.com.br';

// Token de leitura público por cidade (slug + e-mail de leitor da plataforma)
export const FONTE_CIDADES: Record<string, { slug: string; email: string }> = {
  goiania: {
    slug: 'goiania',
    email: 'leitor_aparecidadegoiania@vm2info.com',
  },
  aparecidadegoiania: {
    slug: 'aparecidadegoiania',
    email: 'leitor_aparecidadegoiania@vm2info.com',
  },
  balneariocamboriu: {
    slug: 'balneariocamboriu',
    email: 'leitor_balneariocamboriu@vm2info.com',
  },
};
