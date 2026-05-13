'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { ConfiguracaoAlerta, MercadoPagoConfigAdmin } from '@/lib/api';
import { PainelAlertas } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

export default function ConfiguracoesPage() {
  const [alertas, setAlertas] = useState<ConfiguracaoAlerta[]>([]);
  const [mercadoPago, setMercadoPago] = useState<MercadoPagoConfigAdmin | null>(null);
  const [pagamentosOpen, setPagamentosOpen] = useState(false);
  const [localizacaoOpen, setLocalizacaoOpen] = useState(false);
  const [localizacao, setLocalizacao] = useState<{ endereco: string | null; lat: number | null; lng: number | null } | null>(null);
  const [loadingLocalizacao, setLoadingLocalizacao] = useState(false);
  const [savingLocalizacao, setSavingLocalizacao] = useState(false);
  const [formLocalizacao, setFormLocalizacao] = useState({ endereco: '', lat: '', lng: '' });
  const [loadingMp, setLoadingMp] = useState(false);
  const [formMp, setFormMp] = useState({
    ativo: false,
    publicKey: '',
    accessToken: '',
    webhookSecret: '',
    webhookUrl: '',
  });
  const [savingMp, setSavingMp] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  const carregarDados = useCallback(async () => {
    try {
      const alertasData = await api.adminAlertas.listar();
      setAlertas(alertasData);
    } catch {
      showError('Erro ao carregar configurações', 'Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  const carregarMercadoPago = useCallback(async () => {
    try {
      setLoadingMp(true);
      const mpData = await api.adminPagamentos.obterMercadoPago();
      setMercadoPago(mpData);
      setFormMp({
        ativo: mpData.ativo,
        publicKey: mpData.publicKey || '',
        accessToken: '',
        webhookSecret: '',
        webhookUrl: mpData.webhookUrl || '',
      });
    } catch {
      showError('Erro ao carregar Mercado Pago', 'Tente novamente.');
    } finally {
      setLoadingMp(false);
    }
  }, [showError]);

  useEffect(() => {
    if (pagamentosOpen && !mercadoPago && !loadingMp) {
      void carregarMercadoPago();
    }
  }, [pagamentosOpen, mercadoPago, loadingMp, carregarMercadoPago]);

  const carregarLocalizacao = useCallback(async () => {
    try {
      setLoadingLocalizacao(true);
      const data = await api.adminPedidos.obterLocalizacaoLoja();
      setLocalizacao(data);
      setFormLocalizacao({
        endereco: data.endereco ?? '',
        lat: data.lat?.toString() ?? '',
        lng: data.lng?.toString() ?? '',
      });
    } catch {
      showError('Erro ao carregar localização', 'Tente novamente.');
    } finally {
      setLoadingLocalizacao(false);
    }
  }, [showError]);

  useEffect(() => {
    if (localizacaoOpen && !localizacao && !loadingLocalizacao) {
      void carregarLocalizacao();
    }
  }, [localizacaoOpen, localizacao, loadingLocalizacao, carregarLocalizacao]);

  const handleAtualizar = useCallback(async (
    tipo: string,
    dados: Partial<Pick<ConfiguracaoAlerta, 'ativo' | 'threshold' | 'acao'>>
  ) => {
    try {
      const atualizado = await api.adminAlertas.atualizar(tipo, dados);
      setAlertas((prev) => prev.map((a) => a.tipo === tipo ? { ...a, ...atualizado } : a));
      showSuccess('Alerta atualizado');
    } catch {
      showError('Erro ao atualizar alerta', 'Tente novamente.');
    }
  }, [showSuccess, showError]);

  const handleSalvarMercadoPago = useCallback(async () => {
    try {
      setSavingMp(true);
      const atualizado = await api.adminPagamentos.atualizarMercadoPago({
        ativo: formMp.ativo,
        publicKey: formMp.publicKey,
        accessToken: formMp.accessToken || undefined,
        webhookSecret: formMp.webhookSecret || undefined,
        webhookUrl: formMp.webhookUrl,
      });
      setMercadoPago(atualizado);
      setFormMp((prev) => ({ ...prev, accessToken: '', webhookSecret: '' }));
      showSuccess('Configuração do Mercado Pago salva');
    } catch {
      showError('Erro ao salvar Mercado Pago', 'Revise os dados e tente novamente.');
    } finally {
      setSavingMp(false);
    }
  }, [formMp, showError, showSuccess]);

  const handleSalvarLocalizacao = useCallback(async () => {
    const lat = parseFloat(formLocalizacao.lat);
    const lng = parseFloat(formLocalizacao.lng);
    if (!formLocalizacao.endereco.trim() || isNaN(lat) || isNaN(lng)) {
      showError('Preencha endereço, latitude e longitude');
      return;
    }
    try {
      setSavingLocalizacao(true);
      const data = await api.adminPedidos.atualizarLocalizacaoLoja(formLocalizacao.endereco, lat, lng);
      setLocalizacao(data);
      showSuccess('Localização da loja salva');
    } catch {
      showError('Erro ao salvar localização', 'Verifique os dados e tente novamente.');
    } finally {
      setSavingLocalizacao(false);
    }
  }, [formLocalizacao, showError, showSuccess]);

  return (
    <div className="p-5 md:p-6">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Configurações</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Integrações, localização da loja e alertas operacionais.</p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {/* Pagamentos */}
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setPagamentosOpen((prev) => !prev)}
            >
              <div>
                <h2 className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Integrações de pagamento</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Centralize e gerencie gateways de pagamento.</p>
              </div>
              <span className="text-sm text-[var(--color-text-secondary)]">{pagamentosOpen ? 'Fechar' : 'Abrir'}</span>
            </button>

            {pagamentosOpen && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                {loadingMp ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Carregando Mercado Pago...</p>
                ) : (
                  <div>
                    <h3 className="font-sora text-base font-semibold text-[var(--color-text-primary)]">Mercado Pago</h3>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Configure as credenciais do checkout.</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                        <input
                          type="checkbox"
                          checked={formMp.ativo}
                          onChange={(e) => setFormMp((prev) => ({ ...prev, ativo: e.target.checked }))}
                        />
                        Integração ativa
                      </label>
                      <div className="text-xs text-[var(--color-text-secondary)] md:text-right">
                        Token salvo: {mercadoPago?.accessTokenConfigured ? 'sim' : 'não'} | Secret salvo: {mercadoPago?.webhookSecretConfigured ? 'sim' : 'não'}
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Public Key</label>
                        <input
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          value={formMp.publicKey}
                          onChange={(e) => setFormMp((prev) => ({ ...prev, publicKey: e.target.value }))}
                          placeholder="APP_USR-..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Access Token (preencher só para trocar)</label>
                        <input
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          value={formMp.accessToken}
                          onChange={(e) => setFormMp((prev) => ({ ...prev, accessToken: e.target.value }))}
                          placeholder="APP_USR-..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Webhook Secret (opcional)</label>
                        <input
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          value={formMp.webhookSecret}
                          onChange={(e) => setFormMp((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                          placeholder="secret"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Webhook URL</label>
                        <input
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          value={formMp.webhookUrl}
                          onChange={(e) => setFormMp((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                          placeholder="https://rancho.delivery/webhook/mercadopago"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        onClick={handleSalvarMercadoPago}
                        disabled={savingMp}
                      >
                        {savingMp ? 'Salvando...' : 'Salvar Mercado Pago'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Localização */}
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setLocalizacaoOpen((prev) => !prev)}
            >
              <div>
                <h2 className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Localização da loja</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {localizacao?.endereco ?? 'Defina o endereço para cálculo de distância e mapa de prospecção.'}
                </p>
              </div>
              <span className="text-sm text-[var(--color-text-secondary)]">{localizacaoOpen ? 'Fechar' : 'Abrir'}</span>
            </button>

            {localizacaoOpen && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                {loadingLocalizacao ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Use o{' '}
                      <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)]">
                        OpenStreetMap
                      </a>
                      {' '}ou o Google Maps para obter latitude e longitude.
                    </p>
                    <div>
                      <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Endereço completo</label>
                      <input
                        className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                        value={formLocalizacao.endereco}
                        onChange={(e) => setFormLocalizacao((prev) => ({ ...prev, endereco: e.target.value }))}
                        placeholder="Ex: Rua das Flores, 123 - Setor Bueno, Goiânia - GO"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Latitude</label>
                        <input
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          value={formLocalizacao.lat}
                          onChange={(e) => setFormLocalizacao((prev) => ({ ...prev, lat: e.target.value }))}
                          placeholder="-16.6864"
                          inputMode="decimal"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Longitude</label>
                        <input
                          className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                          value={formLocalizacao.lng}
                          onChange={(e) => setFormLocalizacao((prev) => ({ ...prev, lng: e.target.value }))}
                          placeholder="-49.2643"
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                    <button
                      className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      onClick={handleSalvarLocalizacao}
                      disabled={savingLocalizacao}
                    >
                      {savingLocalizacao ? 'Salvando...' : 'Salvar localização'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Alertas */}
          <PainelAlertas alertas={alertas} onAtualizar={handleAtualizar} />
        </div>
      )}
    </div>
  );
}
