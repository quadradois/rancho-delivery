'use client';

import { useEffect, useState } from 'react';
import { InteractiveRobotSpline } from './InteractiveRobotSpline';

const SCENE = 'https://prod.spline.design/S56Doh4-EU10ZfXr/scene.splinecode';

/**
 * Robô 3D (Spline) em tela cheia no hero — só no desktop e quando o usuário não
 * pediu menos movimento. No mobile / reduced-motion mostra uma "aura" leve (sem
 * WebGL) — protege a performance e a conversão. Usa o pacote @splinetool/react-spline
 * (canvas, sem marca d'água), carregado sob demanda (lazy).
 */
export default function HeroSpline() {
  const [render3d, setRender3d] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setRender3d(desktop && !reduz);
  }, []);

  if (!render3d) {
    return <div className="ff-glow ff-float absolute inset-0" aria-hidden />;
  }

  return <InteractiveRobotSpline scene={SCENE} className="absolute inset-0 h-full w-full" />;
}
