# Documentação do Projeto Sabor Express

Este arquivo e a porta de entrada da pasta `docs/`.

## Estrutura Atual

```text
docs/
├── README.md
├── ambiente/
│   └── AMBIENTE_CONFIGURADO.md
├── governanca/
│   └── GUARDIAO_SABOR_EXPRESS.md
│   └── NAMING_OFICIAL.md
├── integracoes/
│   ├── API_ENDPOINTS.md
│   ├── INTEGRACAO_ASAAS.md
│   ├── INTEGRACAO_INFINITEPAY.md
│   └── INTEGRACAO_WHATSAPP.md
├── operacao/
│   ├── HANDOFF.md
│   ├── PLAYBOOK_DEPLOY_PENDENCIAS.md
│   ├── RUNBOOK_E2E_INFINITEPAY.md
│   ├── RUNBOOK_INCIDENTES_DEPLOY.md
│   └── SOP_MINERACAO_CONTATOS.md
├── planejamento/
│   ├── BRAINSTORM_SABOR_EXPRESS.md
│   ├── PLANEJAMENTO_FRONTEND.md
│   └── PLANEJAMENTO_SABOR_EXPRESS.md
├── produtos/
│   └── DESIGN_SYSTEM.md
├── qualidade/
│   └── TESTES.md
├── relatorios/
│   ├── 2026-04-29_implementacao_api_client.md
│   └── 2026-04-29_planejamento_frontend.md
├── arquivo/
│   └── Rancho_DesignSystem.html
├── decisoes/
├── modulos/
├── raio-x/
└── referencias/
```

## Guia Rapido de Onde Colocar Cada Documento

- `planejamento/`: roadmap, direcao de produto e visao de fases.
- `governanca/`: regras de decisao e filtros de viabilidade.
- `operacao/`: handoff, SOPs e rotinas operacionais.
- `integracoes/`: APIs externas, contratos e endpoints.
- `ambiente/`: setup de ambiente e infraestrutura local.
- `qualidade/`: testes, criterios e cobertura.
- `produtos/`: UX/UI, design system e especificacoes funcionais.
- `relatorios/`: analises datadas e registro de execucao.
- `arquivo/`: arquivos legados ou de apoio.
- `decisoes/`: ADRs.
- `modulos/`: docs por funcionalidade (F01, F02, ...).
- `raio-x/`: analises tecnicas profundas.
- `referencias/`: material externo e links de apoio.

## Convencoes

- Documentos principais: `UPPERCASE_COM_UNDERSCORE.md`
- Documentos datados: `YYYY-MM-DD_descricao.md`
- Documentos tecnicos por tema: `snake_case.md`

## Checklist Antes de Criar Documento

1. Confirmar a pasta correta.
2. Usar o padrao de nome da categoria.
3. Inserir contexto, objetivo e proximo passo.
4. Linkar documentos relacionados.

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
