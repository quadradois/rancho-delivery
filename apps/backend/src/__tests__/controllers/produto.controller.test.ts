import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import produtoController from '../../controllers/produto.controller';
import produtoService from '../../services/produto.service';

// Mock do service
vi.mock('../../services/produto.service');

describe('ProdutoController - Testes de Regressão', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      query: {},
      params: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('listar', () => {
    const mockProdutos = [
      {
        id: 'prod-1',
        nome: 'Marmita Executiva',
        preco: 24.90,
        midia: 'https://example.com/foto.jpg',
        descricao: 'Descrição',
        categoria: 'Executiva',
        ordem: 1,
      },
      {
        id: 'prod-2',
        nome: 'Marmita Fit',
        preco: 32.90,
        midia: 'https://example.com/foto2.jpg',
        descricao: 'Descrição 2',
        categoria: 'Fit',
        ordem: 2,
      },
    ];

    it('deve listar todos os produtos quando não há filtro de categoria', async () => {
      // Arrange
      vi.mocked(produtoService.listarProdutos).mockResolvedValue(mockProdutos as any);

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProdutos,
      });
      expect(produtoService.listarProdutos).toHaveBeenCalled();
      expect(produtoService.listarProdutosPorCategoria).not.toHaveBeenCalled();
    });

    it('deve listar produtos por categoria quando categoria é fornecida', async () => {
      // Arrange
      mockRequest.query = { categoria: 'Executiva' };
      const produtosFiltrados = [mockProdutos[0]];

      vi.mocked(produtoService.listarProdutosPorCategoria).mockResolvedValue(produtosFiltrados as any);

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: produtosFiltrados,
      });
      expect(produtoService.listarProdutosPorCategoria).toHaveBeenCalledWith('Executiva');
      expect(produtoService.listarProdutos).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há produtos', async () => {
      // Arrange
      vi.mocked(produtoService.listarProdutos).mockResolvedValue([]);

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('deve retornar erro 500 quando ocorre erro ao listar produtos', async () => {
      // Arrange
      vi.mocked(produtoService.listarProdutos).mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao buscar produtos',
        },
      });
    });

    it('deve ignorar categoria quando não é string', async () => {
      // Arrange
      mockRequest.query = { categoria: ['Executiva', 'Fit'] }; // Array ao invés de string

      vi.mocked(produtoService.listarProdutos).mockResolvedValue(mockProdutos as any);

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(produtoService.listarProdutos).toHaveBeenCalled();
      expect(produtoService.listarProdutosPorCategoria).not.toHaveBeenCalled();
    });

    it('deve listar produtos de diferentes categorias', async () => {
      // Arrange
      const categorias = ['Executiva', 'Fit', 'Bebidas'];

      for (const categoria of categorias) {
        mockRequest.query = { categoria };
        vi.mocked(produtoService.listarProdutosPorCategoria).mockResolvedValue([mockProdutos[0]] as any);

        // Act
        await produtoController.listar(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(produtoService.listarProdutosPorCategoria).toHaveBeenCalledWith(categoria);
      }
    });
  });

  describe('buscarPorId', () => {
    const mockProduto = {
      id: 'prod-1',
      nome: 'Marmita Executiva',
      preco: 24.90,
      midia: 'https://example.com/foto.jpg',
      descricao: 'Descrição do produto',
      categoria: 'Executiva',
      disponivel: true,
      ordem: 1,
    };

    it('deve retornar produto quando encontrado e disponível', async () => {
      // Arrange
      mockRequest.params = { id: 'prod-1' };

      vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(mockProduto as any);

      // Act
      await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProduto,
      });
      expect(produtoService.buscarProdutoPorId).toHaveBeenCalledWith('prod-1');
    });

    it('deve retornar erro 404 quando produto não encontrado', async () => {
      // Arrange
      mockRequest.params = { id: 'prod-inexistente' };

      vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(null);

      // Act
      await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Produto não encontrado',
          code: 'PRODUTO_NAO_ENCONTRADO',
        },
      });
    });

    it('deve retornar erro 404 quando produto está indisponível', async () => {
      // Arrange
      mockRequest.params = { id: 'prod-1' };

      const produtoIndisponivel = {
        ...mockProduto,
        disponivel: false,
      };

      vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(produtoIndisponivel as any);

      // Act
      await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Produto indisponível',
          code: 'PRODUTO_INDISPONIVEL',
        },
      });
    });

    it('deve retornar erro 500 quando ocorre erro ao buscar produto', async () => {
      // Arrange
      mockRequest.params = { id: 'prod-1' };

      vi.mocked(produtoService.buscarProdutoPorId).mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      // Act
      await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao buscar produto',
        },
      });
    });

    it('deve buscar produtos com diferentes IDs', async () => {
      // Arrange
      const ids = ['prod-1', 'prod-2', 'prod-3'];

      for (const id of ids) {
        mockRequest.params = { id };
        vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(mockProduto as any);

        // Act
        await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(produtoService.buscarProdutoPorId).toHaveBeenCalledWith(id);
      }
    });
  });

  describe('Casos de Regressão', () => {
    it('deve manter consistência ao listar produtos múltiplas vezes', async () => {
      // Arrange
      const mockProdutos = [
        { id: 'prod-1', nome: 'Produto 1', preco: 10.00 },
        { id: 'prod-2', nome: 'Produto 2', preco: 20.00 },
      ];

      vi.mocked(produtoService.listarProdutos).mockResolvedValue(mockProdutos as any);

      // Act - Listar 3 vezes
      for (let i = 0; i < 3; i++) {
        await produtoController.listar(mockRequest as Request, mockResponse as Response);
      }

      // Assert
      expect(produtoService.listarProdutos).toHaveBeenCalledTimes(3);
      expect(jsonMock).toHaveBeenCalledTimes(3);
    });

    it('deve lidar com categoria vazia', async () => {
      // Arrange
      mockRequest.query = { categoria: '' };

      vi.mocked(produtoService.listarProdutos).mockResolvedValue([]);

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      // String vazia é tratada como falsy, então deve chamar listarProdutos
      expect(produtoService.listarProdutos).toHaveBeenCalled();
    });

    it('deve lidar com ID vazio ao buscar produto', async () => {
      // Arrange
      mockRequest.params = { id: '' };

      vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(null);

      // Act
      await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(produtoService.buscarProdutoPorId).toHaveBeenCalledWith('');
    });

    it('deve retornar produtos na ordem correta', async () => {
      // Arrange
      const mockProdutosOrdenados = [
        { id: 'prod-1', nome: 'A', ordem: 1 },
        { id: 'prod-2', nome: 'B', ordem: 2 },
        { id: 'prod-3', nome: 'C', ordem: 3 },
      ];

      vi.mocked(produtoService.listarProdutos).mockResolvedValue(mockProdutosOrdenados as any);

      // Act
      await produtoController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProdutosOrdenados,
      });
    });

    it('deve verificar disponibilidade antes de retornar produto', async () => {
      // Arrange
      mockRequest.params = { id: 'prod-1' };

      const produtoDisponivel = {
        id: 'prod-1',
        nome: 'Produto',
        disponivel: true,
      };

      vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(produtoDisponivel as any);

      // Act
      await produtoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: produtoDisponivel,
      });
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
