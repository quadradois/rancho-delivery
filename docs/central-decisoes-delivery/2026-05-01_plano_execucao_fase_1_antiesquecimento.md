# Plano de Execucao — Fase 1 Antiesquecimento

**Data:** 2026-05-01  
**Demanda:** Central de Decisoes para Operacao de Delivery  
**Fase:** Planejamento pre-implementacao  
**Objetivo da fase:** impedir que pedido, cliente, pagamento ou estorno critico fiquem invisiveis.

---

## 1. Resultado esperado da Fase 1

Ao final desta fase, o dono/operador deve abrir a central e enxergar imediatamente:

- Pedido pago esperando confirmacao.
- Cliente aguardando resposta.
- Pedido em preparo atrasado.
- Pedido pronto/sem entregador.
- Estorno pendente.
- WhatsApp indisponivel.

Cada item deve ter motivo, severidade, tempo pendente e proxima acao.

---

## 2. Ordem de execucao recomendada

### P0 — Preparacao

- [ ] Validar nomenclatura final: `Central de Decisoes`, `Fila de Decisoes`, `AlertaOperacional`.
- [ ] Confirmar se a tela sera `/admin/decisoes` ou entrada principal em `/admin/pedidos`.
- [ ] Revisar credenciais e ambiente de staging/producao antes de migrations.

### P1 — Banco de dados

- [ ] Criar enums: `TipoAlertaOperacional`, `SeveridadeAlerta`, `StatusAlerta`, `AcaoRecomendada`.
- [ ] Criar model `AlertaOperacional`.
- [ ] Criar migration Prisma.
- [ ] Rodar migration em ambiente controlado.
- [ ] Validar indices.

### P2 — Service de decisoes

- [ ] Criar `apps/backend/src/services/decisao.service.ts`.
- [ ] Implementar `criarOuAtualizarAlerta`.
- [ ] Implementar deduplicacao por `dedupeKey`.
- [ ] Implementar `resolverAlerta`.
- [ ] Implementar `avaliarPedido`.
- [ ] Implementar `avaliarMensagensCliente`.
- [ ] Implementar `recalcularAbertos`.

### P3 — Regras MVP

- [ ] Regra: pedido pago sem confirmacao.
- [ ] Regra: cliente sem resposta.
- [ ] Regra: preparo atrasado.
- [ ] Regra: pedido sem entregador.
- [ ] Regra: estorno necessario.
- [ ] Regra: WhatsApp indisponivel/falha envio.

### P4 — Integracao com fluxo atual

- [ ] Chamar avaliacao apos webhook de pagamento confirmado.
- [ ] Chamar avaliacao apos mudanca de status.
- [ ] Chamar avaliacao apos mensagem recebida.
- [ ] Resolver alerta de cliente sem resposta apos resposta do operador.
- [ ] Resolver alerta de estorno apos marcar estorno.
- [ ] Emitir eventos SSE de decisao.

### P5 — APIs

- [ ] Criar `admin.decisao.controller.ts`.
- [ ] Criar `admin.decisao.routes.ts`.
- [ ] Registrar rotas em `/api/admin/decisoes`.
- [ ] Implementar `GET /api/admin/decisoes`.
- [ ] Implementar `GET /api/admin/decisoes/metricas`.
- [ ] Implementar `PATCH /api/admin/decisoes/:id/status`.
- [ ] Implementar `PATCH /api/admin/decisoes/:id/resolver`.
- [ ] Implementar `POST /api/admin/decisoes/recalcular`.

### P6 — Frontend MVP

- [ ] Criar pagina `/admin/decisoes`.
- [ ] Adicionar item na sidebar.
- [ ] Criar types no `api.ts`.
- [ ] Criar service frontend `adminDecisoes`.
- [ ] Criar fila de decisoes.
- [ ] Criar painel de detalhe.
- [ ] Criar cards por severidade.
- [ ] Criar acoes diretas iniciais.
- [ ] Integrar SSE.
- [ ] Garantir fallback de polling.

### P7 — Testes

- [ ] Testes unitarios do `decisao.service`.
- [ ] Teste de deduplicacao.
- [ ] Teste de resolucao automatica.
- [ ] Teste de endpoint listar decisoes.
- [ ] Teste manual de alta demanda simulada.

### P8 — Deploy controlado

- [ ] Build backend/frontend.
- [ ] Rodar migration.
- [ ] Reload PM2.
- [ ] Validar `/api/admin/decisoes`.
- [ ] Validar tela admin.
- [ ] Monitorar logs.

---

## 3. Sequencia tecnica detalhada

### Passo 1 — Migration sem comportamento novo

Criar apenas schema e migration. Nao alterar fluxo de pedido ainda.

Risco: baixo.  
Rollback: remover uso antes de dropar tabela, se necessario.

### Passo 2 — Service isolado

Criar `decisao.service.ts` com testes unitarios. O service pode ser testado chamando metodos diretos sem expor API inicialmente.

Risco: baixo.  
Valor: valida regra de negocio antes da tela.

### Passo 3 — Integrar regras com pontos existentes

Pontos de integracao:

- `pedido.service.ts` ao confirmar pagamento.
- `pedido.service.ts` ao atualizar status admin.
- `cliente.service.ts` ao registrar mensagem recebida.
- `cliente.service.ts` ao enviar mensagem humana.
- `admin.cliente.controller.ts` ou service de WhatsApp em falha.

Risco: medio.  
Mitigacao: feature flag ou service tolerante a falhas, sem bloquear pedido se criacao de alerta falhar.

### Passo 4 — API e SSE

Expor fila e metricas. Emitir eventos quando alerta for criado, atualizado ou resolvido.

Risco: medio.  
Mitigacao: manter polling no frontend como fallback.

### Passo 5 — Tela `/admin/decisoes`

Criar a tela sem remover `/admin/pedidos`. O operador pode validar a nova central em paralelo.

Risco: baixo.  
Valor: reduz chance de quebrar fluxo atual.

---

## 4. Regras de prioridade para implementacao

Implementar nesta ordem:

1. Pedido pago sem confirmacao.
2. Cliente sem resposta.
3. Estorno necessario.
4. Preparo atrasado.
5. Pedido sem entregador.
6. WhatsApp indisponivel.

Motivo: as tres primeiras regras evitam perda financeira e cliente esquecido. As demais melhoram controle de SLA e operacao.

---

## 5. Criterios de pronto por etapa

### Banco pronto

- Migration criada.
- Prisma client gerado.
- Tabela consultavel.
- Indices aplicados.

### Service pronto

- Cria alerta com `dedupeKey`.
- Nao duplica alerta aberto.
- Atualiza severidade se necessario.
- Resolve alerta.
- Tem testes.

### API pronta

- Lista alertas ordenados.
- Filtra por status/severidade/tipo.
- Resolve alerta.
- Recalcula alertas.
- Usa autenticacao admin.

### Frontend pronto

- Mostra fila.
- Mostra detalhe.
- Atualiza em tempo real.
- Permite resolver alerta.
- Mantem estado visual sem reload/piscar.
- Exibe vazio, loading e erro.

---

## 6. Plano de teste operacional

### Cenario 1 — Pedido pago sem confirmacao

1. Criar pedido em `AGUARDANDO_PAGAMENTO`.
2. Marcar `statusPagamento = CONFIRMADO`.
3. Rodar avaliacao.
4. Esperado: alerta critico aparece.
5. Confirmar pedido.
6. Esperado: alerta resolvido.

### Cenario 2 — Cliente sem resposta

1. Registrar mensagem humana nao lida.
2. Simular tempo acima de 2 minutos.
3. Rodar avaliacao.
4. Esperado: alerta de atencao aparece.
5. Enviar resposta humana.
6. Esperado: alerta resolvido.

### Cenario 3 — Estorno necessario

1. Criar pedido pago.
2. Cancelar pedido.
3. Esperado: `estornoNecessario = true`.
4. Rodar avaliacao.
5. Esperado: alerta critico.
6. Marcar estorno.
7. Esperado: alerta resolvido.

### Cenario 4 — Preparo atrasado

1. Pedido em `PREPARANDO`.
2. Ajustar `statusMudouEm` para tempo acima do SLA.
3. Rodar avaliacao.
4. Esperado: alerta de atraso.

### Cenario 5 — Tempo real

1. Criar alerta.
2. Tela aberta em `/admin/decisoes`.
3. Esperado: novo alerta aparece sem reload.

---

## 7. Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Alertas duplicados | Operacao perde confianca | `dedupeKey` unica |
| Alertas demais | Vira ruido | Comecar com poucas regras criticas |
| Service de alerta quebra fluxo de pedido | Alto | `try/catch` e log; alerta nao bloqueia pedido |
| Tela vira outra lista de pedidos | Medio | Card deve mostrar motivo e proxima acao |
| SSE falha | Medio | Fallback de polling |
| SLA errado | Medio | Comecar com valores simples e ajustar por operacao |

---

## 8. Entrega recomendada da primeira PR

Primeira PR deve conter somente backend fundacional:

- Schema `AlertaOperacional`.
- Migration.
- `decisao.service.ts`.
- Testes unitarios das regras.
- Nenhuma mudanca visual.

Essa PR reduz risco e permite revisar a inteligencia operacional antes de colocar na mao do operador.

---

## 9. Entrega recomendada da segunda PR

Segunda PR:

- Controller/rotas `/api/admin/decisoes`.
- Eventos SSE.
- Testes de API.

---

## 10. Entrega recomendada da terceira PR

Terceira PR:

- Tela `/admin/decisoes`.
- Sidebar.
- Fila de decisoes.
- Painel de detalhe.
- Integracao com tempo real.

---

## 11. Decisao final antes de implementar

Antes da primeira linha de codigo, confirmar apenas uma decisao de produto:

> A Central de Decisoes sera uma nova rota `/admin/decisoes` inicialmente, mantendo `/admin/pedidos` como cockpit atual.

Recomendacao: sim. Isso permite testar a nova experiencia sem interromper a operacao atual.
