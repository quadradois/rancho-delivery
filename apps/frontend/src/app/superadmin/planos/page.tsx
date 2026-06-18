'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  superadminApi,
  type Plano,
  type ModuloItem,
  type PlanoInput,
  type CicloCobranca,
} from '@/lib/superadmin-client';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, Field, Select, TextInput } from '../components/ui';

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function PlanoFormModal({
  plano,
  modulos,
  onClose,
  onSalvo,
}: {
  plano: Plano | null;
  modulos: ModuloItem[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [nome, setNome] = useState(plano?.nome ?? '');
  const [descricao, setDescricao] = useState(plano?.descricao ?? '');
  const [preco, setPreco] = useState(String(plano?.preco ?? '0'));
  const [ciclo, setCiclo] = useState<CicloCobranca>(plano?.ciclo ?? 'MENSAL');
  const [diasTeste, setDiasTeste] = useState(String(plano?.diasTeste ?? '0'));
  const [publico, setPublico] = useState(plano?.publico ?? true);
  const [ativo, setAtivo] = useState(plano?.ativo ?? true);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(plano?.modulos.map((m) => m.chave) ?? []),
  );
  const [salvando, setSalvando] = useState(false);

  const toggle = (chave: string) =>
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });

  const salvar = async () => {
    const precoNum = Number(preco.replace(',', '.'));
    if (Number.isNaN(precoNum) || precoNum < 0) {
      showError('Preço inválido');
      return;
    }
    const dados: PlanoInput = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      preco: precoNum,
      ciclo,
      diasTeste: Math.max(0, Math.floor(Number(diasTeste) || 0)),
      publico,
      ativo,
      modulos: [...selecionados],
    };
    setSalvando(true);
    try {
      if (plano) await superadminApi.atualizarPlano(plano.id, dados);
      else await superadminApi.criarPlano(dados);
      showSuccess(plano ? 'Plano atualizado' : 'Plano criado');
      onSalvo();
      onClose();
    } catch (err) {
      showError('Falha ao salvar plano', err instanceof Error ? err.message : undefined);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border p-6"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="mb-4 text-lg font-bold">{plano ? 'Editar plano' : 'Novo plano'}</h2>
        <div className="space-y-3">
          <Field label="Nome">
            <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Premium" />
          </Field>
          <Field label="Descrição (opcional)">
            <TextInput value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que o plano oferece" />
          </Field>
          <Field label="Preço (R$)">
            <TextInput value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciclo de cobrança">
              <Select value={ciclo} onChange={(e) => setCiclo(e.target.value as CicloCobranca)}>
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </Select>
            </Field>
            <Field label="Teste grátis (dias)">
              <TextInput value={diasTeste} onChange={(e) => setDiasTeste(e.target.value)} inputMode="numeric" placeholder="0" />
            </Field>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Módulos do plano
            </span>
            <div className="grid gap-1.5">
              {modulos.map((m) => (
                <label
                  key={m.chave}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-input)' }}
                >
                  <input type="checkbox" checked={selecionados.has(m.chave)} onChange={() => toggle(m.chave)} />
                  <span className="flex-1">{m.nome}</span>
                  {m.core && <Badge texto="core" cor="var(--color-text-secondary)" />}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} /> Público
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PlanosPage() {
  const { showError } = useToast();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [modulos, setModulos] = useState<ModuloItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([superadminApi.listarPlanos(), superadminApi.listarModulos()]);
      setPlanos(p);
      setModulos(m);
    } catch (err) {
      showError('Falha ao carregar planos', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const modalAberto = criando || editando !== null;

  return (
    <div className="w-full">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {loading ? 'Carregando…' : `${planos.length} plano(s) · ${modulos.length} módulo(s)`}
          </p>
        </div>
        <Button onClick={() => setCriando(true)}>Novo plano</Button>
      </header>

      {!loading && planos.length === 0 && (
        <div
          className="rounded-xl border p-10 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Nenhum plano criado ainda.
        </div>
      )}

      <div className="grid gap-3">
        {planos.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.nome}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                    {moeda(p.preco)}
                    <span className="text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                      {' '}
                      {p.ciclo === 'ANUAL' ? '/ano' : p.ciclo === 'TRIMESTRAL' ? '/trimestre' : '/mês'}
                    </span>
                  </span>
                  {p.diasTeste > 0 && <Badge texto={`${p.diasTeste}d grátis`} cor="var(--color-success-text)" />}
                  {!p.ativo && <Badge texto="inativo" cor="var(--color-danger)" />}
                  {!p.publico && <Badge texto="oculto" cor="var(--color-text-secondary)" />}
                </div>
                {p.descricao && (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {p.descricao}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.modulos.length === 0 ? (
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      sem módulos
                    </span>
                  ) : (
                    p.modulos.map((m) => <Badge key={m.chave} texto={m.nome} cor="var(--color-accent)" />)
                  )}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setEditando(p)}>
                Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {modalAberto && (
        <PlanoFormModal
          plano={editando}
          modulos={modulos}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}
