import { describe, it, expect, vi, beforeEach } from 'vitest';
import produtoService from '../../services/produto.service';
import prisma from '../../config/database';

describe('ProdutoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listarProdutos', () => {
    it('deve listar todos os produtos disponíveis', async () => {
      const mockProdutos = [
        {
          id: '1',
          nome: 'Marmita Executiva',
          preco: 24.90,
          midia: 'https://example.com/foto.jpg',
          descricao: 'Descrição',
          categoria: 'Executiva',
          ordem: 1,
        },
        {
          id: '2',
          nome: 'Marmita Fit',
          preco: 32.90,
          midia: 'https://example.com/foto2.jpg',
          descricao: 'Descrição 2',
          categoria: 'Fit',
          ordem: 2,
        },
      ];

      vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);

      const resultado = await produtoService.listarProdutos();

      expect(resultado).toEqual(mockProdutos);
      expect(prisma.produto.findMany).toHaveBeenCalledWith({
        where: { disponivel: true },
        orderBy: { ordem: 'asc' },
        select: {
          id: true,
          nome: true,
          preco: true,
          midia: true,
          descricao: true,
          categoria: true,
          disponivel: true,
          ordem: true,
          tempoPreparo: true,
        },
      });
    });

    it('deve retornar array vazio quando não há produtos', async () => {
      vi.mocked(prisma.produto.findMany).mockResolvedValue([]);

      const resultado = await produtoService.listarProdutos();

      expect(resultado).toEqual([]);
    });

    it('deve lançar erro quando falha ao buscar produtos', async () => {
      vi.mocked(prisma.produto.findMany).mockRejectedValue(new Error('Erro no banco'));

      await expect(produtoService.listarProdutos()).rejects.toThrow('Erro ao buscar produtos');
    });
  });

  describe('buscarProdutoPorId', () => {
    it('deve retornar produto quando encontrado', async () => {
      const mockProduto = {
        id: '1',
        nome: 'Marmita Executiva',
        preco: 24.90,
        midia: 'https://example.com/foto.jpg',
        descricao: 'Descrição',
        categoria: 'Executiva',
        disponivel: true,
        ordem: 1,
      };

      vi.mocked(prisma.produto.findUnique).mockResolvedValue(mockProduto as any);

      const resultado = await produtoService.buscarProdutoPorId('1');

      expect(resultado).toEqual(mockProduto);
      expect(prisma.produto.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          nome: true,
          preco: true,
          midia: true,
          descricao: true,
          categoria: true,
          disponivel: true,
          ordem: true,
          tempoPreparo: true,
        },
      });
    });

    it('deve retornar null quando produto não encontrado', async () => {
      vi.mocked(prisma.produto.findUnique).mockResolvedValue(null);

      const resultado = await produtoService.buscarProdutoPorId('999');

      expect(resultado).toBeNull();
    });

    it('deve lançar erro quando falha ao buscar produto', async () => {
      vi.mocked(prisma.produto.findUnique).mockRejectedValue(new Error('Erro no banco'));

      await expect(produtoService.buscarProdutoPorId('1')).rejects.toThrow('Erro ao buscar produto');
    });
  });

  describe('listarProdutosPorCategoria', () => {
    it('deve listar produtos da categoria especificada', async () => {
      const mockProdutos = [
        {
          id: '1',
          nome: 'Marmita Executiva 1',
          preco: 24.90,
          midia: 'https://example.com/foto.jpg',
          descricao: 'Descrição',
          categoria: 'Executiva',
          ordem: 1,
        },
      ];

      vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);

      const resultado = await produtoService.listarProdutosPorCategoria('Executiva');

      expect(resultado).toEqual(mockProdutos);
      expect(prisma.produto.findMany).toHaveBeenCalledWith({
        where: {
          categoria: 'Executiva',
          disponivel: true,
        },
        orderBy: { ordem: 'asc' },
        select: {
          id: true,
          nome: true,
          preco: true,
          midia: true,
          descricao: true,
          categoria: true,
          disponivel: true,
          ordem: true,
          tempoPreparo: true,
        },
      });
    });
  });
});
