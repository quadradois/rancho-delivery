# Raio-X Funcional — `/admin/pedidos`

**Módulo:** Cockpit Operacional
**Data:** 03/05/2026
**Foco:** Fluxo de Status · Ruídos de SLA · Pedidos Encerrados · Experiência do Atendente
**Autor:** Análise PM/UX/Funcional

---

## 1. Mapa do Estado Atual

### 1.1 Grafo de Status (backend real)

```
PENDENTE
    │
    ▼
AGUARDANDO_PAGAMENTO  ──► EXPIRADO ──► (pode voltar p/ CONFIRMADO)
    │
    ▼
CONFIRMADO  ──────────────────────────────────────────────────────┐
    │                                                             │
    ▼                                                             │
PREPARANDO                                                        │
    │                                                          CANCELADO
    ▼                                                             │
PRONTO  ◄── aguardandoEntregador (flag virtual, não é status)    │
    │                                                             │
    ▼                                                             │
SAIU_ENTREGA                                                      │
    │                                                             │
    ▼                                                             │
ENTREGUE  ◄── status final, nenhuma transição possível
```

```
ABANDONADO → pode voltar p/ CONFIRMADO ou CANCELADO (edge case)
```

### 1.2 STATUS_FLOW no frontend (hardcoded em `_utils.ts`)

```typescript
['AGUARDANDO_PAGAMENTO', 'CONFIRMADO', 'PREPARANDO', 'PRONTO', 'SAIU_ENTREGA', 'ENTREGUE']
```

**O que está faltando:** `PENDENTE`, `EXPIRADO`, `ABANDONADO` não aparecem no flow visual — quando um pedido tem esses status, o atendente vê badges sem contexto e o botão de avanço diz `"Ação indisponível"`.

---

## 2. Bugs Críticos Identificados

### 🔴 BUG #1 — SLA e som disparam para pedidos de ontem (o bug principal)

**Localização:** `page.tsx:376–383` + `page.tsx:535–542`

```typescript
// hasSlaDanger não filtra por data de criação
const hasSlaDanger = useMemo(
  () => pedidos.some((pedido) => {
    if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') return false;
    // ⚠️ EXPIRADO e ABANDONADO NÃO são excluídos!
    const sla = slaByStatus(pedido.status);
    return pedido.tempoNoEstagio >= sla.dangerAt;
  }),
  [pedidos]
);
```

**Causa raiz 1:** `hasSlaDanger` exclui apenas `ENTREGUE` e `CANCELADO`. Um pedido `EXPIRADO` ou `ABANDONADO` de ontem que ficou em `CONFIRMADO` por 300 segundos (5 min) cai no `slaByStatus('EXPIRADO')` → `{ warningAt: 300, dangerAt: 600 }` (default) com `tempoNoEstagio` de +24h = **sempre true** → toca beep a cada 30s infinitamente.

**Causa raiz 2:** A query `listarPedidosAdmin` no backend **não filtra por data** — sem filtro de status ativo, retorna pedidos de qualquer dia com `orderBy criadoEm desc` e `limit 50`. Um pedido entregue de ontem com mensagens não-lidas continua na primeira página.

**Causa raiz 3:** `tempoNoEstagio` é calculado como `agora - statusMudouEm` sem teto. Um pedido `EXPIRADO` ontem às 20h tem hoje `tempoNoEstagio ≈ 57.600 segundos` → dispara qualquer threshold de SLA.

---

### 🔴 BUG #2 — Pedidos finalizados não somem da lista por padrão

**Localização:** `pedido.service.ts:327` — `where` sem filtro de data

O backend retorna os 50 pedidos mais recentes independente de status. Com filtro `todos` (padrão do operador), pedidos `ENTREGUE`, `CANCELADO`, `EXPIRADO` de ontem convivem com pedidos ativos de hoje, **empurrando pedidos urgentes para baixo da lista**.

A ordenação por prioridade de status (`prioridadeStatus`) coloca `ENTREGUE=6`, `EXPIRADO=7`, `ABANDONADO=8`, `CANCELADO=9` — eles ficam embaixo, mas **ainda estão na lista** ocupando espaço visual e ativando alertas.

---

### 🔴 BUG #3 — Pedidos finalizados contribuem para `knownPedidoIdsRef` → toca som de "novo pedido" incorretamente

**Localização:** `page.tsx:512–522`

```typescript
const hasNewOrder = [...currentIds].some((id) => !knownPedidoIdsRef.current?.has(id));
if (hasNewOrder) playNewOrder();
```

Quando a lista é recarregada após meia-noite, pedidos de ontem saem e novos pedidos do dia entram — qualquer ID novo toca o som, **mesmo que seja um pedido já processado que entrou na janela de 50**.

---

### 🟡 BUG #4 — `PRONTO` com `aguardandoEntregador=true` bloqueia o botão sem indicar o próximo passo

**Localização:** `_utils.ts:83` + `page.tsx:928–944`

```typescript
if (status === 'PRONTO' && aguardandoEntregador) return 'Aguardando entregador';
```

O botão fica desabilitado com título `"Aguardando entregador"`, mas não há nenhum CTA alternativo visível ("Atribuir motoboy", "Ver painel de motoboys"). O atendente fica paralisado sem entender o próximo passo.

---

### 🟡 BUG #5 — `ctaStatus('PRONTO')` retorna `"Enviar para entrega"` para RETIRADA e CONSUMO_LOCAL

**Localização:** `_utils.ts:72`

```typescript
case 'PRONTO': return 'Enviar para entrega';
```

Para um pedido de retirada pronto, o botão diz "Enviar para entrega" — confuso para o atendente.

---

### 🟡 BUG #6 — `labelStatus` incompleto para statuses reais

**Localização:** `_utils.ts:48–61`

`PREPARANDO`, `ENTREGUE`, `EXPIRADO`, `ABANDONADO` caem no `default: status.replace('_', ' ').toLowerCase()` → exibe `"preparando"`, `"entregue"`, `"expirado"`, `"abandonado"` em minúsculo sem capitalização. Parece texto quebrado.

---

### 🟡 BUG #7 — `FINAL_STATUSES` definido dentro do `return` do componente

**Localização:** `page.tsx:1215`

```typescript
const FINAL_STATUSES = ['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'];
```

Essa constante é recriada a cada render. A lógica de controle de fluxo está espalhada em 3 lugares distintos: `page.tsx:134`, `page.tsx:1215` e `_utils.ts:81`.

---

## 3. Análise de UX — Visão do Atendente

### 3.1 Jornada atual (com dor)

| Momento | O que o atendente enfrenta | Impacto |
|---|---|---|
| Abre o cockpit pela manhã | Vê pedidos de ontem misturados com os de hoje | Desorientação, busca manual |
| SLA bipa sem parar | Som a cada 30s de pedidos EXPIRADOS de ontem | Fadiga sonora, ignora alertas reais |
| Pedido PRONTO sem motoboy | Botão bloqueado sem instrução clara | Paralisia operacional |
| Pedido de RETIRADA pronto | Botão diz "Enviar para entrega" | Confusão, medo de clicar errado |
| Pedido EXPIRADO na lista | Sem badge diferenciado, sem data | Não sabe se é de hoje ou ontem |
| Modo Pico (≥8 pedidos ativos) | Ativa automaticamente — tabs Timeline/IA/Cliente somem | Perde contexto do cliente |

### 3.2 Hierarquia de atenção quebrada

A lista atual mistura **3 universos temporais** que deveriam ser separados:

```
┌─────────────────────────────────────────────┐
│  🔴 AGORA — Precisam de ação imediata       │  ← devem dominar o cockpit
│  AGUARDANDO_PAGAMENTO, CONFIRMADO           │
├─────────────────────────────────────────────┤
│  🟡 EM ANDAMENTO — Monitoramento            │  ← visíveis mas menores
│  PREPARANDO, PRONTO, SAIU_ENTREGA           │
├─────────────────────────────────────────────┤
│  ⚫ ENCERRADOS — Histórico                  │  ← ocultos por padrão
│  ENTREGUE, CANCELADO, EXPIRADO, ABANDONADO  │
└─────────────────────────────────────────────┘
```

Hoje os três universos têm **o mesmo peso visual e sonoro**.

---

## 4. Proposta de Solução — Priorizada

### P0 — Crítico (causa os bugs relatados)

#### P0.1 — Filtrar pedidos finalizados por janela de tempo no backend

**Arquivo:** `apps/backend/src/services/pedido.service.ts` · método `listarPedidosAdmin`

Adicionar ao `where` quando não há filtro de status explícito (modo "todos"):

```typescript
// Se status não filtrado, mostrar:
// - Todos os ativos (qualquer data)
// - Finalizados apenas do dia atual (após meia-noite local)
if (!filtros?.status || filtros.status === 'todos') {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  where.OR = [
    { status: { notIn: ['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'] } },
    {
      status: { in: ['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'] },
      criadoEm: { gte: inicioDia },
    },
  ];
}
```

Isso resolve o problema raiz: pedidos finalizados de ontem desaparecem da lista padrão.

---

#### P0.2 — Corrigir `hasSlaDanger` para excluir todos os status finais

**Arquivo:** `apps/frontend/src/app/admin/pedidos/page.tsx:376–383`

```typescript
const STATUSES_FINAIS = ['ENTREGUE', 'CANCELADO', 'EXPIRADO', 'ABANDONADO'];

const hasSlaDanger = useMemo(
  () => pedidos.some((pedido) => {
    if (STATUSES_FINAIS.includes(pedido.status)) return false;
    const sla = slaByStatus(pedido.status);
    return pedido.tempoNoEstagio >= sla.dangerAt;
  }),
  [pedidos]
);
```

---

#### P0.3 — Corrigir `slaByStatus` para retornar `Infinity` para status finais

**Arquivo:** `apps/frontend/src/app/admin/pedidos/_components/_utils.ts:93–106`

```typescript
export function slaByStatus(status: string) {
  switch (status) {
    case 'CONFIRMADO':   return { warningAt: 180,      dangerAt: 300      };
    case 'PREPARANDO':   return { warningAt: 1500,     dangerAt: 2100     };
    case 'PRONTO':       return { warningAt: 900,      dangerAt: 1500     };
    case 'SAIU_ENTREGA': return { warningAt: 3000,     dangerAt: 3600     };
    case 'ENTREGUE':
    case 'CANCELADO':
    case 'EXPIRADO':
    case 'ABANDONADO':   return { warningAt: Infinity, dangerAt: Infinity };
    default:             return { warningAt: 300,      dangerAt: 600      };
  }
}
```

---

### P1 — Alto Impacto na Navegação

#### P1.1 — Corrigir `labelStatus` para todos os statuses

**Arquivo:** `apps/frontend/src/app/admin/pedidos/_components/_utils.ts:48–61`

```typescript
export function labelStatus(status: string) {
  const labels: Record<string, string> = {
    AGUARDANDO_PAGAMENTO: 'Pag. pendente',
    CONFIRMADO:           'Aguard. preparo',
    PREPARANDO:           'Preparando',
    PRONTO:               'Pronto',
    SAIU_ENTREGA:         'Em rota',
    ENTREGUE:             'Entregue',
    CANCELADO:            'Cancelado',
    EXPIRADO:             'Expirado',
    ABANDONADO:           'Abandonado',
    PENDENTE:             'Pendente',
  };
  return labels[status] ?? status.replace(/_/g, ' ').toLowerCase();
}
```

---

#### P1.2 — CTA contextual por `tipoAtendimento`

**Arquivo:** `apps/frontend/src/app/admin/pedidos/_components/_utils.ts:63–78`

```typescript
export function ctaStatus(status: string, tipoAtendimento?: string) {
  if (status === 'PRONTO') {
    if (tipoAtendimento === 'RETIRADA')      return 'Confirmar retirada';
    if (tipoAtendimento === 'CONSUMO_LOCAL') return 'Confirmar consumo';
    return 'Despachar entrega';
  }
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO': return 'Aceitar pedido';
    case 'CONFIRMADO':           return 'Iniciar preparo';
    case 'PREPARANDO':           return 'Marcar pronto';
    case 'SAIU_ENTREGA':         return 'Marcar entregue';
    default:                     return 'Ação indisponível';
  }
}
```

---

#### P1.3 — Divisor visual ativos/encerrados na lista

Na `ListaPedidos`, adicionar um **divisor** entre pedidos ativos e encerrados do dia, com label `"Encerrados hoje"` colapsável por padrão. Pedidos ativos sempre em cima, sem paginação misturada.

---

#### P1.4 — Botão PRONTO bloqueado deve sugerir o próximo passo

Quando `aguardandoEntregador=true` e o botão está bloqueado, exibir inline abaixo do botão:

```
[Despachar entrega — desabilitado]
↳ "Atribua um motoboy na aba Entrega para continuar"
```

---

### P2 — Melhoria de Qualidade

#### P2.1 — Consolidar `FINAL_STATUSES` em `_utils.ts`

Exportar uma única constante `FINAL_STATUSES` de `_utils.ts` e remover as três cópias espalhadas em `page.tsx`.

#### P2.2 — Proteção no detector de "novo pedido"

```typescript
const hasNewOrder = [...currentIds].some((id) => {
  if (knownPedidoIdsRef.current?.has(id)) return false;
  const p = pedidos.find((x) => x.id === id);
  return p && !FINAL_STATUSES.includes(p.status);
});
```

#### P2.3 — Contador de pedidos ativos no título da aba do browser

```typescript
useEffect(() => {
  const ativos = pedidos.filter((p) => !FINAL_STATUSES.includes(p.status)).length;
  document.title = ativos > 0 ? `(${ativos}) Pedidos — Rancho` : 'Pedidos — Rancho';
}, [pedidos]);
```

Atendente com múltiplas abas sabe o que está pendente sem precisar voltar ao cockpit.

---

## 5. Sequência de Implementação Recomendada

```
Semana 1 — P0 (elimina os bugs relatados, ~2h total)
  ├── P0.1  Backend: filtro de janela de dia em listarPedidosAdmin
  ├── P0.2  Frontend: hasSlaDanger excluir EXPIRADO/ABANDONADO
  └── P0.3  Frontend: slaByStatus → Infinity para status finais

Semana 1 — P1 (melhora navegação imediatamente, ~4h total)
  ├── P1.1  labelStatus completo para todos os statuses
  ├── P1.2  ctaStatus contextual por tipoAtendimento
  └── P1.4  Feedback inline no botão bloqueado (PRONTO sem motoboy)

Semana 2 — P1.3 + P2 (refinamento visual e qualidade, ~3h total)
  ├── P1.3  Divisor visual ativos/encerrados na lista
  ├── P2.1  Consolidar FINAL_STATUSES em _utils.ts
  ├── P2.2  Proteção no detector de novo pedido
  └── P2.3  Título da aba com contador de ativos
```

---

## 6. Resumo Executivo

| # | Problema | Severidade | Esforço estimado |
|---|---|---|---|
| P0.1 | Pedidos de ontem na lista padrão | 🔴 Crítico | ~1h |
| P0.2 | SLA e som de EXPIRADO/ABANDONADO | 🔴 Crítico | 15min |
| P0.3 | slaByStatus sem proteção para status finais | 🔴 Crítico | 10min |
| P1.1 | Labels de status quebrados/minúsculos | 🟡 Alto | 15min |
| P1.2 | CTA errado para RETIRADA/CONSUMO_LOCAL | 🟡 Alto | 20min |
| P1.3 | Mistura visual ativos/encerrados na lista | 🟡 Alto | 2h |
| P1.4 | Botão bloqueado sem instrução de próximo passo | 🟡 Alto | 1h |
| P2.1 | FINAL_STATUSES em 3 lugares distintos | 🟢 Baixo | 20min |
| P2.2 | Som de novo pedido para pedidos já encerrados | 🟢 Baixo | 20min |
| P2.3 | Sem contador de ativos no título da aba | 🟢 Baixo | 15min |

> **Os três P0 juntos resolvem ~90% das dores relatadas e levam menos de 2h de implementação.**

---

## 7. Arquivos Afetados

| Arquivo | Alterações |
|---|---|
| `apps/backend/src/services/pedido.service.ts` | P0.1 — filtro de janela de dia em `listarPedidosAdmin` |
| `apps/frontend/src/app/admin/pedidos/page.tsx` | P0.2, P2.2, P2.3 — `hasSlaDanger`, detector de novo pedido, título da aba |
| `apps/frontend/src/app/admin/pedidos/_components/_utils.ts` | P0.3, P1.1, P1.2, P2.1 — `slaByStatus`, `labelStatus`, `ctaStatus`, `FINAL_STATUSES` |
| `apps/frontend/src/app/admin/pedidos/_components/ListaPedidos.tsx` | P1.3 — divisor visual ativos/encerrados |
| `apps/frontend/src/app/admin/pedidos/page.tsx` (seção PRONTO) | P1.4 — feedback inline para botão bloqueado |
