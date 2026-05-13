# App do Entregador — Integrado ao Sistema Rancho

**Data de Criação:** 2026-05-05
**Prioridade:** P1
**Status:** Concluído (com A5 parcial)
**Fase Relacionada:** Geral — Infraestrutura de Entregas

## Contexto

O sistema atual gerencia pedidos, clientes e mineração de leads, mas o entregador
opera de forma manual: recebe o endereço via WhatsApp/papel e traça a rota por conta
própria. Não há visibilidade em tempo real da localização do entregador, nem
agrupamento inteligente de entregas próximas.

A base técnica para este app já está parcialmente construída:
- Clientes têm `lat`, `lng`, `nrinscr` desde 2026-05-05
- Imóveis têm `latitude`, `longitude` no banco (646k registros)
- Backend tem SSE/realtime (`realtime.service.ts`)
- Entregadores (motoboys) já estão no banco (`motoboys`)
- Pedidos têm `bairroEntrega` e `enderecoEntrega`

## Problema

Hoje o entregador:
1. Recebe endereço em texto — sem mapa, sem rota
2. Faz uma entrega por vez — sem agrupamento de pedidos próximos
3. Operador não sabe onde o entregador está — sem rastreio
4. Sem confirmação de entrega — operador fica no escuro

Resultado: entregas mais lentas, mais custo de combustível, operador sobrecarregado
de ligações para confirmar status.

## Escopo Futuro

### A1 — PWA do Entregador (app sem loja de apps)

Aplicativo como Progressive Web App — entregador abre no celular como site,
instala na tela inicial, funciona offline. Sem precisar publicar na Play Store.

**Stack sugerida:** Next.js (já existe no projeto) ou React standalone.

**Telas:**
- Login por telefone (autenticação simples, sem senha — token SMS ou link mágico)
- Fila de entregas do dia (pedidos atribuídos a ele)
- Detalhe do pedido com mapa e botão "Iniciar rota"
- Botão "Confirmar entrega" com foto opcional
- Histórico do dia (entregas feitas, valor acumulado)

---

### A2 — Rotas Agrupadas (agrupamento de pedidos)

**Funcionalidade principal:** agrupar pedidos próximos em uma única saída,
ordenando automaticamente pelo caminho mais eficiente.

**Lógica de agrupamento:**
- Pedidos dentro de um raio configurável (ex: 1.5km entre si) são candidatos ao grupo
- Máximo de N pedidos por rota (configurável pelo operador — ex: 3 ou 4)
- Ordenação por distância mínima (algoritmo do vizinho mais próximo — simples e eficaz)
- Ponto de partida: coordenadas da loja (já salvas em `loja_configuracao`)

**Exemplo visual no cockpit:**
```
Rota #1 — Entregador: Wesley
  📍 Loja (partida)
  → [1] Rua EF5, 195 — Res. Eli Forte      (1.2km)
  → [2] Av. Principal, 430 — Res. Ventana   (0.8km)
  → [3] Rua das Flores, 88 — Jd. Goiás     (1.1km)
  Total: ~3.1km | Estimativa: 25min
```

**Backend:**
- `POST /api/admin/entregas/agrupar` — recebe lista de pedidos pendentes,
  retorna grupos otimizados
- Algoritmo: nearest-neighbor com ponto fixo de partida (loja)
- Sem dependência de API externa — tudo calculado localmente com distância euclidiana
  (suficiente para raios curtos em cidade)

**Frontend (cockpit admin):**
- Botão "Agrupar entregas" no painel de pedidos prontos
- Visualização das rotas no mapa (Leaflet já instalado)
- Atribuição de rota para entregador com um clique

---

### A3 — Rastreio em Tempo Real

- Entregador compartilha localização via GPS do celular (browser API)
- Backend recebe via WebSocket/SSE e repassa para o cockpit
- Operador vê pin do entregador se movendo no mapa em tempo real
- Cliente recebe link de rastreio (página pública simples)

**Tecnologia:** `navigator.geolocation.watchPosition()` no PWA →
POST periódico para `PATCH /api/entregas/:id/localizacao`

---

### A4 — Confirmação de Entrega com Evidência

- Botão "Entregue" no app do entregador
- Opcional: foto da entrega (comprovante)
- Atualiza status do pedido para `ENTREGUE` automaticamente
- Notificação SSE para o cockpit
- Timestamp e coordenada GPS registrados na entrega

---

### A5 — Relatório de Produtividade do Entregador

- Entregas por dia/semana
- Tempo médio por entrega
- Distância total percorrida
- Taxa de confirmação (entregues vs. saíram)
- Ranking entre entregadores (gamificação leve)

---

## Dependências Técnicas

| Dependência | Status |
|---|---|
| `clientes.lat` / `clientes.lng` | ✅ Implementado em 2026-05-05 |
| `loja_configuracao.lat_loja` / `lng_loja` | ✅ Implementado em 2026-05-05 |
| `imoveis_prefeitura` com coordenadas | ✅ 646k registros |
| `motoboys` no banco | ✅ Existe |
| SSE / realtime no backend | ✅ `realtime.service.ts` |
| Leaflet no frontend | ✅ Instalado |
| API de geocodificação de novos clientes | ✅ Implementado em 2026-05-05 |

## Impactos

**Positivos:**
- Entregas mais rápidas — rota otimizada reduz tempo e combustível
- Operador com visibilidade total — sem ligações para confirmar status
- Cliente com rastreio — menos chamados de "cadê meu pedido?"
- Entregador mais produtivo — mais entregas por turno
- Base para cobrar taxa de entrega variável por distância real percorrida

**Negativos/Trade-offs:**
- PWA tem limitações em iOS (geolocalização em background)
- Agrupamento simples (vizinho mais próximo) não é ótimo para 5+ pedidos
  — para volumes maiores considerar algoritmo VRP no futuro
- Requer que entregador tenha smartphone com dados móveis

**Dependências externas opcionais:**
- OSRM ou Google Maps API para rota real por rua (vs. linha reta)
  — pode começar com linha reta e evoluir depois

## Ordem de Implementação Recomendada

1. **A2 — Rotas Agrupadas** (mais impacto imediato, sem precisar do app)
2. **A1 — PWA do Entregador** (tela simples com fila e mapa)
3. **A4 — Confirmação de Entrega**
4. **A3 — Rastreio em Tempo Real**
5. **A5 — Relatório de Produtividade**

## Critério de Pronto Futuro

- [x] Entregador consegue ver seus pedidos do dia no celular (`/entregador/fila`, `/entregador/entregas`)
- [x] Cockpit mostra rotas agrupadas com mapa antes de despachar (`/admin/entregas/page.tsx`)
- [x] Agrupamento por proximidade funciona com ponto de partida da loja (`rotaEntrega.service.ts:agruparRota`)
- [x] Botão "Confirmar entrega" atualiza status no cockpit em tempo real (`POST /entregador/entregas/:id/confirmar` + SSE)
- [x] Operador vê localização aproximada do entregador no mapa (`PATCH /entregador/localizacao` + `MapaRastreio.tsx`)
- [x] Acerto financeiro por entregador (`GET /admin/motoboys/:id/acerto`)
- [ ] Relatório completo de produtividade (entregas/dia, tempo médio, distância, ranking) — A5 parcial

## Estimativa

**Complexidade:** Alta
**Tempo Estimado:** 2–3 semanas (implementação gradual por módulo)

## Notas Adicionais

- Começar pelo A2 (agrupamento de rotas) pois não depende do app —
  já resolve o maior problema operacional hoje com o cockpit existente
- O agrupamento usa as coordenadas que já estão no banco —
  não precisa de nenhuma API externa para começar
- PWA é a escolha certa para evitar Play Store/App Store no curto prazo
- Quando o volume de entregas justificar, evoluir o algoritmo de rota para
  OSRM (open source, auto-hospedado) sem custo de API

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-05-05 | Criação do item | Claude |
| 2026-05-13 | Revisão — A1, A2, A3, A4 totalmente implementados. A5 parcial (só acerto financeiro). Status → Concluído | Claude |

## Status atual da implementação (revisão 2026-05-13)

| Módulo | Status | Arquivos |
|---|---|---|
| **A1** — PWA do Entregador | ✅ Concluído | `apps/frontend/src/app/entregador/{layout,fila,entregas}/page.tsx`, `routes/entregador.routes.ts` |
| **A2** — Rotas Agrupadas | ✅ Concluído | `services/rotaEntrega.service.ts:agruparRota`, `routes/admin.entrega.routes.ts:/agrupar`, `apps/frontend/src/app/admin/entregas/page.tsx` |
| **A3** — Rastreio em Tempo Real | ✅ Concluído | `PATCH /entregador/localizacao`, SSE `/entregador/events`, `MapaRastreio.tsx` |
| **A4** — Confirmação com Evidência | ✅ Concluído | `POST /entregador/entregas/:id/confirmar`, `entregador.controller.ts` |
| **A5** — Relatório de Produtividade | ⚠️ Parcial | `GET /admin/motoboys/:id/acerto` (apenas acerto financeiro). Falta: tempo médio, distância total, ranking, gamificação |

**Pendência residual:** completar A5 (relatório operacional além do financeiro). Pode virar item separado no backlog quando justificar.
