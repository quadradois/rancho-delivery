# ELYON Platform — Design System

> Documentação visual do sistema de design da plataforma ELYON CRM.  
> Stack: Next.js + Tailwind CSS + Lucide Icons  
> Gerado em: Maio/2026

---

## 1. Identidade Visual

| Item | Valor |
|---|---|
| **Produto** | ELYON Platform — CRM de prospecção imobiliária com IA |
| **Logo** | Ícone geométrico (grid/cubo) em roxo + wordmark "ELYON" branco |
| **Framework CSS** | Tailwind CSS |
| **Fonte principal** | Inter |
| **Biblioteca de ícones** | Lucide Icons (outline/line) |

---

## 2. Paleta de Cores

### 2.1 Cores Primárias (Brand)

| Token | Hex | RGB | Tailwind | Uso |
|---|---|---|---|---|
| Primary / Indigo 600 | `#4f46e5` | `rgb(79, 70, 229)` | `indigo-600` | Cor primária de ação, links ativos, botões |
| Primary Dark / Violet 600 | `#7c3aed` | `rgb(124, 58, 237)` | `violet-600` | Gradiente primário (par do indigo-600) |
| Primary Light / Indigo 500 | `#6366f1` | `rgb(99, 102, 241)` | `indigo-500` | Ícones, destaques secundários, glow |
| Secondary / Violet 500 | `#8b5cf6` | `rgb(139, 92, 246)` | `violet-500` | Badges, elementos de suporte |

**Gradiente primário (active/CTA):**
```css
background: linear-gradient(to right, #4f46e5, #7c3aed);
/* Tailwind: bg-gradient-to-r from-indigo-600 to-violet-600 */
```
> Aplicado no: link ativo do sidebar, botão Dashboard, botões CTA principais.

---

### 2.2 Cores Semânticas / Status

| Token | Hex | RGB | Tailwind | Uso |
|---|---|---|---|---|
| Success | `#059669` | `rgb(5, 150, 105)` | `emerald-600` | Status ATIVA, CONECTADO, confirmações |
| Success Light | `#10b981` | `rgb(16, 185, 129)` | `emerald-500` | Saldo créditos, ícones sucesso, botão pagar |
| Warning | `#f59e0b` | `rgb(245, 158, 11)` | `amber-500` | Alertas, Opt-out, item ativo Proprietários |
| Warning Light | `#fbbf24` | `rgb(251, 191, 36)` | `amber-400` | Texto ativo nav Proprietários |
| Danger | `#ef4444` | `rgb(239, 68, 68)` | `red-500` | Blacklist, ações destrutivas, alertas críticos |
| Info | `#2563eb` | `rgb(37, 99, 235)` | `blue-600` | Links informativos, contagem Contatando |

---

### 2.3 Cores Neutras

| Token | Hex | RGB | Tailwind | Uso |
|---|---|---|---|---|
| Text Primary | `#0f172a` | `rgb(15, 23, 42)` | `slate-900` | Títulos principais |
| Text Body | `#020817` | `rgb(2, 8, 23)` | `slate-950` | Corpo de texto |
| Text Muted | `#64748b` | `rgb(100, 116, 139)` | `slate-500` | Textos auxiliares, labels |
| Text Disabled | `#94a3b8` | `rgb(148, 163, 184)` | `slate-400` | Ícones/texto inativos no sidebar |
| Sidebar BG | `#0f172a` | `rgb(15, 23, 42)` | `slate-900` | Background do sidebar |
| Sidebar Hover | `#1e293b` | `rgb(30, 41, 59)` | `slate-800` | Hover dos itens do sidebar |
| Header BG | `#ffffff` | `rgb(255, 255, 255)` | `white` | Topbar |
| Card BG | `#ffffff` | `rgb(255, 255, 255)` | `white` | Cards, modais |
| Page BG | `#f8fafc` | `rgb(248, 250, 252)` | `slate-50` | Background geral da página |
| Border | `#e2e8f0` | `rgb(226, 232, 240)` | `slate-200` | Bordas, divisores |
| Border Light | `#f1f5f9` | `rgb(241, 245, 249)` | `slate-100` | Separadores internos de tabela |

---

### 2.4 Soft Tints (fundos de badges e chips)

| Cor Base | Hex | Tailwind | Uso |
|---|---|---|---|
| Indigo soft | `#eef2ff` | `indigo-50` | Badge indigo |
| Violet soft | `#f5f3ff` | `violet-50` | Badge violeta |
| Emerald soft | `#ecfdf5` | `emerald-50` | Badge verde, créditos |
| Blue soft | `#eff6ff` | `blue-50` | Badge info |
| Amber soft | `#fffbeb` | `amber-50` | Badge alerta amarelo |
| Red soft | `#fef2f2` | `red-50` | Badge alerta vermelho |
| Green soft | `#d1fae5` | `emerald-100` | Badge sucesso, score |
| Amber active | `rgba(245,158,11,0.1)` | `amber-500/10` | Nav item ativo (Proprietários) |

---

## 3. Tipografia

**Família:** `Inter` (Google Fonts)  
**Fallback:** `ui-sans-serif, system-ui, -apple-system, sans-serif`

### 3.1 Escala

| Nível | px | rem | Peso | Line-height | Tailwind | Uso |
|---|---|---|---|---|---|---|
| Page Title (H1) | 24px | 1.5rem | 700 (Bold) | 32px | `text-2xl font-bold` | Títulos de página |
| Section Title (H2) | 14–16px | 0.875–1rem | 600 (SemiBold) | 20px | `text-sm font-semibold` | Rótulos de seção (ZONA 1…) |
| Card Title (H3) | 16px | 1rem | 600 (SemiBold) | 24px | `text-base font-semibold` | Títulos de card |
| Body | 16px | 1rem | 400 (Regular) | 24px | `text-base` | Corpo de texto padrão |
| Nav / Label | 14px | 0.875rem | 500 (Medium) | 20px | `text-sm font-medium` | Itens de menu, labels de campo |
| Caption / Meta | 12px | 0.75rem | 400 (Regular) | 16px | `text-xs` | Datas, subtextos de métrica |
| Metric (KPI) | 24–32px | 1.5–2rem | 700 (Bold) | auto | `text-2xl font-bold` | Números grandes de KPI |

### 3.2 Cores de Texto

```css
--text-primary:   #0f172a; /* slate-900 — títulos */
--text-body:      #020817; /* slate-950 — corpo */
--text-muted:     #64748b; /* slate-500 — auxiliar */
--text-disabled:  #94a3b8; /* slate-400 — inativo */
--text-inverse:   #ffffff; /* branco — sobre fundos escuros */
--text-link:      #4338ca; /* indigo-700 — links ativos */
--text-success:   #047857; /* emerald-700 */
--text-warning:   #b45309; /* amber-700 */
--text-danger:    #b91c1c; /* red-700 */
```

---

## 4. Componentes

### 4.1 Sidebar / Menu Lateral

```
Largura:     256px (fixo)
Position:    fixed, inset-y-0 left-0