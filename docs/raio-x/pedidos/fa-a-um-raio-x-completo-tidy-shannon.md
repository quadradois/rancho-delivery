# Status geral do projeto — Rancho Delivery

## O que já foi feito

### Raio-X /admin/pedidos (completo ✅)
- R10: TypeScript fix (`ator: string` em `registrarTimeline`)
- R9: Validação Zod em todos os endpoints do admin controller
- R8: `page.tsx` (1333→1145 linhas) quebrado em 5 componentes (`CockpitHeader`, `MetricasBar`, `FiltrosBusca`, `ListaPedidos`, `ModalCancelar`, `_utils.ts`)
- Env vars operacionais: `JWT_EXPIRES_IN=12h`, `JWT_SECRET` rotacionado, `WHATSAPP_DONO`, `ADMIN_ROLE`
- Testes E2E: webhook InfinitePay (8 testes) + RBAC admin (19 testes)

### Raio-X PEDIDOS — Fase 1 (completo ✅)
- IDOR/LGPD: `tokenAcesso` (32 bytes hex) gerado na criação; `GET /pedidos/:id` exige `?token=` ou JWT admin; `GET /pedidos/cliente/:telefone` requer JWT admin
- Rate limit: `pedidoLimiter` 5 req/min por IP em `POST /pedidos` (skip em `NODE_ENV=test`)
- Idempotência: middleware `Idempotency-Key` com TTL 10min (in-memory Map)
- Migration Prisma: campo `tokenAcesso` + 5 índices (`statusPagamento`, `pagamentoExpiraEm`, `estornoNecessario`, `(status, criadoEm)`, `token_acesso` unique)
- N+1 fix: `criarPedido()` usa `prisma.produto.findMany({ where: { id: { in: ids } } })` em vez de loop
- 160 testes passando; thresholds atualizados (`lines: 42`, `branches: 75`, `functions: 34`)

---

## O que ainda falta (por fase e prioridade)

### Fase 1 — Item pendente
1. **Job de reprocessamento de link PIX** — pedidos `AGUARDANDO_PAGAMENTO` sem `pagamentoId` há > 2 min ficam presos sem link. Implementar varredura periódica que chama `infinitePayService.criarLinkPagamento()` novamente.
   - Arquivo de destino: `apps/backend/src/services/pedido.service.ts` (método `reprocessarPedidosSemLink`)
   - Acionado via `sincronizarExpiracoesCheckout()` (já chamado periodicamente)

### Fase 2 — Estabilização (próximas 2–4 semanas)
2. **Testes unitários críticos com 0% de cobertura** — `atualizarStatus()`, `atualizarStatusAdmin()`, `processarExpiracoes()`, `obterFilaUrgente()`
3. **Testes E2E** — fluxo completo PIX (criar → webhook → confirmar → entregar) e fluxo de expiração
4. **Logs estruturados** — adicionar `logger.info('pedido.criar.inicio', ...)`, `logger.info('pedido.status.transicao', { pedidoId, de, para, ator, tempoMs })` nos fluxos críticos
5. **Validar bairro em `atualizarEnderecoEntrega()`** — atualmente aceita bairro não atendido sem recalcular taxa
6. **Unificar CartContext** — remover `CarrinhoContext.tsx` (duplicado em português), manter apenas `CartContext.tsx`

### Fase 3 — Evolução funcional (1–2 meses)
7. **Recovery de carrinho abandonado** — infraestrutura existe (`RECOVERY_ENABLED=false`); ativar e conectar ao WhatsApp
8. **Re-order com 1 clique** — `POST /api/pedidos/reorder/:id` copia itens do último pedido
9. **WebSocket no acompanhamento** — substituir polling de 30s em `/pedido/[id]` por conexão WebSocket
10. **Estimativa de entrega dinâmica** — substituir hardcoded 30 min por média real de `tempoMedioPreparo`
11. **NPS automático** — WhatsApp 2h após ENTREGUE com link de avaliação 1–5 estrelas

### Fase 4 — IA e diferenciais (2–3 meses)
12. **Mensagem de status personalizada com IA** — nome + item favorito no WhatsApp
13. **Circuit breaker na Evolution API** — hoje só tem retry sem circuit breaker
14. **Job de expiração persistente** — lock no banco para sobreviver a restarts
15. **Métricas Prometheus/Grafana**

---

## Próximo passo recomendado
Implementar o **job de reprocessamento de link PIX** (Fase 1 pendente) — único risco de receita silenciosa ainda em aberto. Em seguida, atacar os testes críticos com 0% de cobertura (Fase 2, item 2).

