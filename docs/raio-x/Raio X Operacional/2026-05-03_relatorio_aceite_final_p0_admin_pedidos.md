# Relatório Final de Aceite P0 — `/admin/pedidos`

Data: 2026-05-03

## 1. Objetivo do hardening
- Revisar regressão backend/frontend do P0.
- Garantir cobertura da transição `AGUARDANDO_PAGAMENTO -> CONFIRMADO` para `statusPagamento=CONFIRMADO` e `statusPagamento=A_RECEBER`.
- Validar compatibilidade com pedidos legados sem `formaPagamento` e `tipoAtendimento`.

## 2. Revisão de regressão executada
- Frontend admin:
  - CTA contextual e bloqueios de status finais mantidos.
  - Botão de confirmação na lista validado para `CONFIRMADO` e `A_RECEBER`.
  - Ticket operacional validado com observação geral e por item.
  - Fallback legado validado: ausência de `formaPagamento`/`tipoAtendimento` exibe `PIX · ENTREGA`.
- Backend pedidos:
  - Fluxo de atualização de status mantido.
  - Transição de confirmação coberta para os dois cenários de pagamento do P0.

## 3. Testes adicionados/ajustados
- Backend:
  - `apps/backend/src/__tests__/services/pedido.service.test.ts`
    - transição `AGUARDANDO_PAGAMENTO -> CONFIRMADO` com `statusPagamento=CONFIRMADO` (PIX)
    - transição `AGUARDANDO_PAGAMENTO -> CONFIRMADO` com `statusPagamento=A_RECEBER` (dinheiro/cartão)
- Frontend:
  - `apps/frontend/src/__tests__/admin.pedidos.lista.test.tsx`
    - compatibilidade legado sem `formaPagamento` e `tipoAtendimento` (fallback)
  - já existentes no P0 e mantidos:
    - `admin.pedidos.utils.test.ts` (label/CTA/bloqueio final)
    - `admin.pedidos.ticket.test.tsx` (observações no ticket)

## 4. Evidência de validação
- `pnpm --filter @rancho-delivery/backend test -- src/__tests__/services/pedido.service.test.ts` ✅
- `pnpm --filter @rancho-delivery/frontend test -- src/__tests__/admin.pedidos.utils.test.ts src/__tests__/admin.pedidos.lista.test.tsx src/__tests__/admin.pedidos.ticket.test.tsx` ✅
- `pnpm --filter @rancho-delivery/frontend typecheck` ✅
- `pnpm --filter @rancho-delivery/backend typecheck` ✅

## 5. Riscos residuais
- Regra de negócio atual converte `A_RECEBER` para `CONFIRMADO` ao aceitar pedido. Isso mantém o fluxo P0, mas perde granularidade de conciliação (esperado no P0; tratar no P1).
- Cobertura está forte para serviços/utilitários/componentes críticos, porém sem E2E do fluxo completo em navegador.
- Dependência de confirmação manual (`window.confirm`) sem trilha de UX avançada (aceitável em P0).

## 6. Critérios de Go-Live P0
- ✅ Typecheck backend/frontend sem erro.
- ✅ Testes críticos de status/CTA/ticket passando.
- ✅ Compatibilidade com pedidos legados validada por fallback.
- ✅ Sem inclusão de escopo P1.
- ✅ Fluxo operacional mínimo do admin preservado.

## 7. Decisão de aceite
- **Status:** GO com ressalvas leves.
- **Ressalvas para monitorar em produção:**
  - volume de pedidos com `A_RECEBER` para confirmar que operação está fluida;
  - cancelamentos com pagamento confirmado e rotina de estorno;
  - aderência operacional dos CTAs em horário de pico.

## 8. Próximas ações recomendadas (pós-P0)
1. Instrumentar métricas operacionais no admin (`tempo até confirmar`, `tempo em preparo`, `atrasos por estágio`).
2. Preparar P1 de status logístico (`PRONTO` + estado derivado aguardando entregador).
3. Evoluir impressão operacional (`window.print` com CSS dedicado) com checklist de layout térmico.
