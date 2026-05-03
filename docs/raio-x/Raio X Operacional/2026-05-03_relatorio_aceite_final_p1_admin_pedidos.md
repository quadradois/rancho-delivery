# Relatório Final de Aceite P1 — `/admin/pedidos`

Data: 2026-05-03

## 1. Escopo de hardening executado
- Revisão de regressão dos itens P1:
  - status `PRONTO`
  - estado derivado `Aguardando entregador` (sem enum persistido)
  - impressão operacional via `window.print` com CSS dedicado
- Ampliação de testes de integração frontend/backend no fluxo:
  - `PREPARANDO -> PRONTO -> SAIU_ENTREGA` com motoboy
  - `PREPARANDO -> PRONTO` sem motoboy, com `aguardandoEntregador=true` e bloqueio operacional no frontend

## 2. Evidências técnicas (mudanças validadas)

### Backend
- `StatusPedido` já inclui `PRONTO` e transições operacionais foram mantidas.
- Estado derivado `aguardandoEntregador` exposto em:
  - lista admin (`listarPedidosAdmin`)
  - detalhe admin (`buscarPedidoAdminPorId`)

### Frontend
- Lista exibe badge `Aguardando entregador` quando derivado `true`.
- Tela de pedidos usa motivo de bloqueio explícito para impedir avanço em `PRONTO` sem despachar.
- Ticket operacional possui bloco imprimível com dados essenciais e botão `Imprimir` via `window.print`.

## 3. Testes adicionados/ajustados

### Backend
- `apps/backend/src/__tests__/integration/admin.rbac.integration.test.ts`
  - fluxo com motoboy: `PREPARANDO -> PRONTO -> SAIU_ENTREGA`
  - cenário sem motoboy: manutenção em `PRONTO` + retorno `aguardandoEntregador=true` na lista
- `apps/backend/src/__tests__/services/pedido.service.test.ts`
  - cobertura de transições e derivação admin (lista/detalhe)

### Frontend
- `apps/frontend/src/__tests__/admin.pedidos.lista.test.tsx`
  - destaque visual `Aguardando entregador` em pedido `PRONTO` derivado
- `apps/frontend/src/__tests__/admin.pedidos.utils.test.ts`
  - motivo de bloqueio para `PRONTO` sem entregador
- `apps/frontend/src/__tests__/admin.pedidos.ticket.test.tsx`
  - render do bloco imprimível com dados essenciais

## 4. Execuções realizadas
- `pnpm --filter @rancho-delivery/backend test -- src/__tests__/integration/admin.rbac.integration.test.ts src/__tests__/services/pedido.service.test.ts` ✅
- `pnpm --filter @rancho-delivery/frontend test -- src/__tests__/admin.pedidos.utils.test.ts src/__tests__/admin.pedidos.lista.test.tsx src/__tests__/admin.pedidos.ticket.test.tsx` ✅
- `pnpm --filter @rancho-delivery/frontend typecheck` ✅
- `pnpm --filter @rancho-delivery/backend typecheck` ✅

## 5. Riscos residuais
- Backend ainda permite transição para `SAIU_ENTREGA` sem validação rígida de motoboy; o bloqueio operacional está no frontend/fluxo de operação.
- Impressão depende de comportamento de browser/impressora térmica; pode exigir ajuste fino de CSS por ambiente operacional.
- Não há E2E browser-to-browser cobrindo clique real de impressão (somente validação de render e estrutura).

## 6. Critérios de Go-Live P1
- ✅ Fluxo `PREPARANDO -> PRONTO -> SAIU_ENTREGA` coberto por testes de integração.
- ✅ Estado derivado `Aguardando entregador` disponível no contrato admin e refletido em UI.
- ✅ Bloqueio operacional explícito no frontend para etapa sem despacho.
- ✅ Impressão operacional ativa via `window.print` com CSS dedicado.
- ✅ Typecheck e suítes críticas passando.

## 7. Decisão final
- **Status:** GO com ressalvas leves.

Ressalvas:
1. Formalizar (em etapa futura) validação backend para despacho sem motoboy quando `tipoAtendimento=ENTREGA`, caso a regra de negócio exija enforcement server-side.
2. Rodar smoke em impressora real (A4 e térmica) antes de alta escala em produção.

## 8. Próximas ações recomendadas
1. Criar teste E2E operacional do cockpit (`PRONTO` + despacho + impressão).
2. Definir política final de enforcement backend para despacho sem motoboy.
3. Instrumentar métricas específicas do estágio `PRONTO` (tempo parado aguardando entregador).
