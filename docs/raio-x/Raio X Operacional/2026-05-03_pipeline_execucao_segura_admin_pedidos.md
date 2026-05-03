# Pipeline Seguro de Execução — `/admin/pedidos`

**Origem:** `2026-05-03_raio_x_funcional_admin_pedidos_fluxo_status.md`  
**Data:** 03/05/2026  
**Objetivo:** transformar o diagnóstico funcional em plano de execução seguro, com baixo risco de regressão e foco na operação.

---

## 1) Backlog consolidado do RAIO-X

- `BX-01` Filtrar pedidos finalizados por janela diária no backend (modo `todos`).
- `BX-02` Excluir todos os status finais da lógica de SLA crítico (`hasSlaDanger`).
- `BX-03` Definir SLA `Infinity` para status finais em `slaByStatus`.
- `BX-04` Completar `labelStatus` para todos os status reais.
- `BX-05` Tornar `ctaStatus` contextual por `tipoAtendimento` (ENTREGA/RETIRADA/CONSUMO_LOCAL).
- `BX-06` Inserir divisor visual entre ativos e encerrados do dia na lista.
- `BX-07` Em `PRONTO + aguardandoEntregador`, mostrar instrução clara de próxima ação.
- `BX-08` Centralizar `FINAL_STATUSES` em único ponto (`_utils.ts`).
- `BX-09` Proteger detector de “novo pedido” para não tocar com finalizados.
- `BX-10` Exibir contador de pedidos ativos no título da aba.

---

## 2) Classificação P0/P1/P2/P3

- `P0`: `BX-01`, `BX-02`, `BX-03`
- `P1`: `BX-04`, `BX-05`, `BX-06`, `BX-07`
- `P2`: `BX-08`, `BX-09`, `BX-10`
- `P3`: sem itens no diagnóstico atual

---

## 3) Escopo recomendado do Ciclo 1

Implementar somente itens críticos e de alta clareza operacional com baixo risco:

- Incluir: `BX-01`, `BX-02`, `BX-03`, `BX-04`, `BX-05`, `BX-07`
- Excluir neste ciclo: `BX-06`, `BX-08`, `BX-09`, `BX-10`

Racional:
- Elimina ruído de SLA/som e mistura de pedidos antigos.
- Melhora decisão do atendente sem mudança estrutural grande de UI.

---

## 4) Itens fora de escopo (Ciclo 1)

- `BX-06` Divisor visual ativos/encerrados (mudança visual mais ampla).
- `BX-08` Refactor de centralização de constantes.
- `BX-09` Ajuste de detector de novo pedido.
- `BX-10` Contador no título da aba.
- Qualquer mudança de regra de negócio fora do fluxo `/admin/pedidos`.

---

## 5) SPEC funcional do Ciclo 1

### 5.1 Comportamento da listagem padrão (`status=todos`)
- Exibir pedidos ativos de qualquer data.
- Exibir pedidos finais apenas se criados no dia corrente local.

### 5.2 Comportamento de alertas SLA
- `hasSlaDanger` deve ignorar todos os status finais.
- `slaByStatus` para finais deve retornar `warningAt=Infinity` e `dangerAt=Infinity`.

### 5.3 Clareza textual de status e ação
- `labelStatus` deve cobrir todos os status reais com labels legíveis.
- `ctaStatus` deve variar por `tipoAtendimento` quando status for `PRONTO`.

### 5.4 Estado bloqueado em `PRONTO`
- Quando `aguardandoEntregador=true`, manter ação principal bloqueada.
- Exibir instrução explícita de próximo passo para o operador.

---

## 6) Critérios de aceite

- `CA-01` Pedido `EXPIRADO` de ontem não aparece em `todos`.
- `CA-02` Pedido `ENTREGUE` de hoje aparece em `todos`.
- `CA-03` Nenhum pedido final contribui para `hasSlaDanger`.
- `CA-04` Beep de SLA não toca por causa de pedidos finais.
- `CA-05` `labelStatus` não usa fallback quebrado para status conhecidos.
- `CA-06` `PRONTO + RETIRADA` mostra CTA `Confirmar retirada`.
- `CA-07` `PRONTO + CONSUMO_LOCAL` mostra CTA `Confirmar consumo`.
- `CA-08` `PRONTO + aguardandoEntregador=true` mostra orientação operacional clara.

---

## 7) Slices de implementação

- `Slice 1 (Backend crítico)`: `BX-01`
- `Slice 2 (Frontend crítico SLA)`: `BX-02` + `BX-03`
- `Slice 3 (Clareza operacional UI)`: `BX-04` + `BX-05` + `BX-07`

---

## 8) Estratégia de testes

### 8.1 Unit (backend)
- `listarPedidosAdmin` sem status: valida OR (ativos + finais do dia).
- `listarPedidosAdmin` com status explícito: não aplica janela automática.

### 8.2 Unit (frontend)
- `slaByStatus` retorna `Infinity` para finais.
- `labelStatus` cobre todos os status mapeados.
- `ctaStatus` responde corretamente por `tipoAtendimento`.

### 8.3 Integração/API
- `/api/admin/pedidos` em `todos` exclui finalizados antigos.
- `/api/admin/pedidos` com status explícito mantém comportamento esperado.

### 8.4 Validação manual
- Polling de 30s não gera beep indevido por finalizados.
- Fluxo `PRONTO` comunica próximo passo quando bloqueado.

---

## 9) Ordem segura de execução

1. Implementar `Slice 1` (backend).
2. Executar testes backend e validar dados com massa ontem/hoje.
3. Implementar `Slice 2` (SLA frontend).
4. Executar testes frontend + validação de polling/áudio.
5. Implementar `Slice 3` (clareza operacional).
6. Rodar regressão funcional de `/admin/pedidos`.
7. Homologar com cenário de virada de dia.
8. Publicar com monitoramento inicial operacional.

---

## 10) Riscos e mitigação

- Risco: corte de “início do dia” incorreto por timezone.
- Mitigação: usar timezone operacional definido e testar perto de meia-noite.

- Risco: esconder finalizado necessário para acompanhamento imediato.
- Mitigação: manter acesso por filtro de status explícito.

- Risco: regressão em CTA de `PRONTO` por tipo de atendimento.
- Mitigação: teste de matriz `PRONTO x tipoAtendimento`.

- Risco: ruído residual por regras legadas de alerta.
- Mitigação: validar logs/telemetria de alerta após deploy.

---

## 11) Checklist de validação manual

- [ ] Abrir `/admin/pedidos` com massa contendo pedidos de ontem e hoje.
- [ ] Confirmar que finalizados de ontem não aparecem em `todos`.
- [ ] Confirmar que finalizados de hoje aparecem em `todos`.
- [ ] Esperar polling e validar ausência de beep indevido.
- [ ] Validar labels de todos os status do fluxo.
- [ ] Validar CTA `PRONTO` para `RETIRADA`.
- [ ] Validar CTA `PRONTO` para `CONSUMO_LOCAL`.
- [ ] Validar mensagem de orientação em `PRONTO + aguardandoEntregador`.
- [ ] Validar que filtros explícitos continuam funcionando.

---

## 12) Prompt recomendado para agente dev implementar o Slice 1

Implemente apenas o **Slice 1 (backend)**, sem alterar frontend.

### Objetivo
Ajustar `listarPedidosAdmin` em `apps/backend/src/services/pedido.service.ts` para que, quando o filtro de status estiver ausente ou for `todos`, a consulta retorne:

1. Pedidos com status não final (`ENTREGUE`, `CANCELADO`, `EXPIRADO`, `ABANDONADO` excluídos) de qualquer data.
2. Pedidos com status final apenas com `criadoEm >= início do dia local`.

### Restrições
- Não alterar contrato da API.
- Não refatorar outras áreas.
- Não mudar ordenação/paginação atuais.
- Preservar comportamento quando `status` explícito for informado.

### Entrega esperada
- Código implementado no serviço.
- Testes cobrindo:
  - cenário sem status;
  - cenário com status explícito;
  - diferença entre finalizados de ontem e hoje.
- Resumo curto sobre tratamento de timezone no cálculo de início do dia.

