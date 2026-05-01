# Prompt para Equipe Dev — Correções do Sistema Admin

**Para:** Equipe de Desenvolvimento
**Data:** 2026-05-01
**Referência:** `docs/relatorios/2026-05-01_auditoria_sistema_admin.md`
**Contexto anterior:** `docs/relatorios/2026-05-01_auditoria_cockpit_pedidos.md`

---

## Contexto

Foi realizada uma auditoria completa de todas as páginas do painel admin (`/admin`): Dashboard, Pedidos, Produtos, Bairros/Entregas e Layout/Sidebar. Foram identificados **15 problemas** em 5 áreas distintas.

O checklist completo está em `docs/relatorios/2026-05-01_auditoria_sistema_admin.md`. Este documento detalha o que precisa ser feito, por quem e em qual ordem.

---

## 🔴 Prioridade máxima — corrigir antes de qualquer deploy

---

### #1 — SEGURANÇA: Nenhuma rota do admin tem autenticação

Este é o problema mais grave do sistema. Atualmente qualquer pessoa com acesso à URL da API pode:
- Criar, editar e excluir produtos e bairros
- Cancelar pedidos e mudar status da loja
- Ler dados completos de todos os clientes
- Alterar status do WhatsApp

**O que fazer:**
1. Criar middleware de autenticação (sugestão: JWT com secret em variável de ambiente)
2. Aplicar em todas as rotas `/api/admin/*`
3. Aplicar nas rotas de escrita de `/api/bairros` (POST, PUT, DELETE) e `/api/produtos` (POST, PUT, DELETE)
4. Criar endpoint de login (`POST /api/admin/auth/login`) que retorna o token
5. Adicionar tela de login no frontend antes de renderizar o `AdminLayout`

Arquivos: `apps/backend/src/routes/admin.routes.ts`, `apps/backend/src/routes/bairro.routes.ts`, `apps/backend/src/routes/produto.routes.ts`, `apps/frontend/src/app/admin/layout.tsx`

---

### #2 — Bairros inativos desaparecem da UI — impossível reativá-los

O frontend filtra `bairro.ativo === true` mesmo chamando o endpoint `/api/bairros/todos`. Bairros desativados somem completamente — o operador não tem como reativá-los sem acesso direto ao banco.

**O que fazer:**
- Remover o `.filter((bairro) => bairro.ativo)` na linha 65 de `bairros/page.tsx`
- Exibir todos os bairros na tabela com badge de status (Ativo/Inativo)
- Adicionar botão de toggle ativo/inativo em cada linha (chamar `PUT /api/bairros/:id` com `{ ativo: !bairro.ativo }`)

Arquivo: `apps/frontend/src/app/admin/bairros/page.tsx:65`

---

### #3 — `/admin` renderiza lista de produtos em vez de dashboard

A rota `/admin` (item "Dashboard" na sidebar) exibe `AdminProdutosPage`. Não existe dashboard real.

**O que fazer:**
- Criar `apps/frontend/src/app/admin/page.tsx` com dashboard real consumindo `GET /api/admin/metricas`
- Exibir: pedidos do dia, receita, pedidos por status, status da loja, mensagens não lidas
- Após resolver, revisar a lógica de `isActive` na sidebar (`layout.tsx:210`) para que "Dashboard" destaque corretamente

Arquivo: `apps/frontend/src/app/admin/page.tsx`

---

### #4 — CRUD de produtos e bairros usa `fetch` direto com URL hardcoded

DELETE/POST/PUT em produtos e bairros usam `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` diretamente. Em produção sem a variável configurada, todas as operações falham apontando para localhost.

**O que fazer:**
- Adicionar métodos `criar`, `atualizar` e `excluir` ao `adminProdutoService` em `apps/frontend/src/lib/api.ts`
- Fazer o mesmo para bairros em `adminBairroService`
- Substituir todos os `fetch(...)` diretos nas páginas de produtos e bairros pelos novos métodos do `api-client`

Arquivos: `apps/frontend/src/app/admin/produtos/page.tsx:42`, `apps/frontend/src/app/admin/produtos/[id]/page.tsx:125`, `apps/frontend/src/app/admin/bairros/page.tsx:57`

---

### #5 — Botão "Conectar WhatsApp" falha silenciosamente

O `try/finally` sem `catch` em `prepararConexaoWhatsApp` silencia qualquer erro da Evolution API. O operador não recebe feedback quando a conexão falha.

**O que fazer:**
- Adicionar bloco `catch` com `showError('Falha ao conectar WhatsApp', 'Verifique se a Evolution API está acessível')`
- Considerar exibir o erro específico retornado pela API para facilitar diagnóstico

Arquivo: `apps/frontend/src/app/admin/layout.tsx:151`

---

## 🟡 Prioridade média — próxima sprint

**#6 — Campo nome do bairro travado ao editar**
Tornar o campo editável após preenchimento pelo ViaCEP, mantendo-o como sugestão.
Arquivo: `apps/frontend/src/app/admin/bairros/page.tsx:347`

**#7 — `tempoPreparo` fora do schema Zod**
Adicionar `tempoPreparo: z.number().int().min(1)` ao `produtoSchema`.
Arquivo: `apps/frontend/src/app/admin/produtos/[id]/page.tsx:13`

**#8 — Polling WhatsApp a cada 30s em todas as páginas**
Pausar o `setInterval` quando `document.visibilityState === 'hidden'` usando o evento `visibilitychange`.
Arquivo: `apps/frontend/src/app/admin/layout.tsx:137`

**#9 — Erros do backend silenciados no catch de bairros**
Propagar `err instanceof Error ? err.message : 'Tente novamente'` no `showError`.
Arquivo: `apps/frontend/src/app/admin/bairros/page.tsx:178`

**#10 — Lista de produtos desatualizada após edição**
Adicionar `router.refresh()` após `router.push('/admin/produtos')` para forçar revalidação.
Arquivo: `apps/frontend/src/app/admin/produtos/[id]/page.tsx:147`

**#11 — Navegação ativa na sidebar confusa**
Resolver após o bug #3. Garantir que cada item da sidebar destaque corretamente pela rota.
Arquivo: `apps/frontend/src/app/admin/layout.tsx:210`

---

## 🟢 Backlog

- **#12** — Migrar classes Tailwind hardcoded de bairros para variáveis CSS do tema admin (`bairros/page.tsx:205`)
- **#13** — Mesma migração de tema para produtos (`produtos/page.tsx:71`)
- **#14** — Adicionar `target="_blank"` no link "Ver site" da sidebar (`layout.tsx:241`)
- **#15** — Remover interface `Bairro` local e importar tipo centralizado (`bairros/page.tsx:14`)

---

## Ordem de execução sugerida

```
Sprint atual (bloqueadores de produção):
  #1 Autenticação → #4 api-client → #5 WhatsApp catch → #2 Bairros inativos → #3 Dashboard

Próxima sprint:
  #7 Zod tempoPreparo → #9 Erros bairros → #10 Refresh lista → #6 Nome bairro → #8 Polling → #11 Sidebar

Backlog:
  #12 → #13 → #14 → #15
```

---

## Checklist

Marcar `- [x]` no arquivo de checklist conforme cada item for resolvido:

```
docs/relatorios/2026-05-01_auditoria_sistema_admin.md
```

Para dúvidas sobre escopo ou priorização, abrir discussão na PR correspondente.
