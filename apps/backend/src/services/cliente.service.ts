import prisma from '../config/database';
import { logger } from '../config/logger';
import { Origem } from '@prisma/client';

export class ClienteService {
  /**
   * Cria ou atualiza cliente
   * Se o telefone já existe, atualiza os dados
   * Se não existe, cria novo cliente
   */
  async criarOuAtualizar(dados: {
    telefone: string;
    nome: string;
    endereco: string;
    bairro: string;
    origem?: Origem;
  }) {
    try {
      const { telefone, nome, endereco, bairro, origem = 'SITE' } = dados;

      // Verifica se cliente já existe
      const clienteExistente = await prisma.cliente.findUnique({
        where: { telefone },
      });

      if (clienteExistente) {
        // Atualiza dados do cliente (exceto origem)
        const clienteAtualizado = await prisma.cliente.update({
          where: { telefone },
          data: {
            nome,
            endereco,
            bairro,
          },
        });

        logger.info(`Cliente atualizado: ${telefone}`);
        return clienteAtualizado;
      }

      // Cria novo cliente
      const novoCliente = await prisma.cliente.create({
        data: {
          telefone,
          nome,
          endereco,
          bairro,
          origem,
        },
      });

      logger.info(`Novo cliente criado: ${telefone} - Origem: ${origem}`);
      return novoCliente;
    } catch (error) {
      logger.error('Erro ao criar/atualizar cliente:', error);
      throw new Error('Erro ao processar dados do cliente');
    }
  }

  /**
   * Busca cliente por telefone
   */
  async buscarPorTelefone(telefone: string) {
    try {
      const cliente = await prisma.cliente.findUnique({
        where: { telefone },
      });

      return cliente;
    } catch (error) {
      logger.error(`Erro ao buscar cliente ${telefone}:`, error);
      throw new Error('Erro ao buscar cliente');
    }
  }

  /**
   * Lista todos os clientes
   */
  async listarClientes() {
    try {
      const clientes = await prisma.cliente.findMany({
        orderBy: {
          criadoEm: 'desc',
        },
      });

      return clientes;
    } catch (error) {
      logger.error('Erro ao listar clientes:', error);
      throw new Error('Erro ao buscar clientes');
    }
  }
}

export default new ClienteService();
