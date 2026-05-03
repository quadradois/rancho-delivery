import { loadMercadoPago } from '@mercadopago/sdk-js';

let initialized = false;

export async function initMercadoPagoSdk() {
  if (initialized) return true;

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  if (!publicKey) return false;

  await loadMercadoPago();
  // Inicializa o objeto global para uso futuro (Bricks/Checkout Transparente).
  // eslint-disable-next-line no-new
  new (window as any).MercadoPago(publicKey);
  initialized = true;
  return true;
}

