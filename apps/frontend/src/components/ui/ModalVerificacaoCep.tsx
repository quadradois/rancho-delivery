'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface MarketplaceLinks {
  ifood?: string;
  food99?: string;
  outro?: string;
  nomeOutro?: string;
}

interface ValidacaoCep {
  atendido: boolean;
  endereco?: {
    bairro: string;
    logradouro: string;
    localidade: string;
    uf: string;
  };
  taxa?: number;
  tempoEntrega?: number;
  marketplaces?: MarketplaceLinks;
  erro?: string;
}

const CEP_VALIDADO_KEY = 'rancho:cep_validado';

export function getCepValidado() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CEP_VALIDADO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Alias para compatibilidade — não é um hook, é uma função utilitária
export function useCepValidado() {
  return getCepValidado();
}

export function salvarCepValidado(dados: {
  cep: string;
  bairro: string;
  logradouro: string;
  localidade: string;
  uf: string;
  taxa: number;
  tempoEntrega: number;
}) {
  sessionStorage.setItem(CEP_VALIDADO_KEY, JSON.stringify(dados));
}

export function limparCepValidado() {
  sessionStorage.removeItem(CEP_VALIDADO_KEY);
}

interface ModalVerificacaoCepProps {
  onAtendido: (dados: { cep: string; bairro: string; logradouro: string; localidade: string; uf: string; taxa: number; tempoEntrega: number }) => void;
}

export default function ModalVerificacaoCep({ onAtendido }: ModalVerificacaoCepProps) {
  const [aberto, setAberto] = useState(false);
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ValidacaoCep | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Abre o modal se não tiver CEP validado na sessão
    const cepSalvo = getCepValidado();
    if (!cepSalvo) {
      setTimeout(() => setAberto(true), 800);
    }
  }, []);

  const formatarCep = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 8);
    if (numeros.length > 5) return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    return numeros;
  };

  const handleVerificar = async () => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoading(true);
    setResultado(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/bairros/cep/${cepLimpo}`);
      const json = await res.json();
      const data: ValidacaoCep = json.data ?? json;
      setResultado(data);

      if (data.atendido && data.endereco && data.taxa !== undefined) {
        const dadosValidados = {
          cep: cepLimpo,
          bairro: data.endereco.bairro,
          logradouro: data.endereco.logradouro,
          localidade: data.endereco.localidade,
          uf: data.endereco.uf,
          taxa: data.taxa,
          tempoEntrega: data.tempoEntrega ?? 30,
        };
        salvarCepValidado(dadosValidados);
        onAtendido(dadosValidados);
        setTimeout(() => setAberto(false), 1500);
      }
    } catch {
      setResultado({ atendido: false, erro: 'Serviço de CEP temporariamente indisponível. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFechar = () => {
    setAberto(false);
  };

  if (!mounted || !aberto) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop suave — não bloqueia, apenas destaca */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleFechar}
      />

      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#251208', border: '1.5px solid #3E2214' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-brand text-2xl font-black uppercase text-[#F4E8CC]">
                Entregamos na sua região?
              </h2>
              <p className="text-sm text-[#9A7B5C] mt-1">
                Digite seu CEP para verificar antes de montar seu pedido
              </p>
            </div>
            <button
              onClick={handleFechar}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#9A7B5C] hover:text-[#F4E8CC] hover:bg-white/10 transition-all"
              aria-label="Fechar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Input CEP */}
        <div className="px-6 pb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A7B5C]">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(formatarCep(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerificar()}
                className="w-full h-11 pl-9 pr-4 rounded-xl text-[#F4E8CC] text-sm outline-none border border-[#3E2214] focus:border-[#D4601C] transition-colors"
                style={{ background: '#1A0D06' }}
                maxLength={9}
                autoFocus
              />
            </div>
            <button
              onClick={handleVerificar}
              disabled={loading || cep.replace(/\D/g, '').length !== 8}
              className={cn(
                'px-4 h-11 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex-shrink-0',
                'bg-[#D4601C] text-white hover:bg-[#E87830]',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Verificar'}
            </button>
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="px-6 pb-6">
            {resultado.atendido ? (
              /* Atendido */
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(74,120,64,0.15)', border: '1.5px solid rgba(74,120,64,0.4)' }}>
                <div className="w-8 h-8 rounded-full bg-[#4A7840]/30 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7840" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[#4A7840] text-sm">Entregamos na sua região!</p>
                  <p className="text-xs text-[#9A7B5C] mt-0.5">
                    {resultado.endereco?.bairro} — {resultado.endereco?.localidade}/{resultado.endereco?.uf}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs font-bold text-[#E87830]">
                      🛵 {resultado.tempoEntrega ?? 30} min
                    </span>
                    <span className="text-xs font-bold text-[#E8A040]">
                      {resultado.taxa === 0 ? '✅ Frete grátis' : `💰 ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.taxa ?? 0)}`}
                    </span>
                  </div>
                </div>
              </div>
            ) : resultado.erro ? (
              /* Erro de CEP */
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'rgba(212,96,28,0.1)', border: '1.5px solid rgba(212,96,28,0.3)' }}>
                <div className="w-8 h-8 rounded-full bg-[#D4601C]/20 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4601C" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-sm text-[#E87830]">{resultado.erro}</p>
              </div>
            ) : (
              /* Não atendido — mostra marketplaces */
              <div className="space-y-3">
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(212,96,28,0.1)', border: '1.5px solid rgba(212,96,28,0.3)' }}>
                  <p className="font-bold text-[#E87830] text-sm">Ainda não entregamos nessa região</p>
                  {resultado.endereco && (
                    <p className="text-xs text-[#9A7B5C] mt-0.5">
                      {resultado.endereco.bairro} — {resultado.endereco.localidade}/{resultado.endereco.uf}
                    </p>
                  )}
                </div>

                {/* Links de marketplace */}
                {resultado.marketplaces && (
                  Object.values(resultado.marketplaces).some(Boolean)
                ) && (
                  <div className="space-y-2">
                    <p className="text-xs text-[#9A7B5C] font-semibold uppercase tracking-wider">
                      Mas você pode nos encontrar em:
                    </p>
                    <div className="flex flex-col gap-2">
                      {resultado.marketplaces?.ifood && (
                        <a
                          href={resultado.marketplaces.ifood}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
                          style={{ background: '#EA1D2C', color: 'white' }}
                        >
                          <span className="text-lg">🛵</span>
                          iFood
                        </a>
                      )}
                      {resultado.marketplaces?.food99 && (
                        <a
                          href={resultado.marketplaces.food99}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
                          style={{ background: '#FFD700', color: '#1A1A1A' }}
                        >
                          <span className="text-lg">🍔</span>
                          99Food
                        </a>
                      )}
                      {resultado.marketplaces?.outro && resultado.marketplaces?.nomeOutro && (
                        <a
                          href={resultado.marketplaces.outro}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
                          style={{ background: '#3E2214', color: '#F4E8CC', border: '1.5px solid #5C3418' }}
                        >
                          <span className="text-lg">🍽️</span>
                          {resultado.marketplaces.nomeOutro}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFechar}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#9A7B5C] hover:text-[#F4E8CC] transition-colors"
                >
                  Continuar navegando mesmo assim
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer — pular */}
        {!resultado && (
          <div className="px-6 pb-5 text-center">
            <button
              onClick={handleFechar}
              className="text-xs text-[#5C3418] hover:text-[#9A7B5C] transition-colors"
            >
              Pular verificação
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
