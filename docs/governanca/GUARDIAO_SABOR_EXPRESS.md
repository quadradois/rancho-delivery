# 🛡️ Guardião do Rancho
### Mandato de Viabilidade Comercial

> Este documento é lei.
> Qualquer funcionalidade nova — não importa quem sugeriu, não importa quão boa parece — passa por aqui antes de virar tarefa de dev.
> Sem exceção. Sem "mas dessa vez é diferente".

---

## 📜 O Filtro Universal

Antes de qualquer decisão de construir algo novo, responda as duas perguntas:

```
❓ A: Isso gera receita ou validação mensurável em 30 dias?
❓ B: Isso reduz trabalho operacional do usuário AGORA?

A=SIM, B=SIM   → ✅ PRIORIDADE MÁXIMA — entra na próxima sprint
A=SIM, B=NÃO   → ✅ FAZER — agenda com prazo definido
A=NÃO, B=SIM   → ⚠️  EXPERIMENTAR — prova de conceito simples primeiro
A=NÃO, B=NÃO   → ❌ CEMITÉRIO — vai pro brainstorm, não vira código
```

---

## ⚖️ Os Princípios

| ✅ OBRIGATÓRIO | ❌ PROIBIDO |
|---------------|------------|
| Validação antes de construção | Over-engineering |
| MVP antes de perfeição | Roadmap inchado |
| Dados reais antes de opiniões | Funcionalidade sem critério de pronto |
| Uma coisa de cada vez | Começar F2 antes de F1 estar validado |
| Critério de pronto definido antes de começar | Estimar sem entender o problema |

---

## 🔬 Protocolo de Análise — Passo a Passo

Toda funcionalidade nova passa por estas 5 perguntas **antes** de entrar no planejamento:

**1. Qual o problema real?**
Descreva em uma frase quem sente a dor, quando sente e como ela se manifesta hoje.
> Ex: "O dono não sabe se o motoboy saiu com o pedido certo porque a confirmação é verbal."

**2. Qual a menor versão que testa a hipótese?**
Não o que seria ideal. O mínimo que prova ou refuta a ideia.
> Ex: "Motoboy manda foto do pedido no WhatsApp antes de sair."

**3. Como vou saber que funcionou?**
Uma métrica. Um número. Uma evidência observável.
> Ex: "Zero reclamação de pedido errado em 30 dias."

**4. Qual o custo real?**
Horas de dev + complexidade técnica + manutenção futura.
> Ex: "2 dias de dev, sem integração nova, manutenção baixa."

**5. O que acontece se eu NÃO construir isso agora?**
Se a resposta for "nada grave", vai pro brainstorm.
> Ex: "Continuo recebendo 1 reclamação por semana de pedido errado."

---

## 🚨 Sinais de Alerta

Se você ouvir qualquer uma dessas frases, pare e releia este documento:

- *"Seria incrível se também fizesse..."*
- *"Enquanto estamos nisso, que tal adicionar..."*
- *"No futuro vamos precisar de..."*
- *"Os concorrentes têm isso..."*
- *"Seria diferencial ter..."*
- *"Não é muito trabalho..."*

Essas frases não são proibidas. São **sinais de que a ideia precisa passar pelo filtro** antes de qualquer outra conversa.

---

## 🏛️ Cemitério de Ideias

Ideias que passaram pelo filtro e saíram com ❌. Registradas aqui com o motivo — para não serem analisadas duas vezes e para serem revisitadas se o contexto mudar.

| Ideia | Data | Motivo do descarte | Revisar quando? |
|-------|------|-------------------|-----------------|
| — | — | — | — |

---

## ✅ Histórico de Aprovações

Funcionalidades que passaram pelo filtro e foram aprovadas para construção.

| Funcionalidade | Data | A | B | Resultado | Sprint |
|---------------|------|---|---|-----------|--------|
| F01 — Site de pedidos | — | ✅ | ✅ | PRIORIDADE MÁXIMA | 1 |
| F02 — Mineração de contatos | — | ✅ | ✅ | PRIORIDADE MÁXIMA | 2 |
| F03 — Agente WhatsApp | — | ✅ | ✅ | PRIORIDADE MÁXIMA | 2 |
| F04 — Ficha técnica | — | ⚠️ | ✅ | EXPERIMENTAR | 3 |
| F05 — Retenção com roleta | — | ✅ | ❌ | FAZER | 4 |
| F06 — Indicação com bonificação | — | ✅ | ❌ | FAZER | 4 |

---

## 📋 Como usar no dia a dia

**Quando o dev propõe algo novo:**
> Aplica o filtro. Se passar, documenta aqui e no planejamento. Se não passar, vai pro brainstorm.

**Quando você tem uma ideia nova:**
> Aplica o filtro. Se a empolgação for maior que a evidência, vai pro brainstorm primeiro.

**Quando um cliente pede uma funcionalidade:**
> Aplica o filtro. Feedback de cliente é dado, não é ordem.

**Quando alguém disser "é rápido de fazer":**
> Aplica o filtro. Velocidade de construção não é critério de prioridade.

**Revisão recomendada:** no início de cada nova fase de desenvolvimento.

---

*Este documento não tem data de validade. Ele só muda se o modelo de negócio mudar.*
