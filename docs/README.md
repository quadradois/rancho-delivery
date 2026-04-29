# 📚 Documentação do Projeto Sabor Express

> Centro de documentação técnica e estratégica do sistema web de delivery Sabor Express.
> Toda documentação relacionada ao projeto deve ser armazenada nesta pasta seguindo as convenções estabelecidas.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Documentação](#estrutura-de-documentação)
3. [Convenções de Nomenclatura](#convenções-de-nomenclatura)
4. [Tipos de Documentos](#tipos-de-documentos)
5. [Fluxo de Desenvolvimento](#fluxo-de-desenvolvimento)
6. [Boas Práticas](#boas-práticas)
7. [Documentos Principais](#documentos-principais)

---

## 🎯 Visão Geral

Este diretório contém toda a documentação necessária para o desenvolvimento, manutenção e evolução do sistema Sabor Express. A organização segue princípios de clareza, rastreabilidade e facilidade de manutenção.

**Princípios fundamentais:**
- Documentação viva: atualizada conforme o projeto evolui
- Rastreabilidade: toda decisão técnica ou de produto deve estar documentada
- Clareza: linguagem objetiva, sem ambiguidade
- Versionamento: documentos críticos devem ter histórico de mudanças

---

## 📁 Estrutura de Documentação

```
docs/
├── README.md                           # Este arquivo (índice geral)
├── PLANEJAMENTO_SABOR_EXPRESS.md      # Planejamento técnico oficial (MVP)
├── GUARDIAO_SABOR_EXPRESS.md          # Filtro de viabilidade comercial
├── BRAINSTORM_SABOR_EXPRESS.md        # Ideias futuras (não aprovadas)
├── SOP_MINERACAO_CONTATOS.md          # Procedimento operacional padrão
│
├── relatorios/                         # Relatórios de progresso e análises
│   ├── YYYY-MM-DD_sprint_N.md
│   ├── YYYY-MM-DD_analise_performance.md
│   └── YYYY-MM-DD_retrospectiva_fase_N.md
│
├── raio-x/                             # Análises técnicas profundas
│   ├── YYYY-MM-DD_raio_x_arquitetura.md
│   ├── YYYY-MM-DD_raio_x_integracao_asaas.md
│   └── YYYY-MM-DD_raio_x_performance_feed.md
│
├── modulos/                            # Documentação por módulo/funcionalidade
│   ├── F01_site_pedidos/
│   │   ├── README.md
│   │   ├── especificacao_tecnica.md
│   │   ├── fluxos.md
│   │   └── testes.md
│   ├── F02_mineracao_contatos/
│   ├── F03_agente_whatsapp/
│   ├── F04_ficha_tecnica/
│   ├── F05_roleta_promocoes/
│   └── F06_indicacao_bonificacao/
│
├── produtos/                           # Especificações de produto
│   ├── cardapio_feed_vertical.md
│   ├── checkout_fluxo.md
│   └── notificacao_whatsapp.md
│
├── decisoes/                           # ADRs (Architecture Decision Records)
│   ├── 001_escolha_stack.md
│   ├── 002_gateway_pagamento.md
│   └── 003_feed_vertical_vs_grade.md
│
└── referencias/                        # Documentação externa e referências
    ├── asaas_api.md
    ├── evolution_api.md
    └── assertiva_api.md
```

---

## 🏷️ Convenções de Nomenclatura

### Formato Geral
```
[PREFIXO]_[NOME_DESCRITIVO].[extensao]
```

### Prefixos por Tipo

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| `PLANEJAMENTO_` | Planejamento estratégico | `PLANEJAMENTO_SABOR_EXPRESS.md` |
| `SOP_` | Standard Operating Procedure | `SOP_MINERACAO_CONTATOS.md` |
| `GUARDIAO_` | Documento de governança | `GUARDIAO_SABOR_EXPRESS.md` |
| `BRAINSTORM_` | Ideias não aprovadas | `BRAINSTORM_SABOR_EXPRESS.md` |
| `YYYY-MM-DD_` | Documentos datados | `2026-04-29_sprint_1.md` |
| `F[NN]_` | Funcionalidade específica | `F01_site_pedidos` |
| `[NNN]_` | ADR numerado | `001_escolha_stack.md` |

### Regras de Nomenclatura

1. **Use snake_case** para nomes de arquivos: `especificacao_tecnica.md`
2. **Use UPPERCASE** para documentos principais: `PLANEJAMENTO_SABOR_EXPRESS.md`
3. **Inclua data** em relatórios e análises: `2026-04-29_retrospectiva.md`
4. **Seja descritivo**: `raio_x_integracao_asaas.md` > `integracao.md`
5. **Evite caracteres especiais**: sem acentos, espaços ou símbolos
6. **Use extensão .md** para todos os documentos (Markdown)

---

## 📝 Tipos de Documentos

### 1. Planejamento Estratégico
**Localização:** Raiz de `docs/`  
**Nomenclatura:** `PLANEJAMENTO_[NOME].md`  
**Propósito:** Define o que construir, em que ordem e por quê

**Conteúdo obrigatório:**
- Visão geral do projeto
- Sequência de construção com rationale
- Especificações técnicas por funcionalidade
- Critérios de pronto
- Stack tecnológica

**Exemplo:** `PLANEJAMENTO_SABOR_EXPRESS.md`

---

### 2. Relatórios
**Localização:** `docs/relatorios/`  
**Nomenclatura:** `YYYY-MM-DD_[tipo]_[descricao].md`  
**Propósito:** Documentar progresso, análises e retrospectivas

**Tipos de relatórios:**
- **Sprint:** progresso da sprint, tarefas concluídas, bloqueios
- **Retrospectiva:** lições aprendidas ao final de cada fase
- **Análise:** análises de performance, bugs, incidentes
- **Status:** status geral do projeto para stakeholders

**Template mínimo:**
```markdown
# [Tipo] — [Descrição]
**Data:** YYYY-MM-DD
**Fase:** N
**Autor:** [Nome]

## Contexto
[O que motivou este relatório]

## Resumo Executivo
[3-5 linhas do essencial]

## Detalhamento
[Conteúdo principal]

## Ações Necessárias
- [ ] Ação 1
- [ ] Ação 2

## Próximos Passos
[O que vem depois]
```

---

### 3. Raio-X (Análises Técnicas Profundas)
**Localização:** `docs/raio-x/`  
**Nomenclatura:** `YYYY-MM-DD_raio_x_[tema].md`  
**Propósito:** Análises técnicas detalhadas de arquitetura, integrações, performance

**Quando criar:**
- Antes de decisões arquiteturais importantes
- Após incidentes críticos (post-mortem)
- Para documentar integrações complexas
- Análises de performance e otimização

**Template mínimo:**
```markdown
# Raio-X — [Tema]
**Data:** YYYY-MM-DD
**Autor:** [Nome]
**Status:** [Em análise | Concluído | Arquivado]

## Objetivo
[Por que esta análise foi feita]

## Contexto
[Situação atual]

## Análise Técnica
[Detalhamento profundo]

## Descobertas
[O que foi encontrado]

## Recomendações
[O que deve ser feito]

## Impacto
[Consequências de implementar ou não]

## Referências
[Links, documentos, código]
```

---

### 4. Documentação de Módulos
**Localização:** `docs/modulos/[nome_modulo]/`  
**Nomenclatura:** Estrutura padronizada por módulo  
**Propósito:** Documentação técnica completa de cada funcionalidade

**Estrutura obrigatória por módulo:**
```
F[NN]_[nome_funcionalidade]/
├── README.md                    # Visão geral do módulo
├── especificacao_tecnica.md     # Specs técnicas detalhadas
├── fluxos.md                    # Diagramas e fluxos de dados
├── api.md                       # Documentação de endpoints (se aplicável)
├── testes.md                    # Estratégia e casos de teste
└── changelog.md                 # Histórico de mudanças
```

**README.md do módulo deve conter:**
- Descrição da funcionalidade
- Dependências
- Como rodar localmente
- Como testar
- Links para documentação relacionada

---

### 5. Especificações de Produto
**Localização:** `docs/produtos/`  
**Nomenclatura:** `[nome_feature].md`  
**Propósito:** Especificações de UX/UI e comportamento do produto

**Conteúdo obrigatório:**
- Problema que resolve
- Comportamento esperado
- Fluxos do usuário
- Wireframes ou mockups (se aplicável)
- Critérios de aceitação
- Métricas de sucesso

---

### 6. ADRs (Architecture Decision Records)
**Localização:** `docs/decisoes/`  
**Nomenclatura:** `[NNN]_[decisao].md` (numeração sequencial)  
**Propósito:** Registrar decisões arquiteturais importantes

**Template ADR:**
```markdown
# ADR [NNN]: [Título da Decisão]

**Data:** YYYY-MM-DD
**Status:** [Proposto | Aceito | Rejeitado | Substituído por ADR-XXX]
**Decisores:** [Nomes]

## Contexto
[Qual problema estamos resolvendo]

## Decisão
[O que decidimos fazer]

## Alternativas Consideradas
1. Opção A — [prós e contras]
2. Opção B — [prós e contras]

## Consequências
**Positivas:**
- [Benefício 1]

**Negativas:**
- [Trade-off 1]

## Referências
[Links, discussões, documentos]
```

---

### 7. SOPs (Standard Operating Procedures)
**Localização:** Raiz de `docs/`  
**Nomenclatura:** `SOP_[PROCESSO].md`  
**Propósito:** Procedimentos operacionais padronizados

**Conteúdo obrigatório:**
- Objetivo do procedimento
- Quando executar
- Passo a passo detalhado
- Critério de pronto
- Troubleshooting comum

**Exemplo:** `SOP_MINERACAO_CONTATOS.md`

---

### 8. Documentos de Governança
**Localização:** Raiz de `docs/`  
**Nomenclatura:** `GUARDIAO_[NOME].md`  
**Propósito:** Regras e filtros de decisão do projeto

**Exemplo:** `GUARDIAO_SABOR_EXPRESS.md` (filtro de viabilidade comercial)

---

### 9. Brainstorm
**Localização:** Raiz de `docs/`  
**Nomenclatura:** `BRAINSTORM_[NOME].md`  
**Propósito:** Capturar ideias antes que virem tarefas

**Regras:**
- Ideias não aprovadas não viram código
- Toda ideia tem status: 💡 Bruta | ✅ Aprovada | ⏳ Timing errado | ❌ Descartada
- Revisão recomendada ao final de cada fase

---

## 🔄 Fluxo de Desenvolvimento

### Fase 1: Planejamento
```
1. Ideia surge → registra no BRAINSTORM
2. Aplica filtro do GUARDIAO
3. Se aprovada → especifica no PLANEJAMENTO
4. Cria estrutura em docs/modulos/
5. Define critérios de pronto
```

### Fase 2: Desenvolvimento
```
1. Dev lê especificação em docs/modulos/[funcionalidade]/
2. Durante desenvolvimento, atualiza changelog.md
3. Decisões arquiteturais → cria ADR em docs/decisoes/
4. Dúvidas técnicas → cria raio-x em docs/raio-x/
5. Testes → documenta em testes.md
```

### Fase 3: Entrega
```
1. Funcionalidade concluída → marca no PLANEJAMENTO
2. Cria relatório de sprint em docs/relatorios/
3. Atualiza README.md do módulo
4. Retrospectiva → docs/relatorios/YYYY-MM-DD_retrospectiva.md
```

### Fase 4: Manutenção
```
1. Bug encontrado → documenta em raio-x (se complexo)
2. Mudança de comportamento → atualiza especificacao_tecnica.md
3. Nova integração → documenta em docs/referencias/
4. Otimização → cria raio-x de performance
```

---

## ✅ Boas Práticas

### Escrita de Documentação

1. **Seja objetivo:** vá direto ao ponto, sem rodeios
2. **Use exemplos:** código, diagramas, fluxos visuais
3. **Mantenha atualizado:** documento desatualizado é pior que ausência de documento
4. **Versione decisões:** quando mudar algo importante, registre o motivo
5. **Pense no futuro:** você de 6 meses atrás não lembra por que fez aquilo

### Organização

1. **Um documento, um propósito:** não misture planejamento com brainstorm
2. **Use links internos:** conecte documentos relacionados
3. **Mantenha hierarquia:** README → especificação → detalhes técnicos
4. **Arquive, não delete:** documentos antigos vão para `docs/arquivo/`
5. **Revise periodicamente:** ao final de cada fase, revise toda a documentação

### Commits de Documentação

```bash
# Formato de commit para docs
docs: [tipo] descrição curta

Tipos:
- docs: add       → novo documento
- docs: update    → atualização de documento existente
- docs: fix       → correção de erro em documento
- docs: refactor  → reorganização de estrutura
- docs: archive   → arquivamento de documento obsoleto

Exemplos:
docs: add raio-x da integração com Asaas
docs: update PLANEJAMENTO com critérios de F01
docs: fix typo em SOP_MINERACAO_CONTATOS
```

### Revisão de Documentação

**Quando revisar:**
- Ao final de cada sprint
- Ao final de cada fase
- Antes de iniciar nova funcionalidade
- Após incidentes ou bugs críticos
- A cada 30 dias (documentos principais)

**Checklist de revisão:**
- [ ] Informações ainda estão corretas?
- [ ] Links internos funcionam?
- [ ] Exemplos de código estão atualizados?
- [ ] Decisões antigas ainda fazem sentido?
- [ ] Falta alguma informação importante?

---

## 📚 Documentos Principais

### Documentos Estratégicos
- **[PLANEJAMENTO_SABOR_EXPRESS.md](./PLANEJAMENTO_SABOR_EXPRESS.md)** — Planejamento técnico oficial do MVP
- **[GUARDIAO_SABOR_EXPRESS.md](./GUARDIAO_SABOR_EXPRESS.md)** — Filtro de viabilidade comercial
- **[BRAINSTORM_SABOR_EXPRESS.md](./BRAINSTORM_SABOR_EXPRESS.md)** — Ideias futuras (não aprovadas)

### Procedimentos Operacionais
- **[SOP_MINERACAO_CONTATOS.md](./SOP_MINERACAO_CONTATOS.md)** — Pipeline de mineração de contatos

### Módulos (a serem criados conforme desenvolvimento)
- `docs/modulos/F01_site_pedidos/` — Site de pedidos (Fase 1)
- `docs/modulos/F02_mineracao_contatos/` — Mineração de contatos (Fase 2)
- `docs/modulos/F03_agente_whatsapp/` — Agente WhatsApp (Fase 2)
- `docs/modulos/F04_ficha_tecnica/` — Ficha técnica e precificação (Fase 3)
- `docs/modulos/F05_roleta_promocoes/` — Roleta de promoções (Fase 4)
- `docs/modulos/F06_indicacao_bonificacao/` — Indicação com bonificação (Fase 4)

---

## 🚀 Início Rápido para Desenvolvedores

### Primeira vez no projeto?
1. Leia `PLANEJAMENTO_SABOR_EXPRESS.md` — entenda o que estamos construindo
2. Leia `GUARDIAO_SABOR_EXPRESS.md` — entenda como decidimos o que construir
3. Vá para `docs/modulos/F01_site_pedidos/` — comece pela Fase 1

### Vai implementar uma funcionalidade?
1. Leia a especificação em `docs/modulos/[funcionalidade]/`
2. Verifique se há ADRs relacionados em `docs/decisoes/`
3. Durante o desenvolvimento, atualize o `changelog.md` do módulo
4. Ao concluir, marque como pronto no `PLANEJAMENTO_SABOR_EXPRESS.md`

### Precisa tomar uma decisão arquitetural?
1. Crie um ADR em `docs/decisoes/[NNN]_[decisao].md`
2. Discuta com o time
3. Atualize o status do ADR
4. Referencie o ADR na especificação técnica

### Encontrou um problema complexo?
1. Crie um raio-x em `docs/raio-x/YYYY-MM-DD_raio_x_[tema].md`
2. Documente o problema, análise e recomendações
3. Compartilhe com o time
4. Implemente a solução
5. Atualize o raio-x com o resultado

---

## 📞 Dúvidas?

- **Onde documentar X?** → Consulte a seção [Tipos de Documentos](#tipos-de-documentos)
- **Como nomear arquivo?** → Consulte [Convenções de Nomenclatura](#convenções-de-nomenclatura)
- **Quando criar ADR?** → Sempre que tomar decisão arquitetural que afeta múltiplos módulos
- **Quando criar raio-x?** → Para análises técnicas profundas ou post-mortems

---

## 📜 Histórico de Mudanças

| Data | Versão | Mudança | Autor |
|------|--------|---------|-------|
| 2026-04-29 | 1.0.0 | Criação do documento | OpenCode |

---

*Documento vivo — atualizar conforme o projeto evolui.*
