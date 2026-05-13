# Módulo Mineração — Guia de Trabalho
**Projeto:** Rancho Delivery / ELYON Prospecting Engine
**Atualizado em:** 2026-05-04

---

## Chegou agora? Comece aqui.

Este diretório contém todas as tarefas de evolução do módulo `/admin/mineracao`.
Os arquivos estão numerados — leia nessa ordem:

```
README.md                        ← você está aqui
00-indice.md                     ← contexto técnico + decisões de projeto
01-sprint-fundacao.md            ← sprint atual (começar por aqui)
02-sprint-crescimento.md         ← próximo sprint
03-sprint-inteligencia-visual.md ← sprint futuro
04-sprint-score.md               ← sprint futuro (requer dados)
```

---

## O que é este módulo?

O módulo de mineração extrai dados de proprietários de imóveis da Prefeitura de
Goiânia, enriquece com telefones via API externa (Assertiva) e dispara campanhas
de WhatsApp para converter proprietários em clientes de delivery.

Pense nele como um **motor de aquisição de leads** que roda dentro do painel admin.

**Raio X completo do estado atual:**
[`docs/raio-x/2026-05-04_raio_x_admin_mineracao.md`](../raio-x/2026-05-04_raio_x_admin_mineracao.md)

---

## Como trabalhar com as tarefas

### Status das tarefas

Cada tarefa tem um campo `**Status:**` que deve ser mantido atualizado:

| Status | Significado |
|--------|-------------|
| `TODO` | Não iniciada |
| `EM ANDAMENTO` | Alguém está trabalhando agora — coloque seu nome no `Assignee` |
| `CONCLUÍDA` | Finalizada e testada em produção |
| `BLOQUEADA` | Parada por dependência externa ou dúvida técnica |

### Ao assumir uma tarefa

1. Abra o arquivo do sprint em andamento
2. Mude o `Status` de `TODO` para `EM ANDAMENTO`
3. Coloque seu nome no campo `Assignee`
4. Preencha a data no campo `Notas do dev` no final do arquivo
5. Faça um commit só com essa atualização de status antes de começar a codar

```bash
# Exemplo de commit de início de tarefa
git add docs/tarefas/01-sprint-fundacao.md
git commit -m "tarefas: inicia S1-T1 (retry scraper) — [seu nome]"
```

### Ao concluir uma tarefa

1. Confira **todos** os critérios de aceite (checkboxes)
2. Teste em produção — não apenas local
3. Mude o `Status` para `CONCLUÍDA` e adicione a data
4. Atualize o `Resumo de status atual` no `00-indice.md`
5. Se criou variáveis de ambiente novas: documente em `00-indice.md`

### Ao travar em uma tarefa

1. Mude o `Status` para `BLOQUEADA`
2. No campo `Notas do dev`, escreva:
   - O que você tentou
   - Onde travou exatamente
   - O que precisa para desbloquear
3. Abra uma discussão com o time antes de ficar mais de 2h preso

### Regra de ouro

> **Nunca delete informação já escrita nas tarefas.**
> Adicione, corrija, complemente — mas preserve o histórico.
> Um dev que chegar depois precisa entender o que foi tentado, não só o que funcionou.

---

## Ordem de execução dos sprints

```
Sprint 1 — Fundação        ← COMEÇAR AQUI
    Sem pré-requisitos. Pode iniciar hoje.
    Objetivo: tornar o pipeline confiável.
        │
        ▼
Sprint 2 — Crescimento     ← após Sprint 1 concluído
    Requer: Sprint 1 + chave da Claude API (Anthropic)
    Objetivo: IA responde leads + mineração automática semanal.
        │
        ▼
Sprint 3 — Inteligência Visual  ← após Sprint 2 + ~30 dias de dados
    Requer: Sprint 2 rodando + mínimo de dados no banco
    Objetivo: mapa de penetração + analytics de território.
        │
        ▼
Sprint 4 — Score           ← após ~90 dias de dados de conversão
    Requer: Sprint 3 + mínimo 50 leads convertidos no banco
    Objetivo: priorizar leads com maior chance de virar cliente.
```

**Como verificar se pode avançar para o Sprint 4:**
```sql
SELECT COUNT(*) FROM leads_marketing WHERE status = 'CONVERTIDO';
-- Se < 50: aguardar mais tempo de operação antes de iniciar S4
```

---

## Ambiente de desenvolvimento

### Requisitos

- Node.js 20+
- PostgreSQL 15+ (banco `rancho_delivery` em localhost)
- PM2 instalado globalmente

### Subir o projeto localmente

```bash
# Na raiz do projeto
cd /var/www/rancho-delivery

# Backend
cd apps/backend
npm install
npm run dev   # porta 3001

# Frontend (outro terminal)
cd apps/frontend
npm install
npm run dev   # porta 3000
```

### Rodar migrations

```bash
cd apps/backend
npx prisma migrate dev        # aplica migrations pendentes
npx prisma studio             # interface visual do banco (porta 5555)
```

### Verificar logs em produção

```bash
pm2 logs                      # todos os logs em tempo real
pm2 logs rancho-backend       # só o backend
pm2 logs --lines 200          # últimas 200 linhas
```

### Testar o módulo manualmente

1. Acesse `/admin/mineracao` no painel admin
2. Credenciais: ver `.env` → `ADMIN_USERNAME` / `ADMIN_PASSWORD`
3. Busque pelo condomínio `"Ventana"` — já tem dados no banco
4. Selecione alguns IPTUs e execute a mineração

---

## Dependências externas — como acessar

| Serviço | Para que serve | Onde configurar |
|---------|---------------|-----------------|
| Assertiva | CPF/CNPJ → telefone | `.env` ASSERTIVA_CLIENT_ID + SECRET |
| Evolution API | Enviar/receber WhatsApp | `.env` EVOLUTION_API_URL + KEY |
| API GIS Prefeitura | Dados de imóveis Goiânia | Pública — sem configuração |
| Claude API | IA de conversação (Sprint 2) | `.env` ANTHROPIC_API_KEY — obter em console.anthropic.com |

---

## Onde encontrar documentação relacionada

| Documento | Conteúdo |
|-----------|---------|
| [`docs/raio-x/2026-05-04_raio_x_admin_mineracao.md`](../raio-x/2026-05-04_raio_x_admin_mineracao.md) | Diagnóstico completo AS-IS e visão TO-BE |
| [`docs/operacao/SOP_WIZARD_CAPTACAO_CAMPANHA.md`](../operacao/SOP_WIZARD_CAPTACAO_CAMPANHA.md) | Fluxo operacional do wizard em linguagem de processo |
| [`docs/integracoes/INTEGRACAO_WHATSAPP.md`](../integracoes/INTEGRACAO_WHATSAPP.md) | Detalhes da integração com Evolution API |
| [`apps/backend/prisma/schema.prisma`](../../apps/backend/prisma/schema.prisma) | Schema completo do banco de dados |

---

## Perguntas frequentes

**P: Posso pular o Sprint 1 e ir direto para features novas?**
Não. O Sprint 1 resolve falhas silenciosas que podem corromper dados. Features novas
em cima de uma base instável vão gerar retrabalho.

**P: Preciso de Redis para o job assíncrono?**
Não. A decisão foi usar `node-cron` com fila em memória — suficiente para o volume
atual (1 operador, lotes de até 1.000 IPTUs). Ver decisão técnica em `00-indice.md`.

**P: Posso usar outro modelo de IA além do Claude?**
Tecnicamente sim, mas Claude Haiku foi escolhido pelo custo (~R$ 0,05/conversa) e
qualidade para português. Trocar o modelo requer apenas mudar o parâmetro `model`
em `conversacao.service.ts`.

**P: E se a API da Prefeitura de Goiânia ficar fora do ar?**
O banco local `imoveis_prefeitura` tem 704 mil imóveis como cache. O sistema usa
o banco local primeiro e só vai à API externa quando o dado não está em cache.

**P: Como sei se a IA está respondendo corretamente?**
Acompanhe os logs: `pm2 logs | grep "IA de conversação"`. Cada resposta gera um
log com o número do lead e os tokens usados.
