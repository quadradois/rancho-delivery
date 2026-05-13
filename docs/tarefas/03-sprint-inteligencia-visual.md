# Sprint 3 — Inteligência Visual: Mapa + Analytics de Território
**Objetivo:** Transformar os 704 mil imóveis do banco em inteligência geográfica visual.
**Pré-requisito:** Sprint 1 e Sprint 2 concluídos. Mínimo 30 dias de dados coletados.
**Estimativa total:** ~4-5 dias de dev

> **Por que esperar dados?**
> O mapa de penetração só faz sentido quando há clientes com endereço no banco.
> Hoje temos 7 clientes. Com 30 dias de operação + IA de conversação (Sprint 2),
> esperamos ter 50-200 clientes ativos — suficiente para o mapa ser útil.

---

## Tarefas

---

### S3-T1 — Ativar geometria na API GIS e salvar coordenadas

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 3h
**Prioridade:** 🔴 Alta (bloqueador para S3-T2)
**Depende de:** Sprint 1 concluído

#### Contexto

A API GIS da Prefeitura de Goiânia é um servidor **ArcGIS FeatureServer**. O código atual
passa `returnGeometry: false` na query, ignorando as coordenadas dos imóveis.

Mudando para `returnGeometry: true`, cada imóvel retorna com geometria do tipo Point
contendo `x` (longitude) e `y` (latitude) no sistema de coordenadas SIRGAS 2000.

**Confirmado:** A API suporta geometria. Foi testado manualmente — os campos existem.

#### Campos de coordenada a adicionar no schema Prisma

Em `apps/backend/prisma/schema.prisma`, no model `ImovelPrefeitura`:

```prisma
  latitude     Float?
  longitude    Float?
```

Migration:
```bash
npx prisma migrate dev --name add_coordenadas_imovel
```

#### Arquivo a modificar
`apps/backend/src/services/mineracao.service.ts`

Função `consultarMapaPrefeitura()`:

1. Mudar `returnGeometry: 'false'` → `returnGeometry: 'true'`

2. Ao salvar cada imóvel, extrair coordenadas da resposta:
   ```typescript
   // A resposta do ArcGIS tem o formato:
   // feature.geometry.x (longitude)
   // feature.geometry.y (latitude)
   // O sistema de referência é o da camada (verificar spatialReference.wkid)
   // Se wkid = 4326: já é WGS84 (lat/lng padrão)
   // Se for outro (ex: 31982 SIRGAS): precisa converter
   ```

3. Em `salvarImoveisPrefeitura()`, incluir `latitude` e `longitude` no upsert

#### Atenção — sistema de coordenadas

Testar com 1 imóvel primeiro e verificar o `spatialReference.wkid` da resposta.
- Se `wkid = 4326`: coordenadas prontas para uso
- Se `wkid = 31982` (SIRGAS 2000 UTM Zona 22S): precisa reprojetar
  - Biblioteca: `proj4` (`npm install proj4 @types/proj4`)
  - Goiânia está na Zona 22S (longitude ~49°W)

#### Critério de aceite
- [ ] `imoveis_prefeitura.latitude` e `.longitude` populados para imóveis sincronizados
- [ ] Coordenadas de Goiânia: latitude entre -16.8 e -16.6, longitude entre -49.4 e -49.1
- [ ] Imóveis sem geometria na API: `latitude = null, longitude = null` (não bloqueantes)
- [ ] Performance: sincronização de 1.000 imóveis em < 60s

---

### S3-T2 — Mapa de penetração por bairro

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 6h
**Prioridade:** 🔴 Alta
**Depende de:** S3-T1 (coordenadas no banco)

#### Contexto

O mapa mostra **onde estão os clientes** e **onde estão as oportunidades**.
Bairros com poucos ou nenhum cliente aparecem brancos — oportunidade virgem.
O operador clica num bairro branco → sistema inicia mineração automaticamente.

#### Instalação (frontend)
```bash
cd apps/frontend
npm install leaflet react-leaflet @types/leaflet
```

#### Endpoint a criar (backend)
`GET /admin/mineracao/mapa/cobertura`

Retorna dados agregados por bairro para o mapa:
```json
{
  "bairros": [
    {
      "nome": "Setor Bueno",
      "totalImoveis": 4821,
      "totalLeads": 312,
      "totalClientes": 18,
      "taxaPenetracao": 0.37,
      "centroide": { "lat": -16.7023, "lng": -49.2734 },
      "nivelCobertura": "MEDIO"   // VIRGEM | BAIXO | MEDIO | ALTO
    }
  ]
}
```

Para calcular o centróide de cada bairro: `AVG(latitude), AVG(longitude)` dos imóveis
do bairro. Simples e suficiente para posicionar o marcador.

#### Arquivo a criar (frontend)
`apps/frontend/src/app/admin/mineracao/components/MapaCobertura.tsx`

```tsx
'use client';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';

// Cor por nível de cobertura:
// VIRGEM  → branco/cinza  (oportunidade máxima)
// BAIXO   → amarelo       (potencial)
// MEDIO   → laranja       (em andamento)
// ALTO    → verde         (território consolidado)

// Ao clicar num bairro VIRGEM ou BAIXO:
// → Abre modal: "Minerar [Nome do Bairro]? (X imóveis)"
// → Confirmar → chama POST /admin/mineracao/executar
//   com modo=bairro, termo=[nome]
```

**Atenção com SSR:** Leaflet não funciona no servidor. Usar:
```tsx
const MapaCobertura = dynamic(
  () => import('./components/MapaCobertura'),
  { ssr: false }
);
```

#### Critério de aceite
- [ ] Mapa carrega centralizado em Goiânia (-16.6864, -49.2643)
- [ ] Cada bairro aparece como círculo com cor proporcional à penetração
- [ ] Hover no círculo: tooltip com nome do bairro, total de imóveis, leads e clientes
- [ ] Clique em bairro VIRGEM: abre confirmação de mineração
- [ ] Mapa não quebra se não há dados (estado vazio com mensagem)
- [ ] Carregamento: dados do mapa em < 2s (query com GROUP BY, não carregar todos os imóveis)

---

### S3-T3 — Dashboard de analytics de território

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 4h
**Prioridade:** 🟡 Média
**Depende de:** S2-T3 (funil de ROI deve estar pronto)

#### Contexto

Complementa o mapa com gráficos que respondem: "Onde vale a pena investir mais?",
"Qual campanha trouxe mais retorno?", "Qual bairro tem o maior LTV?"

#### Instalação (frontend)
```bash
cd apps/frontend
npm install recharts
```

#### Endpoint a criar (backend)
`GET /admin/mineracao/analytics`

Query params: `periodo=30d|90d|all`

Resposta:
```json
{
  "periodo": "30d",
  "resumo": {
    "totalLeads": 302,
    "totalConvertidos": 18,
    "taxaConversaoGeral": "5.9%",
    "ticketMedioLeadsConvertidos": 47.50,
    "custoMedioAquisicao": 8.20
  },
  "porBairro": [
    {
      "bairro": "Res. Ventana",
      "leads": 259,
      "convertidos": 8,
      "taxaConversao": "3.1%",
      "ltv": 312.00
    }
  ],
  "porCampanha": [
    {
      "campanhaId": "...",
      "nome": "Res. Ventana - Mai/26",
      "enviados": 142,
      "convertidos": 8,
      "roi": "42.3x"
    }
  ],
  "evolucaoSemanal": [
    { "semana": "2026-W18", "novosLeads": 45, "conversoes": 3 }
  ]
}
```

#### Arquivo a criar (frontend)
`apps/frontend/src/app/admin/mineracao/components/AnalyticsTerritorios.tsx`

Gráficos a implementar:
1. **Barras horizontais** — Conversão por bairro (ordenado por taxa)
2. **Linha temporal** — Novos leads vs. conversões por semana
3. **Cards de métricas** — Total leads, taxa conversão, LTV médio, CAC

#### Critério de aceite
- [ ] Dashboard carrega em < 1.5s
- [ ] Gráficos são responsivos (funcionam em tela de laptop e monitor)
- [ ] Estado vazio: "Sem dados para o período selecionado"
- [ ] Filtro de período funciona (30d / 90d / tudo)

---

## Checklist final do Sprint 3

- [ ] S3-T1: Coordenadas nos imóveis — confirmado em produção
- [ ] S3-T2: Mapa carrega sem erro — testado em Chrome e Firefox
- [ ] S3-T2: Clique em bairro dispara mineração corretamente
- [ ] S3-T3: Gráficos exibem dados reais (não mock)
- [ ] Nenhuma biblioteca nova adicionada além de `leaflet`, `react-leaflet`, `recharts`
- [ ] Mapa com SSR desabilitado (não quebra no build)

## Notas do dev (preencher ao trabalhar)

```
Data:
Dev:
Observações:


```
