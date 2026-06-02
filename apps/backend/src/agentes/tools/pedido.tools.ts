import Anthropic from '@anthropic-ai/sdk';

// Definições das tools no formato Anthropic SDK
export const PEDIDO_TOOLS: Anthropic.Tool[] = [
  {
    name: 'buscar_cardapio',
    description:
      'Busca os produtos disponíveis no cardápio. Use sempre que o cliente perguntar sobre preços, itens disponíveis ou quiser fazer um pedido. Nunca invente produtos ou preços.',
    input_schema: {
      type: 'object',
      properties: {
        categoria: {
          type: 'string',
          description: 'Filtrar por categoria (opcional). Ex: "Marmitas", "Bebidas".',
        },
      },
      required: [],
    },
  },
  {
    name: 'adicionar_item',
    description:
      'Adiciona um item ao carrinho do cliente. Use o produtoId retornado por buscar_cardapio. Valida se o produto existe e está disponível.',
    input_schema: {
      type: 'object',
      properties: {
        produtoId: { type: 'string', description: 'ID do produto (obtenha de buscar_cardapio).' },
        quantidade: { type: 'number', description: 'Quantidade desejada (mínimo 1).' },
        observacao: { type: 'string', description: 'Observação opcional (ex: "sem cebola").' },
      },
      required: ['produtoId', 'quantidade'],
    },
  },
  {
    name: 'remover_item',
    description: 'Remove um item do carrinho do cliente.',
    input_schema: {
      type: 'object',
      properties: {
        produtoId: { type: 'string', description: 'ID do produto a remover.' },
      },
      required: ['produtoId'],
    },
  },
  {
    name: 'ver_carrinho',
    description:
      'Mostra o carrinho atual do cliente: itens, subtotal, taxa de entrega e endereço. Use antes de pedir confirmação do pedido.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'validar_entrega',
    description:
      'Valida se entregamos no endereço do cliente e calcula a taxa. Pode receber bairro, CEP, ou coordenadas GPS (lat/lng). Use quando o cliente informar o endereço ou compartilhar a localização.',
    input_schema: {
      type: 'object',
      properties: {
        bairro: { type: 'string', description: 'Nome do bairro.' },
        cep: { type: 'string', description: 'CEP com 8 dígitos.' },
        lat: { type: 'number', description: 'Latitude (de localização GPS).' },
        lng: { type: 'number', description: 'Longitude (de localização GPS).' },
        endereco: { type: 'string', description: 'Endereço completo (rua e número).' },
      },
      required: [],
    },
  },
  {
    name: 'confirmar_pedido',
    description:
      'Finaliza e cria o pedido no sistema. Só use quando o cliente confirmar todos os itens e o endereço. Gera link de pagamento PIX automaticamente.',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome do cliente para o pedido.' },
        formaPagamento: {
          type: 'string',
          enum: ['PIX', 'DINHEIRO'],
          description: 'Forma de pagamento. Prefira PIX (confirmação automática).',
        },
        trocoPara: {
          type: 'number',
          description: 'Valor em reais para troco (apenas quando formaPagamento = DINHEIRO).',
        },
      },
      required: ['nome', 'formaPagamento'],
    },
  },
  {
    name: 'cancelar_pedido',
    description: 'Cancela o pedido em andamento e limpa o carrinho do cliente.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
