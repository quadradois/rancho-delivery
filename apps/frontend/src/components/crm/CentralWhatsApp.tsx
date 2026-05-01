'use client';

import React, { useState } from 'react';
import { ConversaNaoLida, MensagemClienteAdmin } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';

interface CentralWhatsAppProps {
  conversas: ConversaNaoLida[];
  onVerPedido: (pedidoId: string) => void;
  onCarregarMensagens: (telefone: string) => Promise<MensagemClienteAdmin[]>;
  onEnviarMensagem: (telefone: string, texto: string, pedidoId?: string) => Promise<void>;
  whatsappConectado: boolean;
}

const RESPOSTAS_RAPIDAS = [
  'Já saiu para entrega!',
  'Em preparo, aguarde!',
  'Chegando em breve!',
  'Pedido confirmado!',
  'Em instantes entramos em contato.',
];

function formatTempo(segundos: number) {
  const min = Math.floor(segundos / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}min` : ''}`;
}

export default function CentralWhatsApp({
  conversas,
  onVerPedido,
  onCarregarMensagens,
  onEnviarMensagem,
  whatsappConectado,
}: CentralWhatsAppProps) {
  const [conversaSelecionada, setConversaSelecionada] = useState<ConversaNaoLida | null>(null);
  const [mensagens, setMensagens] = useState<MensagemClienteAdmin[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const abrirConversa = async (conversa: ConversaNaoLida) => {
    setConversaSelecionada(conversa);
    setCarregando(true);
    try {
      const msgs = await onCarregarMensagens(conversa.telefone);
      setMensagens(msgs);
    } finally {
      setCarregando(false);
    }
  };

  const enviar = async (textoEnvio: string) => {
    if (!conversaSelecionada || !textoEnvio.trim() || enviando) return;
    setEnviando(true);
    try {
      await onEnviarMensagem(
        conversaSelecionada.telefone,
        textoEnvio.trim(),
        conversaSelecionada.pedidoAtivo?.id
      );
      setTexto('');
      const msgs = await onCarregarMensagens(conversaSelecionada.telefone);
      setMensagens(msgs);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
      {/* Lista de conversas */}
      <CrmCard className="flex flex-col p-0 overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Mensagens ({conversas.length})
            </p>
            <span className={`h-2 w-2 rounded-full ${whatsappConectado ? 'bg-green-500' : 'bg-red-500'}`} title={whatsappConectado ? 'WhatsApp conectado' : 'WhatsApp desconectado'} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {conversas.length === 0 ? (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">Sem mensagens não lidas.</p>
          ) : (
            conversas.map((c) => (
              <button
                key={c.telefone}
                type="button"
                onClick={() => void abrirConversa(c)}
                className={`w-full border-b border-[var(--color-border)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-hover)] ${
                  conversaSelecionada?.telefone === c.telefone ? 'bg-[var(--color-accent-muted)]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{c.nome}</p>
                  <span className={`shrink-0 text-[10px] font-semibold ${c.tempoSemRespostaSegundos >= 600 ? 'text-[var(--color-danger-text)]' : 'text-[var(--color-text-tertiary)]'}`}>
                    {formatTempo(c.tempoSemRespostaSegundos)}
                  </span>
                </div>
                <p className="truncate text-[11px] text-[var(--color-text-secondary)]">{c.ultimaMensagem}</p>
                <div className="mt-1 flex items-center gap-2">
                  {c.mensagensNaoLidas > 0 && (
                    <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {c.mensagensNaoLidas}
                    </span>
                  )}
                  {c.pedidoAtivo && (
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                      Pedido ativo · {c.pedidoAtivo.status}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </CrmCard>

      {/* Conversa aberta */}
      <CrmCard className="flex flex-col p-0 overflow-hidden">
        {!conversaSelecionada ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-[var(--color-text-secondary)]">Selecione uma conversa.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{conversaSelecionada.nome}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">{conversaSelecionada.telefone}</p>
              </div>
              {conversaSelecionada.pedidoAtivo && (
                <CrmButton
                  size="sm"
                  variant="ghost"
                  onClick={() => onVerPedido(conversaSelecionada.pedidoAtivo!.id)}
                >
                  Ver pedido
                </CrmButton>
              )}
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-2">
              {carregando ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>
              ) : mensagens.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Sem mensagens.</p>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.origem === 'HUMANO'
                        ? 'mr-auto bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]'
                        : 'ml-auto bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                    }`}
                  >
                    <p>{msg.texto}</p>
                    <p className="mt-0.5 text-[10px] opacity-60">
                      {msg.origem === 'SISTEMA' ? '[AUTO]' : msg.origem === 'HUMANO' ? 'Cliente' : 'Operador'}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[var(--color-border)] p-3 space-y-2">
              <div className="flex flex-wrap gap-1">
                {RESPOSTAS_RAPIDAS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => void enviar(r)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(texto); } }}
                  placeholder="Digite uma mensagem..."
                  className="h-9 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]"
                />
                <CrmButton onClick={() => void enviar(texto)} disabled={enviando || !texto.trim()}>
                  {enviando ? '...' : 'Enviar'}
                </CrmButton>
              </div>
            </div>
          </>
        )}
      </CrmCard>
    </div>
  );
}