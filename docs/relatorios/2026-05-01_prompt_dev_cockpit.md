# Prompt para Equipe Dev — Correções do Cockpit de Pedidos

**Para:** Equipe de Desenvolvimento  
**Data:** 2026-05-01  
**Referência:** `docs/relatorios/2026-05-01_auditoria_cockpit_pedidos.md`

---

## Contexto

Foi realizada uma auditoria completa do Cockpit de Pedidos (`/admin/pedidos`). Foram identificados **14 problemas** distribuídos em três níveis de criticidade. O relatório completo com checklist está em `docs/relatorios/2026-05-01_auditoria_cockpit_pedidos.md`.

Precisamos que a equipe dê seguimento às correções, priorizando os itens 🔴 críticos pois impactam a operação real do restaurante hoje.

---

## O que precisa ser feito

### 🔴 Prioridade máxima — corrigir esta sprint

**#3 — Timer SLA mostrando valores absurdos (ex: `1121:33`)**

O campo `tempoNoEstagio` é calculado com base em `atualizadoEm`, que é resetado por qualquer operação no pedido (atribuir motoboy, editar endereço). Isso zera o timer incorretamente e pode gerar valores gigantes se houver divergência de timezone.

- Backend: `apps/backend/src/services/pedido.service.ts:338`
- Solução: adicionar campo `statusMudouEm: DateTime` no schema Prisma, populado apenas em `atualizarStatusAdmin`. Usar esse campo no cálculo do `tempoNoEstagio`.

---

**#1 e #2 — Fluxo de status visual não reflete o estado real do pedido**

Os badges do fluxo (`CONFIRMADO → PREPARANDO → SAIU_ENTREGA → ENTREGUE`) são renderizados todos iguais, sem destacar o passo atual. Além disso, `AGUARDANDO_PAGAMENTO` não está no fluxo, então pedidos PIX recém-criados não têm nenhum passo ativo.

- Frontend: `apps/frontend/src/app/admin/pedidos/page.tsx:39` e `:664`
- Solução: (a) adicionar `AGUARDANDO_PAGAMENTO` ao fluxo visual; (b) comparar cada badge com `pedidoDetalhe.status` e aplicar estilo ativo (ex: `variant="active"` ou borda destacada).

---

**#4 — Botão "Avançar status" aparece habilitado mas não faz nada para pedidos PENDENTE**

Para pedidos em `PENDENTE` ou `AGUARDANDO_PAGAMENTO` com pagamento não confirmado, o botão aparece clicável mas executa silenciosamente sem feedback.

- Frontend: `apps/frontend/src/app/admin/pedidos/page.tsx:667`
- Solução: adicionar condição explícita de `disabled` para esses estados e exibir tooltip "Aguardando confirmação de pagamento".

---

**#5 — Falha de envio WhatsApp não tem feedback específico para o operador**

Quando a Evolution API está desconectada, o backend retorna HTTP 502 com `WHATSAPP_ENVIO_FALHOU`, mas o frontend exibe apenas "Falha ao enviar mensagem" genérico. O operador não sabe que o WhatsApp está offline.

- Frontend: `apps/frontend/src/app/admin/pedidos/page.tsx:420`
- Solução: tratar o código de erro `WHATSAPP_ENVIO_FALHOU` separadamente e exibir mensagem como "WhatsApp desconectado. Acesse Configurações para reconectar."

---

### 🟡 Prioridade média — próxima sprint

**#8 — Campo "ID do produto" no pedido manual**
Substituir o input de UUID por um `<select>` ou autocomplete que carregue os produtos via `api.produtos.listar()`.
Arquivo: `apps/frontend/src/app/admin/pedidos/page.tsx:846`

**#9 — Cancelamento via `PATCH /status` não marca estorno**
Adicionar verificação de `statusPagamento` em `atualizarStatusAdmin` quando `novoStatus === CANCELADO`, espelhando o comportamento de `cancelarPedidoAdmin`.
Arquivo: `apps/backend/src/services/pedido.service.ts:714`

**#10 — SSE sem reconexão automática**
Implementar backoff exponencial (ex: 1s, 2s, 4s, 8s) antes de cair para polling permanente.
Arquivo: `apps/frontend/src/hooks/useCockpitSocket.ts:62`

**#11 — `statusPagamento` inferido, não armazenado**
Adicionar campo `statusPagamento` no banco, atualizado pelo webhook do InfinitePay. Isso evita pedidos pagos presos em `AGUARDANDO_PAGAMENTO` quando o webhook falha.
Arquivo: `apps/backend/src/services/pedido.service.ts:42`

---

### 🟢 Prioridade baixa — backlog

- **#6** — Aba IA: adicionar tooltip "Em breve" ou remover até estar pronta (`page.tsx:655`)
- **#7** — Checkbox "Imprimir comanda": implementar ou remover (`page.tsx:681`)
- **#12** — Botão "Fechar loja": adicionar modal de confirmação (`page.tsx:531`)
- **#13** — Label "Som on/off": corrigir para `{muted ? 'Ligar som' : 'Desligar som'}` (`page.tsx:525`)
- **#14** — Paginação: mover para dentro do card da lista (`page.tsx:806`)

---

## Checklist completo

O checklist com todos os 14 itens para marcar conforme forem resolvidos está em:

```
docs/relatorios/2026-05-01_auditoria_cockpit_pedidos.md
```

Ao concluir cada item, marcar `- [x]` no checklist e registrar o commit correspondente.

---

## Dúvidas

Qualquer dúvida sobre o escopo ou a priorização, consultar o relatório de auditoria ou abrir discussão na PR correspondente.
