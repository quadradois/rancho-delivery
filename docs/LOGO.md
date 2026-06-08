# Logo — Rancho Comida Caseira

Imagotipo: cabeça de **touro longhorn** + "Rancho" (fonte stamp rústica) + slogan "comida caseira".

## Variações (em `apps/frontend/public/`)

| Arquivo | Cor | Quando usar |
|---|---|---|
| `logo.svg` | **Preta** | Fundos **claros** (creme/bege, material impresso, nota). Otimizada (1.2 MB → 350 KB). |
| `logo-reverse.svg` | **Branca** | Fundos **escuros** — é a indicada pro app (tema dark madeira/brasa), onde a preta sumiria. |
| `logo-symbol.svg` | Só o **touro** | Favicon, ícone do app/PWA, avatar, espaços pequenos onde a wordmark não cabe. |

> ⚠️ A logo é monocromática. Em fundo escuro use **a reverse** (branca) ou o **símbolo** — a versão preta tem contraste insuficiente sobre madeira/brasa.

## Regras de uso

- **Clear space**: manter ao redor da logo uma margem ≥ a altura da letra "R" da wordmark.
- **Tamanho mínimo**: ~120 px de largura (logo completa); ~24 px (símbolo).
- **Não**: distorcer/esticar (manter proporção), recolorir fora de preto/branco, aplicar sombra/efeito, ou colocar sobre fundo de baixo contraste/imagem poluída.
- **Tipografia**: a fonte stamp (`Rustic Printed`) vive **na logo** — na UI ela é só `--font-brand`; títulos/preços usam Alfa Slab (`--font-display`).

## Pendências (validar no navegador)

- `logo-reverse.svg` e `logo-symbol.svg` foram **gerados programaticamente** — conferir o render antes de adotar.
- Ainda **não estão em uso** no app (header usa wordmark estilizado; favicon/manifest usam `icon-192/512.png` genéricos). Adotar a logo no header (reverse) e gerar favicon a partir do símbolo é um passo de UI à parte.
