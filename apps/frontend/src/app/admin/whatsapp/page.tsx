'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { type ConexaoWhatsAppAdmin, type WhatsAppConfigInstancia } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

// Configurações suportadas pelo Evolution Go (advanced-settings)
const CONFIGS_INFO: { key: keyof WhatsAppConfigInstancia; label: string; icon: string; descricao: string }[] = [
  { key: 'rejectCall', label: 'Bloquear Chamadas', icon: '🚫', descricao: 'Rejeita automaticamente chamadas de voz e vídeo recebidas' },
  { key: 'groupsIgnore', label: 'Ignorar Grupos', icon: '👥', descricao: 'Não processa mensagens recebidas em grupos do WhatsApp' },
  { key: 'alwaysOnline', label: 'Sempre Online', icon: '🟢', descricao: 'Mantém o status do número sempre como online' },
  { key: 'readMessages', label: 'Marcar como Lido', icon: '✅', descricao: 'Confirma automaticamente a leitura das mensagens recebidas' },
  { key: 'readStatus', label: 'Ler Status', icon: '👁️', descricao: 'Visualiza automaticamente os status/stories dos contatos' },
];

function formatTelefone(t: string | null) {
  if (!t) return '-';
  const d = t.replace(/\D/g, '');
  if (d.length === 13 || d.length === 12) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  }
  return t;
}

export default function WhatsAppPage() {
  const { showSuccess, showError } = useToast();
  const [conexoes, setConexoes] = useState<ConexaoWhatsAppAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [qrs, setQrs] = useState<Record<string, string | null>>({});
  const [settingsAberto, setSettingsAberto] = useState<string | null>(null);
  const [settings, setSettings] = useState<WhatsAppConfigInstancia | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await api.adminClientes.listarConexoesWhatsApp();
      setConexoes(data);
    } catch (err) {
      showError('Erro ao carregar conexões', err instanceof Error ? err.message : '');
    } finally {
      setCarregando(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregar();
    const interval = setInterval(() => void carregar(), 10000);
    return () => clearInterval(interval);
  }, [carregar]);

  const criar = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    setAcao('criar');
    try {
      const data = await api.adminClientes.criarConexaoWhatsApp(nome);
      setQrs((q) => ({ ...q, [nome]: data.qrCodeBase64 ?? null }));
      setNovoNome('');
      showSuccess('Conexão criada', data.qrCodeBase64 ? 'Escaneie o QR Code' : 'Pronta');
      await carregar();
    } catch (err) {
      showError('Falha ao criar conexão', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const conectar = async (nome: string) => {
    setAcao(`conectar:${nome}`);
    try {
      const data = await api.adminClientes.qrcodeConexaoWhatsApp(nome);
      setQrs((q) => ({ ...q, [nome]: data.conectado ? null : data.qrCodeBase64 }));
      if (data.conectado) showSuccess('Conectado!', nome);
      await carregar();
    } catch (err) {
      showError('Falha ao gerar QR', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const desconectar = async (nome: string) => {
    if (!window.confirm(`Desconectar "${nome}"? Será preciso escanear o QR novamente.`)) return;
    setAcao(`desc:${nome}`);
    try {
      await api.adminClientes.desconectarConexaoWhatsApp(nome);
      setQrs((q) => ({ ...q, [nome]: null }));
      showSuccess('Desconectado', nome);
      await carregar();
    } catch (err) {
      showError('Falha ao desconectar', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const apagar = async (nome: string) => {
    if (!window.confirm(`Apagar a conexão "${nome}"? Isso REMOVE a instância no Evolution Go (irreversível).`)) return;
    setAcao(`del:${nome}`);
    try {
      await api.adminClientes.apagarConexaoWhatsApp(nome);
      showSuccess('Conexão apagada', nome);
      await carregar();
    } catch (err) {
      showError('Falha ao apagar', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const tornarPrincipal = async (nome: string) => {
    setAcao(`princ:${nome}`);
    try {
      await api.adminClientes.definirPrincipalWhatsApp(nome);
      showSuccess('Conexão principal definida', nome);
      await carregar();
    } catch (err) {
      showError('Falha ao definir principal', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const abrirSettings = async (nome: string) => {
    if (settingsAberto === nome) {
      setSettingsAberto(null);
      return;
    }
    setSettingsAberto(nome);
    setSettings(null);
    try {
      const det = await api.adminClientes.detalhesConexaoWhatsApp(nome);
      setSettings(det.configs || {});
    } catch (err) {
      showError('Falha ao carregar configurações', err instanceof Error ? err.message : '');
    }
  };

  const toggleConfig = async (nome: string, key: keyof WhatsAppConfigInstancia) => {
    if (!settings) return;
    const novo: WhatsAppConfigInstancia = { ...settings, [key]: !settings[key] };
    setSettings(novo);
    try {
      await api.adminClientes.configConexaoWhatsApp(nome, novo);
    } catch (err) {
      showError('Falha ao salvar configuração', err instanceof Error ? err.message : '');
      setSettings({ ...settings });
    }
  };

  if (carregando) {
    return <div className="p-6 text-sm text-[var(--color-text-secondary)]">Carregando...</div>;
  }

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div>
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">📱 Central do WhatsApp</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Conexões do WhatsApp da loja. A conexão <strong>principal</strong> cuida de pedidos, notificações e atendimento.
        </p>
      </div>

      {/* Nova conexão */}
      <CrmCard className="p-5">
        <p className="mb-2 font-sora text-lg font-semibold text-[var(--color-text-primary)]">+ Nova conexão</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="nome-da-conexao (ex: rancho-comida)"
            className="flex-1 min-w-[220px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            onKeyDown={(e) => { if (e.key === 'Enter') void criar(); }}
          />
          <CrmButton onClick={() => void criar()} disabled={!!acao || !novoNome.trim()}>
            {acao === 'criar' ? 'Criando...' : 'Criar conexão'}
          </CrmButton>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          Use letras, números, <code>_</code> e <code>-</code> (3-100 caracteres). A primeira conexão vira a principal.
        </p>
      </CrmCard>

      {conexoes.length === 0 && (
        <CrmCard className="p-5 text-center text-sm text-[var(--color-text-secondary)]">
          Nenhuma conexão ainda. Crie a primeira acima.
        </CrmCard>
      )}

      {/* Lista de conexões */}
      {conexoes.map((c) => {
        const qr = qrs[c.nome];
        const ocupado = acao?.endsWith(`:${c.nome}`) ?? false;
        return (
          <CrmCard key={c.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-[var(--color-text-primary)]">{c.nome}</p>
                  {c.principal && (
                    <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                      ★ Principal
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${c.conectado ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`} />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {c.conectado ? 'Conectado' : 'Desconectado'}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {formatTelefone(c.telefone)}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {qr && !c.conectado && (
              <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Escaneie no WhatsApp do celular:</p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR Code WhatsApp" className="h-56 w-56 rounded-md bg-white p-2" />
                </div>
                <p className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">
                  WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!c.conectado && (
                <CrmButton onClick={() => void conectar(c.nome)} disabled={!!acao}>
                  {acao === `conectar:${c.nome}` ? 'Gerando QR...' : (qr ? '🔄 Atualizar QR' : '📱 Conectar')}
                </CrmButton>
              )}
              {c.conectado && (
                <CrmButton variant="ghost" onClick={() => void desconectar(c.nome)} disabled={!!acao}>
                  {acao === `desc:${c.nome}` ? 'Desconectando...' : '🔌 Desconectar'}
                </CrmButton>
              )}
              {!c.principal && (
                <CrmButton variant="ghost" onClick={() => void tornarPrincipal(c.nome)} disabled={!!acao}>
                  {acao === `princ:${c.nome}` ? '...' : '★ Tornar principal'}
                </CrmButton>
              )}
              <CrmButton variant="ghost" onClick={() => void abrirSettings(c.nome)} disabled={!!acao}>
                ⚙️ Configurações
              </CrmButton>
              <CrmButton variant="danger" onClick={() => void apagar(c.nome)} disabled={!!acao}>
                {acao === `del:${c.nome}` ? 'Apagando...' : '🗑️ Apagar'}
              </CrmButton>
            </div>

            {/* Settings da conexão */}
            {settingsAberto === c.nome && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                {!settings ? (
                  <p className="text-xs text-[var(--color-text-secondary)]">Carregando configurações...</p>
                ) : (
                  <div className="space-y-2">
                    {CONFIGS_INFO.map((cfg) => {
                      const ativo = Boolean(settings[cfg.key]);
                      return (
                        <button
                          key={cfg.key}
                          type="button"
                          onClick={() => void toggleConfig(c.nome, cfg.key)}
                          disabled={ocupado}
                          className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--color-border)] p-3 text-left hover:bg-[var(--color-surface-raised)] disabled:opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{cfg.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{cfg.label}</p>
                              <p className="text-xs text-[var(--color-text-secondary)]">{cfg.descricao}</p>
                            </div>
                          </div>
                          <div className={`relative h-6 w-11 rounded-full transition-colors ${ativo ? 'bg-[var(--color-success)]' : 'bg-[var(--color-surface-raised)]'}`}>
                            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CrmCard>
        );
      })}
    </div>
  );
}
