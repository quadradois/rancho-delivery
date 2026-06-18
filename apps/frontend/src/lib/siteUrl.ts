/** Domínio padrão do site institucional, usado como fallback. */
const DEFAULT_SITE_URL = 'https://foodflow.ia.br';

/**
 * Converte o host da requisição (x-forwarded-host/host) em URL absoluta do site.
 * Necessário para o `metadataBase` — o WhatsApp exige og:image com URL absoluta.
 * Sem host (ex.: build estático), cai no domínio padrão.
 */
export function siteUrlFromHost(host: string | null | undefined): string {
  return host ? `https://${host}` : DEFAULT_SITE_URL;
}
