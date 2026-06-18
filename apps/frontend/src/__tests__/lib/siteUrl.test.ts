import { describe, it, expect } from 'vitest';
import { siteUrlFromHost } from '@/lib/siteUrl';

describe('siteUrlFromHost', () => {
  it('usa o host da requisição com https', () => {
    expect(siteUrlFromHost('foodflow.ia.br')).toBe('https://foodflow.ia.br');
    expect(siteUrlFromHost('www.foodflow.ia.br')).toBe('https://www.foodflow.ia.br');
  });

  it('cai no domínio padrão quando o host é vazio/ausente', () => {
    expect(siteUrlFromHost('')).toBe('https://foodflow.ia.br');
    expect(siteUrlFromHost(null)).toBe('https://foodflow.ia.br');
    expect(siteUrlFromHost(undefined)).toBe('https://foodflow.ia.br');
  });
});
