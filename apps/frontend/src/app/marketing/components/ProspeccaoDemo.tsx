'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import Contador from './Contador';

// Quais "casas" do mini-mapa viram lead (acendem). Grid 7x5 = 35.
const COLS = 7;
const ROWS = 5;
const LEADS = new Set([2, 5, 8, 11, 13, 16, 18, 20, 23, 26, 29, 31, 33]);

/**
 * Demo do hero: mini-mapa do bairro com casas acendendo (prospecção), contador
 * de leads e de pedidos, e a mensagem que a AURA manda no WhatsApp. As animações
 * DEMONSTRAM o produto (acontecem uma vez ao entrar na tela). reduced-motion safe.
 */
export default function ProspeccaoDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const emView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const animar = emView && !reduce;

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center p-2">
      <div className="ff-glow absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2" aria-hidden />

      <div
        className="relative w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* topo: pedidos hoje */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
              Pedidos hoje
            </p>
            <Contador value={13} className="ff-display text-4xl font-bold" />
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-success-text)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
            AURA ativa
          </span>
        </div>

        {/* mini-mapa do bairro */}
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>Jardim Atlântico</span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-accent)' }}>
              leads: <Contador value={47} duration={1600} />
            </span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {Array.from({ length: COLS * ROWS }).map((_, i) => {
              const lead = LEADS.has(i);
              return (
                <motion.div
                  key={i}
                  className="aspect-square rounded-[4px]"
                  style={{ background: lead ? 'var(--color-accent)' : 'var(--color-surface-active)' }}
                  initial={animar ? { opacity: lead ? 0.15 : 0.4, scale: 0.9 } : false}
                  animate={animar ? { opacity: lead ? 1 : 0.4, scale: 1 } : undefined}
                  transition={{ duration: 0.3, delay: lead ? 0.3 + (i % 12) * 0.08 : 0 }}
                />
              );
            })}
          </div>
        </div>

        {/* balão do WhatsApp montado pela AURA */}
        <motion.div
          className="mt-4 rounded-xl border p-3"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
          initial={animar ? { opacity: 0, y: 8 } : false}
          animate={animar ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full" style={{ background: 'var(--color-success)' }} />
            <span className="text-xs font-semibold">WhatsApp · João</span>
          </div>
          <p className="rounded-lg rounded-tr-none px-3 py-2 text-xs leading-relaxed" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-text-primary)' }}>
            Oi João! Acabou de abrir o <b>Rancho Delivery</b> aqui no Jardim Atlântico 🍔 Quer ver o cardápio?
          </p>
          <span className="mt-1 block text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>enviado pela AURA ✓</span>
        </motion.div>
      </div>
    </div>
  );
}
