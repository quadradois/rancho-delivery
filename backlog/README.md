# Backlog do Projeto Rancho

Este diretório centraliza **tarefas pendentes**, ideias de melhoria e mudanças planejadas para versões futuras.

## Objetivo

Evitar perda de contexto e garantir que decisões de adiar implementação fiquem registradas com clareza.

## Quando usar

Use o backlog quando:
- uma demanda for importante, mas **não prioritária agora**;
- houver risco de esquecer uma melhoria futura;
- a equipe decidir manter foco em produção e adiar mudanças estruturais.

## Como usar

1. Crie um arquivo markdown para cada item pendente.
2. Nomeie no padrão:
   - `YYYY-MM-DD-slug-curto.md`
3. Preencha os campos mínimos:
   - Contexto
   - Problema
   - Escopo futuro
   - Impactos
   - Critério de pronto futuro
   - Prioridade
   - Status

## Status recomendados

- `Pendente`
- `Refinar`
- `Pronto para Implementar`
- `Em Implementação`
- `Concluído`
- `Descartado`

## Prioridade recomendada

- `P0` crítico
- `P1` alto
- `P2` médio
- `P3` baixo

## Consulta rápida

Sempre que houver pergunta sobre "tarefas pendentes", "o que ficou para depois" ou "próximas melhorias", consulte este diretório primeiro.

---

## Template para Novos Itens

Ao criar um novo item no backlog, use o template abaixo:

```markdown
# [Título do Item]

**Data de Criação:** YYYY-MM-DD
**Prioridade:** [P0 | P1 | P2 | P3]
**Status:** [Pendente | Refinar | Pronto para Implementar | Em Implementação | Concluído | Descartado]
**Fase Relacionada:** [F01 | F02 | F03 | F04 | F05 | F06 | Geral]

## Contexto

[Descreva o contexto que originou esta demanda. Por que isso surgiu?]

## Problema

[Qual problema específico este item resolve ou qual oportunidade ele representa?]

## Escopo Futuro

[O que precisa ser feito? Descreva a solução ou melhoria proposta.]

## Impactos

**Positivos:**
- [Benefício 1]
- [Benefício 2]

**Negativos/Trade-offs:**
- [Trade-off 1]
- [Trade-off 2]

**Dependências:**
- [Dependência 1]
- [Dependência 2]

## Critério de Pronto Futuro

- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## Estimativa

**Complexidade:** [Baixa | Média | Alta]
**Tempo Estimado:** [X dias/semanas]

## Notas Adicionais

[Qualquer informação adicional relevante, links, referências, etc.]

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| YYYY-MM-DD | Criação do item | [Nome] |
```

---

## Organização por Prioridade

### P0 - Crítico
Itens que bloqueiam funcionalidades essenciais ou representam riscos graves.

### P1 - Alto
Melhorias importantes que agregam valor significativo ao produto.

### P2 - Médio
Melhorias desejáveis que podem ser implementadas quando houver capacidade.

### P3 - Baixo
Nice-to-have, ideias interessantes mas não urgentes.

---

## Organização por Fase

Itens do backlog podem ser organizados por fase do projeto:

- **F01** — Site de pedidos
- **F02** — Mineração de contatos
- **F03** — Agente WhatsApp
- **F04** — Ficha técnica e precificação
- **F05** — Retenção com roleta
- **F06** — Indicação com bonificação
- **Geral** — Melhorias transversais ou infraestrutura

---

## Fluxo de Vida de um Item

```
Pendente
   ↓
Refinar (análise técnica, estimativa, priorização)
   ↓
Pronto para Implementar (especificação completa)
   ↓
Em Implementação (desenvolvimento ativo)
   ↓
Concluído (entregue e validado)

   ou

Descartado (não faz mais sentido)
```

---

## Revisão do Backlog

**Frequência recomendada:** ao final de cada fase do projeto

**Checklist de revisão:**
- [ ] Itens "Pendente" ainda fazem sentido?
- [ ] Prioridades estão atualizadas?
- [ ] Há itens que podem ser descartados?
- [ ] Há itens prontos para implementar na próxima fase?
- [ ] Estimativas ainda são válidas?

---

## Exemplos de Itens do Backlog

### Exemplo 1: Melhoria de Performance
`2026-05-15-otimizacao-feed-cardapio.md`
- **Prioridade:** P2
- **Status:** Pendente
- **Fase:** F01

### Exemplo 2: Nova Funcionalidade
`2026-06-01-historico-pedidos-cliente.md`
- **Prioridade:** P1
- **Status:** Refinar
- **Fase:** F01

### Exemplo 3: Correção Técnica
`2026-04-30-refatorar-validacao-bairros.md`
- **Prioridade:** P3
- **Status:** Pendente
- **Fase:** F01

---

## Integração com Documentação

Itens do backlog que forem aprovados para implementação devem:

1. Passar pelo filtro do **GUARDIAO_SABOR_EXPRESS.md**
2. Se aprovados, migrar para **PLANEJAMENTO_SABOR_EXPRESS.md**
3. Receber especificação técnica em **docs/modulos/**
4. Ter o item do backlog atualizado para status "Em Implementação"
5. Ao concluir, atualizar para "Concluído" com link para a documentação final

---

## Boas Práticas

1. **Seja específico:** evite itens genéricos como "melhorar performance"
2. **Um item, um objetivo:** não misture múltiplas demandas em um único item
3. **Mantenha atualizado:** revise e atualize status regularmente
4. **Documente decisões:** se um item for descartado, explique o motivo
5. **Use links:** conecte itens relacionados do backlog entre si
6. **Priorize com dados:** use métricas e feedback real para priorizar

---

## Consulta Rápida por Categoria

### Performance
Itens relacionados a otimização, velocidade, escalabilidade.

### UX/UI
Melhorias na experiência do usuário e interface.

### Integrações
Novas integrações com serviços externos.

### Infraestrutura
Melhorias em deploy, monitoramento, segurança.

### Funcionalidades
Novas features ou expansão de features existentes.

### Refatoração
Melhorias técnicas sem impacto funcional visível.

### Bugs Conhecidos
Bugs identificados mas não críticos para correção imediata.

---

*Documento vivo — atualizar conforme o projeto evolui.*
