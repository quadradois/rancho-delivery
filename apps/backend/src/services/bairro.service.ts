import prisma from '../config/database';
import { logger } from '../config/logger';
import axios from 'axios';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export class BairroService {
  /**
   * Consulta ViaCEP e retorna dados do endereço
   */
  async consultarViaCep(cep: string): Promise<ViaCepResponse | null> {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return null;

    try {
      const response = await axios.get<ViaCepResponse>(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
        { timeout: 5000 }
      );

      if (response.data.erro) {
        logger.warn(`CEP não encontrado no ViaCEP: ${cepLimpo}`);
        return null;
      }

      return response.data;
    } catch (error) {
      logger.error(`Erro ao consultar ViaCEP para CEP ${cepLimpo}:`, error);
      return null;
    }
  }

  /**
   * Lista todos os bairros ativos
   */
  async listarBairrosAtivos() {
    try {
      const bairros = await prisma.bairro.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          cep: true,
          taxa: true,
          linkIfood: true,
          link99food: true,
          linkOutro: true,
          nomeOutro: true,
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
   * Lista todos os bairros (admin — ativos e inativos)
   */
  async listarTodos() {
    try {
      return await prisma.bairro.findMany({
        orderBy: { nome: 'asc' },
      });
    } catch (error) {
      logger.error('Erro ao listar todos os bairros:', error);
      throw new Error('Erro ao buscar bairros');
    }
  }

  /**
   * Busca bairro por nome (insensitive)
   */
  async buscarBairroPorNome(nome: string) {
    try {
      const bairro = await prisma.bairro.findFirst({
        where: {
          nome: { equals: nome, mode: 'insensitive' },
          ativo: true,
        },
      });

      if (!bairro) {
        logger.warn(`Bairro não encontrado ou inativo: ${nome}`);
        return null;
      }

      return bairro;
    } catch (error) {
      logger.error(`Erro ao buscar bairro ${nome}:`, error);
      throw new Error('Erro ao buscar bairro');
    }
  }

  /**
   * Valida CEP via ViaCEP e verifica se o bairro é atendido
   * Retorna dados do endereço + taxa + links de marketplace se não atendido
   */
  async validarCep(cep: string): Promise<{
    atendido: boolean;
    endereco?: ViaCepResponse;
    taxa?: number;
    bairroId?: string;
    marketplaces?: { ifood?: string; food99?: string; outro?: string; nomeOutro?: string };
    erro?: string;
  }> {
    // 1. Consultar ViaCEP
    const endereco = await this.consultarViaCep(cep);

    if (!endereco) {
      return { atendido: false, erro: 'CEP não encontrado' };
    }

    // 2. Verificar se o bairro retornado é atendido
    const bairro = await this.buscarBairroPorNome(endereco.bairro);

    if (!bairro) {
      // Não atendido — retorna endereço + links de marketplace
      const marketplaceLinks = await this.buscarLinksMarketplace();
      return {
        atendido: false,
        endereco,
        marketplaces: marketplaceLinks,
      };
    }

    return {
      atendido: true,
      endereco,
      taxa: Number(bairro.taxa),
      bairroId: bairro.id,
    };
  }

  /**
   * Busca links de marketplace globais (do primeiro bairro que tiver links)
   * Em produção, pode ser uma config global separada
   */
  async buscarLinksMarketplace() {
    try {
      const bairroComLinks = await prisma.bairro.findFirst({
        where: {
          OR: [
            { linkIfood: { not: null } },
            { link99food: { not: null } },
            { linkOutro: { not: null } },
          ],
        },
        select: {
          linkIfood: true,
          link99food: true,
          linkOutro: true,
          nomeOutro: true,
        },
      });

      return {
        ifood: bairroComLinks?.linkIfood ?? undefined,
        food99: bairroComLinks?.link99food ?? undefined,
        outro: bairroComLinks?.linkOutro ?? undefined,
        nomeOutro: bairroComLinks?.nomeOutro ?? undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Valida se bairro está ativo e retorna taxa (compatibilidade)
   */
  async validarBairro(nome: string): Promise<{ valido: boolean; taxa?: number }> {
    const bairro = await this.buscarBairroPorNome(nome);
    if (!bairro) return { valido: false };
    return { valido: true, taxa: Number(bairro.taxa) };
  }

  /**
   * Cria bairro
   */
  async criar(dados: {
    nome: string;
    cep?: string;
    taxa: number;
    ativo?: boolean;
    linkIfood?: string;
    link99food?: string;
    linkOutro?: string;
    nomeOutro?: string;
  }) {
    try {
      return await prisma.bairro.create({ data: dados });
    } catch (error) {
      logger.error('Erro ao criar bairro:', error);
      throw new Error('Erro ao criar bairro');
    }
  }

  /**
   * Atualiza bairro
   */
  async atualizar(id: string, dados: {
    nome?: string;
    cep?: string;
    taxa?: number;
    ativo?: boolean;
    linkIfood?: string | null;
    link99food?: string | null;
    linkOutro?: string | null;
    nomeOutro?: string | null;
  }) {
    try {
      return await prisma.bairro.update({ where: { id }, data: dados });
    } catch (error) {
      logger.error(`Erro ao atualizar bairro ${id}:`, error);
      throw new Error('Erro ao atualizar bairro');
    }
  }

  /**
   * Exclui bairro
   */
  async excluir(id: string) {
    try {
      return await prisma.bairro.delete({ where: { id } });
    } catch (error) {
      logger.error(`Erro ao excluir bairro ${id}:`, error);
      throw new Error('Erro ao excluir bairro');
    }
  }
}

export default new BairroService();
