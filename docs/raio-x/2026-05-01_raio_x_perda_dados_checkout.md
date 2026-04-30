# Raio-X: Perda de Dados no Retorno do Checkout InfinitePay

**Data:** 2026-05-01  
**Severidade:** 🔴 Crítica — impacto direto em conversão e receita  
**Status:** Aguardando implementação  
**Módulo:** `apps/frontend/src/app/checkout/page.tsx`

---

## Problema

Quando o cliente é redirecionado para o link de pagamento da InfinitePay e decide **voltar** (botão voltar do browser ou da página de pagamento), o sistema:

1. Redireciona para `/` (tela inicial) em vez de retornar ao checkout
2. Apaga todos os dados preenchidos (nome, telefone, endereço, forma de pagamento)
3. O carrinho pode estar vazio dependendo do momento do retorno

O cliente precisa refazer todo o pedido do zero. **Venda perdida.**

---

## Causa Raiz

### 1. Redirecionamento externo destrói o estado React

```ts
// checkout/page.tsx — linha 219
if (pedido.linkPagamento) {
  window.location.href = pedido.linkPagamento; // ← sai da SPA completamente
  return;
}
```

`window.location.href` faz uma navegação hard — o React é desmontado, todo o estado em memória (`addressForm`, `paymentForm`, `currentStep`) é destruído. Quando o usuário volta, o Next.js remonta a página do zero.

### 2. Estado do formulário vive apenas em memória

```ts
// checkout/page.tsx — linhas 61-75
const [addressForm, setAddressForm] = useState<AddressForm>({
  nome: '', telefone: '', email: '', cep: '', ...
});
```

Nenhum dado é persistido em `sessionStorage`, `localStorage` ou URL params antes do redirecionamento. Ao retornar, o estado é inicializado vazio.

### 3. Redirect para `/` quando carrinho está vazio

```ts
// checkout/page.tsx — linha 84
useEffect(() => {
  if (items.length === 0) router.push('/');
}, [items, router]);
```

Se o `clearCart()` foi chamado antes do redirect (linha 217), ao retornar o carrinho está vazio e o cliente é jogado para a home imediatamente, sem chance de recuperar o pedido.

```ts
// checkout/page.tsx — linhas 216-222
const pedido = await api.pedidos.criar(pedidoData);
showSuccess('Pedido realizado!', `Pedido #${pedido.id.slice(-8)}`);
clearCart();                              // ← carrinho limpo ANTES do redirect
if (pedido.linkPagamento) {
  window.location.href = pedido.linkPagamento;
  return;
}
```

---

## Fluxo do Bug (passo a passo)

```
Cliente preenche formulário
        ↓
Clica "Confirmar Pedido"
        ↓
API cria pedido → retorna linkPagamento
        ↓
clearCart() é chamado  ← carrinho zerado aqui
        ↓
window.location.href = linkPagamento  ← React desmontado
        ↓
Cliente está na página InfinitePay
        ↓
Cliente clica "Voltar"
        ↓
Next.js remonta /checkout com estado vazio
        ↓
useEffect detecta items.length === 0
        ↓
router.push('/')  ← cliente na home, sem dados, sem pedido
```

---

## Arquivos Envolvidos

| Arquivo | Linhas | Problema |
|---------|--------|---------|
| `apps/frontend/src/app/checkout/page.tsx` | 84–85 | Redirect para `/` quando carrinho vazio |
| `apps/frontend/src/app/checkout/page.tsx` | 216–222 | `clearCart()` antes do redirect externo |
| `apps/frontend/src/app/checkout/page.tsx` | 61–75 | Estado do formulário sem persistência |
| `apps/frontend/src/contexts/CartContext.tsx` | — | Carrinho sem persistência em `sessionStorage` |

---

## Solução Recomendada

### Correção 1 — Persistir dados do formulário antes do redirect

Salvar `addressForm`, `paymentForm` e `pedidoId` em `sessionStorage` imediatamente antes de `window.location.href`:

```ts
// Antes do redirect externo
sessionStorage.setItem('checkout_recovery', JSON.stringify({
  addressForm,
  paymentForm,
  pedidoId: pedido.id,
  timestamp: Date.now(),
}));
clearCart();
window.location.href = pedido.linkPagamento;
```

### Correção 2 — Restaurar dados ao montar o checkout

No `useEffect` de inicialização, verificar se há dados salvos:

```ts
useEffect(() => {
  const recovery = sessionStorage.getItem('checkout_recovery');
  if (recovery) {
    const dados = JSON.parse(recovery);
    // Expirar após 30 minutos
    if (Date.now() - dados.timestamp < 30 * 60 * 1000) {
      setAddressForm(dados.addressForm);
      setPaymentForm(dados.paymentForm);
      setPedidoRecuperado(dados.pedidoId);
      setCurrentStep('review'); // volta para revisão, não para o início
    }
    sessionStorage.removeItem('checkout_recovery');
  }
}, []);
```

### Correção 3 — Não redirecionar para `/` se há recovery pendente

Ajustar o guard do carrinho vazio:

```ts
useEffect(() => {
  const temRecovery = !!sessionStorage.getItem('checkout_recovery');
  if (items.length === 0 && !temRecovery) router.push('/');
}, [items, router]);
```

### Correção 4 — Tela de retorno amigável

Quando o cliente retorna com `pedidoId` salvo, mostrar uma tela intermediária:

```
┌─────────────────────────────────────┐
│  Você voltou do pagamento           │
│                                     │
│  Pedido #ABC123 foi criado.         │
│                                     │
│  [Tentar pagar novamente]           │
│  [Ver status do pedido]             │
│  [Cancelar e refazer]               │
└─────────────────────────────────────┘
```

---

## Ordem de Implementação

1. **Correção 3** — remover o redirect agressivo para `/` (5 min, baixo risco)
2. **Correção 1** — salvar dados antes do redirect (10 min)
3. **Correção 2** — restaurar dados ao montar (20 min)
4. **Correção 4** — tela de retorno amigável (30 min, opcional mas recomendado)

---

## Critério de Pronto

- [ ] Cliente preenche formulário → vai para InfinitePay → volta → vê os dados preenchidos
- [ ] Cliente não é redirecionado para `/` ao retornar
- [ ] Dados expiram após 30 minutos (não ficam presos para sempre)
- [ ] Se pedido já foi criado, cliente vê opção de acessar o status

---

## Referências

- `apps/frontend/src/app/checkout/page.tsx`
- `apps/frontend/src/contexts/CartContext.tsx`
- `apps/frontend/src/components/ui/ModalVerificacaoCep.tsx` — padrão de persistência em sessionStorage já usado no projeto
- `docs/integracoes/INTEGRACAO_INFINITEPAY.md`
