import { describe, it, expect, vi, beforeEach } from 'vitest';
import clienteService from '../../services/cliente.service';
import prisma from '../../config/database';

describe('ClienteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarOuAtualizar', () => {
    it('deve criar novo cliente quando não existe', async () => {
      const dadosCliente = {
        telefone: '5562999887766',
        nome: 'João Silva',
        endereco: 'Rua Teste, 123',
        bairro: 'Setor Bueno',
      };

      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cliente.create).mockResolvedValue({
        ...dadosCliente,
        origem: 'SITE',
        criadoEm: new Date(),
      } as any);

      const resultado = await clienteService.criarOuAtualizar(dadosCliente);

      expect(resultado.telefone).toBe(dadosCliente.telefone);
      expect(resultado.nome).toBe(dadosCliente.nome);
      expect(prisma.cliente.findUnique).toHaveBeenCalledWith({
        where: { telefone: dadosCliente.telefone },
      });
      expect(prisma.cliente.create).toHaveBeenCalled();
    });

    it('deve atualizar cliente quando já existe', async () => {
      const dadosCliente = {
        telefone: '5562999887766',
        nome: 'João Silva Atualizado',
        endereco: 'Rua Nova, 456',
        bairro: 'Setor Marista',
      };

      const clienteExistente = {
        telefone: '5562999887766',
        nome: 'João Silva',
        endereco: 'Rua Antiga, 123',
        bairro: 'Setor Bueno',
        origem: 'SITE',
        criadoEm: new Date(),
      };

      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(clienteExistente as any);
      vi.mocked(prisma.cliente.update).mockResolvedValue({
        ...clienteExistente,
        ...dadosCliente,
      } as any);

      const resultado = await clienteService.criarOuAtualizar(dadosCliente);

      expect(resultado.nome).toBe(dadosCliente.nome);
      expect(resultado.endereco).toBe(dadosCliente.endereco);
      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { telefone: dadosCliente.telefone },
        data: {
          nome: dadosCliente.nome,
          endereco: dadosCliente.endereco,
          bairro: dadosCliente.bairro,
        },
      });
    });

    it('deve usar origem SITE por padrão', async () => {
      const dadosCliente = {
        telefone: '5562999887766',
        nome: 'João Silva',
        endereco: 'Rua Teste, 123',
        bairro: 'Setor Bueno',
      };

      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cliente.create).mockResolvedValue({
        ...dadosCliente,
        origem: 'SITE',
        criadoEm: new Date(),
      } as any);

      await clienteService.criarOuAtualizar(dadosCliente);

      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          origem: 'SITE',
        }),
      });
    });
  });

  describe('buscarPorTelefone', () => {
    it('deve retornar cliente quando encontrado', async () => {
      const mockCliente = {
        telefone: '5562999887766',
        nome: 'João Silva',
        endereco: 'Rua Teste, 123',
        bairro: 'Setor Bueno',
        origem: 'SITE',
        criadoEm: new Date(),
      };

      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as any);

      const resultado = await clienteService.buscarPorTelefone('5562999887766');

      expect(resultado).toEqual(mockCliente);
    });

    it('deve retornar null quando cliente não encontrado', async () => {
      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);

      const resultado = await clienteService.buscarPorTelefone('5562999999999');

      expect(resultado).toBeNull();
    });
  });
});
