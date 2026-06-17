'use client';

import { ReactNode, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import ProspeccaoDemo from './components/ProspeccaoDemo';
import Contador from './components/Contador';
import PlanosPublicos from './components/PlanosPublicos';
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

const DORES = [
  { t: 'Sem vitrine', s: 'Dark kitchen não tem porta na rua pra atrair quem passa.', d: 'M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z|M9 22V12h6v10' },
  { t: 'Sem freguês fixo', s: 'Restaurante novo começa do zero, sem base de clientes.', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
  { t: 'Anúncio caro converte pouco', s: 'Pagar pra converter 1% é queimar margem que você não tem.', d: 'M3 3v18h18|M7 14l4-4 3 3 5-6' },
];

const PASSOS = [
  { n: '1', t: 'Acha', s: 'A AURA mapeia quem mora no seu raio de entrega.', d: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z|M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { n: '2', t: 'Qualifica', s: 'Ranqueia os melhores contatos com um score de 0 a 100.', d: 'M3 3v18h18|M7 15l3-3 3 2 4-5' },
  { n: '3', t: 'Aborda', s: 'Manda a oferta certa no WhatsApp, com o nome e o bairro da pessoa.', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { n: '4', t: 'Converte', s: 'Atende, fecha o pedido e registra a venda. Sozinha.', d: 'M20 6 9 17l-5-5' },
];

const CASOS = [
  { v: 13, suf: '', label: 'pedidos na 1ª noite', sub: '100 mensagens enviadas' },
  { v: 18, suf: '', label: 'pedidos no 2º dia', sub: 'só 50 mensagens' },
  { v: 36, suf: '%', label: 'de conversão', sub: 'anúncio comum: 1–3%' },
];

const RECURSOS = [
  { t: 'Cardápio digital', s: 'Fotos, categorias e disponibilidade em tempo real.', d: 'M3 7h18|M3 12h18|M3 17h18' },
  { t: 'Pedidos & cozinha', s: 'Do clique ao preparo, sem papelzinho.', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z|M3 6h18|M16 10a4 4 0 0 1-8 0' },
  { t: 'Entregas inteligentes', s: 'Rotas e motoboys organizados no mapa.', d: 'M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0z|M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z' },
  { t: 'Pagamento na hora', s: 'PIX e cartão, dinheiro cai na sua conta.', d: 'M2 7h20v10H2z|M2 11h20' },
  { t: 'Domínio próprio', s: 'app.seurestaurante.com.br, a sua cara.', d: 'M2 12h20|M12 2a15 15 0 0 1 0 20|M12 2a15 15 0 0 0 0 20|M12 2v20' },
  { t: 'A sua marca', s: 'White-label: cores e logo do seu restaurante.', d: 'M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5' },
];

const FUNDADOR = [
  { t: 'Preço de fundador congelado', d: 'M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5' },
  { t: 'Suporte direto com o criador', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { t: 'Acesso antecipado a novidades', d: 'M13 2 3 14h7l-1 8 10-12h-7z' },
];

const FAQ = [
  { q: 'Preciso pagar pra começar?', a: 'Não. O Básico é grátis pra sempre: cardápio, pedidos, entregas e pagamento. Você só paga quando quiser ligar a AURA (Premium).' },
  { q: 'Preciso instalar algo?', a: 'Não. Funciona no navegador e no seu WhatsApp. Seu restaurante ganha um link (e pode usar domínio próprio).' },
  { q: 'A IA pode responder errado e me queimar com o cliente?', a: 'Você revisa as mensagens e o tom, e tem gente de verdade no suporte. A AURA trabalha do seu jeito.' },
  { q: 'Mandar mensagem pra quem não me conhece é permitido?', a: 'A AURA trabalha com abordagem responsável e opt-out automático: quem pede pra sair não é mais contatado.' },
  { q: 'E se eu já tiver site ou app?', a: 'Sem problema — dá pra integrar, e o FoodFlow é white-label (fica com a sua marca).' },
];

export default function MarketingPage() {
  const [faqAberto, setFaqAberto] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <main>
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-bg) 80%, transparent)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Wordmark className="text-xl" />
          <a href="#comecar" className="rounded-full px-4 py-2 text-sm font-bold transition hover:opacity-90" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
            Quero a AURA
          </a>
        </div>
      </header>

      {/* HERO 1 — promessa + prova + demo */}
      <section className="relative">
        <div className="ff-glow pointer-events-none absolute -right-20 -top-24 h-[420px] w-[420px] opacity-70" aria-hidden />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-5 pb-12 pt-12 lg:min-h-[88vh] lg:grid-cols-2 lg:gap-10 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-accent)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              Aquisição de clientes por IA
            </span>
            <h1 className="ff-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.4rem]">
              A IA que enche seu delivery de pedidos — <span style={{ color: 'var(--color-accent)' }}>mesmo que ninguém ainda te conheça</span>.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              A <b style={{ color: 'var(--color-text-primary)' }}>AURA</b> encontra moradores no seu raio de entrega, manda a oferta certa no WhatsApp e fecha o pedido sozinha. Você só cozinha.
            </p>
            <div className="mt-5 rounded-xl border-l-2 p-3" style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}>
              <p className="text-sm font-semibold">
                Rancho Delivery: <span style={{ color: 'var(--color-accent)' }}>13 pedidos na primeira noite</span> com 100 mensagens.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Sem anúncio. Sem panfleto.</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#comecar" className="rounded-full px-6 py-3 text-sm font-bold transition hover:opacity-90" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
                Quero a AURA vendendo por mim
              </a>
              <a href="#motor" className="rounded-full border px-6 py-3 text-sm font-bold transition" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-primary)' }}>
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Loja no ar no mesmo dia · Sem cartão · Cancele quando quiser
            </p>
          </motion.div>

          <div className="relative h-[440px] sm:h-[520px]">
            <ProspeccaoDemo />
          </div>
        </div>
      </section>

      {/* HERO 2 — a dor */}
      <section className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h2 className="ff-display text-3xl font-bold sm:text-4xl">Cozinha boa não basta. Sem movimento na porta, o pedido não vem sozinho.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
              O problema nunca foi a comida — é fazer as pessoas certas, perto de você, descobrirem que você existe.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {DORES.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.1}>
                <div className="h-full rounded-2xl border p-5 text-left" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--color-danger-muted)', color: 'var(--color-danger-text)' }}>
                    <Icon d={c.d} size={20} />
                  </div>
                  <h3 className="text-sm font-bold">{c.t}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <p className="mt-8 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>A AURA resolve exatamente isso. ↓</p>
          </Reveal>
        </div>
      </section>

      {/* HERO 3 — o motor de aquisição (a estrela) */}
      <section id="motor" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>O motor de aquisição</p>
            <h2 className="ff-display mt-2 max-w-2xl text-3xl font-bold sm:text-4xl">Veja a AURA buscar cliente novo enquanto você cozinha.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.1}>
                <div className="h-full rounded-2xl border p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="ff-display flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{p.n}</span>
                    <span style={{ color: 'var(--color-accent)' }}><Icon d={p.d} size={20} /></span>
                  </div>
                  <h3 className="text-lg font-bold">{p.t}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{p.s}</p>
                  {p.t === 'Qualifica' && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-surface-active)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'var(--color-accent)', transformOrigin: 'left' }}
                          initial={reduce ? false : { scaleX: 0 }}
                          whileInView={{ scaleX: 0.92 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3, ease }}
                        />
                      </div>
                      <span className="mt-1 block text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>score 92/100</span>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-success-text)' }}><Icon d="M20 6 9 17l-5-5" size={14} /></span>
              Com opt-out automático e abordagem responsável. Quem pede pra sair, sai.
            </p>
          </Reveal>
        </div>
      </section>

      {/* HERO 4 — estudo de caso Rancho */}
      <section className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>História real</p>
            <h2 className="ff-display mt-2 text-3xl font-bold sm:text-4xl">O Rancho Delivery abriu as portas com a casa cheia.</h2>
            <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Restaurante novo, sem base de clientes, sem verba de marketing. Ligaram a AURA antes de inaugurar — e a primeira noite já foi diferente.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {CASOS.map((c, i) => (
              <Reveal key={c.label} delay={i * 0.12}>
                <div className="rounded-2xl border p-6" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
                  <Contador value={c.v} suffix={c.suf} className="ff-display text-4xl font-bold" />
                  <p className="mt-1 text-sm font-semibold">{c.label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{c.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HERO 5 — tudo num lugar só */}
      <section id="plataforma" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="ff-display max-w-2xl text-3xl font-bold sm:text-4xl">Da prospecção ao PIX na conta. Tudo num lugar só.</h2>
            <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
              A AURA traz o cliente. A plataforma cuida do resto.
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

      {/* HERO 6 — oferta de fundador */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <div className="rounded-3xl border-2 p-8 sm:p-10" style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
                Vagas limitadas
              </span>
              <h2 className="ff-display mt-4 text-3xl font-bold sm:text-4xl">Seja um dos primeiros restaurantes a operar com a AURA.</h2>
              <p className="mt-3 max-w-2xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Estamos selecionando um grupo pequeno de parceiros fundadores. Você entra com preço travado pra sempre, suporte direto comigo (o criador) e ajuda a moldar o produto.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {FUNDADOR.map((f) => (
                  <div key={f.t} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5" style={{ color: 'var(--color-accent)' }}><Icon d={f.d} size={18} /></span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{f.t}</span>
                  </div>
                ))}
              </div>
              <a href="#comecar" className="mt-7 inline-block rounded-full px-6 py-3 text-sm font-bold transition hover:opacity-90" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
                Quero minha vaga de fundador
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HERO 7 — planos */}
      <section className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-5xl px-5">
          <Reveal>
            <h2 className="ff-display text-center text-3xl font-bold sm:text-4xl">Comece grátis. Ligue a máquina de vendas quando quiser.</h2>
          </Reveal>
          <Reveal className="mt-10">
            <PlanosPublicos />
          </Reveal>
        </div>
      </section>

      {/* HERO 8 — FAQ */}
      <section className="py-20">
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
                    <button onClick={() => setFaqAberto(aberto ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold" aria-expanded={aberto}>
                      {f.q}
                      <span style={{ color: 'var(--color-accent)', transform: aberto ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>
                        <Icon d="M12 5v14|M5 12h14" size={18} />
                      </span>
                    </button>
                    {aberto && <p className="px-5 pb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{f.a}</p>}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* HERO 9 — CTA final + form */}
      <section id="comecar" className="border-t py-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 lg:grid-cols-2">
          <Reveal>
            <h2 className="ff-display text-3xl font-bold sm:text-4xl">Pronto pra encher seu delivery de pedidos?</h2>
            <p className="mt-3 text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Deixe seu contato e a gente libera seu acesso. Sem cartão, sem compromisso.
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
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>© 2026 FoodFlow — a máquina de aquisição do seu delivery.</p>
        </div>
      </footer>
    </main>
  );
}
