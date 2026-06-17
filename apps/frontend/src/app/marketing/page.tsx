'use client';

import { ReactNode, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import HeroSpline from './components/HeroSpline';
import LeadForm from './components/LeadForm';

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`ff-display ${className}`} style={{ fontWeight: 700 }}>
      Food<span style={{ color: 'var(--color-accent)' }}>Flow</span>
    </span>
  );
}

/* Ícone genérico (stroke, estilo Lucide) — sem emoji como ícone estrutural. */
function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split('|').map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const RECURSOS = [
  { t: 'Cardápio digital', s: 'Fotos, categorias e disponibilidade em tempo real.', d: 'M3 7h18|M3 12h18|M3 17h18' },
  { t: 'Pedidos & cozinha', s: 'Do clique ao preparo, sem papelzinho.', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0' },
  { t: 'Entregas inteligentes', s: 'Rotas e motoboys organizados no mapa.', d: 'M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0z|M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z' },
  { t: 'Pagamento na hora', s: 'PIX e cartão, dinheiro cai na sua conta.', d: 'M2 7h20v10H2z|M2 11h20' },
  { t: 'Domínio próprio', s: 'app.seurestaurante.com.br, a sua cara.', d: 'M2 12h20|M12 2a15 15 0 0 1 0 20|M12 2a15 15 0 0 0 0 20|M12 2v20' },
  { t: 'A sua marca', s: 'White-label: cores e logo do seu restaurante.', d: 'M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5' },
];

const AURA = [
  { t: 'Atende', s: 'Responde clientes no WhatsApp 24/7, tira dúvidas e fecha pedido.', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { t: 'Prospecta', s: 'Encontra e aborda novos clientes na sua região.', d: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.3-4.3' },
  { t: 'Faz campanhas', s: 'Cria e dispara promoções que trazem o cliente de volta.', d: 'M3 11l18-5v12L3 14v-3z|M11.6 16.8a3 3 0 1 1-5.8-1.6' },
];

const PASSOS = [
  { n: '1', t: 'Crie sua conta grátis', s: 'Deixe seu contato — a gente libera seu acesso rapidinho.' },
  { n: '2', t: 'Monte seu cardápio', s: 'Suba seus pratos e configure entrega e pagamento.' },
  { n: '3', t: 'Venda mais com a AURA', s: 'Sua IA atende, prospecta e traz cliente. Você cozinha.' },
];

const FAQ = [
  { q: 'Preciso pagar pra começar?', a: 'Não. O plano Básico é grátis pra sempre: cardápio, pedidos, entregas e pagamento. Você só paga se quiser a AURA e os recursos Premium.' },
  { q: 'Tenho que instalar alguma coisa?', a: 'Nada. É tudo no navegador. Seu restaurante ganha um link (e pode usar domínio próprio).' },
  { q: 'A AURA funciona no meu WhatsApp?', a: 'Sim. A AURA atende seus clientes, prospecta novos e dispara campanhas — integrada ao seu número.' },
  { q: 'E se eu já tiver site/app?', a: 'O FoodFlow é white-label: fica com a sua marca, suas cores e seu domínio. Seus clientes nem percebem que tem o FoodFlow por trás.' },
];

export default function MarketingPage() {
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  return (
    <main>
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-bg) 80%, transparent)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Wordmark className="text-xl" />
          <a
            href="#comecar"
            className="rounded-full px-4 py-2 text-sm font-bold transition hover:opacity-90"
            style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
          >
            Testar grátis
          </a>
        </div>
      </header>

      {/* HERO — robô 3D em tela cheia (desktop) com o texto sobreposto */}
      <section className="relative overflow-hidden">
        {/* Robô full-bleed (desktop) / aura (mobile) */}
        <div className="absolute inset-0">
          <HeroSpline />
        </div>
        {/* Scrim: escurece a esquerda pra leitura, deixa o robô à direita */}
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{ background: 'linear-gradient(90deg, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 78%, transparent) 36%, transparent 66%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{ background: 'linear-gradient(0deg, var(--color-bg), transparent)' }}
          aria-hidden
        />

        {/* Conteúdo: o wrapper deixa o cursor passar pro robô; só o texto é interativo */}
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-5 py-16 lg:min-h-[88vh]">
          <motion.div
            className="pointer-events-auto lg:max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-bg) 50%, transparent)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              Delivery turbinado por IA
            </span>
            <h1 className="ff-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              O delivery que <span style={{ color: 'var(--color-accent)' }}>vende por você</span>.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Cardápio, pedidos, entregas e pagamento num lugar só — com a <b style={{ color: 'var(--color-text-primary)' }}>AURA</b>, a IA que atende seus clientes, prospecta e faz campanhas. Comece grátis.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#comecar" className="rounded-full px-6 py-3 text-sm font-bold transition hover:opacity-90" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
                Quero testar grátis
              </a>
              <a href="#aura" className="rounded-full border px-6 py-3 text-sm font-bold backdrop-blur transition" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)', background: 'color-mix(in srgb, var(--color-bg) 40%, transparent)' }}>
                Conhecer a AURA
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AURA */}
      <section id="aura" className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>AURA</p>
            <h2 className="ff-display mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">
              Sua assistente de IA que trabalha o dia inteiro
            </h2>
            <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
              O carro-chefe do FoodFlow. A AURA cuida do atendimento, da prospecção e das campanhas — você foca na comida.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {AURA.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.08}>
                <div className="h-full rounded-2xl border p-6 transition hover:-translate-y-1" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                    <Icon d={c.d} />
                  </div>
                  <h3 className="text-lg font-bold">{c.t}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS — bento */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="ff-display max-w-2xl text-3xl font-bold sm:text-4xl">Tudo do seu delivery, num lugar só</h2>
            <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Sem juntar cinco sistemas. O essencial pronto desde o primeiro dia.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((c, i) => (
              <Reveal key={c.t} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-2xl border p-6 transition hover:-translate-y-1" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--color-surface-active)', color: 'var(--color-accent)' }}>
                    <Icon d={c.d} />
                  </div>
                  <h3 className="text-base font-bold">{c.t}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <h2 className="ff-display text-center text-3xl font-bold sm:text-4xl">Comece grátis. Cresça quando quiser.</h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
            <Reveal>
              <div className="flex h-full flex-col rounded-2xl border p-7" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
                <h3 className="text-lg font-bold">Básico</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Pra colocar seu delivery no ar.</p>
                <p className="ff-display mt-4 text-4xl font-bold">Grátis</p>
                <ul className="mt-5 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {['Cardápio digital', 'Pedidos e cozinha', 'Entregas', 'Pagamento PIX e cartão'].map((x) => (
                    <li key={x} className="flex items-center gap-2"><span style={{ color: 'var(--color-success-text)' }}><Icon d="M20 6 9 17l-5-5" size={16} /></span>{x}</li>
                  ))}
                </ul>
                <a href="#comecar" className="mt-7 rounded-full border px-5 py-3 text-center text-sm font-bold" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)' }}>
                  Começar grátis
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="relative flex h-full flex-col rounded-2xl border-2 p-7" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-accent)' }}>
                <span className="absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
                  Mais popular
                </span>
                <h3 className="text-lg font-bold">Premium</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Tudo do Básico + a IA que vende.</p>
                <p className="ff-display mt-4 text-4xl font-bold">AURA<span className="text-base font-medium" style={{ color: 'var(--color-text-tertiary)' }}> incluída</span></p>
                <ul className="mt-5 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {['Tudo do Básico', 'AURA: atende, prospecta e faz campanhas', 'Domínio próprio', 'Sua marca (white-label)'].map((x) => (
                    <li key={x} className="flex items-center gap-2"><span style={{ color: 'var(--color-accent)' }}><Icon d="M20 6 9 17l-5-5" size={16} /></span>{x}</li>
                  ))}
                </ul>
                <a href="#comecar" className="mt-7 rounded-full px-5 py-3 text-center text-sm font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
                  Quero o Premium
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <h2 className="ff-display text-3xl font-bold sm:text-4xl">Do zero ao primeiro pedido em 3 passos</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08}>
                <div>
                  <div className="ff-display flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                    {p.n}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{p.t}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{p.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <h2 className="ff-display text-3xl font-bold sm:text-4xl">Perguntas frequentes</h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQ.map((f, i) => {
              const aberto = faqAberto === i;
              return (
                <Reveal key={f.q} delay={i * 0.04}>
                  <div className="rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
                    <button
                      onClick={() => setFaqAberto(aberto ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold"
                      aria-expanded={aberto}
                    >
                      {f.q}
                      <span style={{ color: 'var(--color-accent)', transform: aberto ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>
                        <Icon d="M12 5v14|M5 12h14" size={18} />
                      </span>
                    </button>
                    {aberto && (
                      <p className="px-5 pb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{f.a}</p>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL + FORM */}
      <section id="comecar" className="py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 lg:grid-cols-2">
          <Reveal>
            <h2 className="ff-display text-3xl font-bold sm:text-4xl">Pronto pra vender mais?</h2>
            <p className="mt-3 text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Comece grátis hoje. Deixe seu contato e a gente libera seu acesso — sem cartão, sem compromisso.
            </p>
            <ul className="mt-6 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {['Loja no ar no mesmo dia', 'Suporte de gente de verdade', 'Cancele quando quiser'].map((x) => (
                <li key={x} className="flex items-center gap-2"><span style={{ color: 'var(--color-success-text)' }}><Icon d="M20 6 9 17l-5-5" size={16} /></span>{x}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <LeadForm id="comecar-form" />
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10" style={{ borderColor: 'var(--color-border)' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Wordmark className="text-lg" />
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            © 2026 FoodFlow — a plataforma do seu delivery.
          </p>
        </div>
      </footer>
    </main>
  );
}
