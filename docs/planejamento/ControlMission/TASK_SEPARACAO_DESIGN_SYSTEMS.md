# TASK — Separação dos Design Systems · Rancho Comida Caseira

> O projeto agora tem dois produtos distintos com identidades visuais próprias.
> Esta task garante que cada produto use seu Design System correto
> sem contaminação entre eles.

---

## Contexto

O projeto cresceu e hoje tem dois produtos com propósitos opostos:

| Produto | Usuário | Objetivo | Design System |
|---|---|---|---|
| Site de Pedidos | Cliente com fome | Despertar apetite, converter | Rancho_DesignSystem.html |
| Cockpit de Gestão | Operador em serviço | Clareza, velocidade, controle | Rancho_CRM_DesignSystem.html |

Aplicar o Design System do site de pedidos no CRM — ou vice-versa —
é um erro de produto. Esta task define a separação correta.

---

## Arquivos de referência

Dois arquivos anexos nesta task:

- `Rancho_DesignSystem.html` → Design System do site de pedidos
- `Rancho_CRM_DesignSystem.html` → Design System do cockpit de gestão

Abrir os dois no navegador antes de começar.

---

## O que fazer

### 1. Estrutura de tokens no projeto

Criar dois arquivos de tokens CSS separados no projeto:

```
packages/shared/styles/
├── tokens.site.css       ← tokens do site de pedidos
└── tokens.crm.css        ← tokens do cockpit de gestão
```

Extrair os tokens de cada arquivo HTML de referência
e organizá-los nos respectivos arquivos `.css`.

---

### 2. Tokens do Site de Pedidos — `tokens.site.css`

Extrair do `Rancho_DesignSystem.html`:

```css
/* Paleta */
--madeira-fundo:    #1A0D06;
--madeira-media:    #251208;
--madeira-clara:    #3E2214;
--couro-escuro:     #5C3418;
--brasa-viva:       #D4601C;
--brasa-quente:     #E87830;
--mel-campo:        #E8A040;
--bege-fumaca:      #E8D4B0;
--bege-claro:       #F4E8CC;
--cinza-couro:      #9A7B5C;
--verde-campo:      #4A7840;
--fuligem:          #0D0603;

/* Tipografia */
--font-display: 'Alfa Slab One', serif;
--font-corpo:   'Nunito', sans-serif;
```

---

### 3. Tokens do CRM — `tokens.crm.css`

Extrair do `Rancho_CRM_DesignSystem.html`.

O CRM tem dois modos nativos — dark é o padrão:

```css
/* Dark mode — padrão (born dark) */
:root,
.dark-mode {
  --color-bg:               #0C0905;
  --color-surface:          #141009;
  --color-surface-raised:   #1D1610;
  --color-surface-overlay:  #261D14;
  --color-text-primary:     /* extrair do arquivo */
  --color-text-secondary:   /* extrair do arquivo */
  --color-border:           /* extrair do arquivo */
  --color-accent:           #D4601C;  /* brasa herdada da marca */
  --color-success:          /* extrair do arquivo */
  --color-warning:          /* extrair do arquivo */
  --color-danger:           /* extrair do arquivo */
  --color-info:             /* extrair do arquivo */
}

/* Light mode — override */
.light-mode {
  /* extrair do arquivo */
}

/* Tipografia */
--font-display: 'Sora', sans-serif;
--font-corpo:   'DM Sans', sans-serif;
```

> Extrair os valores completos do arquivo HTML de referência —
> os valores acima são parciais para orientação.

---

### 4. Aplicar no projeto

**Site de pedidos** (`apps/frontend`):
- Importar apenas `tokens.site.css`
- Remover qualquer referência a tokens do CRM

**Cockpit de gestão** (`apps/frontend/admin` ou rota equivalente):
- Importar apenas `tokens.crm.css`
- Remover qualquer referência a tokens do site
- Toggle dark/light mode funcional (classe `.dark-mode` / `.light-mode` no `<html>`)
- Persistir preferência no `localStorage`

---

### 5. Fontes

Cada produto carrega suas próprias fontes via Google Fonts:

**Site de pedidos:**
```html
<link href="https://fonts.googleapis.com/css2?
  family=Alfa+Slab+One
  &family=Nunito:wght@400;600;700;800;900
  &display=swap" rel="stylesheet">
```

**Cockpit de gestão:**
```html
<link href="https://fonts.googleapis.com/css2?
  family=Sora:wght@400;500;600;700
  &family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600
  &display=swap" rel="stylesheet">
```

Não carregar as duas em todas as páginas —
cada produto carrega apenas o que usa.

---

### 6. Verificação final

Percorrer todas as telas e confirmar:

**Site de pedidos:**
- [ ] Fundo escuro amadeirado (`--madeira-fundo`)
- [ ] Botões em laranja brasa (`--brasa-viva`)
- [ ] Títulos em Alfa Slab One
- [ ] Nenhum token `--color-surface` ou `--color-bg` do CRM

**Cockpit de gestão:**
- [ ] Dark mode ativo por padrão
- [ ] Toggle dark/light funcionando e persistindo
- [ ] Superfícies em `--color-surface` e `--color-surface-raised`
- [ ] Acento em `--color-accent` (#D4601C — brasa herdada)
- [ ] Títulos em Sora
- [ ] Corpo em DM Sans
- [ ] Nenhum token `--madeira-*` ou `--brasa-*` do site de pedidos

---

## Critério de pronto

- [ ] Dois arquivos de tokens separados criados em `packages/shared/styles/`
- [ ] Site de pedidos importa apenas `tokens.site.css`
- [ ] Cockpit importa apenas `tokens.crm.css`
- [ ] Toggle dark/light no cockpit funcionando
- [ ] Preferência de modo persistida no localStorage
- [ ] Nenhuma tela misturando tokens dos dois sistemas
- [ ] Fontes carregadas separadamente por produto

---

## Arquivos desta task
- `Rancho_DesignSystem.html` — referência visual do site de pedidos
- `Rancho_CRM_DesignSystem.html` — referência visual do cockpit

*Abrir os dois no navegador antes de começar.*
