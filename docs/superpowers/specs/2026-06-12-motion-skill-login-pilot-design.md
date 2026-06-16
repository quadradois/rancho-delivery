# Design — Skill `motion` + piloto de animação no login admin

**Data:** 2026-06-12 · **Status:** aprovado (abordagem B) · **Escopo:** enxuto (1 skill + 1 tela)

## Objetivo
1. Criar uma **skill `motion`** reutilizável para o Claude (conhecimento da biblioteca Motion / `framer-motion` v12: API, padrões, performance, acessibilidade).
2. **Aplicar** num piloto real: animar a **tela de login do admin** (`app.foodflow.ia.br/admin`).

## Skill `motion`
- Local: `~/.claude/skills/motion/` (user-level, como a `ui-ux-pro-max`).
- Arquivos: `SKILL.md` (regras + índice de padrões) + `reference.md` (código copiável).
- Cobre: `motion.*`, variants/stagger, `AnimatePresence`, gestos, layout, `useReducedMotion`, performance (transform/opacity, `LazyMotion`), Next App Router (`'use client'`).

## Piloto — login admin (`apps/frontend/src/app/admin/layout.tsx`, bloco `!authToken`)
Abordagem **B (sutil-profissional)**, sem redesign, sem nova dependência (usa o `framer-motion@12` já instalado):
- **Entrada do card:** `scale 0.98→1` (container variants), `ease-out` 0.3s.
- **Stagger dos campos:** título, inputs e botão entram com `opacity 0→1, y 8→0` (`staggerChildren 0.07s`).
- **Botão:** `whileTap scale 0.98` (mantém estado "Entrando...").
- **Erro:** no `catch` do `handleLogin`, um contador `loginShake` dispara um **shake** (`x` keyframes) no wrapper — além do toast atual. Não usar `key` para disparar (remontaria o form e perderia o input).
- **Acessibilidade:** `useReducedMotion()` → `initial={false}` + variants desligadas (render instantâneo).

## Fora de escopo (YAGNI)
Animar o resto do admin; trocar `framer-motion`→`motion`; redesign visual; novos componentes.

## Verificação
`typecheck` + `lint` + `build` do frontend passam; login anima no navegador; com `prefers-reduced-motion` não há transform. Entrega via PR (deploy pela automação).
