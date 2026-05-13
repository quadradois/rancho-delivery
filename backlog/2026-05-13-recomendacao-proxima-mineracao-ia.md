# Recomendação de Próxima Mineração com IA

**Data de Criação:** 2026-05-13
**Prioridade:** P2
**Status:** Pendente
**Fase Relacionada:** F02

## Contexto

Originado do **Raio-X Operacional do Módulo de Mineração Outbound** (`docs/raio-x/Raio X Operacional/2026-05-12_raio_x_operacional_mineracao_outbound.md`, item #10 do Top 10).

Após uma sessão completa de melhorias na mineração (refactor scraping → Geo360, IA gerando mensagens, score de qualidade, agendamento, retry inteligente, dashboard de engajamento), 9 dos 10 problemas críticos foram resolvidos. O item #10 ficou para depois por exigir massa crítica de dados históricos que ainda não temos.

## Problema

Hoje, ao concluir uma mineração + campanha bem-sucedida, o operador fica sem direção sobre **qual o próximo bairro/setor a minerar**. As decisões são feitas no "olhômetro" — escolhe um bairro adjacente sem critério objetivo. Resultado:

- Cobertura desigual da região (alguns bairros mineraram 3x, outros zero)
- Dispersão de esforço (campanhas em bairros de baixa conversão)
- Sem aprendizado: campanhas que deram resultado não influenciam a próxima escolha
- Operador novo não tem como saber por onde começar

A oportunidade é usar IA + dados de conversão histórica para sugerir o próximo passo de forma proativa.

## Escopo Futuro

### 1. Agregação de métricas por bairro/setor
- Computar para cada bairro:
  - Total de leads minerados (`LeadMarketing.bairro`)
  - Total de mensagens enviadas (campanhas)
  - Taxa de resposta (mensagens respondidas / enviadas)
  - Taxa de conversão (leads que viraram clientes / leads minerados)
  - Pedidos médios por cliente convertido
  - Distância média até a loja
- Persistir em uma tabela `MetricasBairro` ou view materializada, atualizada a cada N minutos

### 2. Endpoint de recomendação
- `GET /admin/mineracao/recomendacao-proxima`
- Retorna 3 sugestões priorizadas:
  - **"Replicar sucesso"** — bairro adjacente ao de melhor conversão
  - **"Explorar nova região"** — bairro com cobertura zero e alta densidade de imóveis com CPF
  - **"Retomar bairro"** — bairro minerado há > 60 dias com bons resultados originais

### 3. UI: Card "Próximo passo" no dashboard de mineração
- Aparece após concluir uma campanha
- Mostra as 3 sugestões com justificativa:
  - "Bairro X teve 18% de conversão. Sugerimos minerar Y (adjacente, 1200 imóveis sem cobertura)"
  - Botão "Minerar este bairro" — pula direto para a busca já preenchida

### 4. IA gerando justificativa em linguagem natural
- Claude recebe os números e produz a explicação:
  - "Você converteu 32 leads no Setor Bueno. O Setor Bueno II é adjacente, tem 847 imóveis com CPF cadastrado e ainda não recebeu nenhuma campanha — boa chance de replicar o resultado."

## Impactos

**Positivos:**
- Operador deixa de escolher no "olhômetro" — passa a ter direção objetiva
- Cobertura territorial mais estratégica (priorizando ROI esperado)
- Aprendizado contínuo: campanhas que convertem aumentam o peso do bairro adjacente
- Reduz curva de aprendizado de operadores novos

**Negativos/Trade-offs:**
- Requer massa crítica de dados (mínimo ~10 campanhas concluídas para ter sinal)
- Sugestões iniciais podem ser pobres se o histórico for pequeno
- Risco de viés: bairros já minerados ganham mais peso, esquecendo a exploração de novos
- Custo adicional de tokens Anthropic por consulta de IA

**Dependências:**
- ✅ Mineração funcional (já implementado)
- ✅ Geo360 com bairros e CPFs (já implementado)
- ✅ Tabela `LeadMarketing` com origem (já implementado)
- ✅ Tabela `CampanhaMarketing` com métricas de envio (já implementado)
- ✅ ANTHROPIC_API_KEY configurada (já implementado)
- ⏳ **Histórico real de pelo menos ~5-10 campanhas com leads convertidos**
- ⏳ Lógica de conversão lead→cliente já está no `dispararCampanha` mas precisa rodar em volume

## Critério de Pronto Futuro

- [ ] Tabela `MetricasBairro` (ou view) com agregações por bairro
- [ ] Job/worker que recomputa as métricas a cada 6h
- [ ] Endpoint `GET /admin/mineracao/recomendacao-proxima` retornando 3 sugestões com justificativa
- [ ] Card "Próximo passo" no admin/mineracao com as sugestões
- [ ] Botão "Minerar este bairro" que pula direto para step 1 com termo preenchido
- [ ] Texto da justificativa gerado pela IA (Claude Sonnet, prompt sistema dedicado)
- [ ] Pelo menos 1 das 3 sugestões deve ser "explorar nova região" (evita viés de só replicar)
- [ ] Documentação no `/docs/modulos/`

## Estimativa

**Complexidade:** Alta
**Tempo Estimado:** 3-5 dias

## Notas Adicionais

### Justificativa de adiamento

O item entra no backlog em vez de ser implementado imediatamente porque:

1. **Falta de dados:** sem ~5-10 campanhas reais concluídas, a IA não tem o que recomendar com base estatística. Recomendar com 1-2 campanhas pode gerar sugestões piores que o "olhômetro" do operador.

2. **ROI dependente:** o valor só se materializa quando o operador faz minerações periódicas. Hoje (maio/2026) ainda estamos validando o fluxo end-to-end. Implementar antes da validação corre risco de retrabalho.

3. **Outros itens com ROI imediato:** os outros 9 itens do raio-x já entregam impacto sem precisar de dados históricos.

### Próximo gatilho para revisar

Quando o admin tiver:
- ✅ Pelo menos 10 campanhas concluídas (`status = CONCLUIDA`)
- ✅ Pelo menos 5 conversões reais (`LeadStatus.CONVERTIDO`)
- ✅ Histórico de ≥ 30 dias de mineração ativa

→ Repriorizar este item para P1.

### Referências cruzadas

- Raio-X: [docs/raio-x/Raio X Operacional/2026-05-12_raio_x_operacional_mineracao_outbound.md](../docs/raio-x/Raio%20X%20Operacional/2026-05-12_raio_x_operacional_mineracao_outbound.md)
- Top 10 Oportunidades, item #9: "Recomendação de próxima mineração — IA sugere bairro adjacente com melhor potencial"
- Tabela relacionada: `LeadMarketing`, `CampanhaMarketing`, `ExecucaoMineracao`

### Sketches de implementação

**Prompt do sistema (Claude):**
```
Você é um analista de marketing territorial do Rancho Delivery.
Com base nas métricas a seguir, recomende 3 próximas minerações:
- 1 "replicar sucesso" (bairro adjacente ao de melhor conversão)
- 1 "explorar nova região" (alta densidade, zero cobertura)
- 1 "retomar bairro" (bom histórico, > 60 dias parado)

Para cada uma, escreva 1 frase justificando com os números reais.
Não invente números — use apenas os fornecidos.
```

**Estrutura de retorno:**
```json
{
  "sugestoes": [
    {
      "tipo": "replicar_sucesso",
      "bairro": "Setor Bueno II",
      "imoveisDisponiveis": 847,
      "justificativa": "Bueno I converteu 18%. Bueno II é adjacente e tem 847 imóveis sem cobertura."
    },
    ...
  ]
}
```

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-05-13 | Criação do item — adiado da sessão de melhorias UX da mineração | Claude (sessão 2026-05-13) |
