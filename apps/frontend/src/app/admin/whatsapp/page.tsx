'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { type WhatsAppDetalhesAdmin, type WhatsAppConfigInstancia } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

const CONFIGS_INFO: { key: keyof WhatsAppConfigInstancia; label: string; icon: string; descricao: string }[] = [
  { key: 'rejectCall', label: 'Bloquear Chamadas', icon: '🚫', descricao: 'Rejeita automaticamente chamadas de voz e vídeo recebidas' },
  { key: 'groupsIgnore', label: 'Ignorar Grupos', icon: '👥', descricao: 'Não processa mensagens recebidas em grupos do WhatsApp' },
  { key: 'alwaysOnline', label: 'Sempre Online', icon: '🟢', descricao: 'Mantém o status do número sempre como online' },
  { key: 'readMessages', label: 'Marcar como Lido', icon: '✅', descricao: 'Confirma automaticamente a leitura das mensagens recebidas' },
  { key: 'readStatus', label: 'Ler Status', icon: '👁️', descricao: 'Visualiza automaticamente os status/stories dos contatos' },
  { key: 'syncFullHistory', label: 'Sincronizar Histórico', icon: '🔄', descricao: 'Sincroniza o histórico completo de mensagens ao conectar' },
];

function formatTelefone(t: string | null) {
  if (!t) return '-';
  const d = t.replace(/\D/g, '');
  // Brasil: 55 + DDD + numero
  if (d.length === 13 || d.length === 12) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, -4)}-${d.slice(-4)}`;
  }
  return t;
}

export default function WhatsAppPage() {
  const { showSuccess, showError } = useToast();
  const [detalhes, setDetalhes] = useState<WhatsAppDetalhesAdmin | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await api.adminClientes.detalhesWhatsApp();
      setDetalhes(data);
    } catch (err) {
      showError('Erro ao carregar detalhes', err instanceof Error ? err.message : '');
    } finally {
      setCarregando(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregar();
    // Auto-refresh a cada 10s para detectar mudança de status
    const interval = setInterval(() => void carregar(), 10000);
    return () => clearInterval(interval);
  }, [carregar]);

  const conectar = async () => {
    setAcao('conectar');
    try {
      const data = await api.adminClientes.prepararWhatsApp();
      setQrCode(data.qrCodeBase64);
      if (data.conectado) {
        showSuccess('Já conectado', `Instância ${data.instanceName} ativa`);
        setQrCode(null);
      }
      await carregar();
    } catch (err) {
      showError('Falha ao conectar', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const atualizarQr = async () => {
    setAcao('qr');
    try {
      const data = await api.adminClientes.atualizarQrCodeWhatsApp();
      setQrCode(data.qrCodeBase64);
      if (data.conectado) {
        showSuccess('Conectado!');
        setQrCode(null);
      }
      await carregar();
    } catch (err) {
      showError('Falha ao atualizar QR', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const desconectar = async () => {
    if (!window.confirm('Desconectar o WhatsApp? Você precisará escanear o QR Code novamente para reconectar.')) return;
    setAcao('desconectar');
    try {
      await api.adminClientes.desconectarWhatsApp();
      showSuccess('WhatsApp desconectado');
      setQrCode(null);
      await carregar();
    } catch (err) {
      showError('Falha ao desconectar', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const apagar = async () => {
    if (!window.confirm('Apagar a instância? Isso vai remover toda a configuração e histórico. Esta ação é irreversível.')) return;
    setAcao('apagar');
    try {
      await api.adminClientes.apagarWhatsApp();
      showSuccess('Instância apagada');
      setQrCode(null);
      await carregar();
    } catch (err) {
      showError('Falha ao apagar', err instanceof Error ? err.message : '');
    } finally {
      setAcao(null);
    }
  };

  const toggleConfig = async (key: keyof WhatsAppConfigInstancia) => {
    if (!detalhes) return;
    const atual = detalhes.configs?.[key] || false;
    const novo = { [key]: !atual };
    try {
      // Atualiza UI otimisticamente
      setDetalhes({ ...detalhes, configs: { ...detalhes.configs, ...novo } });
      await api.adminClientes.atualizarConfigWhatsApp(novo);
    } catch (err) {
      showError('Falha ao atualizar configuração', err instanceof Error ? err.message : '');
      // Reverte UI
      setDetalhes({ ...detalhes, configs: { ...detalhes.configs, [key]: atual } });
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
          Gerencie a conexão do WhatsApp Business da loja
        </p>
      </div>

      <CrmCard className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-[var(--color-text-tertiary)]">{detalhes?.instanceName || '-'}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${detalhes?.conectado ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`} />
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {detalhes?.conectado ? 'Conectado' : 'Desconectado'}
              </span>
              {detalhes?.state && (
                <span className="text-xs text-[var(--color-text-tertiary)]">({detalhes.state})</span>
              )}
            </div>
          </div>
          {detalhes?.fotoPerfil && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detalhes.fotoPerfil} alt="Perfil" className="h-12 w-12 rounded-full" />
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Último telefone</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatTelefone(detalhes?.telefone ?? null)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Nome do perfil</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{detalhes?.nomePerfil || '-'}</p>
          </div>
        </div>

        {/* QR Code */}
        {qrCode && !detalhes?.conectado && (
          <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Escaneie o QR Code com o WhatsApp do celular:
            </p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code WhatsApp" className="h-64 w-64 rounded-md bg-white p-2" />
            </div>
            <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
              WhatsApp &gt; Configurações &gt; Aparelhos conectados &gt; Conectar um aparelho
            </p>
          </div>
        )}

        {/* Ações principais */}
        <div className="mt-5 flex flex-wrap gap-2">
          {!detalhes?.conectado && (
            <CrmButton onClick={() => void conectar()} disabled={!!acao}>
              {acao === 'conectar' ? 'Gerando QR Code...' : '📱 Conectar'}
            </CrmButton>
          )}
          {qrCode && !detalhes?.conectado && (
            <CrmButton variant="ghost" onClick={() => void atualizarQr()} disabled={!!acao}>
              {acao === 'qr' ? 'Atualizando...' : '🔄 Atualizar QR Code'}
            </CrmButton>
          )}
          {detalhes?.conectado && (
            <CrmButton variant="ghost" onClick={() => void desconectar()} disabled={!!acao}>
              {acao === 'desconectar' ? 'Desconectando...' : '🔌 Desconectar'}
            </CrmButton>
          )}
          {detalhes?.existe && (
            <CrmButton variant="danger" onClick={() => void apagar()} disabled={!!acao}>
              {acao === 'apagar' ? 'Apagando...' : '🗑️ Apagar instância'}
            </CrmButton>
          )}
        </div>
      </CrmCard>

      {/* Configurações da instância */}
      <CrmCard className="p-5">
        <p className="mb-1 font-sora text-lg font-semibold text-[var(--color-text-primary)]">Configurações da Instância</p>
        <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
          Comportamento do WhatsApp Business — afeta como recebemos e tratamos mensagens
        </p>
        <div className="space-y-2">
          {CONFIGS_INFO.map((c) => {
            const ativo = Boolean(detalhes?.configs?.[c.key]);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => void toggleConfig(c.key)}
                disabled={!detalhes?.existe || !!acao}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--color-border)] p-3 text-left hover:bg-[var(--color-surface-raised)] disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{c.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{c.descricao}</p>
                  </div>
                </div>
                <div className={`relative h-6 w-11 rounded-full transition-colors ${ativo ? 'bg-[var(--color-success)]' : 'bg-[var(--color-surface-raised)]'}`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>
            );
          })}
        </div>
        {!detalhes?.existe && (
          <p className="mt-3 text-xs text-[var(--color-warning-text)]">
            ⚠️ Crie a instância primeiro (botão "Conectar") para configurar.
          </p>
        )}
      </CrmCard>
    </div>
  );
}
