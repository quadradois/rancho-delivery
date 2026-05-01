import prisma from '../config/database';
import { logger } from '../config/logger';

export const ALERTAS_PADRAO = [
  { tipo: 'PAGAMENTO_SEM_CONFIRMACAO', threshold: 180,  acao: 'som+badge',  ativo: true },
  { tipo: 'PREPARO_ACIMA_TEMPO',       threshold: 1800, acao: 'som+push',   ativo: true },
  { tipo: 'MOTOBOY_SEM_RETORNO',       threshold: 4200, acao: 'badge',      ativo: true },
  { tipo: 'WHATSAPP_SEM_RESPOSTA',     threshold: 600,  acao: 'badge',      ativo: true },
  { tipo: 'LOJA_PAUSADA_MUITO_TEMPO',  threshold: 1200, acao: 'badge',      ativo: true },
  { tipo: 'TODOS_MOTOBOYS_OCUPADOS',   threshold: 0,    acao: 'som+badge',  ativo: true },
  { tipo: 'WHATSAPP_DESCONECTADO',     threshold: 0,    acao: 'som+visual', ativo: true },
];

export class AlertaService {
  async listar() {
    const registros = await prisma.configuracaoAlerta.findMany({
      orderBy: { tipo: 'asc' },
    });

    // Garantir que todos os padrões existam
    const tiposExistentes = new Set(registros.map((r) => r.tipo));
    const faltando = ALERTAS_PADRAO.filter((p) => !tiposExistentes.has(p.tipo));

    if (faltando.length > 0) {
      await prisma.configuracaoAlerta.createMany({
        data: faltando,
        skipDuplicates: true,
      });
      return prisma.configuracaoAlerta.findMany({ orderBy: { tipo: 'asc' } });
    }

    return registros;
  }

  async atualizar(tipo: string, dados: { ativo?: boolean; threshold?: number; acao?: string }) {
    const padrao = ALERTAS_PADRAO.find((p) => p.tipo === tipo);
    if (!padrao) throw new Error('ALERTA_INVALIDO');

    return prisma.configuracaoAlerta.upsert({
      where: { tipo },
      update: {
        ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
        ...(dados.threshold !== undefined ? { threshold: dados.threshold } : {}),
        ...(dados.acao !== undefined ? { acao: dados.acao } : {}),
      },
      create: {
        tipo,
        ativo: dados.ativo ?? padrao.ativo,
        threshold: dados.threshold ?? padrao.threshold,
        acao: dados.acao ?? padrao.acao,
      },
    });
  }

  async obterPorTipo(tipo: string) {
    const registro = await prisma.configuracaoAlerta.findUnique({ where: { tipo } });
    if (registro) return registro;
    const padrao = ALERTAS_PADRAO.find((p) => p.tipo === tipo);
    return padrao || null;
  }
}

export default new AlertaService();
