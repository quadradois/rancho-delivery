# Alinhamento Objetivo — Fase 1 (Módulo Pedidos)

> Rancho Delivery · Gerado em 02/05/2026

## Objetivo
Executar a Fase 1 com foco em segurança, resiliência e prevenção de perda de receita, com Definition of Done claro para cada item.

## Status de execução
- [x] Tarefa 1 concluída em 02/05/2026: autenticação/autorização de cliente em consultas de pedido (`GET /api/pedidos/:id` com `?token=` ou JWT admin; `GET /api/pedidos/cliente/:telefone` apenas admin).
- [x] Tarefa 2 concluída em 02/05/2026: rate limit de `POST /api/pedidos` ajustado para chave `IP + telefone` com log de bloqueio e mascaramento de telefone.
- [x] Tarefa 3 concluída em 02/05/2026: `Idempotency-Key` obrigatório em `POST /api/pedidos` com retorno `400` (`IDEMPOTENCY_KEY_REQUIRED`) quando ausente, mantendo replay de resposta dentro do TTL.
- [x] Tarefa 4 concluída em 02/05/2026: migration Prisma `20260502100000_add_token_acesso_and_indices` presente e válida com índices `statusPagamento`, `pagamentoExpiraEm`, `estornoNecessario` e composto `(status, criadoEm)`.
- [x] Tarefa 5 concluída em 02/05/2026: validação final da correção N+1 com teste dedicado de deduplicação de `produtoId` e garantia de consulta em lote única (`findMany` chamado 1x).
- [x] Tarefa 6 concluída em 02/05/2026: implementado `reprocessarPedidosSemLink()` no service e acoplado a `sincronizarExpiracoesCheckout()`, com testes unitários de sucesso/falha.

## 1) Autenticação e autorização de cliente
- Decisão: usar `tokenAcesso` por pedido (`GET /api/pedidos/:id?token=...`) e manter bypass apenas para JWT admin.
- Decisão: `GET /api/pedidos/cliente/:telefone` fica somente admin (sem acesso público).

Critérios de aceite:
- Sem token válido: `401`.
- Token válido de outro pedido: `403`.
- Admin com JWT válido: acesso permitido.
- Nenhum endpoint público retorna dado pessoal sem validação.

## 2) Idempotência na criação de pedido
- Decisão: `Idempotency-Key` obrigatória em `POST /api/pedidos`.
- Decisão: chave repetida no TTL retorna a mesma resposta original (não `409`).

Critérios de aceite:
- Mesmo payload + mesma chave: 1 pedido no banco.
- Repetição dentro do TTL: replay `201` com mesmo `pedido.id`.
- Sem header: `400`.

## 3) Rate limit
- Decisão: `5 req/min` por `IP + telefone` em `POST /api/pedidos` (skip em `NODE_ENV=test`).

Critérios de aceite:
- 6ª requisição na janela retorna `429`.
- Logs com motivo e fingerprint mascarado.

## 4) Migration de banco (índices críticos)
- Decisão: adicionar índices em `statusPagamento`, `pagamentoExpiraEm`, `estornoNecessario` e composto `(status, criadoEm)`.

Critérios de aceite:
- Migration aplicada sem downtime lógico.
- Query plans críticos sem full scan para consultas de expiração/métricas.

## 5) Correção de N+1 na validação de produtos
- Decisão: trocar loop por `findMany({ where: { id: { in: ids } } })`.

Critérios de aceite:
- 1 query para carregar produtos do pedido.
- Validação de produto inexistente/indisponível preservada.

## 6) Job de reprocessamento de link PIX
- Decisão: job periódico reprocessa pedidos `AGUARDANDO_PAGAMENTO` sem `pagamentoId` após 2 minutos.

Critérios de aceite:
- Pedido sem link é reenfileirado automaticamente.
- Tentativas logadas com `pedidoId` e resultado.
- Execução idempotente (sem gerar links duplicados para o mesmo pedido).

## 7) Testes mínimos obrigatórios
Integração:
- IDOR bloqueado.
- `GET /pedidos/:id` com token válido/inválido.
- Rate limit com `429`.
- Idempotência em duplo submit.

Unitários:
- Reprocessamento PIX (sucesso/falha).
- Batch de produtos com item inválido.

## 8) Ordem de execução recomendada
1. Migration de índices.
2. Auth + IDOR.
3. Rate limit.
4. Idempotência.
5. N+1.
6. Job PIX.
7. Testes + hardening final.

## Resultado esperado da Fase 1
- Exposição de dados de pedidos mitigada.
- Criação de pedidos protegida contra abuso e duplicação.
- Consultas críticas mais performáticas.
- Pedidos sem link PIX recuperados automaticamente.
- Base segura para avançar à Fase 2 (estabilização).

---

## Status de execução — Fase 2 (Estabilização)

- [x] Item 2 concluído em 02/05/2026: cobertura unitária crítica ampliada no `pedido.service` para `atualizarStatus()`, `atualizarStatusAdmin()`, `processarExpiracoesEAbandonos()` e `obterFilaUrgente()`.
- [x] Item 3 concluído em 02/05/2026: integração do fluxo PIX reforçada (`pedido.integration` + `webhook.integration`) incluindo cenário de idempotência de criação e confirmação por webhook.
- [x] Item 4 concluído em 02/05/2026: logs estruturados adicionados em fluxos críticos (`pedido.criar.inicio`, `pedido.criar.sucesso`, `pedido.status.transicao`, `infinitepay.link.criado`, `infinitepay.link.falha`).
- [x] Item 5 concluído em 02/05/2026: `atualizarEnderecoEntrega()` agora valida bairro atendido e recalcula `taxaEntrega`; controller mapeia `BAIRRO_NAO_ATENDIDO` para `400`.
- [x] Item 6 concluído em 02/05/2026: unificação de contexto do carrinho realizada, mantendo `CartContext` como fonte única e `CarrinhoContext` como camada de compatibilidade (sem lógica duplicada).

### Validação executada (Fase 2)
- Backend: `78` testes passando (`pedido.service`, `admin.pedido.controller`, `pedido.integration`, `webhook.integration`).
- Frontend (carrinho): `42` testes passando (`useCarrinho` + `CartContext`).

---

## Status de execução — Fase 3 (Evolução funcional)

- [x] Item 7 concluído em 02/05/2026: recovery de carrinho abandonado implementado no backend com `RECOVERY_ENABLED`, envio WhatsApp e controle por `tentativasRecuperacao`.
- [x] Item 8 concluído em 02/05/2026: re-order implementado em `POST /api/pedidos/reorder/:id` com validação de acesso por token/JWT e botão "Pedir novamente" no acompanhamento.
- [x] Item 9 concluído em 02/05/2026: acompanhamento em tempo real no cliente implementado com stream SSE autenticado (`GET /api/pedidos/:id/eventos`) substituindo polling fixo como canal primário.
- [x] Item 10 concluído em 02/05/2026: estimativa de entrega dinâmica implementada via média real de preparo dos últimos 7 dias + ajuste por etapa de status.
- [x] Item 11 concluído em 02/05/2026: NPS automático pós-entrega implementado (`NPS_ENABLED`, `NPS_DELAY_MINUTES`) + endpoint de registro `POST /api/pedidos/:id/nps`.

### Validação executada (Fase 3)
- Prisma Client regenerado com novos campos de NPS.
- Backend: `46` testes passando nas suítes impactadas (`pedido.service`, `pedido.controller`, `pedido.integration`).
- Frontend: `42` testes passando nas suítes de carrinho após mudanças de compatibilidade.
