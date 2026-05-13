# Sprint 4 — Score de Propensidade
**Objetivo:** Usar dados históricos para priorizar os leads com maior chance de conversão.
**Pré-requisito:** Sprints 1, 2 e 3 concluídos. **Mínimo 90 dias de dados de conversão.**
**Estimativa total:** ~2-3 dias de dev

> **⚠️ LEIA ANTES DE COMEÇAR:**
> Este sprint não deve ser iniciado sem dados suficientes.
> Rodar `SELECT COUNT(*) FROM leads_marketing WHERE status = 'CONVERTIDO'`
> Se retornar < 50 conversões: **aguardar mais tempo de operação.**
> Score com dados insuficientes gera ruído, não sinal.

---

## Lógica do Score (sem ML complexo)

A abordagem é propositalmente simples: **taxa de conversão histórica por atributo**.

Não usamos regressão logística nem modelos de ML — isso exige volume de dados e
manutenção que não compensa agora. Um score baseado em regras, alimentado por dados
reais, é mais confiável e muito mais fácil de debugar.

### Fórmula do Score (0 a 100)

```
score = (peso_bairro × 0.50) +
        (peso_tipo_imovel × 0.20) +
        (peso_distancia_cliente × 0.20) +
        (peso_dia_semana_mineracao × 0.10)
```

Cada componente é uma taxa de conversão normalizada:
- `peso_bairro`: % de leads do mesmo bairro que já converteram
- `peso_tipo_imovel`: apartamento converte mais que lote? Usar histórico
- `peso_distancia_cliente`: imóveis próximos a clientes ativos convertem mais
- `peso_dia_semana`: leads minerados em dias com mais pedidos tendem a converter mais

---

## Tarefas

---

### S4-T1 — Cálculo e armazenamento do score por lead

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 4h
**Prioridade:** 🔴 Alta
**Depende de:** 90 dias de dados + Sprint 3 concluído

#### Pré-verificação obrigatória

Antes de iniciar, rodar no banco:
```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'CONVERTIDO' THEN 1 END) as convertidos,
  COUNT(DISTINCT bairro) as bairros_com_dado
FROM leads_marketing
WHERE bairro IS NOT NULL;
```

Se `convertidos < 50` ou `bairros_com_dado < 5`: **não iniciar esta tarefa ainda.**

#### Campo a adicionar no schema

Em `apps/backend/prisma/schema.prisma`, model `LeadMarketing`:
```prisma
  score         Int?     @default(null)  // 0-100, null = não calculado
  scoreCalcEm   DateTime? @map("score_calc_em")
```

Migration:
```bash
npx prisma migrate dev --name add_lead_score
```

#### Arquivo novo a criar
`apps/backend/src/services/leadScore.service.ts`

```typescript
import prisma from '../config/database';

interface ScoreParams {
  bairro?: string | null;
  tipoImovel?: string | null; // 'APARTAMENTO' | 'CASA' | 'COMERCIAL' | null
  lat?: number | null;
  lng?: number | null;
}

export async function calcularScore(params: ScoreParams): Promise<number> {
  // 1. Score por bairro (peso 50%)
  const scoreBairro = params.bairro
    ? await taxaConversaoPorBairro(params.bairro)
    : 50; // sem bairro = neutro

  // 2. Score por tipo de imóvel (peso 20%)
  const scoreTipo = params.tipoImovel
    ? await taxaConversaoPorTipo(params.tipoImovel)
    : 50;

  // 3. Score por proximidade a clientes (peso 20%)
  const scoreProximidade =
    params.lat && params.lng
      ? await scoreProximidadeClientes(params.lat, params.lng)
      : 50;

  // 4. Score base (peso 10%) — leads recentes têm leve vantagem
  const scoreBase = 50;

  const score = Math.round(
    scoreBairro * 0.5 +
    scoreTipo * 0.2 +
    scoreProximidade * 0.2 +
    scoreBase * 0.1
  );

  return Math.min(100, Math.max(0, score));
}

async function taxaConversaoPorBairro(bairro: string): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ total: bigint; convertidos: bigint }>>`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'CONVERTIDO' THEN 1 END) as convertidos
    FROM leads_marketing
    WHERE bairro = ${bairro}
  `;
  const { total, convertidos } = result[0];
  if (Number(total) < 5) return 50; // dados insuficientes = neutro
  return Math.round((Number(convertidos) / Number(total)) * 100);
}

async function taxaConversaoPorTipo(tipo: string): Promise<number> {
  // Implementar quando houver campo de tipo de imóvel no lead
  // Por ora retorna neutro
  return 50;
}

async function scoreProximidadeClientes(lat: number, lng: number): Promise<number> {
  // Conta clientes em raio de 500m (usando distância euclidiana aproximada)
  const raio = 0.005; // ~500m em graus decimais na latitude de Goiânia
  const clientesProximos = await prisma.cliente.count({
    where: {
      // Quando clientes tiverem lat/lng (futura melhoria)
      // Por ora retorna neutro
    },
  });
  return clientesProximos > 0 ? Math.min(100, 50 + clientesProximos * 10) : 50;
}

export async function recalcularTodosScores(): Promise<void> {
  const leads = await prisma.leadMarketing.findMany({
    where: { status: 'ATIVO' },
    select: { id: true, bairro: true },
  });

  for (const lead of leads) {
    const score = await calcularScore({ bairro: lead.bairro });
    await prisma.leadMarketing.update({
      where: { id: lead.id },
      data: { score, scoreCalcEm: new Date() },
    });
  }
}
```

#### Quando recalcular o score

1. **Após cada mineração:** calcular score dos novos leads
2. **Semanalmente (job):** recalcular todos os leads ativos (taxas mudam com o tempo)
3. **Endpoint manual:** `POST /admin/mineracao/leads/recalcular-scores`

#### Critério de aceite
- [ ] Campo `score` populado para todos os leads ativos após migração
- [ ] Score de 0 a 100 (nunca fora do range)
- [ ] Leads sem bairro recebem score 50 (neutro, não zero)
- [ ] Score é recalculado automaticamente toda semana

---

### S4-T2 — Filtro de score na UI e na criação de campanhas

**Status:** `TODO`
**Assignee:** —
**Estimativa:** 3h
**Prioridade:** 🟡 Média
**Depende de:** S4-T1

#### O que implementar

**Backend — filtro por score mínimo nos leads:**

Em `GET /admin/mineracao/leads`, adicionar query param `scoreMinimo`:
```
GET /admin/mineracao/leads?scoreMinimo=60&status=ATIVO
```

Em `POST /admin/mineracao/campanhas`, respeitar filtro por score:
```json
{
  "nome": "Campanha Leads Premium",
  "filtro": { "scoreMinimo": 70 },
  "mensagem": "..."
}
```

**Frontend — slider de score na criação de campanha:**

Na etapa 3 do wizard (Resultado), antes de criar a campanha:
```
Filtrar leads por score mínimo:
[════════════════○══] 60
  Leads elegíveis: 87 de 302 (29%)
  Score médio: 74
```

- Slider de 0 a 100
- Ao mover o slider: atualiza em tempo real quantos leads serão incluídos
- Default: 50 (neutro — inclui todos)
- Recomendação visual: "Recomendamos score ≥ 60 para melhor conversão"

**Frontend — badge de score na lista de leads:**

Na listagem de leads, exibir badge colorido:
- Score 80-100: badge verde "QUENTE"
- Score 60-79: badge amarelo "MÉDIO"
- Score < 60: badge cinza "FRIO"

#### Critério de aceite
- [ ] Slider filtra leads em tempo real sem recarregar a página
- [ ] Campanha criada com `scoreMinimo: 70` só inclui leads com score ≥ 70
- [ ] Badge de score visível na lista de leads
- [ ] Se scoreMinimo resulta em 0 leads: avisa antes de criar campanha vazia

---

## Checklist final do Sprint 4

- [ ] Verificação de dados: `convertidos >= 50` antes de iniciar
- [ ] S4-T1: Score calculado para todos os leads ativos
- [ ] S4-T1: Job semanal de recálculo rodando
- [ ] S4-T2: Slider de score na UI funcionando
- [ ] S4-T2: Campanhas respeitam filtro de score
- [ ] Documentar: "O que o score mede?" nos docs (para futuros devs entenderem)

## Notas do dev (preencher ao trabalhar)

```
Data:
Dev:
Observações:


```
