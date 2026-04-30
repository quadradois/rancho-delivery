# API Endpoints - Sabor Express

Documentação dos endpoints da API REST do Sabor Express.

**Base URL:** `http://localhost:3001/api`

---

## Produtos

### Listar Produtos

Lista todos os produtos disponíveis ordenados por ordem de exibição.

**Endpoint:** `GET /api/produtos`

**Query Parameters:**
- `categoria` (opcional) - Filtrar por categoria

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmojjn1cq0005hldnrsyvnhpd",
      "nome": "Marmita Executiva - Frango Grelhado",
      "preco": "24.9",
      "midia": "https://placeholder.com/frango-grelhado.jpg",
      "descricao": "Peito de frango grelhado, arroz integral, feijão preto...",
      "categoria": "Executiva",
      "ordem": 1
    }
  ]
}
```

**Exemplos:**
```bash
# Listar todos os produtos
curl http://localhost:3001/api/produtos

# Filtrar por categoria
curl http://localhost:3001/api/produtos?categoria=Executiva
```

---

### Buscar Produto por ID

Busca um produto específico pelo ID.

**Endpoint:** `GET /api/produtos/:id`

**Parâmetros:**
- `id` (obrigatório) - ID do produto

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "cmojjn1cq0005hldnrsyvnhpd",
    "nome": "Marmita Executiva - Frango Grelhado",
    "preco": "24.9",
    "midia": "https://placeholder.com/frango-grelhado.jpg",
    "descricao": "Peito de frango grelhado...",
    "categoria": "Executiva",
    "disponivel": true,
    "ordem": 1
  }
}
```

**Resposta de Erro (404):**
```json
{
  "success": false,
  "error": {
    "message": "Produto não encontrado",
    "code": "PRODUTO_NAO_ENCONTRADO"
  }
}
```

**Exemplo:**
```bash
curl http://localhost:3001/api/produtos/cmojjn1cq0005hldnrsyvnhpd
```

---

## Bairros

### Listar Bairros

Lista todos os bairros atendidos com suas respectivas taxas de entrega.

**Endpoint:** `GET /api/bairros`

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmojjn1ao0000hldnd1bc4ktb",
      "nome": "Setor Bueno",
      "taxa": "6"
    },
    {
      "id": "cmojjn1ao0001hldn4jdcu7gt",
      "nome": "Setor Oeste",
      "taxa": "5"
    }
  ]
}
```

**Exemplo:**
```bash
curl http://localhost:3001/api/bairros
```

---

### Validar Bairro

Valida se um bairro está ativo e retorna a taxa de entrega.

**Endpoint:** `POST /api/bairros/validar`

**Body:**
```json
{
  "nome": "Setor Bueno"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "valido": true,
    "taxa": 6
  }
}
```

**Resposta de Erro (404):**
```json
{
  "success": false,
  "error": {
    "message": "Bairro não atendido",
    "code": "BAIRRO_NAO_ATENDIDO"
  }
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3001/api/bairros/validar \
  -H "Content-Type: application/json" \
  -d '{"nome": "Setor Bueno"}'
```

---

## Health Check

### Verificar Status da API

Verifica se a API está online e funcionando.

**Endpoint:** `GET /health`

**Resposta de Sucesso (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-29T04:17:43.228Z",
  "service": "sabor-express-api"
}
```

**Exemplo:**
```bash
curl http://localhost:3001/health
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 400 | Requisição inválida |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

### Códigos de Erro Customizados

| Code | Descrição |
|------|-----------|
| `PRODUTO_NAO_ENCONTRADO` | Produto não existe no banco |
| `PRODUTO_INDISPONIVEL` | Produto existe mas está indisponível |
| `BAIRRO_NAO_ATENDIDO` | Bairro não está na lista de atendimento |
| `BAIRRO_OBRIGATORIO` | Nome do bairro não foi informado |
| `NOT_FOUND` | Rota não existe |
| `INTERNAL_SERVER_ERROR` | Erro não tratado no servidor |

---

## Formato de Resposta Padrão

Todas as respostas seguem o formato:

**Sucesso:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro:**
```json
{
  "success": false,
  "error": {
    "message": "Descrição do erro",
    "code": "CODIGO_ERRO"
  }
}
```

---

## Webhooks

### InfinitePay

**Endpoint:** `POST /webhook/infinitepay`

**Headers aceitos para assinatura:**
- `x-infinitepay-signature`
- `authorization`
- `x-webhook-secret`

**Comportamento:**
- Confirma pedido em eventos aprovados
- Processamento idempotente para pedidos ja confirmados
- Retorna `200` em erros internos para evitar loop de reenvio

---

## Pedidos

### Criar Pedido

Cria um novo pedido com validação de bairro, cálculo automático de taxas e criação/atualização do cliente.

**Endpoint:** `POST /api/pedidos`

**Body:**
```json
{
  "cliente": {
    "telefone": "5562999887766",
    "nome": "João Silva",
    "endereco": "Rua das Flores, 123",
    "bairro": "Setor Bueno"
  },
  "itens": [
    {
      "produtoId": "cmojjn1cq0005hldnrsyvnhpd",
      "quantidade": 2,
      "observacao": "Sem cebola"
    }
  ],
  "observacao": "Entregar no portão principal"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "data": {
    "id": "cmojkvik50002ip5e1c3dackp",
    "clienteTelefone": "5562999887766",
    "subtotal": "49.8",
    "taxaEntrega": "6",
    "total": "55.8",
    "status": "PENDENTE",
    "observacao": "Entregar no portão principal",
    "criadoEm": "2026-04-29T04:51:46.227Z",
    "itens": [
      {
        "id": "cmojkvik50004ip5e0iq8ksqs",
        "produtoId": "cmojjn1cq0005hldnrsyvnhpd",
        "quantidade": 2,
        "precoUnit": "24.9",
        "subtotal": "49.8",
        "observacao": "Sem cebola",
        "produto": {
          "nome": "Marmita Executiva - Frango Grelhado",
          "categoria": "Executiva"
        }
      }
    ],
    "cliente": {
      "nome": "João Silva",
      "telefone": "5562999887766",
      "endereco": "Rua das Flores, 123",
      "bairro": "Setor Bueno"
    }
  }
}
```

**Resposta de Erro (400):**
```json
{
  "success": false,
  "error": {
    "message": "Bairro não atendido",
    "code": "BAIRRO_NAO_ATENDIDO"
  }
}
```

**Lógica de Negócio:**
1. Valida bairro e obtém taxa de entrega
2. Valida disponibilidade de todos os produtos
3. Calcula subtotal (soma dos itens)
4. Calcula total (subtotal + taxa de entrega)
5. Cria ou atualiza cliente automaticamente
6. Cria pedido com status PENDENTE
7. Retorna pedido completo com itens e cliente

**Exemplo:**
```bash
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefone": "5562999887766",
      "nome": "João Silva",
      "endereco": "Rua das Flores, 123",
      "bairro": "Setor Bueno"
    },
    "itens": [
      {
        "produtoId": "cmojjn1cq0005hldnrsyvnhpd",
        "quantidade": 2
      }
    ]
  }'
```

---

### Buscar Pedido por ID

Busca um pedido específico com todos os detalhes.

**Endpoint:** `GET /api/pedidos/:id`

**Parâmetros:**
- `id` (obrigatório) - ID do pedido

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "cmojkvik50002ip5e1c3dackp",
    "clienteTelefone": "5562999887766",
    "subtotal": "49.8",
    "taxaEntrega": "6",
    "total": "55.8",
    "status": "PENDENTE",
    "itens": [...],
    "cliente": {...}
  }
}
```

**Exemplo:**
```bash
curl http://localhost:3001/api/pedidos/cmojkvik50002ip5e1c3dackp
```

---

### Listar Pedidos por Cliente

Lista todos os pedidos de um cliente específico.

**Endpoint:** `GET /api/pedidos/cliente/:telefone`

**Parâmetros:**
- `telefone` (obrigatório) - Telefone do cliente

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmojkvik50002ip5e1c3dackp",
      "subtotal": "49.8",
      "total": "55.8",
      "status": "PENDENTE",
      "criadoEm": "2026-04-29T04:51:46.227Z",
      "itens": [...]
    }
  ]
}
```

**Exemplo:**
```bash
curl http://localhost:3001/api/pedidos/cliente/5562999887766
```

---

## Próximos Endpoints (Fase 1)

- `POST /webhook/infinitepay` - Webhook oficial de pagamento (InfinitePay)
- `POST /api/whatsapp/notificar` - Enviar notificação via WhatsApp

---

## Códigos de Erro Atualizados

| Code | Descrição |
|------|-----------|
| `PRODUTO_NAO_ENCONTRADO` | Produto não existe no banco |
| `PRODUTO_INDISPONIVEL` | Produto existe mas está indisponível |
| `BAIRRO_NAO_ATENDIDO` | Bairro não está na lista de atendimento |
| `BAIRRO_OBRIGATORIO` | Nome do bairro não foi informado |
| `PEDIDO_NAO_ENCONTRADO` | Pedido não existe no banco |
| `VALIDACAO_ERRO` | Dados enviados são inválidos |
| `NOT_FOUND` | Rota não existe |
| `INTERNAL_SERVER_ERROR` | Erro não tratado no servidor |

---

**Versão da API:** 0.3.0  
**Última atualização:** 29/04/2026
