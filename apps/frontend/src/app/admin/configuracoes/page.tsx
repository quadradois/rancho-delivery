'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { ConfiguracaoAlerta } from '@/lib/api';
import { PainelAlertas } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

export default function ConfiguracoesPage() {
  const [alertas, setAlertas] = useState<ConfiguracaoAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  const carregarAlertas = useCallback(async () => {
    try {
      const data = await api.adminAlertas.listar();
      setAlertas(data);
    } catch {
      showError('Erro ao carregar alertas', 'Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregarAlertas();
  }, [carregarAlertas]);

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

  return (
    <div className="p-5 md:p-6">
      <div className="mb-6">
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Configurações</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Gerencie os alertas e preferências da operação.</p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando...</p>
      ) : (
        <PainelAlertas alertas={alertas} onAtualizar={handleAtualizar} />
      )}
    </div>
  );
}
