# Plano de Execucao Tecnico P0 - `/admin/pedidos`

**Data:** 2026-05-03  
**Modulo:** `/admin/pedidos`  
**Tipo:** Plano tecnico pre-implementacao  
**Status:** Pronto para virar backlog tecnico P0  

**Arquivos base:**

- `docs/raio-x/Raio X Operacional/raio-x-funcional-produto-admin-pedidos.md`
- `docs/raio-x/Raio X Operacional/2026-05-02_especificacao_p0_p1_admin_pedidos.md`
- `docs/raio-x/Raio X Operacional/2026-05-02_decisoes_tecnicas_p0_admin_pedidos.md`

**Observacao:** analise feita apenas por leitura estatica do codigo. Nenhum arquivo de produto foi alterado durante a elaboracao deste plano.

---

## 1. Mapa de arquivos provavelmente impactados

### Banco / Prisma

- `apps/backend/prisma/schema.prisma`
  - Modelo `Pedido`
  - Enum `StatusPagamento`
  - Novo enum `FormaPagamentoPedido`
  - Novo enum `TipoAtendimentoPedido`
- `apps/backend/prisma/migrations/*`
  - Nova migration aditiva para campos e enums P0.

### Backend

- `apps/backend/src/services/pedido.service.ts`
  - Criacao de pedido
  - Status
  - Cancelamento
  - Expiracao
  - Reprocessamento Pix
  - Metricas
  - Fila urgente
- `apps/backend/src/controllers/pedido.controller.ts`
  - Validacao do `POST /api/pedidos`
- `apps/backend/src/controllers/admin.pedido.controller.ts`
  - Pedido manual
  - Status
  - Cancelamento
  - Estorno
- `apps/backend/src/controllers/webhook.controller.ts`
  - Confirmacao Pix via InfinitePay
- `apps/backend/src/services/evolution.service.ts`
  - Mensagens automaticas e resumo operacional do pedido

### Frontend

- `apps/frontend/src/app/checkout/page.tsx`
  - Coleta forma de pagamento, mas ainda nao envia no payload.
- `apps/frontend/src/lib/api.ts`
  - Tipos de criacao, lista e detalhe admin.
- `apps/frontend/src/types/domain.types.ts`
  - Tipos de dominio usados no frontend.
- `packages/shared/src/types.ts`
  - Tipos compartilhados.
- `apps/frontend/src/app/admin/pedidos/page.tsx`
  - Avanco de status
  - Ticket operacional
  - Cancelamento
  - Pedido manual
- `apps/frontend/src/app/admin/pedidos/_components/_utils.ts`
  - Labels, fluxo, badge de pagamento.
- `apps/frontend/src/app/admin/pedidos/_components/ListaPedidos.tsx`
  - Badge financeiro e botao confirmar.
- `apps/frontend/src/components/crm/ModalPedidoManual.tsx`
  - Pagamento manual.
- `apps/frontend/src/app/admin/pedidos/_components/ModalCancelar.tsx`
  - Estorno e cancelamento.
- `apps/frontend/src/app/pedido/[id]/page.tsx`
  - Acompanhamento do cliente.

### Testes

- `apps/backend/src/__tests__/services/pedido.service.test.ts`
- `apps/backend/src/__tests__/controllers/pedido.controller.test.ts`
- `apps/backend/src/__tests__/controllers/admin.pedido.controller.test.ts`
- `apps/backend/src/__tests__/integration/pedido.integration.test.ts`
- `apps/backend/src/__tests__/integration/admin.rbac.integration.test.ts`
- `apps/frontend/src/__tests__/schemas/checkoutSchema.test.ts`

---

## 2. Estado atual encontrado no codigo

- `StatusPagamento` possui apenas:
  - `PENDENTE`
  - `CONFIRMADO`
  - `EXPIRADO`
- `Pedido` nao possui:
  - `formaPagamento`
  - `trocoPara`
  - `tipoAtendimento`
- O checkout exibe Pix, dinheiro, cartao credito e cartao debito, mas o payload enviado ao backend nao inclui pagamento.
- O backend cria todo pedido publico como:
  - `status = AGUARDANDO_PAGAMENTO`
  - `statusPagamento = PENDENTE`
- Todo pedido publico tenta gerar link InfinitePay.
- Pedido manual aceita apenas `PIX` e `DINHEIRO`.
- Pedido manual em dinheiro e marcado como `statusPagamento = CONFIRMADO`, o que e financeiramente incorreto.
- O admin usa o label antigo "Aprovacao" para `CONFIRMADO`.
- O botao principal ainda e generico: "Avancar status".
- Observacoes de pedido e item existem no backend, mas nao aparecem no ticket principal do admin.
- Reprocessamento Pix busca pedidos `AGUARDANDO_PAGAMENTO` sem `pagamentoId`; se o P0 nao filtrar por `formaPagamento = PIX`, pode gerar link Pix indevido para dinheiro/cartao.

---

## 3. Lacunas entre codigo atual e especificacao P0

- Falta persistencia real da forma de pagamento.
- Falta `StatusPagamento.A_RECEBER` para dinheiro/cartao na entrega.
- Falta validacao de `trocoPara >= total`.
- Falta impedir InfinitePay para dinheiro/cartao.
- Falta `tipoAtendimento = ENTREGA` como base tecnica.
- Falta atualizar contratos de lista/detalhe admin com:
  - `formaPagamento`
  - `trocoPara`
  - `tipoAtendimento`
  - `pagamentoResumo`
  - `proximaAcao`
- Falta CTA contextual e bloqueio claro por motivo.
- Falta confirmacao para entregar, cancelar e marcar estorno.
- Falta bloqueio de cancelamento em status finais.
- Falta exibicao operacional de observacoes no painel principal.

---

## 4. Ordem recomendada de implementacao

| Ordem | Etapa | Objetivo |
|---|---|---|
| 1 | Migration, schema e tipos | Criar base segura sem mudar comportamento visual |
| 2 | Backend de criacao de pedido | Separar Pix de dinheiro/cartao |
| 3 | Backend admin, status e cancelamento | Proteger regras P0 no servidor |
| 4 | Contratos admin | Expor resumo operacional para UI |
| 5 | Checkout | Enviar pagamento real e ajustar botao/redirecionamento |
| 6 | Admin UI | Ticket, labels, CTAs, observacoes e confirmacoes |
| 7 | Testes | Cobrir Pix, dinheiro, cartao, troco e bloqueios |

---

## 5. Migrations necessarias

### Alterar enum existente

- Adicionar `A_RECEBER` em `StatusPagamento`.

### Criar enum `FormaPagamentoPedido`

Valores:

- `PIX`
- `DINHEIRO`
- `CARTAO_CREDITO`
- `CARTAO_DEBITO`

### Criar enum `TipoAtendimentoPedido`

Valores:

- `ENTREGA`
- `RETIRADA`
- `CONSUMO_LOCAL`

### Adicionar campos em `Pedido`

- `formaPagamento FormaPagamentoPedido NOT NULL DEFAULT 'PIX'`
- `trocoPara Decimal? @db.Decimal(10, 2)`
- `tipoAtendimento TipoAtendimentoPedido NOT NULL DEFAULT 'ENTREGA'`

### Regras de compatibilidade

- Pedidos antigos devem assumir `formaPagamento = PIX`.
- Pedidos antigos devem assumir `tipoAtendimento = ENTREGA`.
- `trocoPara` deve ser nullable.
- Nao tentar inferir dinheiro/cartao em pedidos antigos sem evidencias confiaveis.

---

## 6. Enums e modelos que precisam mudar

### Backend Prisma

- `StatusPagamento`
  - Adicionar `A_RECEBER`.
- `Pedido`
  - Adicionar `formaPagamento`.
  - Adicionar `trocoPara`.
  - Adicionar `tipoAtendimento`.
- Novo enum `FormaPagamentoPedido`.
- Novo enum `TipoAtendimentoPedido`.

### Frontend e shared

- Atualizar status financeiro para aceitar:
  - `PENDENTE`
  - `CONFIRMADO`
  - `A_RECEBER`
  - `EXPIRADO`
- Atualizar DTO de criacao de pedido com:
  - `pagamento.forma`
  - `pagamento.trocoPara`
  - `tipoAtendimento`
- Atualizar tipos de lista e detalhe admin com novos campos financeiros e operacionais.

---

## 7. APIs e endpoints que precisam mudar

### `POST /api/pedidos`

Deve aceitar:

```json
{
  "pagamento": {
    "forma": "DINHEIRO",
    "trocoPara": 100
  },
  "tipoAtendimento": "ENTREGA"
}
```

Regras:

- Payload antigo sem `pagamento` deve continuar aceito como Pix.
- Pix gera link InfinitePay.
- Dinheiro/cartao nao gera link InfinitePay.
- Dinheiro/cartao inicia com `statusPagamento = A_RECEBER`.
- `trocoPara` so vale para dinheiro.
- `trocoPara` menor que total deve retornar erro de validacao.

### `GET /api/pedidos/:id`

Deve retornar:

- `formaPagamento`
- `trocoPara`
- `tipoAtendimento`
- `statusPagamento`

### `GET /api/admin/pedidos`

Deve retornar na lista:

- `formaPagamento`
- `trocoPara`
- `tipoAtendimento`
- `statusOperacionalLabel`
- `pagamentoResumo`
- `proximaAcao`

### `GET /api/admin/pedidos/:id`

Deve retornar no detalhe:

- `formaPagamento`
- `trocoPara`
- `trocoCalculado`
- `tipoAtendimento`
- `pagamentoResumo`
- `observacoesCriticas`
- `proximaAcao`

### `POST /api/admin/pedidos/manual`

Deve aceitar:

- `PIX`
- `DINHEIRO`
- `CARTAO_CREDITO`
- `CARTAO_DEBITO`

### `PATCH /api/admin/pedidos/:id/status`

Deve manter bloqueios no backend e permitir preparo quando:

- Pix estiver `CONFIRMADO`.
- Dinheiro/cartao estiver `A_RECEBER`.

### `POST /api/admin/pedidos/:id/cancelar`

Deve:

- Exigir motivo.
- Bloquear status finais.
- Tratar `A_RECEBER` sem estorno.
- Manter estorno apenas para `statusPagamento = CONFIRMADO`.

### `PATCH /api/admin/pedidos/:id/estorno`

Deve continuar permitido apenas para:

- Pedido `CANCELADO`.
- `estornoNecessario = true`.

---

## 8. Services que precisam mudar

### `pedidoService.criarPedido`

Novo comportamento:

- Se `pagamento.forma = PIX`:
  - `status = AGUARDANDO_PAGAMENTO`
  - `statusPagamento = PENDENTE`
  - gerar link InfinitePay
  - definir `pagamentoExpiraEm`
- Se `pagamento.forma = DINHEIRO`:
  - `status = CONFIRMADO`
  - `statusPagamento = A_RECEBER`
  - persistir `trocoPara`
  - nao gerar link InfinitePay
- Se `pagamento.forma = CARTAO_CREDITO` ou `CARTAO_DEBITO`:
  - `status = CONFIRMADO`
  - `statusPagamento = A_RECEBER`
  - nao gerar link InfinitePay
  - exibir "cobrar na entrega" no admin

### `pedidoService.criarPedidoManual`

- Parar de marcar dinheiro como `CONFIRMADO` financeiro.
- Usar `A_RECEBER` para dinheiro/cartao.
- Suportar cartao credito e cartao debito.

### `pedidoService.reprocessarPedidosSemLink`

- Filtrar somente:
  - `formaPagamento = PIX`
  - `statusPagamento = PENDENTE`
  - `status = AGUARDANDO_PAGAMENTO`
  - `pagamentoId = null`

### `pedidoService.processarExpiracoesEAbandonos`

- Expirar apenas pedidos Pix pendentes.
- Ignorar pedidos dinheiro/cartao com `A_RECEBER`.

### `pedidoService.atualizarStatusAdmin`

- Permitir avanco de pedido dinheiro/cartao com `A_RECEBER`.
- Bloquear status finais.
- Registrar timeline.

### `pedidoService.cancelarPedidoAdmin`

- Bloquear cancelamento normal para:
  - `ENTREGUE`
  - `CANCELADO`
  - `EXPIRADO`
  - `ABANDONADO`
- Para `A_RECEBER`, cancelar sem marcar estorno.
- Para `CONFIRMADO`, manter `estornoNecessario = true`.

### `pedidoService.obterMetricasAdmin`

- Separar pagamento Pix pendente de cobranca na entrega.
- Evitar tratar `A_RECEBER` como pagamento confirmado.

### `pedidoService.obterFilaUrgente`

- Nao classificar `A_RECEBER` como pagamento travado.
- Destacar Pix pendente separado de pedido aguardando preparo.

---

## 9. Telas e componentes que precisam mudar

### Checkout

Arquivo principal:

- `apps/frontend/src/app/checkout/page.tsx`

Mudancas P0:

- Enviar `pagamento.forma`.
- Enviar `pagamento.trocoPara`.
- Enviar `tipoAtendimento = ENTREGA`.
- Validar dinheiro com `trocoPara >= total`, quando informado.
- Botao final:
  - Pix: "Confirmar e pagar"
  - Dinheiro/cartao: "Confirmar pedido"
- Dinheiro/cartao nao devem redirecionar para gateway.

### Admin lista

Arquivos:

- `apps/frontend/src/app/admin/pedidos/_components/ListaPedidos.tsx`
- `apps/frontend/src/app/admin/pedidos/_components/_utils.ts`

Mudancas P0:

- Exibir forma de pagamento.
- Exibir badge `A_RECEBER`.
- Permitir confirmar pedido com dinheiro/cartao sem exigir `statusPagamento = CONFIRMADO`.
- Label de `CONFIRMADO`: "Aguardando preparo".

### Admin detalhe / ticket operacional

Arquivo:

- `apps/frontend/src/app/admin/pedidos/page.tsx`

Mudancas P0:

- Mostrar observacao geral no painel principal.
- Mostrar observacao por item junto ao item.
- Mostrar forma de pagamento, status financeiro, troco e total.
- Mostrar `tipoAtendimento`.
- Trocar "Avancar status" por CTA contextual:
  - `AGUARDANDO_PAGAMENTO` com Pix confirmado: "Aceitar pedido"
  - `CONFIRMADO`: "Iniciar preparo"
  - `PREPARANDO`: "Enviar para entrega"
  - `SAIU_ENTREGA`: "Marcar entregue"
- Mostrar motivo de bloqueio quando acao estiver indisponivel.
- Confirmar acoes sensiveis.

### Pedido manual

Arquivo:

- `apps/frontend/src/components/crm/ModalPedidoManual.tsx`

Mudancas P0:

- Adicionar cartao credito.
- Adicionar cartao debito.
- Persistir troco para dinheiro.
- Enviar forma de pagamento no contrato novo.

### Cancelamento e estorno

Arquivo:

- `apps/frontend/src/app/admin/pedidos/_components/ModalCancelar.tsx`

Mudancas P0:

- Bloquear cancelamento de status finais.
- Exigir confirmacao explicita.
- Diferenciar pedido pago de pedido `A_RECEBER`.
- Confirmar antes de marcar estorno realizado.

### Pagina de acompanhamento do cliente

Arquivo:

- `apps/frontend/src/app/pedido/[id]/page.tsx`

Mudancas P0:

- Mostrar forma de pagamento correta.
- Mostrar troco quando houver.
- Evitar mensagem "esta sendo preparado" se o pedido ainda nao entrou em preparo.

---

## 10. Testes que devem ser criados ou ajustados

### Backend - service

Arquivo:

- `apps/backend/src/__tests__/services/pedido.service.test.ts`

Casos P0:

- Criar pedido Pix gera link e fica `statusPagamento = PENDENTE`.
- Criar pedido dinheiro nao gera Pix e fica `statusPagamento = A_RECEBER`.
- Criar pedido cartao credito nao gera Pix e fica `statusPagamento = A_RECEBER`.
- Criar pedido cartao debito nao gera Pix e fica `statusPagamento = A_RECEBER`.
- Rejeitar dinheiro com `trocoPara < total`.
- Reprocessamento Pix ignora pedidos `A_RECEBER`.
- Expiracao ignora pedidos `A_RECEBER`.
- Cancelamento de `A_RECEBER` nao gera estorno.
- Status final nao permite cancelamento comum.

### Backend - controllers

Arquivos:

- `apps/backend/src/__tests__/controllers/pedido.controller.test.ts`
- `apps/backend/src/__tests__/controllers/admin.pedido.controller.test.ts`

Casos P0:

- `POST /api/pedidos` aceita payload com `pagamento`.
- Payload antigo sem `pagamento` continua funcionando como Pix.
- Pedido manual aceita dinheiro/cartao.
- Cancelamento sem motivo continua rejeitado.
- Estorno invalido continua retornando erro.

### Backend - integracao

Arquivos:

- `apps/backend/src/__tests__/integration/pedido.integration.test.ts`
- `apps/backend/src/__tests__/integration/admin.rbac.integration.test.ts`

Casos P0:

- Fluxo Pix completo.
- Fluxo dinheiro sem gateway.
- Fluxo cartao sem gateway.
- Permissoes admin continuam preservadas.

### Frontend

Arquivos:

- `apps/frontend/src/__tests__/schemas/checkoutSchema.test.ts`
- Possiveis testes novos para componentes admin.

Casos P0:

- Schema aceita Pix, dinheiro, cartao credito e cartao debito.
- Schema rejeita troco negativo.
- Checkout envia `pagamento`.
- Admin renderiza `A_RECEBER`.
- Ticket mostra observacao geral e observacao por item.

---

## 11. Riscos tecnicos

| Risco | Impacto | Mitigacao |
|---|---|---|
| Fluxo Pix atual esta acoplado a qualquer pedido | Alto | Separar criacao por `formaPagamento` no service |
| `A_RECEBER` impacta muitos pontos que assumem tres status financeiros | Medio | Mapear e testar todos os usos de `statusPagamento` |
| Reprocessamento automatico criar Pix indevido | Alto | Filtrar por `formaPagamento = PIX` e `statusPagamento = PENDENTE` |
| Metricas tratarem `A_RECEBER` como pago | Medio | Separar receita operacional de pagamento confirmado |
| Enum Postgres e dificil de reverter | Medio | Migration aditiva e rollback funcional sem remover enum |
| Tipos duplicados ficarem inconsistentes | Medio | Atualizar `lib/api.ts`, `domain.types.ts` e `packages/shared` juntos |
| Checkout novo quebrar payload antigo | Medio | Backend deve aceitar payload antigo como Pix |
| Confirmacoes demais lentificarem operacao | Baixo | Confirmar apenas acoes sensiveis |

---

## 12. Estrategia de compatibilidade com pedidos antigos

- Campos novos devem ter defaults seguros:
  - `formaPagamento = PIX`
  - `tipoAtendimento = ENTREGA`
- `trocoPara` deve ser nullable.
- Payload antigo sem `pagamento` deve ser aceito como Pix.
- Pedidos antigos mantem `statusPagamento` existente.
- Pedidos manuais antigos em dinheiro nao devem ser alterados automaticamente sem evidencia confiavel.
- Se houver necessidade de correcao historica, fazer auditoria separada por timeline e origem.

---

## 13. Plano de rollback ou mitigacao

### Estrategia de deploy

1. Aplicar migration aditiva.
2. Gerar Prisma Client.
3. Subir backend compativel com payload antigo.
4. Subir frontend checkout/admin.
5. Validar smoke em staging.

### Rollback funcional

- Rollback de frontend: voltar a UI anterior, mantendo campos novos ignorados.
- Rollback de backend: manter campos/enums no banco, mas voltar fluxo antigo se necessario.
- Nao tentar remover `A_RECEBER` em rollback emergencial.
- Usar feature flag operacional simples para ocultar dinheiro/cartao no checkout se necessario.

### Smoke minimo antes de producao

- Criar pedido Pix e validar link.
- Criar pedido dinheiro e validar ausencia de link Pix.
- Criar pedido cartao credito e validar `A_RECEBER`.
- Criar pedido cartao debito e validar `A_RECEBER`.
- Validar troco no admin.
- Validar cancelamento de pedido `A_RECEBER`.
- Validar cancelamento de pedido Pix confirmado com estorno necessario.

---

## 14. Checklist tecnico P0 em ordem de execucao

1. Criar migration/schema Prisma.
2. Rodar `prisma generate`.
3. Atualizar tipos compartilhados/frontend.
4. Atualizar DTO/Zod do pedido publico.
5. Implementar regras de pagamento no service.
6. Filtrar expiracao/reprocessamento para Pix.
7. Atualizar pedido manual.
8. Atualizar contratos admin lista/detalhe.
9. Atualizar status/cancelamento/estorno no backend.
10. Atualizar checkout.
11. Atualizar admin lista/detalhe.
12. Atualizar CTAs, labels e confirmacoes.
13. Adicionar testes backend.
14. Adicionar testes frontend.
15. Rodar typecheck.
16. Rodar testes.
17. Fazer smoke manual.

---

## 15. Separacao clara entre P0 e P1

### P0

- Criar `StatusPagamento.A_RECEBER`.
- Persistir `formaPagamento`.
- Persistir `trocoPara`.
- Persistir `tipoAtendimento = ENTREGA`.
- Checkout enviar pagamento real.
- Admin mostrar forma de pagamento, troco e observacoes.
- Admin usar label `CONFIRMADO = Aguardando preparo`.
- Substituir CTA generico por CTA contextual.
- Bloquear acoes finais no backend e frontend.
- Exigir confirmacao para cancelamento, entrega e estorno.

### P1

- Criar status operacional `PRONTO`.
- Calcular "aguardando entregador" como estado derivado.
- Verificar Pix manualmente.
- Impressao via `window.print` com CSS dedicado.
- Copiar endereco e abrir WhatsApp em um clique.
- Implementar retirada.
- Implementar consumo local.
- Melhorar metricas logisticas por etapa.

---

## 16. Prontidao para implementacao

O P0 esta pronto para implementacao, desde que seja executado em etapas pequenas e na ordem recomendada.

### Primeira tarefa tecnica

Implementar somente a base de dados e tipos:

- Migration aditiva.
- Atualizacao do Prisma schema.
- `StatusPagamento.A_RECEBER`.
- `FormaPagamentoPedido`.
- `TipoAtendimentoPedido`.
- Campos `formaPagamento`, `trocoPara` e `tipoAtendimento` em `Pedido`.
- Atualizacao minima dos tipos para manter compilacao.

### Parte de maior risco

Separar corretamente o fluxo Pix do fluxo dinheiro/cartao sem quebrar:

- expiracao de checkout;
- reprocessamento de link Pix;
- webhook InfinitePay;
- metricas do admin;
- fluxo de pedido manual.

---

## 17. Prompt recomendado para iniciar a primeira etapa

```markdown
Implemente somente a Etapa 1 do P0 do modulo /admin/pedidos.

Escopo:
- Atualizar Prisma schema.
- Criar migration aditiva.
- Adicionar `StatusPagamento.A_RECEBER`.
- Criar `FormaPagamentoPedido`.
- Criar `TipoAtendimentoPedido`.
- Adicionar em `Pedido`: `formaPagamento`, `trocoPara`, `tipoAtendimento`.
- Atualizar tipos compartilhados/frontend necessarios para compilar.

Regras:
- Nao alterar logica de criacao de pedido ainda.
- Nao alterar UI ainda.
- Nao implementar checkout/admin ainda.
- Nao mexer em P1.
- Manter compatibilidade com pedidos antigos via defaults.
- Rodar apenas validacoes seguras: generate/typecheck/testes relacionados se aplicavel.

Ao final, informe:
- Arquivos alterados.
- Migration criada.
- Campos/enums adicionados.
- Se ha impacto pendente para a Etapa 2.
```
