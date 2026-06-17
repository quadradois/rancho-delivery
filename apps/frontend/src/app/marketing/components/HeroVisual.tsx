'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Visual autoral do hero (sem Spline / sem dependência externa / sem marca d'água).
 * "Núcleo da AURA" pulsante com anel girando + cartões que contam o produto.
 * Sem parallax e sem flutuar (os cartões ficam estáticos — só entram com fade);
 * o único movimento contínuo é o do núcleo, sutil. Respeita prefers-reduced-motion.
 */
export default function HeroVisual() {
  const reduce = useReducedMotion();

  const aparece = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <div className="absolute inset-0" aria-hidden>
      {/* brilho ambiente */}
      <div className="ff-glow absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2" />

      {/* núcleo + órbitas */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-56 w-56 sm:h-64 sm:w-64">
          {/* anel cônico girando */}
          {!reduce && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'conic-gradient(from 0deg, transparent, var(--color-accent), transparent 60%)', opacity: 0.55 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {/* anel estático fino */}
          <div className="absolute inset-3 rounded-full" style={{ border: '1px solid var(--color-border-strong)' }} />
          {/* núcleo pulsante */}
          <motion.div
            className="absolute inset-10 rounded-full"
            style={{ background: 'radial-gradient(circle at 35% 30%, var(--color-accent-hover), var(--color-accent) 45%, #1b1740 100%)', boxShadow: '0 0 80px rgba(99,102,241,0.55)' }}
            animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* marca no núcleo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="ff-display text-2xl font-bold tracking-wide" style={{ color: '#fff' }}>AURA</span>
          </div>
          {/* pontos orbitando */}
          {!reduce &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{ marginLeft: -4, marginTop: -4 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 9 + i * 4, repeat: Infinity, ease: 'linear' }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ transform: `translateX(${110 + i * 14}px)`, background: 'var(--color-accent)', opacity: 0.8 }}
                />
              </motion.div>
            ))}
        </div>
      </div>

      {/* Cartão: WhatsApp / AURA atendendo */}
      <motion.div
        className="absolute left-[6%] top-[16%] w-56 rounded-2xl border p-3 shadow-xl sm:left-[2%]"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        {...aparece(0.1)}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="h-6 w-6 rounded-full" style={{ background: 'var(--color-success)' }} />
          <span className="text-xs font-semibold">Cliente</span>
        </div>
        <p className="rounded-lg rounded-tl-none px-2.5 py-1.5 text-xs" style={{ background: 'var(--color-surface-active)' }}>
          Oi! Vocês entregam agora?
        </p>
        <p className="mt-1.5 rounded-lg rounded-tr-none px-2.5 py-1.5 text-xs" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-text-primary)' }}>
          Entregamos sim 🚀 Quer ver o cardápio?
        </p>
        <span className="mt-1 block text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>AURA respondeu</span>
      </motion.div>

      {/* Cartão: pedido confirmado */}
      <motion.div
        className="absolute bottom-[18%] left-[10%] w-52 rounded-2xl border p-3 shadow-xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        {...aparece(0.22)}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Pedido #1287</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--color-success-muted)', color: 'var(--color-success-text)' }}>Confirmado</span>
        </div>
        <p className="ff-display mt-1.5 text-lg font-bold">R$ 48,90</p>
      </motion.div>

      {/* Cartão: alta de vendas */}
      <motion.div
        className="absolute right-[6%] top-[24%] w-44 rounded-2xl border p-3 shadow-xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        {...aparece(0.34)}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>Vendas no mês</span>
        <div className="mt-1 flex items-end gap-2">
          <span className="ff-display text-xl font-bold" style={{ color: 'var(--color-accent)' }}>+32%</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M21 7v6h-6" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
