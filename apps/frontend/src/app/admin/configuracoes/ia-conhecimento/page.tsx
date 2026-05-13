'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { type IAConhecimento, type VozMarca } from '@/lib/api';
import { CrmButton, CrmCard } from '@/components/crm';
import { useToast } from '@/contexts/ToastContext';

const DIFERENCIAIS_SUGERIDOS = [
  'Comida caseira de verdade',
  'Entrega rápida (até 40min)',
  'Marmita do dia sempre fresca',
  'Feito por mães goianas',
];

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const t = input.trim();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput('');
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1">{label}</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-primary)]">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        <CrmButton type="button" variant="ghost" onClick={add}>Adicionar</CrmButton>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 4, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1">{label}</label>
      {hint && <p className="text-xs text-[var(--color-text-secondary)] mb-1">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
      />
    </div>
  );
}

function Field({ label, value, onChange, hint, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1">{label}</label>
      {hint && <p className="text-xs text-[var(--color-text-secondary)] mb-1">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
      />
    </div>
  );
}

export default function IAConhecimentoPage() {
  const { showSuccess, showError } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  // Campos da base de conhecimento
  const [nomeAtendente, setNomeAtendente] = useState('Maria');
  const [descricaoNegocio, setDescricaoNegocio] = useState('');
  const [diferenciais, setDiferenciais] = useState<string[]>([]);
  const [politicaFrete, setPoliticaFrete] = useState('');
  const [politicaPrimeiroPedido, setPoliticaPrimeiroPedido] = useState('');
  const [tom, setTom] = useState('');
  const [formalidade, setFormalidade] = useState('');
  const [evitar, setEvitar] = useState<string[]>([]);
  const [preferir, setPreferir] = useState<string[]>([]);
  const [exemplosBons, setExemplosBons] = useState<string[]>([]);
  const [exemplosRuins, setExemplosRuins] = useState<string[]>([]);
  const [horaAbreSegSab, setHoraAbreSegSab] = useState('10:00');
  const [horaFechaSegSab, setHoraFechaSegSab] = useState('22:00');
  const [horaAbreDom, setHoraAbreDom] = useState('11:00');
  const [horaFechaDom, setHoraFechaDom] = useState('21:00');

  // Preview
  const [previewIntencao, setPreviewIntencao] = useState('');
  const [previewMensagem, setPreviewMensagem] = useState('');

  const carregar = useCallback(async () => {
    try {
      const data = await api.adminIa.obterConhecimento();
      setNomeAtendente(data.nomeAtendente || 'Maria');
      setDescricaoNegocio(data.descricaoNegocio || '');
      setDiferenciais(data.diferenciais || []);
      setPoliticaFrete(data.politicaFrete || '');
      setPoliticaPrimeiroPedido(data.politicaPrimeiroPedido || '');
      const voz = data.vozMarca as VozMarca | null;
      setTom(voz?.tom || '');
      setFormalidade(voz?.formalidade || '');
      setEvitar(voz?.evitar || []);
      setPreferir(voz?.preferir || []);
      setExemplosBons(voz?.exemplosBons || []);
      setExemplosRuins(voz?.exemplosRuins || []);
      const h = data.horarios;
      if (h?.segunda_sabado) { setHoraAbreSegSab(h.segunda_sabado.abre); setHoraFechaSegSab(h.segunda_sabado.fecha); }
      if (h?.domingo) { setHoraAbreDom(h.domingo.abre); setHoraFechaDom(h.domingo.fecha); }
    } catch (err) {
      showError('Erro ao carregar base de conhecimento', err instanceof Error ? err.message : '');
    } finally {
      setCarregando(false);
    }
  }, [showError]);

  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const payload: Partial<IAConhecimento> = {
        nomeAtendente: nomeAtendente.trim() || 'Maria',
        descricaoNegocio: descricaoNegocio.trim() || null,
        diferenciais: diferenciais.length > 0 ? diferenciais : null,
        politicaFrete: politicaFrete.trim() || null,
        politicaPrimeiroPedido: politicaPrimeiroPedido.trim() || null,
        horarios: {
          segunda_sabado: { abre: horaAbreSegSab, fecha: horaFechaSegSab },
          domingo: { abre: horaAbreDom, fecha: horaFechaDom },
        },
        vozMarca: (tom || formalidade || evitar.length || preferir.length || exemplosBons.length || exemplosRuins.length)
          ? { tom: tom || undefined, formalidade: formalidade || undefined, evitar, preferir, exemplosBons, exemplosRuins }
          : null,
      };
      await api.adminIa.salvarConhecimento(payload);
      showSuccess('Base de conhecimento salva!');
    } catch (err) {
      showError('Erro ao salvar', err instanceof Error ? err.message : '');
    } finally {
      setSalvando(false);
    }
  };

  const gerarPreview = async () => {
    if (!previewIntencao.trim()) return;
    setGerando(true);
    setPreviewMensagem('');
    try {
      const { mensagem } = await api.adminIa.previewConhecimento(previewIntencao);
      setPreviewMensagem(mensagem);
    } catch (err) {
      showError('Erro ao gerar preview', err instanceof Error ? err.message : '');
    } finally {
      setGerando(false);
    }
  };

  if (carregando) {
    return <div className="p-6 text-sm text-[var(--color-text-secondary)]">Carregando...</div>;
  }

  return (
    <div className="space-y-4 p-5 md:p-6">
      <div>
        <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">🧠 Base de Conhecimento da IA</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Configure o que a IA sabe sobre o Rancho Delivery — usado no agente WhatsApp e nas campanhas outbound.
        </p>
      </div>

      {/* Identidade do atendente */}
      <CrmCard className="p-5 space-y-4">
        <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Identidade do Atendente</p>
        <Field
          label="Nome do atendente virtual"
          value={nomeAtendente}
          onChange={setNomeAtendente}
          hint="Nome que a IA usa ao se apresentar nas conversas do WhatsApp"
          placeholder="Ex: Maria"
        />
      </CrmCard>

      {/* Sobre o restaurante */}
      <CrmCard className="p-5 space-y-4">
        <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Sobre o Restaurante</p>
        <Textarea
          label="Descrição do negócio"
          value={descricaoNegocio}
          onChange={setDescricaoNegocio}
          rows={4}
          hint="2-3 parágrafos sobre a história, proposta e diferenciais do Rancho. A IA usa isso para humanizar as mensagens."
        />
        <div>
          <TagInput
            label="Diferenciais"
            values={diferenciais}
            onChange={setDiferenciais}
            placeholder="Ex: Comida caseira de verdade"
          />
          {diferenciais.length === 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {DIFERENCIAIS_SUGERIDOS.map((s) => (
                <button key={s} type="button" onClick={() => setDiferenciais((p) => [...p, s])}
                  className="rounded-full border border-dashed border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </CrmCard>

      {/* Horários */}
      <CrmCard className="p-5 space-y-4">
        <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Horário de Funcionamento</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">Segunda a Sábado</p>
            <div className="flex items-center gap-2">
              <input type="time" value={horaAbreSegSab} onChange={(e) => setHoraAbreSegSab(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]" />
              <span className="text-sm text-[var(--color-text-tertiary)]">às</span>
              <input type="time" value={horaFechaSegSab} onChange={(e) => setHoraFechaSegSab(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">Domingo</p>
            <div className="flex items-center gap-2">
              <input type="time" value={horaAbreDom} onChange={(e) => setHoraAbreDom(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]" />
              <span className="text-sm text-[var(--color-text-tertiary)]">às</span>
              <input type="time" value={horaFechaDom} onChange={(e) => setHoraFechaDom(e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]" />
            </div>
          </div>
        </div>
      </CrmCard>

      {/* Políticas */}
      <CrmCard className="p-5 space-y-4">
        <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Políticas</p>
        <Textarea
          label="Taxa de entrega"
          value={politicaFrete}
          onChange={setPoliticaFrete}
          rows={2}
          hint="Ex: R$ 5 fixo dentro de 3km, R$ 1,20 por km adicional"
        />
        <Textarea
          label="Benefício no primeiro pedido"
          value={politicaPrimeiroPedido}
          onChange={setPoliticaPrimeiroPedido}
          rows={2}
          hint="Ex: Frete grátis no primeiro pedido — cupom RANCHO5 aplicado automaticamente"
        />
      </CrmCard>

      {/* Voz da marca */}
      <CrmCard className="p-5 space-y-4">
        <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Voz da Marca</p>
        <p className="text-xs text-[var(--color-text-secondary)]">Instrui a IA sobre estilo e tom de comunicação.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tom geral" value={tom} onChange={setTom} placeholder="Ex: caloroso, próximo, brasileiro" />
          <Field label="Formalidade" value={formalidade} onChange={setFormalidade} placeholder="Ex: informal mas educado" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TagInput label="Palavras/expressões a preferir" values={preferir} onChange={setPreferir} placeholder="Ex: você, nosso, aqui no Rancho" />
          <TagInput label="Palavras/expressões a evitar" values={evitar} onChange={setEvitar} placeholder="Ex: URGENTE, GRÁTIS!!!" />
        </div>
        <TagInput label="Exemplos de mensagens boas" values={exemplosBons} onChange={setExemplosBons} placeholder="Ex: Olá Maria! Que tal almoçar hoje sem dor de cabeça?" />
        <TagInput label="Exemplos de mensagens ruins" values={exemplosRuins} onChange={setExemplosRuins} placeholder="Ex: PROMOÇÃO IMPERDÍVEL!!! CLIQUE JÁ!!!" />
      </CrmCard>

      <div className="flex justify-end">
        <CrmButton onClick={() => void salvar()} disabled={salvando}>
          {salvando ? 'Salvando...' : '💾 Salvar base de conhecimento'}
        </CrmButton>
      </div>

      {/* Preview */}
      <CrmCard className="p-5 space-y-4">
        <p className="font-sora text-lg font-semibold text-[var(--color-text-primary)]">Preview — testar com a base atual</p>
        <p className="text-xs text-[var(--color-text-secondary)]">Salve primeiro, depois gere um preview para ver como a IA vai usar o contexto.</p>
        <div className="flex gap-2">
          <input
            value={previewIntencao}
            onChange={(e) => setPreviewIntencao(e.target.value)}
            placeholder="Ex: Lançamento da marmita executiva de frango"
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <CrmButton variant="ghost" onClick={() => void gerarPreview()} disabled={gerando || !previewIntencao.trim()}>
            {gerando ? 'Gerando...' : '⚡ Testar'}
          </CrmButton>
        </div>
        {previewMensagem && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2">Mensagem gerada pela IA:</p>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{previewMensagem}</p>
          </div>
        )}
      </CrmCard>
    </div>
  );
}
