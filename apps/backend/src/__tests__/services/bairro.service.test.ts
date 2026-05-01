import { describe, it, expect, vi, beforeEach } from 'vitest';
import bairroService from '../../services/bairro.service';
import prisma from '../../config/database';

describe('BairroService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listarBairrosAtivos', () => {
    it('deve listar todos os bairros ativos', async () => {
      const mockBairros = [
        { id: '1', nome: 'Setor Bueno', taxa: 6.00 },
        { id: '2', nome: 'Setor Oeste', taxa: 5.00 },
      ];

      vi.mocked(prisma.bairro.findMany).mockResolvedValue(mockBairros as any);

      const resultado = await bairroService.listarBairrosAtivos();

      expect(resultado).toEqual(mockBairros);
      expect(prisma.bairro.findMany).toHaveBeenCalledWith({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          cep: true,
          taxa: true,
          tempoEntrega: true,
          linkIfood: true,
          link99food: true,
          linkOutro: true,
          nomeOutro: true,
        },
      });
    });
  });

  describe('buscarBairroPorNome', () => {
    it('deve retornar bairro quando encontrado', async () => {
      const mockBairro = {
        id: '1',
        nome: 'Setor Bueno',
        taxa: 6.00,
      };

      vi.mocked(prisma.bairro.findFirst).mockResolvedValue(mockBairro as any);

      const resultado = await bairroService.buscarBairroPorNome('Setor Bueno');

      expect(resultado).toEqual(mockBairro);
    });

    it('deve retornar null quando bairro não encontrado', async () => {
      vi.mocked(prisma.bairro.findFirst).mockResolvedValue(null);

      const resultado = await bairroService.buscarBairroPorNome('Bairro Inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('validarBairro', () => {
    it('deve retornar válido quando bairro existe e está ativo', async () => {
      const mockBairro = {
        id: '1',
        nome: 'Setor Bueno',
        taxa: 6.00,
      };

      vi.mocked(prisma.bairro.findFirst).mockResolvedValue(mockBairro as any);

      const resultado = await bairroService.validarBairro('Setor Bueno');

      expect(resultado).toEqual({
        valido: true,
        taxa: 6.00,
      });
    });

    it('deve retornar inválido quando bairro não existe', async () => {
      vi.mocked(prisma.bairro.findFirst).mockResolvedValue(null);

      const resultado = await bairroService.validarBairro('Bairro Inexistente');

      expect(resultado).toEqual({
        valido: false,
      });
    });
  });

  describe('excluir', () => {
    it('deve inativar bairro quando encontrado', async () => {
      const mockBairro = {
        id: '1',
        nome: 'Setor Bueno',
        taxa: 6.0,
        ativo: false,
      };

      vi.mocked(prisma.bairro.update).mockResolvedValue(mockBairro as any);

      const resultado = await bairroService.excluir('1');

      expect(resultado).toEqual(mockBairro);
      expect(prisma.bairro.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { ativo: false },
        select: {
          id: true,
          nome: true,
          taxa: true,
          ativo: true,
        },
      });
    });
  });
});
