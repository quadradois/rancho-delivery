# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não Lançado]

### Em Desenvolvimento
- Fase 1 - F01: Site de Pedidos
  - Cardápio com feed vertical
  - Sistema de carrinho
  - Checkout e integração com Asaas
  - Notificação via WhatsApp

---

## [0.1.0] - 2026-04-29

### Adicionado
- Estrutura inicial do projeto em monorepo
- Configuração do backend com Express + TypeScript
- Configuração do frontend com Next.js 14 + Tailwind CSS
- Schema do banco de dados com Prisma (PostgreSQL)
- Package shared com tipos e validações compartilhadas
- Workflows de CI/CD para backend e frontend
- Documentação completa do projeto (README.md)
- Configuração de ESLint e Prettier
- Scripts de desenvolvimento, build e testes
- Seed inicial do banco de dados (bairros e produtos de exemplo)

### Estrutura Criada
```
sabosexprex/
├── apps/
│   ├── backend/          # API REST com Express
│   └── frontend/         # App Next.js
├── packages/
│   └── shared/           # Tipos e utilitários compartilhados
├── docs/                 # Documentação do projeto
├── tests/                # Testes E2E
└── .github/workflows/    # CI/CD
```

### Tecnologias
- **Backend:** Node.js 18, Express, TypeScript, Prisma, PostgreSQL
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Monorepo:** pnpm workspaces
- **CI/CD:** GitHub Actions
- **Qualidade:** ESLint, Prettier, Vitest

---

## Próximos Passos

### Fase 1 - Sprint 1 (F01: Site de Pedidos)
- [ ] Implementar API de produtos (CRUD)
- [ ] Implementar API de bairros (CRUD)
- [ ] Criar componente de feed vertical com scroll snap
- [ ] Implementar carrinho de compras (estado global)
- [ ] Criar fluxo de checkout
- [ ] Integrar com Asaas (pagamento)
- [ ] Implementar webhook do Asaas
- [ ] Integrar com Evolution API (notificação WhatsApp)
- [ ] Criar painel administrativo básico
- [ ] Testes E2E do fluxo completo

### Fase 2 (F02 e F03)
- Mineração de contatos
- Agente WhatsApp (Inbound + Outbound)

### Fase 3 (F04)
- Ficha técnica e precificação

### Fase 4 (F05 e F06)
- Roleta de promoções
- Programa de indicação

---

## Convenções de Commit

Este projeto segue o padrão de commits semânticos:

- `feat(escopo):` nova funcionalidade
- `fix(escopo):` correção de bug
- `refactor(escopo):` refatoração de código
- `docs(escopo):` alteração em documentação
- `test(escopo):` adição ou modificação de testes
- `chore(escopo):` tarefas de manutenção
- `style(escopo):` formatação de código
- `perf(escopo):` melhoria de performance

**Exemplo:** `feat(cardapio): adiciona scroll snap no feed de produtos`

---

**Legenda:**
- `Adicionado` para novas funcionalidades
- `Modificado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correções de bugs
- `Segurança` para vulnerabilidades corrigidas
