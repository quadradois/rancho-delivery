import prisma from '../config/database';
import { logger } from '../config/logger';

export class BairroService {
  /**
   * Lista todos os bairros ativos
   */
  async listarBairrosAtivos() {
    try {
      const bairros = await prisma.bairro.findMany({
        where: {
          ativo: true,
        },
        orderBy: {
          nome: 'asc',
        },
        select: {
          id: true,
          nome: true,
          taxa: true,
        },
      });

      logger.info(`Listados ${bairros.length} bairros ativos`);
      return bairros;
    } catch (error) {
      logger.error('Erro ao listar bairros:', error);
      throw new Error('Erro ao buscar bairros');
    }
  }

  /**
   * Busca bairro por nome
   */
  async buscarBairroPorNome(nome: string) {
    try {
      const bairro = await prisma.bairro.findFirst({
        where: {
          nome: {
            equals: nome,
            mode: 'insensitive',
          },
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          taxa: true,
        },
      });

      if (!bairro) {
        logger.warn(`Bairro não encontrado ou inativo: ${nome}`);
        return null;
      }

      logger.info(`Bairro encontrado: ${bairro.nome} - Taxa: R$ ${bairro.taxa}`);
      return bairro;
    } catch (error) {
      logger.error(`Erro ao buscar bairro ${nome}:`, error);
      throw new Error('Erro ao buscar bairro');
    }
  }

  /**
   * Valida se bairro está ativo e retorna taxa
   */
  async validarBairro(nome: string): Promise<{ valido: boolean; taxa?: number }> {
    const bairro = await this.buscarBairroPorNome(nome);
    
    if (!bairro) {
      return { valido: false };
    }

    return {
      valido: true,
      taxa: Number(bairro.taxa),
    };
  }
}

export default new BairroService();
