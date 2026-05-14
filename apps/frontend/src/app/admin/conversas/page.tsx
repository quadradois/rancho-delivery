'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Conversa {
  telefone: string;
  nome: string;
  naoLidas: number;
  ultimaMensagem: string;
  ultimaMensagemEm: string;
  ultimaOrigem: string;
  tipo?: 'cliente' | 'lead';
  leadId?: string;
}

interface Mensagem {
  id: string;
  texto: string;
  origem: 'HUMANO' | 'IA' | 'SISTEMA';
  lida: boolean;
  criadoEm: string;
}

function formatarTempo(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarTelefone(t: string) {
  const d = t.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return t;
}

export default function ConversasPage() {
  const { showError } = useToast();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [busca, setBusca] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversasRef = useRef<Conversa[]>([]);

  const carregarConversas = useCallback(async () => {
    try {
      const data = await api.adminClientes.listarTodasConversas();
      conversasRef.current = data;
      setConversas(data);
    } catch (err) {
      showError('Erro ao carregar conversas', err instanceof Error ? err.message : '');
    } finally {
      setCarregando(false);
    }
  }, [showError]);

  const carregarMensagens = useCallback(async (telefone: string) => {
    setCarregandoMsgs(true);
    try {
      // Usa ref para evitar dependência de conversas e loop infinito
      const conversa = conversasRef.current.find((c) => c.telefone === telefone);
      let data: Mensagem[];
      if (conversa?.tipo === 'lead' && conversa.leadId) {
        data = await api.adminClientes.listarMensagensLead(conversa.leadId, true) as Mensagem[];
      } else {
        data = await api.adminClientes.listarMensagens(telefone, true) as Mensagem[];
      }
      setMensagens(data);
      setConversas((prev) => prev.map((c) => c.telefone === telefone ? { ...c, naoLidas: 0 } : c));
    } catch (err) {
      showError('Erro ao carregar mensagens', err instanceof Error ? err.message : '');
    } finally {
      setCarregandoMsgs(false);
    }
  }, [showError]);

  useEffect(() => { void carregarConversas(); }, [carregarConversas]);

  useEffect(() => {
    const interval = setInterval(() => void carregarConversas(), 15000);
    return () => clearInterval(interval);
  }, [carregarConversas]);

  useEffect(() => {
    if (selecionada) void carregarMensagens(selecionada);
  }, [selecionada, carregarMensagens]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const selecionar = (telefone: string) => {
    setSelecionada(telefone);
    setMensagens([]);
    setTexto('');
  };

  const enviar = async () => {
    if (!texto.trim() || !selecionada || enviando) return;
    setEnviando(true);
    const textoEnvio = texto.trim();
    setTexto('');
    try {
      await api.adminClientes.enviarMensagem(selecionada, textoEnvio);
      await carregarMensagens(selecionada);
    } catch (err) {
      showError('Erro ao enviar', err instanceof Error ? err.message : '');
      setTexto(textoEnvio);
    } finally {
      setEnviando(false);
    }
  };

  const conversaAtual = conversas.find((c) => c.telefone === selecionada);
  const conversasFiltradas = busca
    ? conversas.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.telefone.includes(busca)
      )
    : conversas;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Lista de conversas */}
      <div className="flex w-80 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] p-3">
          <p className="font-sora text-base font-bold text-[var(--color-text-primary)]">💬 Conversas</p>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="mt-2 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando && (
            <p className="p-4 text-sm text-[var(--color-text-secondary)]">Carregando...</p>
          )}
          {!carregando && conversasFiltradas.length === 0 && (
            <p className="p-4 text-sm text-[var(--color-text-secondary)]">Nenhuma conversa encontrada.</p>
          )}
          {conversasFiltradas.map((c) => (
            <button
              key={c.telefone}
              type="button"
              onClick={() => selecionar(c.telefone)}
              className={`flex w-full items-start gap-3 border-b border-[var(--color-border)] px-3 py-3 text-left hover:bg-[var(--color-surface-raised)] ${selecionada === c.telefone ? 'bg-[var(--color-surface-raised)]' : ''}`}
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{c.nome}</p>
                    {c.tipo === 'lead' && (
                      <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700">Lead</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">{formatarTempo(c.ultimaMensagemEm)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">
                    {c.ultimaOrigem === 'IA' ? '🤖 ' : c.ultimaOrigem === 'SISTEMA' ? '⚙️ ' : ''}{c.ultimaMensagem}
                  </p>
                  {c.naoLidas > 0 && (
                    <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-xs font-bold text-white">
                      {c.naoLidas}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Painel da conversa */}
      {!selecionada ? (
        <div className="flex flex-1 items-center justify-center text-[var(--color-text-tertiary)]">
          <div className="text-center">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
              {conversaAtual?.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{conversaAtual?.nome}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{formatarTelefone(selecionada)}</p>
            </div>
            <a
              href={conversaAtual?.tipo === 'lead' && conversaAtual.leadId
                ? `/admin/mineracao?leadId=${conversaAtual.leadId}`
                : `/admin/clientes/${selecionada}`}
              className="ml-auto text-xs text-[var(--color-primary)] hover:underline"
            >
              Ver perfil →
            </a>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--color-surface-raised)]">
            {carregandoMsgs && (
              <p className="text-center text-sm text-[var(--color-text-secondary)]">Carregando...</p>
            )}
            {!carregandoMsgs && mensagens.length === 0 && (
              <p className="text-center text-sm text-[var(--color-text-secondary)]">Nenhuma mensagem ainda.</p>
            )}
            {mensagens.map((m) => {
              const isNosso = m.origem === 'IA' || m.origem === 'SISTEMA';
              const isHumanoNosso = false; // mensagens do admin são origem SISTEMA
              return (
                <div key={m.id} className={`flex ${isNosso ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    m.origem === 'IA'
                      ? 'bg-blue-100 text-blue-900'
                      : m.origem === 'SISTEMA'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white border border-[var(--color-border)] text-[var(--color-text-primary)]'
                  }`}>
                    {m.origem === 'IA' && (
                      <p className="text-xs font-semibold mb-0.5 opacity-70">🤖 IA</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{m.texto}</p>
                    <p className="text-right text-xs mt-1 opacity-60">
                      {new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!texto.trim() || enviando}
              className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
            >
              {enviando ? '...' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
