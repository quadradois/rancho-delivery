import prisma from '../config/database';
import { logger } from '../config/logger';
import { Origem, OrigemMensagem } from '@prisma/client';
import evolutionService from './evolution.service';

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

  async buscarClienteParaPedidoManual(telefone: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { telefone },
      select: { telefone: true, nome: true, endereco: true, bairro: true },
    });

    if (!cliente) return null;

    // Top 3 produtos mais pedidos pelo cliente
    const topProdutos = await prisma.itemPedido.groupBy({
      by: ['produtoId'],
      where: {
        pedido: { clienteTelefone: telefone },
      },
      _count: { _all: true },
      orderBy: { _count: { produtoId: 'desc' } },
      take: 3,
    });

    const produtoIds = topProdutos.map((p) => p.produtoId);
    const produtos = produtoIds.length
      ? await prisma.produto.findMany({
          where: { id: { in: produtoIds }, disponivel: true },
          select: { id: true, nome: true, preco: true },
        })
      : [];

    const produtosOrdenados = produtoIds
      .map((id) => produtos.find((p) => p.id === id))
      .filter(Boolean) as Array<{ id: string; nome: string; preco: any }>;

    return {
      telefone: cliente.telefone,
      nome: cliente.nome,
      endereco: cliente.endereco,
      bairro: cliente.bairro,
      topProdutos: produtosOrdenados.map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
      })),
    };
  }

  async listarConversasNaoLidas() {
    // Busca todos os clientes com mensagens não lidas
    const grupos = await prisma.mensagemCliente.groupBy({
      by: ['clienteTelefone'],
      where: { origem: OrigemMensagem.HUMANO, lida: false },
      _count: { _all: true },
      _max: { criadoEm: true },
    });

    if (grupos.length === 0) return [];

    const telefones = grupos.map((g) => g.clienteTelefone);

    const [clientes, ultimasMensagens, pedidosAtivos] = await Promise.all([
      prisma.cliente.findMany({
        where: { telefone: { in: telefones } },
        select: { telefone: true, nome: true },
      }),
      prisma.mensagemCliente.findMany({
        where: {
          clienteTelefone: { in: telefones },
          origem: OrigemMensagem.HUMANO,
          lida: false,
        },
        orderBy: { criadoEm: 'desc' },
        distinct: ['clienteTelefone'],
        select: { clienteTelefone: true, texto: true, criadoEm: true },
      }),
      prisma.pedido.findMany({
        where: {
          clienteTelefone: { in: telefones },
          status: {
            notIn: ['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'] as any,
          },
        },
        orderBy: { criadoEm: 'desc' },
        distinct: ['clienteTelefone'],
        select: {
          id: true,
          clienteTelefone: true,
          status: true,
        },
      }),
    ]);

    const clienteMap = new Map(clientes.map((c) => [c.telefone, c.nome]));
    const msgMap = new Map(ultimasMensagens.map((m) => [m.clienteTelefone, m]));
    const pedidoMap = new Map(pedidosAtivos.map((p) => [p.clienteTelefone, p]));

    const agora = Date.now();

    return grupos
      .map((g) => {
        const msg = msgMap.get(g.clienteTelefone);
        const pedido = pedidoMap.get(g.clienteTelefone);
        const tempoSemResposta = msg
          ? Math.floor((agora - new Date(g._max.criadoEm!).getTime()) / 1000)
          : 0;

        return {
          telefone: g.clienteTelefone,
          nome: clienteMap.get(g.clienteTelefone) || 'Cliente',
          mensagensNaoLidas: g._count._all,
          ultimaMensagem: msg?.texto || '',
          ultimaMensagemEm: msg?.criadoEm?.toISOString() || new Date().toISOString(),
          tempoSemRespostaSegundos: tempoSemResposta,
          pedidoAtivo: pedido
            ? { id: pedido.id, status: pedido.status }
            : null,
        };
      })
      .sort((a, b) => b.tempoSemRespostaSegundos - a.tempoSemRespostaSegundos);
  }

  async listarMensagens(telefone: string, marcarComoLida = false) {
    if (marcarComoLida) {
      await prisma.mensagemCliente.updateMany({
        where: {
          clienteTelefone: telefone,
          lida: false,
          origem: OrigemMensagem.HUMANO,
        },
        data: { lida: true },
      });
    }

    return prisma.mensagemCliente.findMany({
      where: { clienteTelefone: telefone },
      orderBy: { criadoEm: 'asc' },
    });
  }

  async registrarMensagemSistema(telefone: string, texto: string, pedidoId?: string | null) {
    return prisma.mensagemCliente.create({
      data: {
        clienteTelefone: telefone,
        pedidoId: pedidoId || null,
        origem: OrigemMensagem.SISTEMA,
        texto,
        lida: true,
      },
    });
  }

  async registrarMensagemRecebida(telefone: string, texto: string, pedidoId?: string | null) {
    const cliente = await prisma.cliente.findUnique({ where: { telefone } });
    if (!cliente) return null;

    return prisma.mensagemCliente.create({
      data: {
        clienteTelefone: telefone,
        pedidoId: pedidoId || null,
        origem: OrigemMensagem.HUMANO,
        texto,
        lida: false,
      },
    });
  }

  async enviarMensagemHumana(telefone: string, texto: string, pedidoId?: string | null) {
    const cliente = await prisma.cliente.findUnique({ where: { telefone } });
    if (!cliente) throw new Error('CLIENTE_NAO_ENCONTRADO');

    const enviado = await evolutionService.enviarMensagem({
      numero: telefone,
      mensagem: texto,
    });

    if (!enviado) throw new Error('FALHA_ENVIO_WHATSAPP');

    return prisma.mensagemCliente.create({
      data: {
        clienteTelefone: telefone,
        pedidoId: pedidoId || null,
        origem: OrigemMensagem.HUMANO,
        texto,
        lida: true,
      },
    });
  }

  async obterStatusWhatsApp() {
    return evolutionService.obterStatusInstancia();
  }

  async prepararConexaoWhatsApp() {
    return evolutionService.garantirInstanciaEObterQrCode();
  }

  async atualizarQrCodeWhatsApp() {
    const status = await evolutionService.obterStatusInstancia();
    if (status.conectado) {
      return {
        ...status,
        qrCodeBase64: null as string | null,
      };
    }

    const qrCodeBase64 = await evolutionService.obterQrCode();
    return {
      ...status,
      qrCodeBase64,
    };
  }

  async obterResumoCliente(telefone: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { telefone },
      include: {
        pedidos: {
          include: {
            itens: {
              include: {
                produto: {
                  select: { nome: true },
                },
              },
            },
          },
          orderBy: { criadoEm: 'asc' },
        },
        listaNegra: true,
      },
    });

    if (!cliente) return null;

    const totalPedidos = cliente.pedidos.length;
    const valorGasto = cliente.pedidos.reduce((acc, p) => acc + Number(p.total), 0);
    const primeiroPedido = cliente.pedidos[0]?.criadoEm || null;
    const ultimoPedido = cliente.pedidos[cliente.pedidos.length - 1]?.criadoEm || null;
    const diasSemPedir = ultimoPedido
      ? Math.floor((Date.now() - ultimoPedido.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const weekdayCount: Record<string, number> = {};
    for (const pedido of cliente.pedidos) {
      const dia = pedido.criadoEm.toLocaleDateString('pt-BR', { weekday: 'long' });
      weekdayCount[dia] = (weekdayCount[dia] || 0) + 1;
    }
    const diaFavorito = Object.entries(weekdayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const produtosCount: Record<string, number> = {};
    for (const pedido of cliente.pedidos) {
      for (const item of pedido.itens) {
        const nome = item.produto?.nome || 'Produto';
        produtosCount[nome] = (produtosCount[nome] || 0) + item.quantidade;
      }
    }
    const topProdutos = Object.entries(produtosCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome, quantidade]) => ({ nome, quantidade }));

    return {
      telefone: cliente.telefone,
      nome: cliente.nome,
      endereco: cliente.endereco,
      bairro: cliente.bairro,
      origem: cliente.origem,
      totalPedidos,
      valorGasto,
      primeiroPedido: primeiroPedido?.toISOString() || null,
      ultimoPedido: ultimoPedido?.toISOString() || null,
      diaFavorito,
      topProdutos,
      diasSemPedir,
      emListaNegra: Boolean(cliente.listaNegra),
      motivoListaNegra: cliente.listaNegra?.motivo || null,
      nivelListaNegra: cliente.listaNegra?.nivel || null,
      totalOcorrencias: cliente.listaNegra?.totalOcorrencias || 0,
    };
  }

  async adicionarListaNegra(telefone: string, motivo: string, registradoPor?: string) {
    const cliente = await prisma.cliente.findUnique({ where: { telefone } });
    if (!cliente) throw new Error('CLIENTE_NAO_ENCONTRADO');

    const existente = await prisma.listaNegraCliente.findUnique({
      where: { clienteTelefone: telefone },
    });

    if (existente) {
      // Escalada de nível: cada nova ocorrência pode subir o nível
      const novoTotal = existente.totalOcorrencias + 1;
      const novoNivel = Math.min(3, existente.nivel + (novoTotal % 2 === 0 ? 1 : 0));

      const [atualizado] = await Promise.all([
        prisma.listaNegraCliente.update({
          where: { clienteTelefone: telefone },
          data: {
            motivo,
            nivel: novoNivel,
            totalOcorrencias: novoTotal,
            registradoPor: registradoPor || existente.registradoPor,
          },
        }),
        prisma.ocorrenciaListaNegra.create({
          data: { clienteTelefone: telefone, motivo, registradoPor },
        }),
      ]);
      return atualizado;
    }

    const [criado] = await Promise.all([
      prisma.listaNegraCliente.create({
        data: { clienteTelefone: telefone, motivo, nivel: 1, totalOcorrencias: 1, registradoPor },
      }),
      prisma.ocorrenciaListaNegra.create({
        data: { clienteTelefone: telefone, motivo, registradoPor },
      }),
    ]);
    return criado;
  }

  async atualizarNivelListaNegra(telefone: string, nivel: number) {
    const existente = await prisma.listaNegraCliente.findUnique({ where: { clienteTelefone: telefone } });
    if (!existente) throw new Error('CLIENTE_NAO_ENCONTRADO_LISTA_NEGRA');
    if (nivel < 1 || nivel > 3) throw new Error('NIVEL_INVALIDO');
    return prisma.listaNegraCliente.update({
      where: { clienteTelefone: telefone },
      data: { nivel },
    });
  }

  async listarOcorrencias(telefone: string) {
    return prisma.ocorrenciaListaNegra.findMany({
      where: { clienteTelefone: telefone },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async removerListaNegra(telefone: string) {
    const existente = await prisma.listaNegraCliente.findUnique({
      where: { clienteTelefone: telefone },
    });
    if (!existente) return null;
    return prisma.listaNegraCliente.delete({ where: { clienteTelefone: telefone } });
  }
}

export default new ClienteService();
