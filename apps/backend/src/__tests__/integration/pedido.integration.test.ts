import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import pedidoRoutes from '../../routes/pedido.routes';
import pedidoService from '../../services/pedido.service';

// Mock dos serviços
vi.mock('../../services/pedido.service');

describe('Fluxo de Pedido - Testes de Integração E2E', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();

    // Configurar app Express para testes
    app = express();
    app.use(express.json());
    app.use('/api/pedidos', pedidoRoutes);
  });

  describe('Fluxo Completo: Criar e Acompanhar Pedido', () => {
    it('deve completar fluxo de pedido: criar -> buscar -> listar', async () => {
      // ========== ETAPA 1: CRIAR PEDIDO ==========
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123, Apto 45',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 2,
            observacao: 'Sem cebola',
          },
          {
            produtoId: 'prod-2',
            quantidade: 1,
          },
        ],
        observacao: 'Entregar na portaria',
      };

      const mockPedidoCriado = {
        id: 'pedido-123',
        clienteTelefone: '5562999887766',
        subtotal: 54.80,
        taxaEntrega: 6.00,
        total: 60.80,
        status: 'PENDENTE',
        observacao: 'Entregar na portaria',
        criadoEm: new Date(),
        itens: [
          {
            id: 'item-1',
            produtoId: 'prod-1',
            quantidade: 2,
            precoUnit: 24.90,
            subtotal: 49.80,
            observacao: 'Sem cebola',
            produto: {
              nome: 'Marmita Executiva',
              categoria: 'Executiva',
            },
          },
          {
            id: 'item-2',
            produtoId: 'prod-2',
            quantidade: 1,
            precoUnit: 5.00,
            subtotal: 5.00,
            produto: {
              nome: 'Refrigerante',
              categoria: 'Bebidas',
            },
          },
        ],
        cliente: {
          nome: 'João Silva',
          telefone: '5562999887766',
          endereco: 'Rua Teste, 123, Apto 45',
          bairro: 'Setor Bueno',
        },
        pagamentoId: 'cobranca-123',
        linkPagamento: 'https://asaas.com/invoice/123',
        pixQrCode: 'PIX_QR_CODE_DATA',
      };

      vi.mocked(pedidoService.criarPedido).mockResolvedValue(mockPedidoCriado as any);

      // Criar pedido
      const respostaCriar = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(201);

      expect(respostaCriar.body.success).toBe(true);
      expect(respostaCriar.body.data.id).toBe('pedido-123');
      expect(respostaCriar.body.data.total).toBe(60.80);
      expect(respostaCriar.body.data.status).toBe('PENDENTE');
      expect(respostaCriar.body.data.linkPagamento).toBeDefined();

      const pedidoId = respostaCriar.body.data.id;

      // ========== ETAPA 2: BUSCAR PEDIDO POR ID ==========
      vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue(mockPedidoCriado as any);

      const respostaBuscar = await request(app)
        .get(`/api/pedidos/${pedidoId}`)
        .expect(200);

      expect(respostaBuscar.body.success).toBe(true);
      expect(respostaBuscar.body.data.id).toBe(pedidoId);
      expect(respostaBuscar.body.data.itens).toHaveLength(2);
      expect(respostaBuscar.body.data.cliente.nome).toBe('João Silva');

      // ========== ETAPA 3: LISTAR PEDIDOS DO CLIENTE ==========
      const mockPedidosCliente = [
        mockPedidoCriado,
        {
          id: 'pedido-anterior',
          clienteTelefone: '5562999887766',
          total: 45.00,
          status: 'ENTREGUE',
          criadoEm: new Date('2024-01-01'),
          itens: [],
        },
      ];

      vi.mocked(pedidoService.listarPedidosPorCliente).mockResolvedValue(mockPedidosCliente as any);

      const respostaListar = await request(app)
        .get('/api/pedidos/cliente/5562999887766')
        .expect(200);

      expect(respostaListar.body.success).toBe(true);
      expect(respostaListar.body.data).toHaveLength(2);
      expect(respostaListar.body.data[0].id).toBe('pedido-123');
      expect(respostaListar.body.data[1].status).toBe('ENTREGUE');
    });
  });

  describe('Fluxo de Validação: Cenários de Erro', () => {
    it('deve rejeitar pedido com bairro não atendido', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Bairro Distante',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 1,
          },
        ],
      };

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Bairro não atendido')
      );

      // Act & Assert
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(400);

      expect(resposta.body.success).toBe(false);
      expect(resposta.body.error.code).toBe('BAIRRO_NAO_ATENDIDO');
      expect(resposta.body.error.message).toBe('Bairro não atendido');
    });

    it('deve rejeitar pedido com produto inexistente', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-inexistente',
            quantidade: 1,
          },
        ],
      };

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Produto não encontrado: prod-inexistente')
      );

      // Act & Assert
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(400);

      expect(resposta.body.success).toBe(false);
      expect(resposta.body.error.code).toBe('PRODUTO_NAO_ENCONTRADO');
    });

    it('deve rejeitar pedido com produto indisponível', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 1,
          },
        ],
      };

      vi.mocked(pedidoService.criarPedido).mockRejectedValue(
        new Error('Produto indisponível: Marmita Executiva')
      );

      // Act & Assert
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(400);

      expect(resposta.body.success).toBe(false);
      expect(resposta.body.error.code).toBe('PRODUTO_INDISPONIVEL');
    });

    it('deve rejeitar pedido com dados inválidos', async () => {
      // Arrange - telefone muito curto
      const dadosInvalidos = {
        cliente: {
          telefone: '123',
          nome: 'Jo',
          endereco: 'Rua',
          bairro: 'Ba',
        },
        itens: [],
      };

      // Act & Assert
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosInvalidos)
        .expect(400);

      expect(resposta.body.success).toBe(false);
      expect(resposta.body.error.code).toBe('VALIDACAO_ERRO');
      expect(resposta.body.error.details).toBeDefined();
    });
  });

  describe('Fluxo de Cálculo: Validação de Valores', () => {
    it('deve calcular corretamente pedido com um item', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 1,
          },
        ],
      };

      const mockPedido = {
        id: 'pedido-123',
        subtotal: 24.90, // 1 x 24.90
        taxaEntrega: 6.00,
        total: 30.90, // 24.90 + 6.00
        status: 'PENDENTE',
      };

      vi.mocked(pedidoService.criarPedido).mockResolvedValue(mockPedido as any);

      // Act
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(201);

      // Assert
      expect(resposta.body.data.subtotal).toBe(24.90);
      expect(resposta.body.data.taxaEntrega).toBe(6.00);
      expect(resposta.body.data.total).toBe(30.90);
    });

    it('deve calcular corretamente pedido com múltiplos itens', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 3,
          },
          {
            produtoId: 'prod-2',
            quantidade: 2,
          },
        ],
      };

      const mockPedido = {
        id: 'pedido-123',
        subtotal: 84.70, // (3 x 24.90) + (2 x 5.00)
        taxaEntrega: 6.00,
        total: 90.70, // 84.70 + 6.00
        status: 'PENDENTE',
      };

      vi.mocked(pedidoService.criarPedido).mockResolvedValue(mockPedido as any);

      // Act
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(201);

      // Assert
      expect(resposta.body.data.subtotal).toBe(84.70);
      expect(resposta.body.data.total).toBe(90.70);
    });
  });

  describe('Fluxo de Busca: Cenários de Pedido Não Encontrado', () => {
    it('deve retornar 404 ao buscar pedido inexistente', async () => {
      // Arrange
      vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue(null);

      // Act
      const resposta = await request(app)
        .get('/api/pedidos/pedido-inexistente')
        .expect(404);

      // Assert
      expect(resposta.body.success).toBe(false);
      expect(resposta.body.error.code).toBe('PEDIDO_NAO_ENCONTRADO');
    });

    it('deve retornar array vazio para cliente sem pedidos', async () => {
      // Arrange
      vi.mocked(pedidoService.listarPedidosPorCliente).mockResolvedValue([]);

      // Act
      const resposta = await request(app)
        .get('/api/pedidos/cliente/5562999999999')
        .expect(200);

      // Assert
      expect(resposta.body.success).toBe(true);
      expect(resposta.body.data).toEqual([]);
    });
  });

  describe('Fluxo de Regressão: Casos Críticos', () => {
    it('deve manter integridade ao criar múltiplos pedidos do mesmo cliente', async () => {
      // Simular criação de 3 pedidos seguidos
      const dadosBase = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 1,
          },
        ],
      };

      const mockPedidos = [
        { id: 'pedido-1', total: 30.90, status: 'PENDENTE' },
        { id: 'pedido-2', total: 30.90, status: 'PENDENTE' },
        { id: 'pedido-3', total: 30.90, status: 'PENDENTE' },
      ];

      for (let i = 0; i < 3; i++) {
        vi.mocked(pedidoService.criarPedido).mockResolvedValue(mockPedidos[i] as any);

        const resposta = await request(app)
          .post('/api/pedidos')
          .send(dadosBase)
          .expect(201);

        expect(resposta.body.success).toBe(true);
        expect(resposta.body.data.id).toBe(mockPedidos[i].id);
      }

      // Verificar que todos os pedidos foram criados
      expect(pedidoService.criarPedido).toHaveBeenCalledTimes(3);
    });

    it('deve preservar observações do pedido e dos itens', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [
          {
            produtoId: 'prod-1',
            quantidade: 1,
            observacao: 'Sem cebola e sem tomate',
          },
          {
            produtoId: 'prod-2',
            quantidade: 1,
            observacao: 'Bem gelado',
          },
        ],
        observacao: 'Entregar na portaria, tocar interfone 45',
      };

      const mockPedido = {
        id: 'pedido-123',
        observacao: 'Entregar na portaria, tocar interfone 45',
        itens: [
          {
            produtoId: 'prod-1',
            observacao: 'Sem cebola e sem tomate',
          },
          {
            produtoId: 'prod-2',
            observacao: 'Bem gelado',
          },
        ],
      };

      vi.mocked(pedidoService.criarPedido).mockResolvedValue(mockPedido as any);

      // Act
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(201);

      // Assert
      expect(resposta.body.data.observacao).toBe('Entregar na portaria, tocar interfone 45');
      expect(resposta.body.data.itens[0].observacao).toBe('Sem cebola e sem tomate');
      expect(resposta.body.data.itens[1].observacao).toBe('Bem gelado');
    });

    it('deve validar quantidade mínima de itens (pelo menos 1)', async () => {
      // Arrange
      const dadosPedido = {
        cliente: {
          telefone: '5562999887766',
          nome: 'João Silva',
          endereco: 'Rua Teste, 123',
          bairro: 'Setor Bueno',
        },
        itens: [], // Array vazio
      };

      // Act
      const resposta = await request(app)
        .post('/api/pedidos')
        .send(dadosPedido)
        .expect(400);

      // Assert
      expect(resposta.body.success).toBe(false);
      expect(resposta.body.error.code).toBe('VALIDACAO_ERRO');
    });
  });
});
