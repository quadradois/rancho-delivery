# RAIO-X AS-IS / TO-BE — MÓDULO PEDIDOS
> Rancho Delivery · Gerado em 02/05/2026

---

## 1. Resumo executivo

O módulo de Pedidos é a **espinha dorsal comercial** do Rancho Delivery. Gerencia 100% do ciclo de vida do pedido: criação pelo cliente, pagamento PIX via InfinitePay, preparo, entrega e cancelamento com estorno. Sem ele, o negócio para.

O módulo está **funcionalmente operacional** em produção, com fluxo de pagamento PIX funcionando, circuit breaker e retry implementados, RBAC no painel admin e 157 testes passando. Porém carrega riscos críticos de segurança no lado do cliente (sem autenticação nos endpoints públicos) e lacunas graves de testes nos fluxos mais importantes do negócio (webhook de pagamento, expiração de checkout, notificações).

| Dimensão | Avaliação |
|---|---|
| **Nível de maturidade** | Médio |
| **Risco atual** | Alto |
| **Prontidão comercial** | GO com ressalvas |

---

## 2. Objetivo do módulo

| Pergunta | Resposta |
|---|---|
| **Quem usa?** | Clientes finais (criam pedidos), admins/operadores (gerenciam), motoboys (recebem atribuições) |
| **Para quê?** | Receber pedidos de comida, processar pagamento PIX, coordenar preparo e entrega |
| **Resultado esperado** | Cliente faz pedido → paga → recebe confirmação → acompanha status → recebe entrega |
| **Valor de negócio** | É a única fonte de receita do negócio. Cada pedido perdido = receita perdida diretamente |

---

## 3. AS-IS — Estado atual

### 3.1 Arquitetura atual

```
BACKEND
├── routes/pedido.routes.ts              (wiring de rotas, sem lógica)
├── controllers/pedido.controller.ts     (validação de entrada, mapeamento HTTP)
├── services/pedido.service.ts           (1.400+ linhas — TODA a lógica de negócio)
│
├── services/infinitepay.service.ts      (PIX: circuit breaker, retry, HMAC)
├── services/evolution.service.ts        (WhatsApp: retry com backoff)
├── controllers/webhook.controller.ts    (recebe eventos InfinitePay + WhatsApp)
│
└── middlewares/
    ├── adminAuth.middleware.ts           (JWT + RBAC admin)
    └── rateLimit.middleware.ts           (limiters por rota)

FRONTEND — Cliente
├── app/checkout/page.tsx               (774 linhas — formulário em 3 etapas)
├── app/cart/page.tsx                   (100 linhas — visualização do carrinho)
├── app/pedido/[id]/page.tsx            (277 linhas — acompanhamento)
├── contexts/CartContext.tsx            (estado global do carrinho)
├── contexts/CarrinhoContext.tsx        (DUPLICADO do CartContext — em português)
├── hooks/useLojaStatus.ts              (SSE para status da loja)
├── services/pedidoService.ts           (interface com a API)
└── schemas/checkoutSchema.ts           (Zod: endereço + pagamento)

BANCO DE DADOS (Prisma)
├── Pedido                (entidade central)
├── ItemPedido            (itens do pedido, cascade delete)
├── PedidoTimeline        (auditoria de eventos, cascade delete)
├── Cliente               (telefone como PK)
├── Bairro                (áreas atendidas com taxa)
├── Motoboy               (entregadores)
├── LojaConfiguracao      (status da loja: ABERTO/PAUSADO/FECHADO)
└── MensagemCliente       (histórico de WhatsApp)
```

### 3.2 Fluxo funcional atual

**Fluxo 1 — Cliente cria e paga pedido (PIX):**
1. Cliente monta carrinho no cardápio (CartContext no frontend)
2. Acessa `/checkout` — 3 etapas: Endereço → Pagamento → Revisão
3. Frontend valida CEP via `GET /api/bairros/cep/{cep}` → obtém taxa de entrega
4. Cliente confirma → `POST /api/pedidos` com cliente, itens, observação
5. Controller valida com Zod; service valida bairro e cada produto (N queries separadas)
6. Pedido criado no banco com `status=AGUARDANDO_PAGAMENTO`, TTL de 20 min
7. Service chama InfinitePay (circuit breaker + retry): obtém URL de pagamento PIX
8. Frontend redireciona cliente para URL PIX do InfinitePay
9. Cliente paga → InfinitePay chama `POST /webhook/infinitepay`
10. Webhook valida HMAC → chama `atualizarStatus(id, CONFIRMADO)`
11. Admin recebe notificação realtime (SSE), cliente recebe WhatsApp

**Fluxo 2 — Preparo e entrega:**
1. Admin vê pedido CONFIRMADO no cockpit
2. Muda status → PREPARANDO (cozinha começa, sem notificação ao cliente)
3. Admin atribui motoboy → `PATCH /api/admin/pedidos/:id/motoboy`
4. Admin muda → SAIU_ENTREGA → cliente recebe WhatsApp "seu pedido saiu"
5. Motoboy entrega → admin muda → ENTREGUE → cliente recebe WhatsApp "bom apetite"

**Fluxo 3 — Expiração e abandono:**
1. 20 min sem pagamento → job `sincronizarExpiracoesCheckout()` transiciona para EXPIRADO
2. Mais 30 min em EXPIRADO → transiciona para ABANDONADO (com `abandonadoEm`)
3. Admin vê pedidos expirados/abandonados no painel de métricas

**Fluxo 4 — Cancelamento com estorno:**
1. Admin cancela pedido com motivo obrigatório
2. Se `statusPagamento=CONFIRMADO` → seta `estornoNecessario=true`
3. Admin marca estorno realizado quando concluir → `PATCH /api/admin/pedidos/:id/estorno`

### 3.3 Regras de negócio atuais

**Regras explícitas:**
- Bairro deve estar cadastrado e ativo para aceitar pedido
- Produto deve existir e ter `disponivel=true`
- Pedido criado sempre com `status=AGUARDANDO_PAGAMENTO` e TTL de 20 min
- Transições de status seguem matriz predefinida (ex: ENTREGUE não tem saída)
- Cancelamento exige motivo obrigatório (via controller)
- Estorno só pode ser marcado se `estornoNecessario=true`
- Loja `PAUSADO` bloqueia checkout no frontend
- Admin precisa de permissão granular para cada operação (RBAC)

**Regras implícitas:**
- Telefone é chave única do cliente — dois números diferentes = dois clientes diferentes
- Pedidos PIX confirmados via webhook têm idempotência (não reprocessa se já CONFIRMADO)
- `statusMudouEm` é atualizado a cada transição (base para cálculo de SLA)
- Pedido manual em dinheiro é confirmado imediatamente (sem webhook)
- Endereço do pedido pode diferir do endereço do cliente (admin pode editar)

**Regras ausentes:**
- Sem limite de pedidos simultâneos por cliente
- Sem validação de horário de funcionamento no backend (só frontend via `useLojaStatus`)
- Sem limite de valor máximo por pedido
- Sem validação de quantidade máxima por item
- Sem idempotência na criação de pedido pelo cliente

**Regras contraditórias:**
- `atualizarEnderecoEntrega()` não valida se novo bairro é atendido (pode criar inconsistência de taxa)
- `pagamentosConfirmados` em `obterMetricasAbandono()` conta `status=CONFIRMADO` em vez de `statusPagamento=CONFIRMADO`

### 3.4 Contratos atuais

| Método | Endpoint | Autenticação | Input | Output | Erros tratados |
|---|---|---|---|---|---|
| POST | `/api/pedidos` | Nenhuma | cliente, itens, observacao | pedido + linkPagamento | 400: bairro/produto, 500: genérico |
| GET | `/api/pedidos/:id` | **Nenhuma** | — | pedido completo | 404, 500 |
| GET | `/api/pedidos/cliente/:telefone` | **Nenhuma** | — | array de pedidos | 500 |
| GET | `/api/pedidos` | Nenhuma | status, page, limit | { data, pagination } | 500 |
| GET | `/api/pedidos/metricas/abandono` | Nenhuma | dias | métricas | 500 |
| POST | `/webhook/infinitepay` | HMAC/token | body InfinitePay | 200 sempre | 401 token inválido |
| POST | `/webhook/whatsapp` | Nenhuma | body Evolution | 200 | — |
| PATCH | `/api/admin/pedidos/:id/status` | JWT+RBAC | status, motivoCancelamento | pedido | 400, 403, 404 |
| PATCH | `/api/admin/pedidos/:id/motoboy` | JWT+RBAC | motoboyId, observacao | pedido | 403, 404 |
| POST | `/api/admin/pedidos/:id/cancelar` | JWT+RBAC | motivo | pedido | 400, 403, 404 |
| PATCH | `/api/admin/pedidos/:id/estorno` | JWT+RBAC | — | pedido | 400, 403, 404 |
| POST | `/api/admin/pedidos/manual` | JWT+RBAC | cliente, itens, pagamento | pedido | 400, 403 |

**Erros não tratados:**
- Timeout de banco de dados (cai no catch genérico 500)
- InfinitePay fora do ar: pedido criado sem link, sem retry automático posterior
- Conflito de concorrência: dois webhooks simultâneos para o mesmo pedido
- Duplicação de pedido por clique duplo no frontend

### 3.5 Banco de dados

**Model Pedido — campos principais:**
```
id               cuid() PK
clienteTelefone  FK → Cliente.telefone  @index
status           StatusPedido           @index
statusPagamento  StatusPagamento        (SEM ÍNDICE — gap)
statusMudouEm    DateTime               (atualizado manualmente)
pagamentoId      String?                (ID InfinitePay)
motoboyId        FK → Motoboy           @index @onDelete:SetNull
subtotal         Decimal(10,2)
taxaEntrega      Decimal(10,2)
total            Decimal(10,2)
pagamentoExpiraEm DateTime?             (TTL 20 min)
abandonadoEm     DateTime?
recuperadoEm     DateTime?
estornoNecessario Boolean               (SEM ÍNDICE — gap)
criadoEm         DateTime               @index
atualizadoEm     DateTime               @updatedAt
```

**Índices declarados:** `clienteTelefone`, `status`, `motoboyId`, `criadoEm`

**Índices AUSENTES (gaps críticos):**
- `statusPagamento` — filtrado frequentemente no webhook e métricas
- `pagamentoExpiraEm` — filtrado a cada execução do job de expiração
- `estornoNecessario` — filtrado na fila urgente
- `abandonadoEm` — filtrado nas métricas de abandono
- Índice composto `(status, criadoEm)` — query mais comum do admin

**Auditoria:**
- `criadoEm` e `atualizadoEm` em todas as entidades ✅
- `PedidoTimeline` registra ações com ator e ação ✅
- **Sem soft delete** — pedidos cancelados permanecem com `status=CANCELADO`

**Relacionamentos:**
- `ItemPedido` tem cascade delete de `Pedido` ✅
- `PedidoTimeline` tem cascade delete de `Pedido` ✅
- `Pedido.bairroEntrega` é string livre, não FK para `Bairro` — risco de inconsistência

### 3.6 UX/UI atual

**Checkout (`/checkout`):**
- Fluxo em 3 etapas com progress indicator ✅
- Validação em tempo real do CEP ✅
- Recovery de sessão (30 min) ✅
- Estado loading no botão de confirmar ✅
- **Problema:** 11 `useState` separados — estado difícil de manter
- **Problema:** Formulário com muitos campos opcionais (quadra, lote, complemento) — fricção
- **Problema:** Dois contextos duplicados (CartContext vs CarrinhoContext)

**Acompanhamento (`/pedido/[id]):**
- Tracker visual de status com 5 etapas ✅
- **Problema:** Polling fixo a cada 30s — latência de até 30s para o cliente ver atualização
- **Problema:** Sem notificação push/toast quando status muda
- **Problema:** Sem estimativa de tempo dinâmica (hardcoded 30 min no backend)

**Estado de loja fechada:**
- Frontend consulta status via SSE/polling ✅
- Exibe mensagem de pausa configurada pelo admin ✅
- **Problema:** Sem feedback ao cliente sobre tempo estimado de reabertura

### 3.7 Integrações atuais

| Sistema | Finalidade | Auth | Retry | Circuit Breaker | Logs |
|---|---|---|---|---|---|
| **InfinitePay** | Geração de link PIX e recebimento de webhook | API Key (header) | ✅ 2x backoff 1s→2s | ✅ 3 falhas→OPEN, 30s→HALF_OPEN | ✅ |
| **Evolution API** | Envio de mensagens WhatsApp | API Key (header) | ✅ 2x backoff 800ms→1600ms | ❌ | ✅ parcial |
| **Prisma/PostgreSQL** | Persistência de dados | Connection string | ❌ | ❌ | ❌ (erros apenas) |

**Gaps de integração:**
- Evolution não tem circuit breaker (se cair, cada notificação tenta 3x)
- Se InfinitePay cai APÓS criação do pedido, pedido fica sem link permanentemente (sem job de reprocessamento)
- Webhook do WhatsApp (`/webhook/whatsapp`) não tem autenticação

### 3.8 Segurança atual

| Aspecto | Status | Detalhe |
|---|---|---|
| **Autenticação cliente** | ❌ AUSENTE | `GET /api/pedidos/:id` e `GET /api/pedidos/cliente/:telefone` sem auth |
| **Autorização admin** | ✅ | JWT + RBAC com 11 permissões |
| **Rate limiting** | ✅ parcial | `adminLimiter` e `loginLimiter`; **falta limiter para POST /pedidos** |
| **Validação de entrada** | ✅ parcial | Zod no controller; falta máximos (telefone, nome, quantidade) |
| **IDOR** | ❌ CRÍTICO | Cliente pode acessar pedido de qualquer ID |
| **HMAC webhook** | ✅ | SHA-256 com timing-safe equal |
| **Webhook WhatsApp** | ❌ | Sem validação de origem |
| **Dados sensíveis em logs** | ⚠️ | Telefone e ID expostos em logs INFO |
| **CORS** | ✅ | Configurado via `FRONTEND_URL` |
| **SQL Injection** | ✅ | Prisma parametrizado; 1 query raw sem concatenação |

### 3.9 Logs, métricas e observabilidade

**O que está logado:**
- Webhook recebido/rejeitado/processado ✅
- Link PIX criado ✅
- Status de pedido atualizado ✅
- Rotina de expiração executada (com totais) ✅
- Erros gerais capturados ✅

**O que NÃO está logado (gaps críticos):**
- Início de `criarPedido()` — impossível correlacionar criações com erros
- Validação de bairro e produto — não sabemos quantas tentativas falham
- Transição `de X para Y` no status — só sabemos o status final
- Notificação WhatsApp enviada/falhada para cada pedido
- N de queries executadas no loop de produtos
- Tempo de resposta das chamadas a InfinitePay e Evolution
- Pedidos que expiraram (individualmente — só o total)

**Métricas ausentes:**
- Taxa de conversão (pedidos criados vs confirmados)
- Tempo médio de criação de pedido (latência do endpoint)
- Taxa de falha de criação de link PIX
- Taxa de retentativas do circuit breaker

### 3.10 Testes atuais

| Área | Cobertura | Cenários críticos sem teste |
|---|---|---|
| Criação de pedido | ✅ 80% | Idempotência (clique duplo), timeout InfinitePay |
| Webhook de pagamento | ✅ (integration) | Webhook com HMAC real, concorrência |
| Atualização de status | ❌ 0% no service | Transições inválidas, notificação WhatsApp |
| Expiração/abandono | ❌ 0% | Job não testado, edge cases de TTL |
| Fila urgente | ❌ 0% | Lógica de SLA mais complexa do sistema |
| Métricas de abandono | ❌ 0% | Cálculo de taxa, edge cases de divisão por zero |
| Recuperação de carrinho | ❌ 0% | Funcionalidade crítica de receita |
| Notificação WhatsApp | ❌ 0% | Retry, falha silenciosa |

---

## 4. Diagnóstico do AS-IS

### 4.1 Pontos fortes

- Circuit breaker + retry na integração com InfinitePay (resiliência real)
- Retry com backoff na Evolution API
- HMAC-SHA256 com timing-safe equal no webhook (segurança correta)
- RBAC granular no admin (11 permissões, 3 roles)
- Idempotência no webhook (não reprocessa pedido já confirmado)
- Timeline de auditoria por pedido (ator + ação + timestamp)
- Validação Zod no controller (entrada tipada)
- Fluxo de expiração + abandono automatizado
- Recovery de checkout no frontend (sessão de 30 min)

### 4.2 Gaps funcionais

- Sem notificação de delay ao cliente ("sua entrega está atrasada")
- Sem estimativa de tempo dinâmica (hardcoded 30 min)
- Sem avaliação de pedido pelo cliente
- Sem re-order ("pedir novamente" com 1 clique)
- Sem recuperação automática de carrinhos abandonados (feature existe na config mas `RECOVERY_ENABLED=false`)
- Sem rastreamento de motoboy em tempo real pelo cliente
- Sem suporte a cupons ou descontos
- Sem agendamento de pedido

### 4.3 Dívidas técnicas

- **`pedido.service.ts` com 1.400+ linhas** — classe Deus com responsabilidades demais
- **N+1 queries** na validação de produtos em `criarPedido()` (loop de `buscarProdutoPorId`)
- **Dois CartContexts duplicados** no frontend (CartContext + CarrinhoContext)
- **`checkout/page.tsx` com 774 linhas** e 11 `useState` separados
- **Throttle de expiração não persistente** — reinício do servidor zera o timer
- **Tempo estimado hardcoded** em 30 minutos — não reflete realidade
- **`aguardandoEntregador` hardcoded** em 0 nas métricas
- **Query SQL raw** misturada com Prisma para tempo médio de preparo
- **Email do cliente sempre vazio** (não existe no schema mas aparece no contrato de resposta)
- **`atualizarEnderecoEntrega()`** não valida se novo bairro é atendido

### 4.4 Riscos de segurança

| Risco | Severidade | Detalhe |
|---|---|---|
| Endpoints cliente sem autenticação | **Crítico** | `GET /pedidos/:id` e `GET /pedidos/cliente/:telefone` expõem dados de qualquer pedido — violação LGPD |
| IDOR em pedidos | **Crítico** | Cliente A pode acessar pedido de cliente B com o ID |
| Sem rate limit em `POST /pedidos` | **Alto** | Cliente pode criar centenas de pedidos por segundo |
| Duplicação de pedido | **Alto** | Sem idempotency key — clique duplo cria 2 pedidos |
| Webhook WhatsApp sem autenticação | **Médio** | Qualquer sistema pode enviar eventos falsos |
| Dados de cliente em logs INFO | **Médio** | Telefone e ID aparecem em logs de nível INFO |
| Sem limite de quantidade por item | **Médio** | Pedido de 999.999 unidades passa validação |

### 4.5 Riscos de produto/UX

- Polling de 30s no acompanhamento: cliente pode esperar até 30s para ver confirmação de pagamento
- Sem feedback visual quando link PIX não é gerado (pedido criado mas cliente não consegue pagar)
- Checkout com campos excessivos (quadra, lote, complemento) gera atrito
- Duplicação de contexto pode causar bugs sutis de estado (carrinho dessincronizado)
- Cliente não sabe que o pedido expirou — só descobre ao tentar acompanhar

### 4.6 Riscos operacionais

- Job de expiração é síncrono e bloqueante — em alta carga pode travar requests
- Throttle de expiração não persistente — após restart, pode processar expiração duas vezes rapidamente
- Se InfinitePay cai, pedido fica "preso" sem link — não há job de reprocessamento
- `pedido.service.ts` com 1.400 linhas dificulta manutenção e onboarding de novos devs
- Sem índice em `statusPagamento` e `pagamentoExpiraEm` — job de expiração faz full scan

### 4.7 Riscos comerciais

- Violação LGPD pelos endpoints sem autenticação (dado pessoal exposto)
- Pedidos sem link PIX = clientes não conseguem pagar = receita perdida silenciosa
- Ausência de avaliação de pedido impede coleta de NPS e social proof
- Sem re-order = fricção desnecessária para clientes recorrentes (principal fonte de receita)
- Tempo estimado falso (30 min fixo) pode criar expectativa errada e cancelamentos

---

## 5. TO-BE — Estado ideal futuro

### 5.1 Visão futura do módulo

O módulo de Pedidos deve ser **seguro por padrão** (autenticação e autorização em todas as rotas), **resiliente a falhas de integração** (reprocessamento automático de pedidos sem link PIX), **observável** (logs estruturados com correlação por pedidoId), e **encantador para o cliente** (tempo real de status via WebSocket, estimativa dinâmica, re-order com 1 clique).

### 5.2 Princípios da solução proposta

- **Segurança por padrão:** toda rota que expõe dado de cliente exige token ou verificação de propriedade
- **Idempotência explícita:** criação de pedido aceita `idempotency-key` para evitar duplicação
- **Falhas visíveis:** InfinitePay fora do ar gera alerta, não silêncio
- **Service enxuto:** quebrar `pedido.service.ts` em domínios (checkout, status, entrega, métricas)
- **Real-time para o cliente:** WebSocket no acompanhamento, sem polling
- **Logs auditáveis:** cada operação crítica com `pedidoId`, `ator`, `de`, `para`, `duração`

### 5.3 Arquitetura TO-BE

```
BACKEND
├── routes/pedido.routes.ts
├── controllers/pedido.controller.ts
│
├── services/
│   ├── pedido/
│   │   ├── pedido.checkout.service.ts   (criarPedido, validações, link PIX)
│   │   ├── pedido.status.service.ts     (transições de status, notificações)
│   │   ├── pedido.entrega.service.ts    (motoboy, endereço, SLA)
│   │   ├── pedido.expiracao.service.ts  (job de expiração/abandono)
│   │   └── pedido.metricas.service.ts   (métricas, fila urgente)
│   ├── infinitepay.service.ts           (inalterado)
│   └── evolution.service.ts             (+ circuit breaker)
│
├── middlewares/
│   ├── clienteAuth.middleware.ts        (NOVO: auth por token ou telefone+OTP)
│   ├── idempotency.middleware.ts        (NOVO: deduplicação por chave)
│   └── pedidoRateLimit.middleware.ts    (NOVO: 5 pedidos/min por IP+telefone)
│
└── jobs/
    └── expiracao.job.ts                 (NOVO: execução agendada persistente)

FRONTEND — Cliente
├── app/checkout/
│   ├── page.tsx                         (orquestra apenas, ~200 linhas)
│   ├── _components/
│   │   ├── EnderecoStep.tsx
│   │   ├── PagamentoStep.tsx
│   │   └── RevisaoStep.tsx
│   └── _hooks/useCheckout.ts            (useReducer para estado unificado)
│
├── app/pedido/[id]/
│   ├── page.tsx                         (WebSocket real-time, sem polling)
│   └── _components/StatusTracker.tsx
│
└── contexts/CartContext.tsx             (unificado, sem duplicação)
```

### 5.4 Fluxo funcional TO-BE

**Criação de pedido:**
1. Cliente finaliza carrinho → frontend envia `POST /api/pedidos` com `Idempotency-Key: {uuid}`
2. Middleware de idempotência verifica se já existe resposta para essa chave — retorna cached se sim
3. Service valida bairro + carrega todos os produtos em **1 query** (batch)
4. Cria pedido em transação atômica — falha total ou sucesso total
5. InfinitePay cria link (circuit breaker + retry)
6. Se InfinitePay falha → job agenda reprocessamento em 2 min, cliente recebe feedback
7. Retorna pedido + link + `expiresAt` (para o cliente exibir countdown)

**Acompanhamento em tempo real:**
1. Cliente abre `/pedido/:id` → frontend conecta via WebSocket autenticado
2. Cada mudança de status emite evento no canal `pedido:{id}`
3. Frontend atualiza status instantaneamente, sem polling
4. Estimativa de tempo é calculada dinamicamente (média de `tempoMedioPreparo` das métricas)

### 5.5 Regras de negócio TO-BE

**Obrigatórias:**
- Toda criação de pedido exige `Idempotency-Key` — rejeita com 409 se chave duplicada
- `POST /pedidos` limitado a 5 req/min por IP+telefone
- `GET /pedidos/:id` exige que o solicitante seja dono do pedido (por token ou telefone)
- Bairro da atualização de endereço deve ser atendido (validar em `atualizarEnderecoEntrega`)

**Condicionais:**
- Se InfinitePay OPEN, informar cliente e oferecer pagamento na entrega como fallback
- Notificação ao cliente quando status muda para CONFIRMADO, SAIU_ENTREGA, ENTREGUE, CANCELADO
- Aviso automático "seu pedido está demorando" se SLA PREPARANDO > 35 min

**Automação:**
- Job persistente (com lock no banco) para expiração/abandono — não depende de memory
- Recovery automático de carrinho abandonado com mensagem WhatsApp após 30 min (opt-in)

### 5.6 Contratos TO-BE

```typescript
// Criação de pedido
POST /api/pedidos
Headers: Idempotency-Key: {uuid}
Body: {
  cliente: { nome, telefone, endereco, bairro, cep? },
  itens: { produtoId, quantidade, observacao? }[],  // min 1, max 20
  observacao?: string   // max 500 chars
}
Response 201: {
  success: true,
  data: { id, numero, status, linkPagamento, expiresAt, total }
}
Response 409: { success: false, error: { code: 'PEDIDO_DUPLICADO' } }

// Acompanhamento — exige header Authorization: Bearer {token} ou X-Cliente-Telefone
GET /api/pedidos/:id
Response 200: { success: true, data: PedidoDetalhe }
Response 401: { success: false, error: { code: 'NAO_AUTENTICADO' } }
Response 403: { success: false, error: { code: 'ACESSO_NEGADO' } }

// Padrão de erro unificado (todos os endpoints)
{
  success: false,
  error: {
    message: string,  // mensagem human-readable
    code: string,     // código machine-readable
    details?: any     // detalhes de validação Zod
  }
}
```

### 5.7 UX/UI TO-BE

**Checkout:**
- Substituir 11 `useState` por `useReducer` com estado unificado
- Extrair etapas em componentes: `<EnderecoStep>`, `<PagamentoStep>`, `<RevisaoStep>`
- Remover campos raramente usados (quadra, lote) da visão padrão → "adicionar detalhes" opcional
- Countdown timer mostrando quanto tempo resta para pagar (TTL de 20 min visível)
- Feedback imediato se InfinitePay falhar ("pagamento PIX temporariamente indisponível")

**Acompanhamento:**
- Atualização de status em tempo real via WebSocket (sem polling de 30s)
- Estimativa de entrega dinâmica baseada em dados reais (tempo médio de preparo + distância)
- Notificação toast quando status muda ("Seu pedido saiu para entrega! 🛵")
- Botão "Pedir Novamente" no estado ENTREGUE — re-order com 1 clique

### 5.8 Segurança TO-BE

| Aspecto | Solução |
|---|---|
| Autenticação cliente | Token JWT de curta duração (1h) gerado no checkout, ou verificação por telefone+SMS |
| Autorização IDOR | Middleware verifica `pedido.clienteTelefone === req.clienteAutenticado.telefone` |
| Rate limit POST /pedidos | 5 req/min por `IP + telefone` (windowMs 60s) |
| Idempotência | Middleware deduplica por `Idempotency-Key` por 5 min |
| Webhook WhatsApp | Validar `X-Hub-Signature` da Evolution API |
| Logs seguros | Não logar telefone em nível INFO — apenas em DEBUG |
| Quantidade máxima | Zod: `quantidade.max(50)`, `itens.max(20)` |

### 5.9 Observabilidade TO-BE

**Logs obrigatórios por operação:**
```typescript
// Criação de pedido
logger.info('pedido.criar.inicio', { telefone: mascarar(tel), bairro, qtdItens })
logger.info('pedido.criar.sucesso', { pedidoId, total, tempoMs })
logger.error('pedido.criar.falha', { motivo, bairro, stack })

// Transição de status
logger.info('pedido.status.transicao', { pedidoId, de: statusAtual, para: novoStatus, ator })

// InfinitePay
logger.info('infinitepay.link.criado', { pedidoId, tempoMs })
logger.warn('infinitepay.link.falha', { pedidoId, tentativa, erro })
logger.warn('infinitepay.circuit.aberto', { falhasConsecutivas })
```

**Métricas a coletar:**
- `pedido.criacao.duracao_ms` — latência do endpoint de criação
- `pedido.criacao.taxa_sucesso` — % que geram link PIX com sucesso
- `pedido.pagamento.taxa_conversao` — % de AGUARDANDO → CONFIRMADO
- `pedido.entrega.tempo_medio_min` — real, calculado por dia
- `pedido.abandono.taxa_percentual` — por dia/semana
- `infinitepay.circuit_breaker.estado` — CLOSED/OPEN/HALF_OPEN
- `evolution.mensagem.taxa_falha` — % de WhatsApps não entregues

### 5.10 Testes TO-BE

| Suite | Prioridade | Cenários |
|---|---|---|
| Unit — `pedido.checkout.service` | P1 | criarPedido com/sem link, N+1 fixo, idempotência |
| Unit — `pedido.status.service` | P1 | todas as transições, transições inválidas, notificação |
| Unit — `pedido.expiracao.service` | P1 | expiração no TTL, abandono após 30 min, edge cases |
| Integration — webhook InfinitePay | P1 | HMAC válido/inválido, idempotência, pedido inexistente |
| Integration — RBAC admin | ✅ feito | 19 testes cobrindo os 3 roles |
| E2E — fluxo completo PIX | P2 | criar → pagar webhook → confirmar → entregar |
| E2E — expiração | P2 | criar → não pagar → expirar → abandonar |
| Security — IDOR | P2 | cliente A não acessa pedido de cliente B |
| Security — rate limit | P2 | 6+ req/min bloqueados com 429 |
| Performance — criação | P3 | 1 query para N produtos (sem N+1) |

---

## 6. Oportunidades de IA e automação

### Quick wins com IA
| Oportunidade | Dor | Como | Impacto | Esforço | Prioridade |
|---|---|---|---|---|---|
| **Mensagem de status personalizada** | WhatsApp genérico, sem personalidade | GPT gera mensagem com nome do cliente e item favorito | Médio | Baixo | Agora |
| **Sugestão de motivo de cancelamento** | Admin digita texto livre → difícil análise posterior | Classificar automaticamente em categorias | Médio | Baixo | Depois |

### Automações simples
| Oportunidade | Dor | Como | Prioridade |
|---|---|---|---|
| **Recovery de carrinho abandonado** | Infraestrutura existe, `RECOVERY_ENABLED=false` | Job envia WhatsApp após 30 min de EXPIRADO com link de recuperação | Agora |
| **Re-order com 1 clique** | Cliente precisa refazer todo o checkout | Endpoint `POST /pedidos/reorder/:id` copia itens do último pedido | Agora |
| **Job de reprocessamento de link PIX** | Pedido criado sem link fica preso | Job varre pedidos `AGUARDANDO_PAGAMENTO` sem `pagamentoId` há > 2 min | Agora |
| **Alerta de pedido sem motoboy** | Pedido em PREPARANDO sem motoboy atribuído fica invisível | Webhook interno: se PREPARANDO > 10 min sem motoboyId → alerta | Depois |

### Automações avançadas
| Oportunidade | Dor | Como | Prioridade |
|---|---|---|---|
| **Estimativa de entrega dinâmica** | Sempre 30 min fixo, gera expectativa errada | Calcular média móvel de `tempoMedioPreparo` + distância bairro | Depois |
| **Detecção de padrão de fraude** | Sem controle de abuso | Flag pedidos com múltiplos clones (mesmo IP, endereço diferente, alto valor) | Futuro |
| **NPS automático** | Sem feedback do cliente | WhatsApp 2h após ENTREGUE com link curto de avaliação (1-5 estrelas) | Depois |

### Ideias que devem ser evitadas agora
- Chatbot de pedido via WhatsApp — complexidade alta, valor incerto antes de ter base sólida
- Predição de demanda por ML — dados insuficientes ainda
- Pagamento parcelado — exige integração bancária diferente, escopo enorme

---

## 7. Matriz impacto x esforço

| Item | Tipo | Impacto | Esforço | Risco | Prioridade |
|---|---|---|---|---|---|
| Autenticação cliente em `GET /pedidos/:id` e `/cliente/:telefone` | Segurança | Alto | Baixo | Crítico | **Agora** |
| Rate limit em `POST /pedidos` | Segurança | Alto | Baixo | Alto | **Agora** |
| Índices em `statusPagamento`, `pagamentoExpiraEm`, `estornoNecessario` | Performance | Alto | Baixo | Médio | **Agora** |
| Idempotency key em criação de pedido | Produto | Alto | Médio | Alto | **Agora** |
| Job de reprocessamento de link PIX falho | Produto | Alto | Médio | Alto | **Agora** |
| Recovery de carrinho abandonado (já existe infra) | Produto | Alto | Baixo | Baixo | **Agora** |
| Corrigir N+1 em validação de produtos | Performance | Médio | Baixo | Médio | **Agora** |
| Re-order com 1 clique | Produto | Alto | Baixo | Baixo | **Agora** |
| Testes unitários para `atualizarStatus` e `processarExpiracoes` | Qualidade | Alto | Médio | Médio | **Agora** |
| Logs estruturados em fluxos críticos | Observabilidade | Alto | Baixo | Baixo | **Agora** |
| WebSocket no acompanhamento (substituir polling 30s) | UX | Médio | Médio | Baixo | **Depois** |
| Quebrar `pedido.service.ts` em sub-services | Técnico | Médio | Alto | Baixo | **Depois** |
| Estimativa de entrega dinâmica | UX | Médio | Médio | Baixo | **Depois** |
| Unificar CartContext + CarrinhoContext | Técnico | Baixo | Baixo | Baixo | **Depois** |
| Checkout refatorado com `useReducer` | Técnico | Baixo | Médio | Baixo | **Depois** |
| Circuit breaker na Evolution API | Resiliência | Médio | Baixo | Médio | **Depois** |
| Job de expiração persistente (lock no DB) | Resiliência | Médio | Médio | Médio | **Depois** |
| NPS automático via WhatsApp | Produto | Alto | Médio | Baixo | **Futuro** |
| Métricas Prometheus / Grafana | Observabilidade | Alto | Alto | Baixo | **Futuro** |
| Rastreamento distribuído (OpenTelemetry) | Observabilidade | Médio | Alto | Baixo | **Futuro** |

---

## 8. Roadmap recomendado

### Fase 1 — Correções críticas (1–2 semanas)
> Objetivo: eliminar riscos de segurança e receita silenciosa perdida

1. **Autenticação em endpoints cliente** — `GET /pedidos/:id` e `GET /pedidos/cliente/:telefone` exigem verificação de propriedade
2. **Rate limit em `POST /pedidos`** — 5 req/min por IP
3. **Idempotência em criação de pedido** — middleware + `Idempotency-Key`
4. **Job de reprocessamento de link PIX** — varre pedidos `AGUARDANDO_PAGAMENTO` sem link há > 2 min
5. **Índices ausentes** — migration Prisma para `statusPagamento`, `pagamentoExpiraEm`, `estornoNecessario`
6. **Corrigir N+1** — `buscarProdutosPorIds([...ids])` em vez de loop

### Fase 2 — Estabilização (2–4 semanas)
> Objetivo: testes dos fluxos críticos e logs auditáveis

7. **Testes unitários** para `atualizarStatus`, `atualizarStatusAdmin`, `processarExpiracoes`
8. **Testes E2E** para fluxo completo PIX e fluxo de expiração
9. **Logs estruturados** em todos os fluxos críticos (com `pedidoId`, `de`, `para`, `tempoMs`)
10. **Validar bairro em `atualizarEnderecoEntrega`**
11. **Unificar CartContext** (eliminar duplicação)

### Fase 3 — Evolução funcional (1–2 meses)
> Objetivo: melhorar experiência do cliente e reduzir churn

12. **Recovery de carrinho abandonado** (ativar `RECOVERY_ENABLED=true` + WhatsApp)
13. **Re-order com 1 clique** (`POST /pedidos/reorder/:id`)
14. **WebSocket no acompanhamento** (substituir polling de 30s)
15. **Estimativa de entrega dinâmica** (média real de `tempoMedioPreparo`)
16. **NPS automático** via WhatsApp 2h após ENTREGUE

### Fase 4 — IA e automação (2–3 meses)
> Objetivo: diferenciais inteligentes

17. **Mensagem de status personalizada** com IA (nome + item favorito)
18. **Classificação automática de motivos de cancelamento**
19. **Circuit breaker na Evolution API**
20. **Job de expiração persistente** com lock no banco

### Fase 5 — Prontidão comercial (3+ meses)
> Objetivo: escala, apresentabilidade e métricas de negócio

21. **Métricas Prometheus + dashboard Grafana** (receita, conversão, tempo médio, abandono)
22. **Rastreamento distribuído** (OpenTelemetry)
23. **Quebrar `pedido.service.ts`** em sub-services por domínio
24. **Testes de carga** no endpoint de criação de pedido

---

## 9. Critérios de aceite

| Critério | Condição de aprovação |
|---|---|
| **Funcional** | Criação → PIX → Confirmação → Preparo → Entrega funciona sem intervenção manual |
| **Funcional** | Cliente não acessa pedido de outro cliente |
| **Funcional** | Pedido duplicado (clique duplo) resulta em 1 pedido, não 2 |
| **Técnico** | `GET /pedidos/:id` retorna 401/403 para quem não é dono |
| **Técnico** | `POST /pedidos` retorna 429 após 5 req/min do mesmo IP |
| **Técnico** | Pedido criado sempre tem link PIX (ou alerta visível de falha) |
| **Segurança** | OWASP Top 10 verificado nos endpoints públicos |
| **Performance** | Criação de pedido com 5 itens < 800ms em P95 |
| **Performance** | Job de expiração não bloqueia requests de cliente |
| **Observabilidade** | Toda transição de status logada com `pedidoId`, `de`, `para`, `ator` |
| **Testes** | Cobertura de linhas ≥ 60% no `pedido.service.ts` |
| **Testes** | Fluxo PIX completo coberto por teste de integração |
| **UX** | Status atualiza em < 3s após mudança no admin (WebSocket) |
| **Comercial** | Módulo aprovado em revisão LGPD (sem dado pessoal exposto sem autenticação) |

---

## 10. Go / No-Go

**Classificação: GO com ressalvas**

**Pode operar em produção desde que:**
1. ✅ RBAC no admin está funcionando
2. ✅ HMAC no webhook está funcionando
3. ✅ Circuit breaker + retry no InfinitePay está funcionando
4. ⚠️ Os endpoints `GET /pedidos/:id` e `GET /pedidos/cliente/:telefone` **não sejam expostos publicamente** até terem autenticação (ou bloquear via nginx/WAF temporariamente)

**O que impede escala:**
- IDOR nos endpoints de cliente — violação LGPD em ambiente com dados reais
- Sem rate limit em criação de pedido — suscetível a abuso
- Pedidos sem link PIX são silenciosos — receita perdida sem alertas
- N+1 queries degradam performance com pedidos de múltiplos itens

**Menor pacote seguro para próxima etapa:**
> Autenticação nos endpoints cliente + rate limit + índices ausentes = 3 itens de baixo esforço que eliminam os maiores riscos imediatamente.

---

## 11. Recomendação final

**Maior risco atual:**
Endpoints `GET /api/pedidos/:id` e `GET /api/pedidos/cliente/:telefone` sem autenticação expõem dados pessoais de todos os clientes — violação direta de LGPD com risco jurídico real.

**Maior oportunidade:**
Recovery de carrinho abandonado — a infraestrutura já existe (`RECOVERY_ENABLED`, `tentativasRecuperacao`, `abandonadoEm`) mas está desligada. Ativar isso com uma mensagem WhatsApp pode recuperar 10–20% de pedidos perdidos sem nenhuma nova feature.

**Primeira ação recomendada:**
Adicionar middleware de autenticação nos 2 endpoints públicos com IDOR + rate limiter em `POST /pedidos` + 3 índices de banco — são 3 itens de 1–2 horas cada que eliminam os riscos críticos imediatamente.

**O que não fazer agora:**
- Não quebrar `pedido.service.ts` antes de ter os testes dos fluxos críticos (risco de regressão)
- Não implementar WebSocket antes de estabilizar os testes de integração
- Não ativar recuperação automática de abandono sem teste do fluxo completo

**Próximo prompt recomendado:**
```
Implemente as correções críticas da Fase 1 do Raio-X do módulo de Pedidos em ordem de prioridade:
1. Autenticação/autorização nos endpoints GET /pedidos/:id e GET /pedidos/cliente/:telefone
2. Rate limit em POST /pedidos (5 req/min por IP)
3. Idempotência em criação de pedido (Idempotency-Key)
4. Migration Prisma com índices ausentes (statusPagamento, pagamentoExpiraEm, estornoNecessario)
5. Corrigir N+1 na validação de produtos
6. Job de reprocessamento para pedidos sem link PIX
```
