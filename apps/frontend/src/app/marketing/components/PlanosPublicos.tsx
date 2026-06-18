'use client';

import { useEffect, useState } from 'react';

interface ModuloPlano {
  chave: string;
  nome: string;
  core: boolean;
}
type CicloCobranca = 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';
interface PlanoPublico {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ciclo?: CicloCobranca;
  diasTeste?: number;
  beneficios?: string[];
  destaque?: boolean;
  modulos: ModuloPlano[];
}

function preco(v: number) {
  return v <= 0 ? 'Grátis' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function sufixoCiclo(c?: CicloCobranca) {
  return c === 'ANUAL' ? '/ano' : c === 'TRIMESTRAL' ? '/trimestre' : '/mês';
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Card({ plano }: { plano: PlanoPublico }) {
  const pago = plano.preco > 0;
  const destaque = !!plano.destaque; // "Mais popular" é escolhido no admin, não pelo preço
  // Benefícios (texto livre) têm prioridade no card; senão cai nos módulos.
  const itens =
    plano.beneficios && plano.beneficios.length > 0
      ? plano.beneficios.slice(0, 8)
      : plano.modulos.length > 0
        ? plano.modulos.slice(0, 6).map((m) => m.nome)
        : ['Acesso à plataforma'];
  return (
    <div
      className={`relative flex w-full flex-col rounded-2xl p-7 sm:w-[330px] ${destaque ? 'border-2' : 'border'}`}
      style={{ background: 'var(--color-surface-raised)', borderColor: destaque ? 'var(--color-accent)' : 'var(--color-border)' }}
    >
      {destaque && (
        <span className="absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
          Mais popular
        </span>
      )}
      <h3 className="text-lg font-bold">{plano.nome}</h3>
      {plano.descricao && (
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{plano.descricao}</p>
      )}
      <p className="ff-display mt-4 text-4xl font-bold">
        {preco(plano.preco)}
        {pago && <span className="text-base font-medium" style={{ color: 'var(--color-text-tertiary)' }}> {sufixoCiclo(plano.ciclo)}</span>}
      </p>
      {pago && (plano.diasTeste ?? 0) > 0 && (
        <span className="mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--color-success-muted)', color: 'var(--color-success-text)' }}>
          {plano.diasTeste} dias grátis
        </span>
      )}
      <ul className="mt-5 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {itens.map((x) => (
          <li key={x} className="flex items-center gap-2">
            <span style={{ color: pago ? 'var(--color-accent)' : 'var(--color-success-text)' }}><Check /></span>
            {x}
          </li>
        ))}
      </ul>
      <a
        href="#comecar"
        className="mt-7 rounded-full px-5 py-3 text-center text-sm font-bold transition hover:opacity-90"
        style={
          pago
            ? { background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }
            : { border: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)' }
        }
      >
        {pago ? `Quero o ${plano.nome}` : 'Começar grátis'}
      </a>
    </div>
  );
}

// Fallback caso a API esteja fora — site nunca quebra.
const FALLBACK: PlanoPublico[] = [
  { id: 'basico', nome: 'Básico', descricao: 'Coloque seu delivery no ar hoje.', preco: 0, modulos: [{ chave: 'cardapio', nome: 'Cardápio, pedidos, entregas e pagamento', core: true }] },
];

export default function PlanosPublicos() {
  const [planos, setPlanos] = useState<PlanoPublico[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/planos')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const data: PlanoPublico[] = j?.data ?? j ?? [];
        if (vivo) setPlanos(Array.isArray(data) && data.length > 0 ? data : FALLBACK);
      })
      .catch(() => vivo && setPlanos(FALLBACK));
    return () => {
      vivo = false;
    };
  }, []);

  if (!planos) {
    // skeleton enquanto carrega
    return (
      <div className="flex flex-wrap justify-center gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="h-72 w-full animate-pulse rounded-2xl border sm:w-[330px]" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-5">
      {planos.map((p) => (
        <Card key={p.id} plano={p} />
      ))}
    </div>
  );
}
