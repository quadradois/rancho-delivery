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
import { Badge, Button, Card, Drawer, Field, Select, TextInput } from '../components/ui';

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
  const [beneficios, setBeneficios] = useState((plano?.beneficios ?? []).join('\n'));
  const [destaque, setDestaque] = useState(plano?.destaque ?? false);
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
      beneficios: beneficios.split('\n').map((s) => s.trim()).filter(Boolean),
      destaque,
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
    <Drawer
      open
      onClose={onClose}
      title={plano ? 'Editar plano' : 'Novo plano'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim()}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </>
      }
    >
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

          <Field label="Benefícios (um por linha — aparecem no card do site)">
            <textarea
              value={beneficios}
              onChange={(e) => setBeneficios(e.target.value)}
              rows={5}
              placeholder={'Preço de fundador congelado\nSuporte direto com o criador\nNovas ferramentas inclusas\nAcesso antecipado a novidades'}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-border-focus)]"
              style={{ background: 'var(--color-surface-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </Field>

          <div>
            <span className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Módulos liberados (acesso)
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} /> Mais popular
            </label>
          </div>
        </div>
    </Drawer>
  );
}

export default function PlanosPage() {
  const { showError, showSuccess } = useToast();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [modulos, setModulos] = useState<ModuloItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [criando, setCriando] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Reordena localmente e persiste a nova ordem; em erro, recarrega do servidor.
  const mover = async (de: number, para: number) => {
    if (de === para) return;
    const novo = [...planos];
    const [item] = novo.splice(de, 1);
    novo.splice(para, 0, item);
    setPlanos(novo);
    try {
      await superadminApi.reordenarPlanos(novo.map((p) => p.id));
      showSuccess('Ordem salva');
    } catch (err) {
      showError('Falha ao salvar a ordem', err instanceof Error ? err.message : undefined);
      void carregar();
    }
  };

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
            {loading ? 'Carregando…' : `${planos.length} plano(s) · ${modulos.length} módulo(s) · arraste para reordenar`}
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
        {planos.map((p, i) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) void mover(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`transition-opacity ${dragIndex === i ? 'opacity-40' : ''}`}
          >
          <Card>
            <div className="flex items-start gap-3">
              <span className="mt-1 cursor-grab select-none active:cursor-grabbing" style={{ color: 'var(--color-text-tertiary)' }} title="Arraste para ordenar" aria-hidden>
                <svg width="14" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.6" /><circle cx="15" cy="5" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="19" r="1.6" /><circle cx="15" cy="19" r="1.6" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.nome}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                    {moeda(p.preco)}
                    <span className="text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                      {' '}
                      {p.ciclo === 'ANUAL' ? '/ano' : p.ciclo === 'TRIMESTRAL' ? '/trimestre' : '/mês'}
                    </span>
                  </span>
                  {p.destaque && <Badge texto="Mais popular" cor="var(--color-accent)" />}
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
          </div>
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
