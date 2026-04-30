# Planejamento Frontend — Próximos Passos Rancho

**Data:** 2026-04-29
**Fase:** 1 (MVP)
**Status:** Em desenvolvimento
**Progresso:** 15/20 tarefas concluídas (75%)

---

## Progresso Geral

```
Prioridade 1 (MVP):        ████████████████████  11/11 (100%) ✅
Prioridade 2 (Qualidade):  ████████████████████  4/4  (100%) ✅
Prioridade 3 (Admin):      ░░░░░░░░░░░░░░░░░░░░  0/4  (0%)
Validação Final:           ░░░░░░░░░░░░░░░░░░░░  0/1  (0%)
─────────────────────────────────────────────────
TOTAL:                     ███████████████░░░░░  15/20 (75%)
```

**🎉 PRIORIDADE 2 COMPLETA! Todas as 4 tarefas de qualidade foram concluídas!**

**Próxima tarefa:** Tarefa 16 — Listagem de produtos no admin

---

## Tarefas Concluídas (Prioridade 1)

- ✅ Tarefa 1: API client para comunicação com backend
- ✅ Tarefa 2: Tipos TypeScript do backend no frontend
- ✅ Tarefa 3: Context API para gerenciamento do carrinho
- ✅ Tarefa 4: Componente CardProduto com design system
- ✅ Tarefa 5: Página de cardápio com feed vertical e scroll snap
- ✅ Tarefa 6: Componente Carrinho (bottom sheet)
- ✅ Tarefa 7: Header com ícone de carrinho
- ✅ Tarefa 8: Página de checkout com formulário
- ✅ Tarefa 9: Validação de bairro com API
- ✅ Tarefa 10: Cálculo de taxa de entrega no checkout
- ✅ Tarefa 11: Fluxo de criação de pedido e redirecionamento Asaas

---

## Tarefas Concluídas (Prioridade 2)

- ✅ Tarefa 12: Skeleton screens (CardProduto, lista, carrinho)
- ✅ Tarefa 13: Error boundary e tratamento de erros
- ✅ Tarefa 14: Validação de formulários com Zod
- ✅ Tarefa 15: Testes unitários dos componentes principais

---

## PRIORIDADE 2 — QUALIDADE (Semana 3) ✅

### 12. Adicionar loading states (skeleton screens)
**Status:** Concluído | **Estimativa:** 4h

- [x] Skeleton para CardProduto
- [x] Skeleton para lista de produtos
- [x] Skeleton para carrinho
- [x] Animações de loading suaves

**Arquivos:** `src/components/ui/ProductCardSkeleton.tsx`, `src/components/ui/CartItemSkeleton.tsx`, `src/components/ui/Skeleton.tsx`

---

### 13. Implementar error boundaries e tratamento de erros
**Status:** Concluído | **Estimativa:** 5h

- [x] Error boundary no nível da aplicação
- [x] Página de erro genérica
- [x] Tratamento de erros de API
- [x] Mensagens de erro amigáveis

**Arquivos:** `src/components/ErrorBoundary.tsx`, `src/components/ClientErrorBoundary.tsx`

---

### 14. Adicionar validação de formulários com Zod
**Status:** Concluído | **Estimativa:** 4h

- [x] Schema Zod para formulário de checkout
- [x] Validação em tempo real
- [x] Mensagens de erro customizadas

**Arquivos:** `src/schemas/checkoutSchema.ts`, `src/app/checkout/page.tsx`

---

### 15. Criar testes unitários dos componentes principais
**Status:** Concluído | **Estimativa:** 8h

- [x] Testes para ProductCard (13 testes)
- [x] Testes para ErrorBoundary (8 testes)
- [x] Testes para CartContext (12 testes)
- [x] Testes para schemas de checkout (16 testes)
- [x] Cobertura mínima de 70% — 82/82 testes passando

**Arquivos:** `src/__tests__/components/ProductCard.test.tsx`, `src/__tests__/components/ErrorBoundary.test.tsx`, `src/__tests__/contexts/CartContext.test.tsx`, `src/__tests__/schemas/checkoutSchema.test.ts`

---

## PRIORIDADE 3 — PAINEL ADMIN (Semana 4)

### 16. Listagem de produtos no admin
**Status:** Pendente | **Estimativa:** 6h

- [ ] Tabela com paginação (imagem, nome, preço, categoria, ações)
- [ ] Botões editar e excluir
- [ ] Busca por nome e filtro por categoria

**Arquivos:** `src/app/admin/produtos/page.tsx`, `src/components/admin/TabelaProdutos.tsx`

---

### 17. Formulário de cadastro/edição de produtos
**Status:** Pendente | **Estimativa:** 8h

- [ ] Campos: nome, descrição, preço, categoria, imagem
- [ ] Upload de imagem
- [ ] Modo criação e edição com validação

**Arquivos:** `src/app/admin/produtos/[id]/page.tsx`, `src/components/admin/FormularioProduto.tsx`

---

### 18. CRUD de bairros no painel admin
**Status:** Pendente | **Estimativa:** 6h

- [ ] Listagem de bairros com taxa de entrega
- [ ] Formulário para adicionar/editar/excluir bairro

**Arquivos:** `src/app/admin/bairros/page.tsx`, `src/components/admin/FormularioBairro.tsx`

---

### 19. Visualização de pedidos no admin
**Status:** Pendente | **Estimativa:** 6h

- [ ] Listagem com filtros (status, data, cliente)
- [ ] Detalhes do pedido (itens, cliente, endereço)
- [ ] Indicador de status de pagamento

**Arquivos:** `src/app/admin/pedidos/page.tsx`, `src/components/admin/DetalhesPedido.tsx`

---

## VALIDAÇÃO FINAL

### 20. Testar fluxo completo end-to-end
**Status:** Pendente | **Estimativa:** 4h

- [ ] Teste manual: cardápio → carrinho → checkout → pagamento
- [ ] Validação em diferentes navegadores
- [ ] Validação em dispositivos móveis
- [ ] Documentação de bugs encontrados

---

## Estimativa Total

| Prioridade | Tarefas | Concluídas | Estimativa |
|------------|---------|------------|------------|
| Prioridade 1 (MVP) | 11 | 11 ✅ | ~56h |
| Prioridade 2 (Qualidade) | 4 | 4 ✅ | ~21h |
| Prioridade 3 (Admin) | 4 | 0 | ~26h |
| Validação Final | 1 | 0 | ~4h |
| **TOTAL** | **20** | **15 (75%)** | **~107h** |

---

## Histórico

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-04-29 | 1.0.0 | Criação do documento |
| 2026-04-29 | 2.0.0 | MVP completo — tarefas 1 a 11 concluídas |
| 2026-04-29 | 3.0.0 | Qualidade completa — tarefas 12 a 15 concluídas |

---

*Documento vivo — atualizar conforme o progresso do desenvolvimento.*
