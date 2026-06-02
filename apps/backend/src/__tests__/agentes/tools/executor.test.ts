import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executarToolCall, montarToolResults } from '../../../agentes/tools/executor';
import prisma from '../../../config/database';
import bairroService from '../../../services/bairro.service';
import taxaEntregaService from '../../../services/taxaEntrega.service';
import pedidoService from '../../../services/pedido.service';
import * as sessaoModule from '../../../agentes/tools/sessao';

vi.mock('../../../agentes/tools/geocoder', () => ({
  geocodificarReverso: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../services/bairro.service', () => ({
  default: {
    validarBairro: vi.fn(),
  },
}));

vi.mock('../../../services/pedido.service', () => ({
  default: {
    criarPedido: vi.fn(),
  },
}));

vi.mock('../../../agentes/tools/sessao', () => ({
  obterSessaoAtiva: vi.fn(),
  criarOuObterSessao: vi.fn(),
  atualizarItens: vi.fn(),
  atualizarEntrega: vi.fn(),
  finalizarSessao: vi.fn(),
  cancelarSessao: vi.fn(),
}));

const TEL = '62999990001';

const SESSAO = {
  id: 'sess-1',
  clienteTelefone: TEL,
  itens: [],
  subtotal: 0,
  taxaEntrega: null,
  endereco: null,
  bairro: null,
  cep: null,
  lat: null,
  lng: null,
};

function toolUse(name: string, input: Record<string, unknown> = {}) {
  return { type: 'tool_use' as const, id: `tu-${name}`, name, input };
}

describe('executarToolCall', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('buscar_cardapio', () => {
    it('retorna lista de produtos disponíveis', async () => {
      vi.mocked(prisma.produto.findMany).mockResolvedValue([
        { id: 'p1', nome: 'Marmita Frango', preco: 25 as any, descricao: null, categoria: 'Marmitas' },
      ] as any);

      const r = await executarToolCall(toolUse('buscar_cardapio'), TEL);
      expect(r).toHaveProperty('total', 1);
      expect((r.produtos as any[])[0].nome).toBe('Marmita Frango');
    });

    it('filtra por categoria', async () => {
      vi.mocked(prisma.produto.findMany).mockResolvedValue([] as any);
      await executarToolCall(toolUse('buscar_cardapio', { categoria: 'Bebidas' }), TEL);
      expect(prisma.produto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoria: expect.objectContaining({ contains: 'Bebidas' }),
          }),
        }),
      );
    });
  });

  describe('adicionar_item', () => {
    it('retorna erro quando quantidade < 1', async () => {
      const r = await executarToolCall(toolUse('adicionar_item', { produtoId: 'p1', quantidade: 0 }), TEL);
      expect(r.erro).toMatch(/quantidade/i);
    });

    it('retorna erro quando produto não encontrado', async () => {
      vi.mocked(prisma.produto.findUnique).mockResolvedValue(null);
      const r = await executarToolCall(toolUse('adicionar_item', { produtoId: 'p-inexistente', quantidade: 1 }), TEL);
      expect(r.erro).toMatch(/não encontrado/i);
    });

    it('retorna erro quando produto indisponível', async () => {
      vi.mocked(prisma.produto.findUnique).mockResolvedValue({ id: 'p1', nome: 'X', preco: 10 as any, disponivel: false } as any);
      const r = await executarToolCall(toolUse('adicionar_item', { produtoId: 'p1', quantidade: 1 }), TEL);
      expect(r.erro).toMatch(/disponível/i);
    });

    it('adiciona item ao carrinho com sucesso', async () => {
      vi.mocked(prisma.produto.findUnique).mockResolvedValue({ id: 'p1', nome: 'Marmita', preco: 25 as any, disponivel: true } as any);
      vi.mocked(sessaoModule.criarOuObterSessao).mockResolvedValue({ ...SESSAO });
      vi.mocked(sessaoModule.atualizarItens).mockResolvedValue({
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }],
        subtotal: 25,
      });

      const r = await executarToolCall(toolUse('adicionar_item', { produtoId: 'p1', quantidade: 1 }), TEL);
      expect(r.ok).toBe(true);
      expect(r.subtotal).toBe(25);
    });

    it('acumula quantidade quando mesmo produto adicionado novamente', async () => {
      const sessaoComItem = {
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }],
        subtotal: 25,
      };
      vi.mocked(prisma.produto.findUnique).mockResolvedValue({ id: 'p1', nome: 'Marmita', preco: 25 as any, disponivel: true } as any);
      vi.mocked(sessaoModule.criarOuObterSessao).mockResolvedValue(sessaoComItem);
      vi.mocked(sessaoModule.atualizarItens).mockResolvedValue({ ...sessaoComItem, subtotal: 50 });

      await executarToolCall(toolUse('adicionar_item', { produtoId: 'p1', quantidade: 1 }), TEL);
      const chamada = vi.mocked(sessaoModule.atualizarItens).mock.calls[0][1];
      expect(chamada[0].quantidade).toBe(2);
    });
  });

  describe('remover_item', () => {
    it('retorna erro quando carrinho está vazio', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue(null);
      const r = await executarToolCall(toolUse('remover_item', { produtoId: 'p1' }), TEL);
      expect(r.erro).toMatch(/vazio/i);
    });

    it('remove item existente do carrinho', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }],
        subtotal: 25,
      });
      vi.mocked(sessaoModule.atualizarItens).mockResolvedValue({ ...SESSAO });

      const r = await executarToolCall(toolUse('remover_item', { produtoId: 'p1' }), TEL);
      expect(r.ok).toBe(true);
      const chamada = vi.mocked(sessaoModule.atualizarItens).mock.calls[0][1];
      expect(chamada).toHaveLength(0);
    });
  });

  describe('ver_carrinho', () => {
    it('retorna vazio quando sem sessão', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue(null);
      const r = await executarToolCall(toolUse('ver_carrinho'), TEL);
      expect(r.vazio).toBe(true);
      expect(r.subtotal).toBe(0);
    });

    it('retorna carrinho com total quando taxa está definida', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 2 }],
        subtotal: 50,
        taxaEntrega: 6,
      });

      const r = await executarToolCall(toolUse('ver_carrinho'), TEL);
      expect(r.subtotal).toBe(50);
      expect(r.taxaEntrega).toBe(6);
      expect(r.total).toBe(56);
    });
  });

  describe('validar_entrega', () => {
    it('retorna erro quando nenhum dado de localização informado', async () => {
      vi.mocked(taxaEntregaService.usaFaixasPorDistancia).mockReturnValue(false);
      const r = await executarToolCall(toolUse('validar_entrega', {}), TEL);
      expect(r.erro).toBeDefined();
    });

    it('valida por bairro com sucesso', async () => {
      vi.mocked(taxaEntregaService.usaFaixasPorDistancia).mockReturnValue(false);
      vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 5 } as any);
      vi.mocked(sessaoModule.criarOuObterSessao).mockResolvedValue({ ...SESSAO });
      vi.mocked(sessaoModule.atualizarEntrega).mockResolvedValue(undefined);

      const r = await executarToolCall(toolUse('validar_entrega', { bairro: 'Centro' }), TEL);
      expect(r.atendido).toBe(true);
      expect(r.taxa).toBe(5);
    });

    it('retorna erro quando bairro não é atendido', async () => {
      vi.mocked(taxaEntregaService.usaFaixasPorDistancia).mockReturnValue(false);
      vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: false, taxa: null } as any);

      const r = await executarToolCall(toolUse('validar_entrega', { bairro: 'Londrina' }), TEL);
      expect(r.atendido).toBe(false);
      expect(r.erro).toBeDefined();
    });
  });

  describe('confirmar_pedido', () => {
    it('retorna erro quando não há sessão ativa', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue(null);
      const r = await executarToolCall(toolUse('confirmar_pedido', { nome: 'João', formaPagamento: 'PIX' }), TEL);
      expect(r.erro).toBeDefined();
    });

    it('retorna erro quando carrinho está vazio', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({ ...SESSAO, itens: [] });
      const r = await executarToolCall(toolUse('confirmar_pedido', { nome: 'João', formaPagamento: 'PIX' }), TEL);
      expect(r.erro).toMatch(/vazio/i);
    });

    it('retorna erro quando endereço não foi informado', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }],
        subtotal: 25,
      });
      const r = await executarToolCall(toolUse('confirmar_pedido', { nome: 'João', formaPagamento: 'PIX' }), TEL);
      expect(r.erro).toMatch(/endereço/i);
    });

    it('retorna erro quando entrega não foi validada', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }],
        subtotal: 25,
        endereco: 'Rua A, 1',
        bairro: 'Centro',
        taxaEntrega: null,
      });
      const r = await executarToolCall(toolUse('confirmar_pedido', { nome: 'João', formaPagamento: 'PIX' }), TEL);
      expect(r.erro).toMatch(/valide/i);
    });

    it('cria pedido com sucesso e retorna total', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({
        ...SESSAO,
        itens: [{ produtoId: 'p1', nome: 'Marmita', preco: 25, quantidade: 1 }],
        subtotal: 25,
        endereco: 'Rua A, 1',
        bairro: 'Centro',
        taxaEntrega: 6,
      });
      vi.mocked(pedidoService.criarPedido).mockResolvedValue({ id: 'ped-1', total: 31 } as any);
      vi.mocked(sessaoModule.finalizarSessao).mockResolvedValue(undefined);

      const r = await executarToolCall(toolUse('confirmar_pedido', { nome: 'João', formaPagamento: 'PIX' }), TEL);
      expect(r.ok).toBe(true);
      expect(r.pedidoId).toBe('ped-1');
      expect(r.total).toBe(31);
    });
  });

  describe('cancelar_pedido', () => {
    it('responde ok sem sessão ativa', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue(null);
      const r = await executarToolCall(toolUse('cancelar_pedido'), TEL);
      expect(r.ok).toBe(true);
    });

    it('cancela sessão existente', async () => {
      vi.mocked(sessaoModule.obterSessaoAtiva).mockResolvedValue({ ...SESSAO });
      vi.mocked(sessaoModule.cancelarSessao).mockResolvedValue(undefined);

      const r = await executarToolCall(toolUse('cancelar_pedido'), TEL);
      expect(r.ok).toBe(true);
      expect(sessaoModule.cancelarSessao).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('tool desconhecida', () => {
    it('retorna erro para tool desconhecida', async () => {
      const r = await executarToolCall(toolUse('ferramenta_inexistente'), TEL);
      expect(r.erro).toMatch(/desconhecida/i);
    });
  });

  describe('montarToolResults', () => {
    it('mapeia tool uses para tool results JSON', () => {
      const tus = [toolUse('ver_carrinho'), toolUse('buscar_cardapio')];
      const results = [{ vazio: true }, { produtos: [] }];
      const tr = montarToolResults(tus, results);
      expect(tr).toHaveLength(2);
      expect(tr[0].tool_use_id).toBe('tu-ver_carrinho');
      expect(JSON.parse(tr[0].content as string)).toEqual({ vazio: true });
    });
  });
});
