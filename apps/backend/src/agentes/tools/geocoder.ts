import axios from 'axios';
import { logger } from '../../config/logger';

export interface EnderecoGeo {
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  enderecoFormatado: string;
}

interface NominatimResponse {
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
  };
  display_name?: string;
}

export async function geocodificarReverso(lat: number, lng: number): Promise<EnderecoGeo | null> {
  try {
    const { data } = await axios.get<NominatimResponse>(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat,
          lon: lng,
          format: 'json',
          'accept-language': 'pt-BR',
        },
        headers: {
          'User-Agent': 'RanchoDelivery/1.0 (contato@rancho.delivery)',
        },
        timeout: 5000,
      },
    );

    const addr = data.address;
    if (!addr) return null;

    const rua = addr.road;
    const numero = addr.house_number;
    const bairro = addr.suburb || addr.neighbourhood;
    const cidade = addr.city || addr.town;
    const estado = addr.state;
    const cep = addr.postcode?.replace(/\D/g, '');

    const partes = [rua, numero && `${numero}`, bairro, cidade].filter(Boolean);
    const enderecoFormatado = partes.join(', ') || data.display_name || `${lat},${lng}`;

    logger.info(`geocoder.reverso lat=${lat} lng=${lng} bairro=${bairro} cep=${cep}`);

    return { rua, numero, bairro, cidade, estado, cep, enderecoFormatado };
  } catch (error: any) {
    logger.warn('geocoder.reverso erro:', error.message);
    return null;
  }
}
