import prisma from '../config/database';
import { logger } from '../config/logger';

export type TipoFaixa = 'GRATIS' | 'FIXO' | 'POR_KM';

export interface FaixaEntrega {
  ateKm: number;
  tipo: TipoFaixa;
  valor: number;
}

export interface ResultadoTaxaEntrega {
  atendido: boolean;
  taxa: number;
  distanciaKm?: number;
  faixa?: FaixaEntrega;
  erro?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodificarCep(cep: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const cepLimpo = cep.replace(/\D/g, '').padStart(8, '0').slice(0, 8);

    // 1. Busca por CEP na tabela Geo360 (centróide dos imóveis daquele CEP)
    const porCep = await (prisma as any).imovelGeo360.findMany({
      where: { cep: cepLimpo, latitude: { not: null } },
      select: { latitude: true, longitude: true },
      take: 20,
    });
    if (porCep.length > 0) {
      const lat = porCep.reduce((s: number, i: any) => s + i.latitude, 0) / porCep.length;
      const lng = porCep.reduce((s: number, i: any) => s + i.longitude, 0) / porCep.length;
      return { lat, lng };
    }

    // 2. Fallback: ViaCEP → bairro → centróide Geo360
    const viacep = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    if (viacep.ok) {
      const dados = await viacep.json() as Record<string, string>;
      if (!dados.erro && dados.bairro) {
        const porBairro = await (prisma as any).imovelGeo360.findMany({
          where: {
            bairro: { contains: dados.bairro, mode: 'insensitive' },
            latitude: { not: null },
          },
          select: { latitude: true, longitude: true },
          take: 20,
        });
        if (porBairro.length > 0) {
          const lat = porBairro.reduce((s: number, i: any) => s + i.latitude, 0) / porBairro.length;
          const lng = porBairro.reduce((s: number, i: any) => s + i.longitude, 0) / porBairro.length;
          return { lat, lng };
        }
      }
    }

    return null;
  } catch (err) {
    logger.error('Erro ao geocodificar CEP:', err);
    return null;
  }
}

function calcularTaxaPorFaixas(distanciaKm: number, faixas: FaixaEntrega[]): ResultadoTaxaEntrega {
  const faixasOrdenadas = [...faixas].sort((a, b) => a.ateKm - b.ateKm);
  const raioMaximo = faixasOrdenadas[faixasOrdenadas.length - 1]?.ateKm ?? 0;

  if (distanciaKm > raioMaximo) {
    return { atendido: false, taxa: 0, distanciaKm, erro: 'Fora da área de entrega' };
  }

  const faixa = faixasOrdenadas.find((f) => distanciaKm <= f.ateKm);
  if (!faixa) {
    return { atendido: false, taxa: 0, distanciaKm, erro: 'Fora da área de entrega' };
  }

  let taxa = 0;
  if (faixa.tipo === 'GRATIS') {
    taxa = 0;
  } else if (faixa.tipo === 'FIXO') {
    taxa = faixa.valor;
  } else {
    // POR_KM: multiplica pela distância total
    taxa = Math.round(distanciaKm * faixa.valor * 100) / 100;
  }

  return { atendido: true, taxa, distanciaKm, faixa };
}

class TaxaEntregaService {
  async calcularPorCep(cep: string): Promise<ResultadoTaxaEntrega> {
    try {
      const loja = await prisma.lojaConfiguracao.findUnique({
        where: { id: 'loja_principal' },
        select: { latLoja: true, lngLoja: true, faixasEntrega: true },
      });

      if (!loja?.faixasEntrega || !loja.latLoja || !loja.lngLoja) {
        return { atendido: false, taxa: 0, erro: 'Configuração de entrega não definida' };
      }

      const faixas = loja.faixasEntrega as unknown as FaixaEntrega[];
      if (!Array.isArray(faixas) || faixas.length === 0) {
        return { atendido: false, taxa: 0, erro: 'Nenhuma faixa de entrega configurada' };
      }

      const coords = await geocodificarCep(cep);
      if (!coords) {
        return { atendido: false, taxa: 0, erro: 'CEP não encontrado' };
      }

      const distanciaKm = haversineKm(loja.latLoja, loja.lngLoja, coords.lat, coords.lng);
      return calcularTaxaPorFaixas(distanciaKm, faixas);
    } catch (err) {
      logger.error('Erro ao calcular taxa de entrega:', err);
      return { atendido: false, taxa: 0, erro: 'Erro interno' };
    }
  }

  async obterFaixas(): Promise<FaixaEntrega[]> {
    const loja = await prisma.lojaConfiguracao.findUnique({
      where: { id: 'loja_principal' },
      select: { faixasEntrega: true },
    });
    return (loja?.faixasEntrega as unknown as FaixaEntrega[]) ?? [];
  }

  async salvarFaixas(faixas: FaixaEntrega[]): Promise<void> {
    const json = faixas as unknown as import('@prisma/client').Prisma.InputJsonValue;
    await prisma.lojaConfiguracao.upsert({
      where: { id: 'loja_principal' },
      update: { faixasEntrega: json },
      create: { id: 'loja_principal', faixasEntrega: json },
    });
  }

  usaFaixasPorDistancia(faixas: FaixaEntrega[] | null): boolean {
    return Array.isArray(faixas) && faixas.length > 0;
  }

  calcularSincrono(distanciaKm: number, faixas: FaixaEntrega[]): ResultadoTaxaEntrega {
    return calcularTaxaPorFaixas(distanciaKm, faixas);
  }
}

export default new TaxaEntregaService();
