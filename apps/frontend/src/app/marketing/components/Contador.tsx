'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * Conta de 0 até `value` quando entra na tela (count-up). Demonstra resultado —
 * não é enfeite. Respeita prefers-reduced-motion (mostra o número final direto).
 */
export default function Contador({
  value,
  duration = 1400,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const emView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!emView) return;
    if (reduce) {
      setN(value);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    const tick = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setN(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [emView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {n}
      {suffix}
    </span>
  );
}
