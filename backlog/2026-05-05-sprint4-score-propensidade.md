# Sprint 4 — Score de Propensidade de Leads

**Data de Criação:** 2026-05-05
**Prioridade:** P1
**Status:** Pendente
**Fase Relacionada:** F02 — Mineração de contatos

## Contexto

Os Sprints 1, 2 e 3 do módulo de mineração foram concluídos. O Sprint 4 foi planejado
mas **não pode ser iniciado ainda** por falta de dados históricos de conversão.

O sistema tem hoje 854 leads e **0 conversões** registradas. O score de propensidade
exige mínimo de 50 conversões em pelo menos 5 bairros distintos para ter sinal
estatístico confiável.

A documentação completa das tarefas está em:
`/var/www/rancho-delivery/docs/tarefas/04-sprint-score.md`

## Problema

Hoje todos os leads têm o mesmo peso na hora de criar campanhas. Não sabemos quais
têm maior chance de virar cliente. Um score baseado em dados históricos permite
priorizar os leads mais quentes e reduzir custo por aquisição.

## Escopo Futuro

### S4-T1 — Cálculo e armazenamento do score por lead

- Adicionar campos `score` (0–100) e `score_calc_em` na tabela `leads_marketing`
- Criar `apps/backend/src/services/leadScore.service.ts` com fórmula:
  ```
  score = (taxa_conversao_bairro × 50%)
        + (taxa_conversao_tipo_imovel × 20%)
        + (proximidade_clientes_ativos × 20%)
        + (score_base × 10%)
  ```
- Job semanal de recálculo automático de todos os leads ativos
- Endpoint manual: `POST /admin/mineracao/leads/recalcular-scores`
- Recalcular score automaticamente após cada mineração

### S4-T2 — Filtro de score na UI e campanhas

- `GET /admin/mineracao/leads?scoreMinimo=60` — filtro no backend
- `POST /admin/mineracao/campanhas` — respeitar `filtro.scoreMinimo`
- Slider de score na etapa 3 do wizard (Resultado) com contagem de leads elegíveis em tempo real
- Badge colorido na lista de leads:
  - 80–100 → verde "QUENTE"
  - 60–79  → amarelo "MÉDIO"
  - < 60   → cinza "FRIO"

## Pré-requisito obrigatório antes de iniciar

Rodar no banco e confirmar antes de começar qualquer tarefa:

```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'CONVERTIDO' THEN 1 END) as convertidos,
  COUNT(DISTINCT bairro) as bairros_com_dado
FROM leads_marketing
WHERE bairro IS NOT NULL;
```

**Critério mínimo:** `convertidos >= 50` E `bairros_com_dado >= 5`.
Score com dados insuficientes gera ruído, não sinal — não iniciar antes disso.

## Impactos

**Positivos:**
- Campanhas mais eficientes — menos envios, mais conversões
- Redução do custo por aquisição
- Operador tem visibilidade clara de quais leads priorizar
- Base para evoluir para ML no futuro quando houver volume

**Negativos/Trade-offs:**
- Score baseado em regras simples — pode não capturar nuances
- Depende de volume de dados que só vem com tempo de operação
- Risco de viés: bairros com poucos dados ficam neutros (score 50)

**Dependências:**
- Mínimo 50 conversões no banco (`leads_marketing.status = 'CONVERTIDO'`)
- Clientes com `lat`/`lng` para o componente de proximidade funcionar
  (já implementado na tabela `clientes` em 2026-05-05)
- Sprints 1, 2 e 3 concluídos ✅

## Critério de Pronto Futuro

- [ ] Verificação de dados: `convertidos >= 50` antes de iniciar
- [ ] Campo `score` populado para todos os leads ativos
- [ ] Score sempre entre 0 e 100 (nunca fora do range)
- [ ] Leads sem bairro recebem score 50 (neutro, não zero)
- [ ] Job semanal de recálculo rodando e confirmado nos logs
- [ ] Slider de score na UI funcionando com contagem em tempo real
- [ ] Campanhas respeitam filtro de score mínimo
- [ ] Badge de score visível na lista de leads
- [ ] Documentar o que o score mede (para futuros devs)

## Estimativa

**Complexidade:** Média
**Tempo Estimado:** 2–3 dias de dev

## Notas Adicionais

- Documentação completa (especificação técnica detalhada):
  `/var/www/rancho-delivery/docs/tarefas/04-sprint-score.md`
- A fórmula é propositalmente simples (sem ML). Não complicar antes de ter dados.
- O componente de proximidade (`scoreProximidadeClientes`) já tem a infra pronta:
  clientes agora têm `lat`/`lng` desde 2026-05-05.
- Quando `convertidos` atingir 50, revisar este item e mover para "Pronto para Implementar".

### Distinção importante: score já implementado em 2026-05-13 é DIFERENTE deste

Em 2026-05-13 foi implementado um **score de qualidade dos IPTUs** (`mineracao.service.ts:calcularScoreLead`)
que NÃO depende de dados de conversão. Ele mede a **probabilidade técnica de obter telefone** baseado em:
- CPF presente no Geo360 (+30)
- Nome presente (+20)
- Telefone já no cache Assertiva (+50) ou ainda não consultado (+30) ou Assertiva sem retorno (-20)

Esse score é mostrado como tag colorida (Alta/Média/Baixa) na lista de IPTUs e permite "Selecionar score alto"
antes de gastar consultas Assertiva.

**Diferença para este item:** o score deste backlog (S4) usa **dados de conversão histórica por bairro/tipo**
e exige `convertidos >= 50`. Os dois podem coexistir no futuro:
- Score técnico (já implementado): probabilidade de obter telefone
- Score de propensidade (este backlog): probabilidade do lead virar cliente

### Itens relacionados no backlog

- [`2026-05-13-recomendacao-proxima-mineracao-ia.md`](2026-05-13-recomendacao-proxima-mineracao-ia.md) —
  outro item adiado por falta de dados de conversão. Provavelmente devem ser implementados juntos
  quando o critério mínimo for atingido (~10 campanhas concluídas + ~50 conversões).

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-05-05 | Criação do item — Sprint 4 adiado por falta de dados (0 conversões) | Claude |
| 2026-05-13 | Revisão — adicionada distinção entre score técnico (já implementado) e score de propensidade (este item, ainda pendente). Linkado com item de recomendação de mineração. | Claude |
