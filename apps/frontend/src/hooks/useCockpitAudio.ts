'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type AudioKind = 'pedido' | 'whatsapp' | 'sla';

const STORAGE_KEY = 'rancho:cockpit:sound-muted';

export function useCockpitAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setMutedState(saved === 'true');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/cockpit-sw.js').catch(() => undefined);
    }
  }, []);

  const ensureContext = useCallback(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!contextRef.current) {
      contextRef.current = new AudioContextClass();
    }
    if (contextRef.current.state === 'suspended') {
      void contextRef.current.resume();
    }
    return contextRef.current;
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
      return;
    }
    if (Notification.permission !== 'granted') return;
    navigator.serviceWorker.controller?.postMessage({
      type: 'cockpit:notify',
      title,
      body,
    });
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
    if (!next) {
      ensureContext();
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  }, [ensureContext]);

  const tone = useCallback((frequency: number, start: number, duration: number, gain = 0.08) => {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    volume.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    oscillator.connect(volume);
    volume.connect(ctx.destination);
    oscillator.start(ctx.currentTime + start);
    oscillator.stop(ctx.currentTime + start + duration + 0.02);
  }, [ensureContext, muted]);

  const play = useCallback((kind: AudioKind) => {
    if (muted) return;
    if (kind === 'pedido') {
      tone(880, 0, 0.14, 0.09);
      tone(1175, 0.16, 0.18, 0.07);
      notify('Novo pedido', 'Um pedido entrou no cockpit.');
      return;
    }
    if (kind === 'whatsapp') {
      tone(660, 0, 0.1, 0.06);
      tone(880, 0.12, 0.08, 0.05);
      notify('Nova mensagem', 'Chegou mensagem de cliente no WhatsApp.');
      return;
    }
    tone(440, 0, 0.08, 0.04);
    tone(440, 0.18, 0.08, 0.04);
    tone(440, 0.36, 0.08, 0.04);
  }, [muted, notify, tone]);

  const playNewOrder = useCallback(() => play('pedido'), [play]);
  const playMessage = useCallback(() => play('whatsapp'), [play]);
  const playSla = useCallback(() => play('sla'), [play]);

  return {
    muted,
    setMuted,
    playNewOrder,
    playMessage,
    playSla,
  };
}

export default useCockpitAudio;
