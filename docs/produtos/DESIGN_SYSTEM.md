# Design System - Rancho

Sistema de design completo para o aplicativo de delivery Rancho.

---

## 🎨 Paleta de Cores

### Cores Primárias

**Vermelho (Primary)** - Cor principal do app
- `--primary-500: #ef4444` - Cor principal
- `--primary-600: #dc2626` - Hover/Active
- `--primary-50: #fef2f2` - Backgrounds claros

**Uso:** Botões principais, CTAs, destaques, badges de promoção

### Cores Secundárias

**Amarelo/Dourado (Secondary)**
- `--secondary-500: #eab308` - Cor secundária
- `--secondary-400: #facc15` - Variação clara

**Uso:** Ícones de estrela (avaliação), badges de desconto, destaques secundários

### Cores Neutras

**Cinza (Gray)**
- `--gray-900: #111827` - Textos principais
- `--gray-600: #4b5563` - Textos secundários
- `--gray-200: #e5e7eb` - Bordas
- `--gray-50: #f9fafb` - Backgrounds

### Cores de Feedback

- **Sucesso:** `--success-500: #22c55e` (pedido confirmado)
- **Aviso:** `--warning-500: #f59e0b` (atenção)
- **Erro:** `--error-500: #ef4444` (erro, cancelamento)
- **Info:** `--info-500: #3b82f6` (informações)

---

## 📝 Tipografia

### Fonte

**Inter** - Fonte principal (sans-serif moderna e legível)

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Escala de Tamanhos

| Nome | Tamanho | Uso |
|------|---------|-----|
| `text-xs` | 12px | Labels pequenos, badges |
| `text-sm` | 14px | Textos secundários, descrições |
| `text-base` | 16px | Texto padrão |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 20px | Títulos de cards |
| `text-2xl` | 24px | Títulos de seção |
| `text-3xl` | 30px | Títulos principais |
| `text-4xl` | 36px | Hero titles |

### Pesos

- `font-normal: 400` - Texto padrão
- `font-medium: 500` - Ênfase leve
- `font-semibold: 600` - Subtítulos, botões
- `font-bold: 700` - Títulos importantes
- `font-extrabold: 800` - Hero titles

---

## 📐 Espaçamento

Sistema baseado em múltiplos de 4px:

| Nome | Valor | Uso |
|------|-------|-----|
| `space-1` | 4px | Espaçamento mínimo |
| `space-2` | 8px | Padding pequeno |
| `space-3` | 12px | Padding médio |
| `space-4` | 16px | Padding padrão |
| `space-6` | 24px | Padding grande |
| `space-8` | 32px | Seções |
| `space-12` | 48px | Espaçamento entre seções |

---

## 🔘 Componentes

### Botões

**Primário** - Ações principais
```html
<button class="btn btn-primary">
  Adicionar ao Carrinho
</button>
```

**Secundário** - Ações secundárias
```html
<button class="btn btn-secondary">
  Ver Detalhes
</button>
```

**Outline** - Ações terciárias
```html
<button class="btn btn-outline">
  Cancelar
</button>
```

**Tamanhos:**
- `.btn-lg` - Botões grandes (CTAs principais)
- `.btn` - Tamanho padrão
- `.btn-sm` - Botões pequenos

### Cards

**Card de Produto**
```html
<div class="card">
  <img src="produto.jpg" alt="Produto" />
  <div class="card-body">
    <h3>Nome do Produto</h3>
    <p>Descrição</p>
    <span class="price">R$ 24,90</span>
  </div>
</div>
```

**Características:**
- Border radius: `--radius-xl` (16px)
- Shadow: `--shadow-base`
- Hover: Elevação e sombra maior
- Transição suave

### Badges

**Status do Pedido**
```html
<span class="badge badge-success">Confirmado</span>
<span class="badge badge-warning">Preparando</span>
<span class="badge badge-error">Cancelado</span>
```

### Inputs

**Campo de Texto**
```html
<input 
  type="text" 
  class="input" 
  placeholder="Digite seu nome"
/>
```

**Características:**
- Border: 2px solid
- Focus: Border primary + shadow
- Border radius: `--radius-lg`

---

## 🎭 Animações

### Fade In
```css
.animate-fade-in {
  animation: fadeIn 200ms ease-out;
}
```

**Uso:** Entrada de elementos, modais

### Slide Up
```css
.animate-slide-up {
  animation: slideUp 300ms ease-out;
}
```

**Uso:** Bottom sheets, carrinho

### Pulse
```css
.animate-pulse {
  animation: pulse 2s infinite;
}
```

**Uso:** Loading states, notificações

### Loading Skeleton
```html
<div class="skeleton" style="width: 100%; height: 200px;"></div>
```

**Uso:** Placeholder enquanto carrega conteúdo

---

## 📱 Layout Mobile-First

### Scroll Snap (Feed Vertical)

```html
<div class="scroll-snap-y hide-scrollbar" style="height: 100vh;">
  <div class="scroll-snap-item" style="height: 100vh;">
    <!-- Card de produto 1 -->
  </div>
  <div class="scroll-snap-item" style="height: 100vh;">
    <!-- Card de produto 2 -->
  </div>
</div>
```

**Características:**
- Scroll vertical com snap
- Cada item ocupa 100vh
- Scrollbar escondida
- Touch-friendly

### Breakpoints

```css
/* Mobile (padrão) */
@media (max-width: 640px) { }

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

---

## 🌓 Dark Mode

Suporte automático baseado em preferência do sistema:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: var(--gray-900);
    --text-primary: var(--gray-50);
  }
}
```

---

## 🎯 Exemplos de Uso

### Card de Produto (Feed)

```html
<div class="scroll-snap-item" style="height: 100vh; position: relative;">
  <!-- Imagem de fundo -->
  <img 
    src="produto.jpg" 
    alt="Marmita" 
    style="width: 100%; height: 100%; object-fit: cover;"
  />
  
  <!-- Gradiente overlay -->
  <div style="
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--gradient-dark);
    padding: var(--space-6);
    color: white;
  ">
    <h2 style="font-size: var(--text-3xl); font-weight: var(--font-bold);">
      Marmita Executiva
    </h2>
    <p style="font-size: var(--text-base); margin: var(--space-2) 0;">
      Frango grelhado, arroz integral, feijão preto e salada
    </p>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-4);">
      <span style="font-size: var(--text-2xl); font-weight: var(--font-bold);">
        R$ 24,90
      </span>
      <button class="btn btn-primary btn-lg">
        Adicionar
      </button>
    </div>
  </div>
</div>
```

### Carrinho (Bottom Sheet)

```html
<div class="animate-slide-up" style="
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  padding: var(--space-6);
  box-shadow: var(--shadow-2xl);
  max-height: 80vh;
  overflow-y: auto;
">
  <h3 style="font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-4);">
    Seu Carrinho
  </h3>
  
  <!-- Itens do carrinho -->
  <div style="margin-bottom: var(--space-6);">
    <!-- Item 1 -->
    <!-- Item 2 -->
  </div>
  
  <!-- Total -->
  <div style="border-top: 2px solid var(--gray-200); padding-top: var(--space-4);">
    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
      <span>Subtotal</span>
      <span>R$ 49,80</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-4);">
      <span>Taxa de entrega</span>
      <span>R$ 6,00</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: var(--text-xl); font-weight: var(--font-bold);">
      <span>Total</span>
      <span style="color: var(--primary-500);">R$ 55,80</span>
    </div>
  </div>
  
  <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: var(--space-4);">
    Finalizar Pedido
  </button>
</div>
```

---

## 📦 Instalação

1. Importar no `globals.css`:
```css
@import './design-system.css';
```

2. Usar variáveis CSS:
```css
.meu-componente {
  color: var(--primary-500);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}
```

3. Usar classes utilitárias:
```html
<button class="btn btn-primary btn-lg">
  Meu Botão
</button>
```

---

## 🎨 Figma

Para visualizar o design completo, acesse:
- Protótipo interativo
- Componentes reutilizáveis
- Guia de estilos

---

**Versão:** 1.0.0  
**Última atualização:** 29/04/2026
