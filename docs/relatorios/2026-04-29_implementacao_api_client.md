# API Client - Documentação de Implementação

**Data:** 2026-04-29  
**Tarefa:** Criar API client para comunicação com backend  
**Status:** ✅ Concluído

---

## Resumo

Implementação completa do cliente HTTP para comunicação com o backend do Sabor Express. O cliente utiliza Axios com interceptors, tratamento robusto de erros, retry automático e tipagem TypeScript completa.

---

## Arquitetura

```
src/
├── lib/
│   └── http-client.ts          # Cliente HTTP com Axios
├── types/
│   ├── api.types.ts            # Tipos base da API
│   └── domain.types.ts         # Tipos de domínio
└── services/
    ├── index.ts                # Exportação centralizada
    ├── produtoService.ts       # Serviço de produtos
    ├── bairroService.ts        # Serviço de bairros
    └── pedidoService.ts        # Serviço de pedidos
```

---

## Funcionalidades Implementadas

### 1. Cliente HTTP (`http-client.ts`)

**Características:**
- ✅ Baseado em Axios
- ✅ Base URL configurável via `NEXT_PUBLIC_API_URL`
- ✅ Timeout de 30 segundos
- ✅ Retry automático (até 3 tentativas) em caso de timeout
- ✅ Interceptors de request e response
- ✅ Logging em modo desenvolvimento
- ✅ Extração automática de dados da estrutura `ApiResponse<T>`
- ✅ Tratamento de erros de rede, timeout e HTTP

**Métodos disponíveis:**
```typescript
apiClient.get<T>(url, params?)
apiClient.post<T>(url, data?)
apiClient.put<T>(url, data?)
apiClient.patch<T>(url, data?)
apiClient.delete<T>(url)
```

---

### 2. Tipos Base (`api.types.ts`)

**ApiResponse<T>**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
```

**ApiError**
```typescript
interface ApiError {
  message: string;
  code?: string;
  details?: any;
}
```

**ApiException**
```typescript
class ApiException extends Error {
  code?: string;
  details?: any;
  statusCode?: number;
}
```

**Códigos de erro:**
- `BAIRRO_OBRIGATORIO`
- `BAIRRO_NAO_ATENDIDO`
- `PRODUTO_NAO_ENCONTRADO`
- `PRODUTO_INDISPONIVEL`
- `PEDIDO_NAO_ENCONTRADO`
- `VALIDACAO_ERRO`
- `UNAUTHORIZED`

---

### 3. Tipos de Domínio (`domain.types.ts`)

**Tipos principais:**
- `Produto` - Produto completo
- `ProdutoCardDTO` - Produto simplificado para cards
- `Bairro` - Bairro com taxa de entrega
- `Pedido` - Pedido completo
- `ItemPedido` - Item do pedido
- `StatusPedido` - Status do pedido (enum)
- `CriarPedidoDTO` - DTO para criar pedido
- `ClientePedidoDTO` - Dados do cliente
- `ItemPedidoDTO` - Item do pedido (DTO)
- `CarrinhoItem` - Item do carrinho (frontend)
- `CheckoutDTO` - Dados do checkout (frontend)

---

### 4. Serviço de Produtos (`produtoService.ts`)

**Métodos:**

```typescript
// Lista todos os produtos (com filtro opcional por categoria)
produtoService.listar(categoria?: string): Promise<Produto[]>

// Busca produto por ID
produtoService.buscarPorId(id: string): Promise<Produto>
```

**Endpoints:**
- `GET /api/produtos?categoria={categoria}`
- `GET /api/produtos/:id`

---

### 5. Serviço de Bairros (`bairroService.ts`)

**Métodos:**

```typescript
// Lista todos os bairros ativos
bairroService.listar(): Promise<Bairro[]>

// Valida bairro e retorna taxa
bairroService.validar(nome: string): Promise<ValidarBairroResponse>

// Busca apenas a taxa (wrapper de validar)
bairroService.buscarTaxa(nome: string): Promise<number>
```

**Endpoints:**
- `GET /api/bairros`
- `POST /api/bairros/validar`

---

### 6. Serviço de Pedidos (`pedidoService.ts`)

**Métodos:**

```typescript
// Cria novo pedido
pedidoService.criar(dados: CriarPedidoDTO): Promise<Pedido>

// Busca pedido por ID
pedidoService.buscarPorId(id: string): Promise<Pedido>

// Lista pedidos de um cliente
pedidoService.listarPorCliente(telefone: string): Promise<Pedido[]>

// Calcula total do pedido (método auxiliar)
pedidoService.calcularTotal(
  itens: Array<{ precoUnit: number; quantidade: number }>,
  taxaEntrega: number
): { subtotal: number; total: number }
```

**Endpoints:**
- `POST /api/pedidos`
- `GET /api/pedidos/:id`
- `GET /api/pedidos/cliente/:telefone`

---

## Uso

### Importação

```typescript
// Importar serviços individualmente
import { produtoService, bairroService, pedidoService } from '@/services';

// Ou importar objeto API completo
import api from '@/services';
```

### Exemplos de Uso

**Listar produtos:**
```typescript
try {
  const produtos = await api.produtos.listar();
  console.log(produtos);
} catch (error) {
  if (error instanceof ApiException) {
    console.error(error.message, error.code);
  }
}
```

**Validar bairro:**
```typescript
try {
  const resultado = await api.bairros.validar('Centro');
  console.log(`Taxa: R$ ${resultado.taxa}`);
} catch (error) {
  if (error.code === 'BAIRRO_NAO_ATENDIDO') {
    alert('Bairro não atendido');
  }
}
```

**Criar pedido:**
```typescript
try {
  const pedido = await api.pedidos.criar({
    cliente: {
      telefone: '11999999999',
      nome: 'João Silva',
      endereco: 'Rua das Flores, 123',
      bairro: 'Centro'
    },
    itens: [
      { produtoId: '123', quantidade: 2, observacao: 'Sem cebola' }
    ],
    observacao: 'Entregar no portão'
  });
  
  // Redirecionar para pagamento
  if (pedido.pagamentoId) {
    window.location.href = `https://asaas.com/pay/${pedido.pagamentoId}`;
  }
} catch (error) {
  if (error instanceof ApiException) {
    switch (error.code) {
      case 'BAIRRO_NAO_ATENDIDO':
        alert('Bairro não atendido');
        break;
      case 'PRODUTO_INDISPONIVEL':
        alert('Produto indisponível');
        break;
      case 'VALIDACAO_ERRO':
        console.error('Erros de validação:', error.details);
        break;
    }
  }
}
```

---

## Tratamento de Erros

O cliente HTTP trata automaticamente os seguintes cenários:

1. **Timeout**: Retry automático até 3 vezes com delay incremental
2. **Erro de rede**: Lança `ApiException` com código `NETWORK_ERROR`
3. **Erros HTTP**: Converte para `ApiException` com mensagem apropriada
4. **Erros da API**: Extrai erro da resposta e lança `ApiException`

**Exemplo de tratamento:**
```typescript
try {
  const produtos = await api.produtos.listar();
} catch (error) {
  if (error instanceof ApiException) {
    // Erro da API
    console.error(`[${error.code}] ${error.message}`);
    
    if (error.details) {
      // Erros de validação Zod
      console.error('Detalhes:', error.details);
    }
  } else {
    // Erro desconhecido
    console.error('Erro desconhecido:', error);
  }
}
```

---

## Configuração

### Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Timeout e Retry

Configurações em `http-client.ts`:
```typescript
const API_TIMEOUT = 30000;      // 30 segundos
const MAX_RETRIES = 3;          // 3 tentativas
const RETRY_DELAY = 1000;       // 1 segundo (incremental)
```

---

## Validação

✅ **TypeScript**: Todos os tipos validados com `pnpm typecheck`  
✅ **Correspondência com Backend**: Tipos espelham exatamente os DTOs do backend  
✅ **Documentação**: JSDoc em todos os métodos públicos  
✅ **Tratamento de Erros**: Cobertura completa de cenários de erro

---

## Próximos Passos

A tarefa **1. Criar API client para comunicação com backend** está **100% concluída**.

**Próxima tarefa:** Tarefa 2 - Implementar tipos TypeScript do backend no frontend (já incluída nesta implementação)

**Sugestão:** Pular para Tarefa 3 - Criar Context API para gerenciamento do carrinho

---

## Referências

- [Documentação Axios](https://axios-http.com/)
- [Backend API - Resumo de Endpoints](../referencias/backend_api.md)
- [PLANEJAMENTO_SABOR_EXPRESS.md](../PLANEJAMENTO_SABOR_EXPRESS.md)
