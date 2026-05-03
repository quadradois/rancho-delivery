'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { ConfiguracaoAlerta, MercadoPagoConfigAdmin, MotoboyAdmin } from '@/lib/api';
import { PainelAlertas } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

export default function ConfiguracoesPage() {
  const [alertas, setAlertas] = useState<ConfiguracaoAlerta[]>([]);
  const [mercadoPago, setMercadoPago] = useState<MercadoPagoConfigAdmin | null>(null);
  const [motoboys, setMotoboys] = useState<MotoboyAdmin[]>([]);
  const [loadingMotoboys, setLoadingMotoboys] = useState(false);
  const [pagamentosOpen, setPagamentosOpen] = useState(false);
  const [entregadoresOpen, setEntregadoresOpen] = useState(false);
  const [loadingMp, setLoadingMp] = useState(false);
  const [formMp, setFormMp] = useState({
    ativo: false,
    publicKey: '',
    accessToken: '',
    webhookSecret: '',
    webhookUrl: '',
  });
  const [savingMp, setSavingMp] = useState(false);
  const [novoMotoboy, setNovoMotoboy] = useState({
    nome: '',
    telefone: '',
    empresa: 'PROPRIO' as 'PROPRIO' | 'IFOOD' | 'MUVE' | 'FOOD99',
    status: 'DISPONIVEL' as 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO',
  });
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

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

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

  const carregarMotoboys = useCallback(async () => {
    try {
      setLoadingMotoboys(true);
      const data = await api.adminPedidos.listarMotoboys();
      setMotoboys(data);
    } catch {
      showError('Erro ao carregar entregadores', 'Tente novamente.');
    } finally {
      setLoadingMotoboys(false);
    }
  }, [showError]);

  useEffect(() => {
    if (entregadoresOpen && motoboys.length === 0 && !loadingMotoboys) {
      void carregarMotoboys();
    }
  }, [entregadoresOpen, motoboys.length, loadingMotoboys, carregarMotoboys]);

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

  const handleCriarMotoboy = useCallback(async () => {
    if (!novoMotoboy.nome.trim() || !novoMotoboy.telefone.trim()) {
      showError('Preencha nome e telefone');
      return;
    }
    try {
      await api.adminPedidos.criarMotoboy(novoMotoboy);
      setNovoMotoboy((prev) => ({ ...prev, nome: '', telefone: '' }));
      await carregarMotoboys();
      showSuccess('Entregador cadastrado');
    } catch {
      showError('Erro ao cadastrar entregador', 'Verifique os dados e tente novamente.');
    }
  }, [novoMotoboy, carregarMotoboys, showError, showSuccess]);

  return (
    <div className="p-5 md:p-6">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Configurações</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Gerencie os alertas e preferências da operação.</p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>
      ) : (
        <div className="space-y-6">
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

            {pagamentosOpen ? (
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
                        <label className="mb-1 block text-sm text-[var(--color-text-primary)]">Access Token (opcional: preencher só para trocar)</label>
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
            ) : null}
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setEntregadoresOpen((prev) => !prev)}
            >
              <div>
                <h2 className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Entregadores</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Cadastre e organize motoboys por empresa de entrega.</p>
              </div>
              <span className="text-sm text-[var(--color-text-secondary)]">{entregadoresOpen ? 'Fechar' : 'Abrir'}</span>
            </button>

            {entregadoresOpen ? (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4 space-y-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <input
                    value={novoMotoboy.nome}
                    onChange={(e) => setNovoMotoboy((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome"
                    className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                  />
                  <input
                    value={novoMotoboy.telefone}
                    onChange={(e) => setNovoMotoboy((prev) => ({ ...prev, telefone: e.target.value }))}
                    placeholder="Telefone"
                    className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                  />
                  <select
                    value={novoMotoboy.empresa}
                    onChange={(e) => setNovoMotoboy((prev) => ({ ...prev, empresa: e.target.value as any }))}
                    className="h-10 rounded-md border border-[var(--color-border)] px-3 text-sm"
                  >
                    <option value="PROPRIO">Próprio</option>
                    <option value="IFOOD">iFood</option>
                    <option value="MUVE">Muve</option>
                    <option value="FOOD99">99Food</option>
                  </select>
                  <button
                    className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                    onClick={handleCriarMotoboy}
                  >
                    Cadastrar
                  </button>
                </div>

                {loadingMotoboys ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Carregando entregadores...</p>
                ) : (
                  <div className="overflow-auto rounded-md border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-surface-subtle)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">Telefone</th>
                          <th className="px-3 py-2 text-left">Empresa</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {motoboys.map((m) => (
                          <tr key={m.id} className="border-t border-[var(--color-border)]">
                            <td className="px-3 py-2">{m.nome}</td>
                            <td className="px-3 py-2">{m.telefone}</td>
                            <td className="px-3 py-2">{m.empresa}</td>
                            <td className="px-3 py-2">{m.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <PainelAlertas alertas={alertas} onAtualizar={handleAtualizar} />
        </div>
      )}
    </div>
  );
}
