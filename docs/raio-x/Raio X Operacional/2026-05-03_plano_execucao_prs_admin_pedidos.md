# Plano de Execução em PRs — `/admin/pedidos`

**Base:** `2026-05-03_pipeline_execucao_segura_admin_pedidos.md`  
**Data:** 03/05/2026  
**Objetivo:** quebrar o pipeline em tarefas operacionais por slice, arquivo e PR, com checkpoints de qualidade.

---

## 1) Estrutura de entrega (PRs)

- **PR-01 (Slice 1 / Backend crítico):** `BX-01`
- **PR-02 (Slice 2 / Frontend SLA):** `BX-02`, `BX-03`
- **PR-03 (Slice 3 / Clareza operacional):** `BX-04`, `BX-05`, `BX-07`
- **PR-04 (Ciclo 2 / Refinamentos):** `BX-06`, `BX-08`, `BX-09`, `BX-10`

Regra:
- Não misturar backend crítico com mudanças visuais na mesma PR.
- Cada PR deve ser validável isoladamente em homologação.

---

## 2) Tarefas por slice e por arquivo

## Slice 1 — Backend crítico (`BX-01`)

### Arquivo
- `apps/backend/src/services/pedido.service.ts`

### Tarefas
- Ajustar `listarPedidosAdmin` para modo `todos`:
  - incluir ativos de qualquer data;
  - incluir finalizados apenas do dia corrente.
- Garantir que `status` explícito não entre nessa regra automática.
- Preservar paginação e ordenação existentes.

### Testes alvo
- `apps/backend/src/__tests__/services/pedido.service.test.ts`
- `apps/backend/src/__tests__/controllers/admin.pedido.controller.test.ts` (se necessário)
- E2E/integration já existente do cockpit (se cobrir listagem)

---

## Slice 2 — Frontend SLA (`BX-02`, `BX-03`)

### Arquivos
- `apps/frontend/src/app/admin/pedidos/page.tsx`
- `apps/frontend/src/app/admin/pedidos/_components/_utils.ts`

### Tarefas
- Em `hasSlaDanger`, ignorar `ENTREGUE`, `CANCELADO`, `EXPIRADO`, `ABANDONADO`.
- Em `slaByStatus`, retornar `Infinity` para warning/danger em status finais.
- Confirmar que polling não dispara beep por pedidos finais.

### Testes alvo
- Testes unit de utilitários (`_utils.ts`).
- Testes de comportamento de página (se houver suite para hooks/componente).

---

## Slice 3 — Clareza operacional (`BX-04`, `BX-05`, `BX-07`)

### Arquivos
- `apps/frontend/src/app/admin/pedidos/_components/_utils.ts`
- `apps/frontend/src/app/admin/pedidos/page.tsx`
- `apps/frontend/src/app/admin/pedidos/_components/ListaPedidos.tsx` (somente se ponto de render exigir)

### Tarefas
- Completar `labelStatus` para todos os status reais.
- Tornar `ctaStatus` contextual por `tipoAtendimento` quando `status=PRONTO`.
- Em estado bloqueado `PRONTO + aguardandoEntregador=true`, exibir instrução operacional explícita.

### Testes alvo
- Unit de `labelStatus` e `ctaStatus`.
- Teste de render/fluxo do estado bloqueado de `PRONTO`.

---

## 3) Checklist por PR

## PR-01 Checklist (Backend)
- [ ] Regra de janela diária aplicada apenas em `todos`.
- [ ] Sem mudança de contrato da API.
- [ ] Sem mudança de ordenação/paginação.
- [ ] Testes cobrindo ontem vs hoje para status finais.
- [ ] Revisão de timezone documentada no PR.

## PR-02 Checklist (SLA frontend)
- [ ] `hasSlaDanger` ignora status finais.
- [ ] `slaByStatus` para finais retorna `Infinity`.
- [ ] Sem regressão de alerta em status ativos.
- [ ] Polling/áudio validado manualmente.

## PR-03 Checklist (UX operacional)
- [ ] `labelStatus` completo e consistente.
- [ ] `ctaStatus` correto por tipo de atendimento.
- [ ] Mensagem de próximo passo no bloqueio de `PRONTO`.
- [ ] Validação manual com cenários ENTREGA/RETIRADA/CONSUMO_LOCAL.

---

## 4) Critérios de pronto (Definition of Done)

- [ ] Todos os critérios de aceite do ciclo 1 atendidos.
- [ ] Testes automatizados relevantes passando.
- [ ] Validação manual do checklist operacional concluída.
- [ ] Sem mudança fora do escopo declarado.
- [ ] Evidências anexadas (capturas/logs curtos) na descrição das PRs.

---

## 5) Ordem segura de execução (operacional)

1. Abrir **PR-01** e homologar com massa mista de pedidos (ontem/hoje).
2. Após merge de PR-01, abrir **PR-02** e validar comportamento de SLA/beep.
3. Após merge de PR-02, abrir **PR-03** e validar clareza de ações do atendente.
4. Consolidar feedback da operação em 24h úteis.
5. Planejar **PR-04** (Ciclo 2) sem bloquear estabilização do ciclo 1.

---

## 6) Riscos de execução por PR e mitigação

- **PR-01**
- Risco: erro de timezone no início do dia.
- Mitigação: testes com horários limítrofes (00:00 e 23:59) e validação em homolog.

- **PR-02**
- Risco: silenciar alerta legítimo.
- Mitigação: testes de status ativos (`CONFIRMADO`, `PREPARANDO`, `PRONTO`, `SAIU_ENTREGA`).

- **PR-03**
- Risco: inconsistência textual entre botões e fluxo real.
- Mitigação: matriz de cenários por `tipoAtendimento` e revisão com operador.

---

## 7) Template de descrição de PR (recomendado)

## Contexto
- Item(s) do backlog: `BX-xx`
- Problema operacional que resolve:

## Escopo
- Arquivos alterados:
- O que foi alterado:
- O que não foi alterado:

## Critérios de aceite validados
- `CA-xx`:

## Testes
- Automatizados executados:
- Validação manual executada:

## Riscos conhecidos
- 

## Evidências
- prints/logs curtos:

