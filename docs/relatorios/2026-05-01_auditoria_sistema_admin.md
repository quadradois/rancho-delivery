# Auditoria Completa do Sistema Admin — Rancho Comida Caseira

**Data:** 2026-05-01
**Escopo:** Todas as páginas de `/admin` — Dashboard, Pedidos, Produtos, Bairros/Entregas, Layout/Sidebar
**Referência anterior:** `docs/relatorios/2026-05-01_auditoria_cockpit_pedidos.md`

---

## 🔴 Críticos

- [x] **#1 — Nenhuma rota do admin tem autenticação**
  `apps/backend/src/routes/admin.routes.ts` · `apps/backend/src/routes/bairro.routes.ts`
  Qualquer pessoa com acesso à URL da API pode criar, editar e excluir produtos e bairros, cancelar pedidos, mudar status da loja e ler dados de clientes — sem login, sem token, sem verificação.
  _Correção: implementar middleware de autenticação (JWT ou session) em todas as rotas `/api/admin/*` e nas rotas de escrita de `/api/bairros` e `/api/produtos`._

- [x] **#2 — Bairros inativos invisíveis — impossível reativá-los pela UI**
  `apps/frontend/src/app/admin/bairros/page.tsx:65`
  O frontend filtra `bairro.ativo === true` mesmo chamando `/api/bairros/todos`. Bairros desativados desaparecem completamente — o operador não tem como reativá-los sem acesso direto ao banco.
  _Correção: remover o `.filter()` do frontend e exibir todos os bairros, com badge de status e botão de ativar/desativar._

- [x] **#3 — `/admin` renderiza lista de produtos em vez de dashboard**
  `apps/frontend/src/app/admin/page.tsx`
  A rota `/admin` (item "Dashboard" na sidebar) exibe `AdminProdutosPage`. Não existe dashboard real implementado — sem métricas, sem visão geral do negócio.
  _Correção: criar página de dashboard com métricas do dia (pedidos, receita, status da loja) consumindo `/api/admin/metricas`._

- [x] **#4 — CRUD de produtos e bairros usa `fetch` direto com URL hardcoded**
  `apps/frontend/src/app/admin/produtos/page.tsx:42` · `apps/frontend/src/app/admin/produtos/[id]/page.tsx:125` · `apps/frontend/src/app/admin/bairros/page.tsx:57`
  DELETE/POST/PUT usam `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'` diretamente. Se a variável não estiver configurada em produção, todas as operações falham apontando para localhost.
  _Correção: migrar todas as chamadas para o `api-client` centralizado em `apps/frontend/src/lib/api-client.ts`._

- [x] **#5 — Botão "Conectar WhatsApp" falha silenciosamente**
  `apps/frontend/src/app/admin/layout.tsx:151`
  O bloco `try/finally` não tem `catch`. Se a Evolution API estiver offline, o erro é silenciado e o operador não recebe nenhum feedback — o botão simplesmente volta ao estado normal.
  _Correção: adicionar `catch` com `showError` e mensagem específica indicando que a Evolution API está inacessível._

---

## 🟡 Médios

- [x] **#6 — Campo "Nome" do bairro travado ao editar — não permite correção manual**
  `apps/frontend/src/app/admin/bairros/page.tsx:347`
  O nome é preenchido pelo ViaCEP e fica `readOnly`. Operador não consegue usar nomes customizados (ex: "Centro - Zona Sul") nem corrigir nomes errados retornados pelo ViaCEP.
  _Correção: tornar o campo editável após preenchimento automático, mantendo o ViaCEP como sugestão._

- [x] **#7 — `tempoPreparo` fora do schema de validação Zod**
  `apps/frontend/src/app/admin/produtos/[id]/page.tsx:13`
  O campo existe no formulário e é enviado ao backend, mas não está no `produtoSchema`. Valores inválidos (negativos, zero) passam sem validação no frontend.
  _Correção: adicionar `tempoPreparo: z.number().int().min(1, 'Tempo mínimo é 1 minuto')` ao schema._

- [x] **#8 — Polling de status do WhatsApp a cada 30s em todas as páginas do admin**
  `apps/frontend/src/app/admin/layout.tsx:137`
  O `setInterval` de 30s roda em todas as páginas do admin, em todas as abas abertas, sem debounce nem pausa quando a aba perde foco.
  _Correção: usar `visibilitychange` para pausar o polling quando a aba não está ativa, ou migrar para SSE via evento `loja:status`._

- [x] **#9 — Erros do backend silenciados no catch de bairros**
  `apps/frontend/src/app/admin/bairros/page.tsx:178`
  O `catch` ignora o erro recebido e exibe sempre "Tente novamente". Mensagens específicas do backend (ex: "Bairro já cadastrado") nunca chegam ao operador.
  _Correção: propagar `err instanceof Error ? err.message : 'Tente novamente'` no `showError`, igual ao padrão usado em produtos._

- [x] **#10 — Lista de produtos pode mostrar dados antigos após edição**
  `apps/frontend/src/app/admin/produtos/[id]/page.tsx:147`
  Após salvar, `router.push('/admin/produtos')` navega de volta, mas o Next.js pode servir a rota em cache. A lista não recarrega automaticamente.
  _Correção: usar `router.refresh()` antes ou depois do `router.push()` para forçar revalidação._

- [x] **#11 — Navegação ativa na sidebar confusa (consequência do bug #3)**
  `apps/frontend/src/app/admin/layout.tsx:210`
  "Dashboard" nunca fica ativo porque `/admin` renderiza produtos. Ao resolver o bug #3, revisar a lógica de `isActive` para garantir que cada item da sidebar destaque corretamente.
  _Correção: resolver após #3. Verificar se `pathname === '/admin'` para Dashboard e `pathname.startsWith('/admin/produtos')` para Produtos._

---

## 🟢 Baixo

- [x] **#12 — Página de bairros usa tema do site em vez do tema admin**
  `apps/frontend/src/app/admin/bairros/page.tsx:205`
  Usa classes Tailwind diretas (`bg-white`, `text-neutral-900`) em vez das variáveis CSS do tema admin. Em modo escuro, a página fica com fundo branco.
  _Correção: substituir classes hardcoded por variáveis CSS do tema: `bg-[var(--color-surface)]`, `text-[var(--color-text-primary)]`, etc._

- [x] **#13 — Página de produtos com o mesmo problema de tema**
  `apps/frontend/src/app/admin/produtos/page.tsx:71`
  Mesmo problema do item #12. Modo escuro não funciona na página de produtos.
  _Correção: mesma abordagem do #12._

- [x] **#14 — Link "Ver site" na sidebar abre na mesma aba**
  `apps/frontend/src/app/admin/layout.tsx:241`
  Navega na mesma aba, perdendo o estado do cockpit (pedido selecionado, filtros ativos).
  _Correção: adicionar `target="_blank" rel="noopener noreferrer"` ao `<Link>`._

- [x] **#15 — Interface `Bairro` duplicada com campos divergentes**
  `apps/frontend/src/app/admin/bairros/page.tsx:14`
  Interface local usa `tempoEntrega` enquanto o tipo global pode usar `tempoEntregaMin`. Risco de divergência silenciosa se o backend mudar o nome do campo.
  _Correção: remover a interface local e importar o tipo de `@/lib/api` ou `@/types/domain.types`._

---

## Resumo

| # | Área | Problema | Criticidade | Arquivo |
|---|------|----------|-------------|---------|
| 1 | Segurança | Nenhuma rota tem autenticação | 🔴 | admin.routes.ts |
| 2 | Bairros | Inativos invisíveis — impossível reativar | 🔴 | bairros/page.tsx:65 |
| 3 | Dashboard | `/admin` renderiza lista de produtos | 🔴 | admin/page.tsx |
| 4 | Produtos/Bairros | `fetch` direto com URL hardcoded | 🔴 | produtos/page.tsx:42 |
| 5 | Sidebar | Erro silencioso ao conectar WhatsApp | 🔴 | layout.tsx:151 |
| 6 | Bairros | Campo nome travado ao editar | 🟡 | bairros/page.tsx:347 |
| 7 | Produtos | `tempoPreparo` fora do schema Zod | 🟡 | produtos/[id]/page.tsx:13 |
| 8 | Layout | Polling WhatsApp a cada 30s em todas as páginas | 🟡 | layout.tsx:137 |
| 9 | Bairros | Erros do backend silenciados no catch | 🟡 | bairros/page.tsx:178 |
| 10 | Produtos | Lista pode mostrar dados antigos após edição | 🟡 | produtos/[id]/page.tsx:147 |
| 11 | Sidebar | Navegação ativa confusa | 🟡 | layout.tsx:210 |
| 12 | Bairros | Tema do site em vez do tema admin | 🟢 | bairros/page.tsx:205 |
| 13 | Produtos | Mesmo problema de tema | 🟢 | produtos/page.tsx:71 |
| 14 | Sidebar | "Ver site" abre na mesma aba | 🟢 | layout.tsx:241 |
| 15 | Bairros | Interface `Bairro` duplicada | 🟢 | bairros/page.tsx:14 |
