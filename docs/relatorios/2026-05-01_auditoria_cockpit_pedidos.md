# Auditoria do Cockpit de Pedidos — Rancho Comida Caseira

**Data:** 2026-05-01  
**Escopo:** `app.rancho.delivery/admin` — página de pedidos  
**Arquivo principal:** `apps/frontend/src/app/admin/pedidos/page.tsx`

---

## 🔴 Críticos

- [x] **#1 — Fluxo de status sem passo ativo destacado**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:664`  
  Os badges `CONFIRMADO → PREPARANDO → SAIU_ENTREGA → ENTREGUE` são renderizados com aparência idêntica — nenhum passo é destacado como ativo. Operador não sabe visualmente em qual etapa o pedido está.  
  _Correção: comparar cada status com `pedidoDetalhe.status` e aplicar variante ativa._

- [x] **#2 — `STATUS_FLOW` não inclui `AGUARDANDO_PAGAMENTO`**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:39`  
  Pedidos em `AGUARDANDO_PAGAMENTO` (estado inicial de todo pedido PIX) não aparecem no fluxo visual. O operador vê o fluxo inteiro sem nenhum passo ativo para esses pedidos.  
  _Correção: adicionar `AGUARDANDO_PAGAMENTO` ao `STATUS_FLOW` ou tratar separadamente no visual._

- [x] **#3 — Timer SLA usa `atualizadoEm` em vez de campo dedicado `statusMudouEm`**  
  `apps/backend/src/services/pedido.service.ts:338`  
  O campo `atualizadoEm` é atualizado por qualquer operação (atribuir motoboy, editar endereço), zerando o timer. Se o banco retornar timezone incorreto, o cálculo `Date.now() - atualizadoEm` produz valores absurdos como `1121:33`.  
  _Correção: adicionar campo `statusMudouEm` no schema Prisma e atualizar apenas em mudanças de status._

- [x] **#4 — Botão "Avançar status" habilitado mas silencioso para pedidos `PENDENTE`**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:667`  
  Para pedidos em `PENDENTE` (não está no `STATUS_FLOW`), o botão aparece habilitado visualmente mas não executa nada e não exibe erro. UX enganosa.  
  _Correção: desabilitar explicitamente quando `status === 'PENDENTE'` ou `status === 'AGUARDANDO_PAGAMENTO'` com pagamento pendente, e exibir tooltip explicativo._

- [x] **#5 — Falha de envio WhatsApp não é distinguida no frontend**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:420`  
  O backend retorna HTTP 502 com código `WHATSAPP_ENVIO_FALHOU` quando a Evolution API falha, mas o frontend trata todos os erros com `showError` genérico. Operador não sabe se o WhatsApp está desconectado.  
  _Correção: verificar `error.code === 'WHATSAPP_ENVIO_FALHOU'` e exibir mensagem específica com link para reconectar._

**Commit de referência dos itens #1 a #5:** `9342a7b`

---

## 🟡 Médios

- [ ] **#6 — Aba "IA" desabilitada sem tooltip ou previsão**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:655`  
  Tab com `disabled` sem `CrmTabPanel` correspondente e sem mensagem "em breve". Se habilitada acidentalmente, renderiza vazio.  
  _Correção: adicionar tooltip "Em breve" ou remover a aba até a funcionalidade estar pronta._

- [ ] **#7 — Checkbox "Imprimir comanda" sem implementação**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:681`  
  Elemento desabilitado com label "(em breve)". Sem onClick, sem integração com impressora.  
  _Correção: implementar ou remover do layout._

- [ ] **#8 — Campo "ID do produto" no pedido manual exige UUID**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:846`  
  Operador precisa digitar o UUID do produto manualmente. Sem busca, autocomplete ou dropdown. Inutilizável em produção sem consultar o banco.  
  _Correção: substituir por `<select>` ou autocomplete carregando produtos via `api.produtos.listar()`._

- [ ] **#9 — Cancelamento via `PATCH /status` não marca `estornoNecessario`**  
  `apps/backend/src/services/pedido.service.ts:714`  
  `atualizarStatusAdmin` não verifica `statusPagamento` ao cancelar. Apenas `cancelarPedidoAdmin` marca `estornoNecessario`. Se o operador cancelar via rota de status diretamente, o estorno não é registrado.  
  _Correção: adicionar verificação de estorno em `atualizarStatusAdmin` quando `novoStatus === CANCELADO`._

- [ ] **#10 — SSE sem reconexão automática após falha**  
  `apps/frontend/src/hooks/useCockpitSocket.ts:62`  
  Na primeira falha do SSE, a conexão é fechada permanentemente e cai para polling a cada 8s. Não tenta reconectar. Se o backend reiniciar, o cockpit fica em polling até o operador recarregar a página.  
  _Correção: implementar backoff exponencial para reconexão do SSE antes de cair para polling._

- [ ] **#11 — `statusPagamento` inferido do status do pedido, não consultado no gateway**  
  `apps/backend/src/services/pedido.service.ts:42`  
  Se o webhook do InfinitePay falhar, o pedido fica em `AGUARDANDO_PAGAMENTO` mesmo após pagamento confirmado. O `statusPagamento` retornado será `PENDENTE` e o botão "Confirmar" ficará bloqueado indefinidamente.  
  _Correção: adicionar endpoint de consulta ao InfinitePay para verificar status real do pagamento, ou armazenar `statusPagamento` como campo independente no banco._

---

## 🟢 Baixo

- [ ] **#12 — Botão "Fechar loja" sem modal de confirmação**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:531`  
  Um clique acidental fecha a loja imediatamente. Pausar exige mensagem (validado no backend), mas Fechar não tem nenhuma proteção.  
  _Correção: adicionar `window.confirm` ou modal antes de executar `atualizarStatusLoja('FECHADO')`._

- [ ] **#13 — Label do botão "Som on/off" invertido**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:525`  
  Quando `muted = true` (som desligado), exibe "Som off" — descreve o estado atual em vez da ação disponível. Convenção esperada seria "Ligar som" ou ícone toggle.  
  _Correção: trocar para `{muted ? 'Ligar som' : 'Desligar som'}` ou usar ícone de alto-falante._

- [ ] **#14 — Paginação da lista posicionada fora do card**  
  `apps/frontend/src/app/admin/pedidos/page.tsx:806`  
  Os botões Anterior/Próxima ficam abaixo do painel de detalhes, visualmente desconectados da lista de pedidos que controlam.  
  _Correção: mover a paginação para dentro do `CrmCard` da lista de pedidos._

---

## Resumo

| # | Problema | Criticidade | Arquivo |
|---|----------|-------------|---------|
| 1 | Fluxo de status sem passo ativo | 🔴 | page.tsx:664 |
| 2 | STATUS_FLOW não inclui AGUARDANDO_PAGAMENTO | 🔴 | page.tsx:39 |
| 3 | Timer SLA usa `atualizadoEm` | 🔴 | pedido.service.ts:338 |
| 4 | Botão "Avançar status" silencioso para PENDENTE | 🔴 | page.tsx:667 |
| 5 | Falha WhatsApp sem feedback específico | 🔴 | page.tsx:420 |
| 6 | Aba IA desabilitada sem fallback | 🟡 | page.tsx:655 |
| 7 | Checkbox "Imprimir comanda" sem implementação | 🟡 | page.tsx:681 |
| 8 | Campo ID do produto no pedido manual | 🟡 | page.tsx:846 |
| 9 | Cancelamento via PATCH não marca estorno | 🟡 | pedido.service.ts:714 |
| 10 | SSE sem reconexão automática | 🟡 | useCockpitSocket.ts:62 |
| 11 | statusPagamento inferido, não consultado | 🟡 | pedido.service.ts:42 |
| 12 | Fechar loja sem confirmação | 🟢 | page.tsx:531 |
| 13 | Label "Som on/off" invertido | 🟢 | page.tsx:525 |
| 14 | Paginação fora do card da lista | 🟢 | page.tsx:806 |
