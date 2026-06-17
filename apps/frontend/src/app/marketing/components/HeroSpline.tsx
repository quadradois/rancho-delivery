'use client';

import { createElement, useEffect, useState } from 'react';

const SCENE = 'https://prod.spline.design/S56Doh4-EU10ZfXr/scene.splinecode';
const VIEWER_SRC = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';

/**
 * Robô 3D (Spline) só no desktop e quando o usuário não pediu menos movimento.
 * No mobile / reduced-motion mostra uma "aura" leve (sem WebGL) — protege a
 * performance e a conversão. Carregado da CDN via web component (sem dep npm).
 */
export default function HeroSpline() {
  const [mostrar3d, setMostrar3d] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!desktop || reduz) return;
    if (!document.querySelector('script[data-spline-viewer]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = VIEWER_SRC;
      s.setAttribute('data-spline-viewer', '');
      document.head.appendChild(s);
    }
    setMostrar3d(true);
  }, []);

  if (!mostrar3d) {
    return (
      <div className="relative h-full w-full">
        <div className="ff-glow ff-float absolute inset-0" aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="ff-glow absolute inset-0" aria-hidden />
      {createElement('spline-viewer', {
        url: SCENE,
        style: { width: '100%', height: '100%', position: 'relative', zIndex: 1 },
      })}
    </div>
  );
}
