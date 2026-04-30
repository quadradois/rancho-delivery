import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import bairroController from '../../controllers/bairro.controller';
import bairroService from '../../services/bairro.service';

// Mock do service
vi.mock('../../services/bairro.service');

describe('BairroController - Testes de Regressão', () => {
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
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('listar', () => {
    const mockBairros = [
      { id: '1', nome: 'Setor Bueno', taxa: 6.00 },
      { id: '2', nome: 'Setor Oeste', taxa: 5.00 },
      { id: '3', nome: 'Setor Marista', taxa: 7.00 },
    ];

    it('deve listar todos os bairros ativos', async () => {
      // Arrange
      vi.mocked(bairroService.listarBairrosAtivos).mockResolvedValue(mockBairros as any);

      // Act
      await bairroController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBairros,
      });
      expect(bairroService.listarBairrosAtivos).toHaveBeenCalled();
    });

    it('deve retornar array vazio quando não há bairros ativos', async () => {
      // Arrange
      vi.mocked(bairroService.listarBairrosAtivos).mockResolvedValue([]);

      // Act
      await bairroController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('deve retornar erro 500 quando ocorre erro ao listar bairros', async () => {
      // Arrange
      vi.mocked(bairroService.listarBairrosAtivos).mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      // Act
      await bairroController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao buscar bairros',
        },
      });
    });

    it('deve retornar bairros ordenados por nome', async () => {
      // Arrange
      const bairrosOrdenados = [
        { id: '1', nome: 'Bairro A', taxa: 5.00 },
        { id: '2', nome: 'Bairro B', taxa: 6.00 },
        { id: '3', nome: 'Bairro C', taxa: 7.00 },
      ];

      vi.mocked(bairroService.listarBairrosAtivos).mockResolvedValue(bairrosOrdenados as any);

      // Act
      await bairroController.listar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: bairrosOrdenados,
      });
    });
  });

  describe('validar', () => {
    it('deve validar bairro com sucesso e retornar taxa', async () => {
      // Arrange
      mockRequest.body = { nome: 'Setor Bueno' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 6.00,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          valido: true,
          taxa: 6.00,
        },
      });
      expect(bairroService.validarBairro).toHaveBeenCalledWith('Setor Bueno');
    });

    it('deve retornar erro 400 quando nome do bairro não é fornecido', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Nome do bairro é obrigatório',
          code: 'BAIRRO_OBRIGATORIO',
        },
      });
      expect(bairroService.validarBairro).not.toHaveBeenCalled();
    });

    it('deve retornar erro 400 quando nome é null', async () => {
      // Arrange
      mockRequest.body = { nome: null };

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Nome do bairro é obrigatório',
          code: 'BAIRRO_OBRIGATORIO',
        },
      });
    });

    it('deve retornar erro 400 quando nome é string vazia', async () => {
      // Arrange
      mockRequest.body = { nome: '' };

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Nome do bairro é obrigatório',
          code: 'BAIRRO_OBRIGATORIO',
        },
      });
    });

    it('deve retornar erro 404 quando bairro não é atendido', async () => {
      // Arrange
      mockRequest.body = { nome: 'Bairro Distante' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: false,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Bairro não atendido',
          code: 'BAIRRO_NAO_ATENDIDO',
        },
      });
    });

    it('deve retornar erro 500 quando ocorre erro ao validar bairro', async () => {
      // Arrange
      mockRequest.body = { nome: 'Setor Bueno' };

      vi.mocked(bairroService.validarBairro).mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erro ao validar bairro',
        },
      });
    });

    it('deve validar múltiplos bairros diferentes', async () => {
      // Arrange
      const bairros = [
        { nome: 'Setor Bueno', taxa: 6.00 },
        { nome: 'Setor Oeste', taxa: 5.00 },
        { nome: 'Setor Marista', taxa: 7.00 },
      ];

      for (const bairro of bairros) {
        mockRequest.body = { nome: bairro.nome };

        vi.mocked(bairroService.validarBairro).mockResolvedValue({
          valido: true,
          taxa: bairro.taxa,
        });

        // Act
        await bairroController.validar(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(bairroService.validarBairro).toHaveBeenCalledWith(bairro.nome);
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          data: {
            valido: true,
            taxa: bairro.taxa,
          },
        });
      }
    });

    it('deve retornar taxas diferentes para bairros diferentes', async () => {
      // Arrange
      const testCases = [
        { nome: 'Bairro Próximo', taxa: 3.00 },
        { nome: 'Bairro Médio', taxa: 6.00 },
        { nome: 'Bairro Distante', taxa: 10.00 },
      ];

      for (const testCase of testCases) {
        mockRequest.body = { nome: testCase.nome };

        vi.mocked(bairroService.validarBairro).mockResolvedValue({
          valido: true,
          taxa: testCase.taxa,
        });

        // Act
        await bairroController.validar(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          data: {
            valido: true,
            taxa: testCase.taxa,
          },
        });
      }
    });
  });

  describe('Casos de Regressão', () => {
    it('deve lidar com nome de bairro com espaços extras', async () => {
      // Arrange
      mockRequest.body = { nome: '  Setor Bueno  ' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 6.00,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(bairroService.validarBairro).toHaveBeenCalledWith('  Setor Bueno  ');
    });

    it('deve lidar com nome de bairro em maiúsculas', async () => {
      // Arrange
      mockRequest.body = { nome: 'SETOR BUENO' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 6.00,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(bairroService.validarBairro).toHaveBeenCalledWith('SETOR BUENO');
    });

    it('deve lidar com nome de bairro em minúsculas', async () => {
      // Arrange
      mockRequest.body = { nome: 'setor bueno' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 6.00,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(bairroService.validarBairro).toHaveBeenCalledWith('setor bueno');
    });

    it('deve manter consistência ao listar bairros múltiplas vezes', async () => {
      // Arrange
      const mockBairros = [
        { id: '1', nome: 'Bairro 1', taxa: 5.00 },
        { id: '2', nome: 'Bairro 2', taxa: 6.00 },
      ];

      vi.mocked(bairroService.listarBairrosAtivos).mockResolvedValue(mockBairros as any);

      // Act - Listar 3 vezes
      for (let i = 0; i < 3; i++) {
        await bairroController.listar(mockRequest as Request, mockResponse as Response);
      }

      // Assert
      expect(bairroService.listarBairrosAtivos).toHaveBeenCalledTimes(3);
      expect(jsonMock).toHaveBeenCalledTimes(3);
    });

    it('deve validar bairro com taxa zero', async () => {
      // Arrange
      mockRequest.body = { nome: 'Bairro Grátis' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 0,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          valido: true,
          taxa: 0,
        },
      });
    });

    it('deve validar bairro com taxa decimal', async () => {
      // Arrange
      mockRequest.body = { nome: 'Setor Central' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 5.50,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          valido: true,
          taxa: 5.50,
        },
      });
    });

    it('deve lidar com nome de bairro com caracteres especiais', async () => {
      // Arrange
      mockRequest.body = { nome: 'Setor São José' };

      vi.mocked(bairroService.validarBairro).mockResolvedValue({
        valido: true,
        taxa: 6.00,
      });

      // Act
      await bairroController.validar(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(bairroService.validarBairro).toHaveBeenCalledWith('Setor São José');
    });
  });
});
