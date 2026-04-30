import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import pedidoController from '../../controllers/pedido.controller';
import pedidoService from '../../services/pedido.service';

// Mock do service
vi.mock('../../services/pedido.service');

describe('PedidoController - Testes de Regressão', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      params: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('criar', () => {
    const dadosPedidoValido = {
      cliente: {
        telefone: '5562999887766',
        nome: 'João Silva',
        endereco: 'Rua Teste, 123',
        bairro: 'Setor Bueno',
      },
      itens: [
        {
          produtoId: 'prod-1',
          quantidade: 2,
          observacao: 'Sem cebola',
        },
      ],
      observacao: 'Entregar na portaria',
    };

    it('deve criar pedido com sucesso e retornar status 201', async () => {
      // Arrange
      mockRequest.body = dadosPedidoValido;

      const mockPedidoCriado = {
        id: 'pedido-123',
        ...dadosPedidoValido,
        subtotal: 49.80,
        taxaEntrega: 6.00,
        total: 55.80,
        status: 'PENDENTE',
        criadoEm: new Date(),
      };

      vi.mocked(pedidoService.criarPedido).mockResolvedValue(mockPedidoCriado as any);

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockPedidoCriado,
      });
      expect(pedidoService.criarPedido).toHaveBeenCalledWith(dadosPedidoValido);
    });

    it('deve retornar erro 400 quando dados são inválidos', async () => {
      // Arrange
      mockRequest.body = {
        cliente: {
          telefone: '123', // telefone muito curto
          nome: 'Jo', // nome muito curto
        },
        itens: [], // array vazio
      };

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Dados inválidos',
          code: 'VALIDACAO_ERRO',
          details: expect.any(Array),
        },
      });
      expect(pedidoService.criarPedido).not.toHaveBeenCalled();
    });

    it('deve retornar erro 400 quando bairro não é atendido', async () => {
      // Arrange
      mockRequest.body = dadosPedidoValido;

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Bairro não atendido')
      );

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bairro não atendido',
          code: 'BAIRRO_NAO_ATENDIDO',
        },
      });
    });

    it('deve retornar erro 400 quando produto não é encontrado', async () => {
      // Arrange
      mockRequest.body = dadosPedidoValido;

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Produto não encontrado: prod-1')
      );

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Produto não encontrado: prod-1',
          code: 'PRODUTO_NAO_ENCONTRADO',
        },
      });
    });

    it('deve retornar erro 400 quando produto está indisponível', async () => {
      // Arrange
      mockRequest.body = dadosPedidoValido;

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Produto indisponível: Marmita Executiva')
      );

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Produto indisponível: Marmita Executiva',
          code: 'PRODUTO_INDISPONIVEL',
        },
      });
    });

    it('deve retornar erro 500 para erros inesperados', async () => {
      // Arrange
      mockRequest.body = dadosPedidoValido;

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Erro inesperado no banco de dados')
      );

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao criar pedido',
        },
      });
    });

    it('deve validar que itens não pode ser array vazio', async () => {
      // Arrange
      mockRequest.body = {
        ...dadosPedidoValido,
        itens: [],
      };

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDACAO_ERRO',
          }),
        })
      );
    });

    it('deve validar que quantidade deve ser positiva', async () => {
      // Arrange
      mockRequest.body = {
        ...dadosPedidoValido,
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: -1, // quantidade negativa
          },
        ],
      };

      // Act
      await pedidoController.criar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDACAO_ERRO',
          }),
        })
      );
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar pedido quando encontrado', async () => {
      // Arrange
      mockRequest.params = { id: 'pedido-123' };

      const mockPedido = {
        id: 'pedido-123',
        clienteTelefone: '5562999887766',
        subtotal: 49.80,
        taxaEntrega: 6.00,
        total: 55.80,
        status: 'PENDENTE',
        criadoEm: new Date(),
        itens: [],
        cliente: {
          nome: 'João Silva',
          telefone: '5562999887766',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
      };

      vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue(mockPedido as any);

      // Act
      await pedidoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockPedido,
      });
      expect(pedidoService.buscarPedidoPorId).toHaveBeenCalledWith('pedido-123');
    });

    it('deve retornar erro 404 quando pedido não encontrado', async () => {
      // Arrange
      mockRequest.params = { id: 'pedido-inexistente' };

      vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue(null);

      // Act
      await pedidoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Pedido não encontrado',
          code: 'PEDIDO_NAO_ENCONTRADO',
        },
      });
    });

    it('deve retornar erro 500 quando ocorre erro ao buscar', async () => {
      // Arrange
      mockRequest.params = { id: 'pedido-123' };

      vi.mocked(pedidoService.buscarPedidoPorId).mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      // Act
      await pedidoController.buscarPorId(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao buscar pedido',
        },
      });
    });
  });

  describe('listarPorCliente', () => {
    it('deve retornar lista de pedidos do cliente', async () => {
      // Arrange
      mockRequest.params = { telefone: '5562999887766' };

      const mockPedidos = [
        {
          id: 'pedido-1',
          clienteTelefone: '5562999887766',
          total: 55.80,
          status: 'ENTREGUE',
          criadoEm: new Date('2024-01-01'),
        },
        {
          id: 'pedido-2',
          clienteTelefone: '5562999887766',
          total: 72.50,
          status: 'PENDENTE',
          criadoEm: new Date('2024-01-02'),
        },
      ];

      vi.mocked(pedidoService.listarPedidosPorCliente).mockResolvedValue(mockPedidos as any);

      // Act
      await pedidoController.listarPorCliente(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockPedidos,
      });
      expect(pedidoService.listarPedidosPorCliente).toHaveBeenCalledWith('5562999887766');
    });

    it('deve retornar array vazio quando cliente não tem pedidos', async () => {
      // Arrange
      mockRequest.params = { telefone: '5562999999999' };

      vi.mocked(pedidoService.listarPedidosPorCliente).mockResolvedValue([]);

      // Act
      await pedidoController.listarPorCliente(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('deve retornar erro 500 quando ocorre erro ao listar', async () => {
      // Arrange
      mockRequest.params = { telefone: '5562999887766' };

      vi.mocked(pedidoService.listarPedidosPorCliente).mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      // Act
      await pedidoController.listarPorCliente(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao buscar pedidos',
        },
      });
    });
  });
});
