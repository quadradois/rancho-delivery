'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/layout/AppBar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import api, { CriarPedidoDTO } from '@/lib/api';
import { getCepValidado, salvarCepValidado } from '@/components/ui/ModalVerificacaoCep';
import { z } from 'zod';

const CHECKOUT_RECOVERY_KEY = 'rancho:checkout_recovery';
const CHECKOUT_DRAFT_KEY = 'rancho:checkout_draft';
const CHECKOUT_LAST_ATTEMPT_KEY = 'rancho:checkout_last_attempt';
const RECOVERY_TTL_MS = 30 * 60 * 1000; // 30 minutos

type CheckoutStep = 'address' | 'payment' | 'review' | 'return';

interface AddressForm {
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  rua: string;
  bairro: string;
  localidade: string;
  uf: string;
  numero: string;
  quadra: string;
  lote: string;
  complemento: string;
  pontoReferencia: string;
}

interface PaymentForm {
  formaPagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix';
  trocoParaValor?: number;
}

type AddressErrors = Partial<Record<keyof AddressForm, string>>;

const addressSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
  cep: z.string().min(8, 'CEP inválido'),
  rua: z.string().min(1, 'Rua é obrigatória'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
});

function salvarRecovery(data: {
  addressForm: AddressForm;
  paymentForm: PaymentForm;
  pedidoId: string;
  linkPagamento: string;
}) {
  try {
    sessionStorage.setItem(CHECKOUT_RECOVERY_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  } catch { /* ignora erros de storage */ }
}

function lerRecovery() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > RECOVERY_TTL_MS) {
      sessionStorage.removeItem(CHECKOUT_RECOVERY_KEY);
      return null;
    }
    return parsed as {
      addressForm: AddressForm;
      paymentForm: PaymentForm;
      pedidoId: string;
      linkPagamento: string;
      timestamp: number;
    };
  } catch {
    return null;
  }
}

function limparRecovery() {
  try { sessionStorage.removeItem(CHECKOUT_RECOVERY_KEY); } catch { /* noop */ }
}

function salvarDraft(data: {
  addressForm: AddressForm;
  paymentForm: PaymentForm;
  deliveryFee: number;
  cepAtendido: boolean;
}) {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch { /* noop */ }
}

function lerDraft() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > RECOVERY_TTL_MS) {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      return null;
    }
    return parsed as {
      addressForm: AddressForm;
      paymentForm: PaymentForm;
      deliveryFee: number;
      cepAtendido: boolean;
      timestamp: number;
    };
  } catch {
    return null;
  }
}

function limparDraft() {
  try { sessionStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* noop */ }
}

function fingerprintPedido(addressForm: AddressForm, items: Array<{ id: string; quantity: number }>) {
  const itens = [...items].sort((a, b) => a.id.localeCompare(b.id)).map((i) => `${i.id}:${i.quantity}`).join('|');
  return [
    addressForm.nome.trim().toLowerCase(),
    addressForm.telefone.replace(/\D/g, ''),
    addressForm.cep.replace(/\D/g, ''),
    addressForm.numero.trim().toLowerCase(),
    itens,
  ].join('::');
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart, deliveryFee: cartDeliveryFee, setDeliveryFee: setCartDeliveryFee } = useCart();
  const { showSuccess, showError } = useToast();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(cartDeliveryFee || 0);
  const [cepAtendido, setCepAtendido] = useState(false);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [recoveryData, setRecoveryData] = useState<ReturnType<typeof lerRecovery>>(null);

  const [addressForm, setAddressForm] = useState<AddressForm>({
    nome: '', telefone: '', email: '', cep: '', rua: '', bairro: '',
    localidade: '', uf: '', numero: '', quadra: '', lote: '', complemento: '', pontoReferencia: '',
  });

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    formaPagamento: 'pix',
    trocoParaValor: undefined,
  });

  // Correção 1 — verificar recovery antes de redirecionar para /
  useEffect(() => {
    const recovery = lerRecovery();
    if (recovery) {
      // Cliente voltou do gateway de pagamento — mostrar tela de retorno
      setRecoveryData(recovery);
      setAddressForm(recovery.addressForm);
      setPaymentForm(recovery.paymentForm);
      setCepAtendido(true);
      setCurrentStep('return');
      return;
    }
    const draft = lerDraft();
    if (draft) {
      setAddressForm(draft.addressForm);
      setPaymentForm(draft.paymentForm);
      setDeliveryFee(draft.deliveryFee || 0);
      setCartDeliveryFee(draft.deliveryFee || 0);
      setCepAtendido(Boolean(draft.cepAtendido));
    }
    // Sem recovery: redirecionar se carrinho vazio
    if (items.length === 0) router.push('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentStep === 'return') return;
    salvarDraft({ addressForm, paymentForm, deliveryFee, cepAtendido });
  }, [addressForm, paymentForm, deliveryFee, cepAtendido, currentStep]);

  // Pré-preencher com CEP validado na sessão
  useEffect(() => {
    if (currentStep === 'return') return; // já restaurado pelo recovery
    const cepSalvo = getCepValidado();
    if (cepSalvo) {
      setAddressForm(prev => ({
        ...prev,
        cep: cepSalvo.cep,
        rua: cepSalvo.logradouro,
        bairro: cepSalvo.bairro,
        localidade: cepSalvo.localidade,
        uf: cepSalvo.uf,
      }));
      setDeliveryFee(cepSalvo.taxa);
      setCartDeliveryFee(cepSalvo.taxa);
      setCepAtendido(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatarCep = (valor: string) => {
    const n = valor.replace(/\D/g, '').slice(0, 8);
    return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
  };

  const formatarTelefone = (valor: string) => {
    const n = valor.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 2) return n;
    if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  };

  const handleCepBlur = async () => {
    const cepLimpo = addressForm.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setLoadingCep(true);
    setCepAtendido(false);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/bairros/cep/${cepLimpo}`);
      const json = await res.json();
      const data = json.data ?? json;

      if (data.erro) {
        showError('CEP não encontrado', 'Verifique o CEP digitado');
        return;
      }
      if (!data.atendido) {
        showError('Fora da área de entrega', `Ainda não entregamos em ${data.endereco?.bairro || 'sua região'}`);
        setAddressForm(prev => ({ ...prev, rua: '', bairro: '', localidade: '', uf: '' }));
        setDeliveryFee(0);
        setCartDeliveryFee(0);
        return;
      }
      const dadosCep = {
        cep: cepLimpo,
        bairro: data.endereco.bairro || '',
        logradouro: data.endereco.logradouro || '',
        localidade: data.endereco.localidade || '',
        uf: data.endereco.uf || '',
        taxa: Number(data.taxa || 0),
        tempoEntrega: Number(data.tempoEntrega || 30),
      };
      setAddressForm(prev => ({
        ...prev,
        rua: dadosCep.logradouro,
        bairro: dadosCep.bairro,
        localidade: dadosCep.localidade,
        uf: dadosCep.uf,
      }));
      salvarCepValidado(dadosCep);
      setDeliveryFee(dadosCep.taxa);
      setCartDeliveryFee(dadosCep.taxa);
      setCepAtendido(true);
    } catch {
      showError('Erro ao buscar CEP', 'Tente novamente');
    } finally {
      setLoadingCep(false);
    }
  };

  const validateAddress = (): boolean => {
    const result = addressSchema.safeParse(addressForm);
    if (!result.success) {
      const erros: AddressErrors = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof AddressForm;
        if (field) erros[field] = e.message;
      });
      setErrors(erros);
      return false;
    }
    if (!cepAtendido) {
      showError('CEP não validado', 'Verifique se entregamos na sua região');
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 'address') {
      if (!validateAddress()) return;
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('review');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'payment') setCurrentStep('address');
    else if (currentStep === 'review') setCurrentStep('payment');
  };

  const handleFinishOrder = async () => {
    setLoading(true);
    try {
      const finger = fingerprintPedido(addressForm, items.map((item) => ({ id: item.id, quantity: item.quantity })));
      const ultimoRaw = sessionStorage.getItem(CHECKOUT_LAST_ATTEMPT_KEY);
      if (ultimoRaw) {
        const ultimo = JSON.parse(ultimoRaw);
        if (ultimo?.fingerprint === finger && Date.now() - Number(ultimo.timestamp || 0) < RECOVERY_TTL_MS) {
          showSuccess('Pedido já iniciado', `Redirecionando para pagamento #${String(ultimo.pedidoId || '').slice(-8)}`);
          window.location.href = String(ultimo.linkPagamento);
          return;
        }
      }

      const enderecoCompleto = [
        addressForm.rua,
        addressForm.numero && `nº ${addressForm.numero}`,
        addressForm.quadra && `Quadra ${addressForm.quadra}`,
        addressForm.lote && `Lote ${addressForm.lote}`,
        addressForm.complemento,
      ].filter(Boolean).join(', ');

      const pedidoData: CriarPedidoDTO = {
        cliente: {
          nome: addressForm.nome,
          telefone: addressForm.telefone.replace(/\D/g, ''),
          endereco: enderecoCompleto,
          bairro: addressForm.bairro,
        },
        itens: items.map(item => ({
          produtoId: item.id,
          quantidade: item.quantity,
          observacao: item.observacao,
        })),
        observacao: addressForm.pontoReferencia || undefined,
      };

      const pedido = await api.pedidos.criar(pedidoData);
      showSuccess('Pedido realizado!', `Pedido #${pedido.id.slice(-8)}`);

      if (pedido.linkPagamento) {
        sessionStorage.setItem(CHECKOUT_LAST_ATTEMPT_KEY, JSON.stringify({
          fingerprint: finger,
          pedidoId: pedido.id,
          linkPagamento: pedido.linkPagamento,
          timestamp: Date.now(),
        }));
        // Correção 2 — salvar dados ANTES de limpar carrinho e redirecionar
        salvarRecovery({
          addressForm,
          paymentForm,
          pedidoId: pedido.id,
          linkPagamento: pedido.linkPagamento,
        });
        limparDraft();
        clearCart();
        window.location.href = pedido.linkPagamento;
        return;
      }

      limparDraft();
      clearCart();
      router.push(`/pedido/${pedido.id}`);
    } catch (error) {
      showError('Erro ao finalizar pedido', error instanceof Error ? error.message : 'Tente novamente');
    } finally {
      setLoading(false);
    }
  };

  const totalWithDelivery = totalPrice + deliveryFee;

  // ── TELA DE RETORNO DO GATEWAY ──────────────────────────────────────────────
  if (currentStep === 'return' && recoveryData) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
        <AppBar title="Retorno do Pagamento" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            {/* Ícone de aviso */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ background: '#3E2214' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8A040" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="font-display text-2xl text-[#F4E8CC] mb-2">Você voltou do pagamento</h2>
              <p className="text-[#9A7B5C] text-sm">
                Seu pedido foi criado. O que deseja fazer?
              </p>
            </div>

            {/* Resumo do pedido */}
            <div className="rounded-xl p-4 space-y-1" style={{ background: '#251208', border: '1px solid #3E2214' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9A7B5C] mb-2">Pedido criado</p>
              <p className="text-sm text-[#F4E8CC] font-semibold">#{recoveryData.pedidoId.slice(-8).toUpperCase()}</p>
              <p className="text-sm text-[#9A7B5C]">{recoveryData.addressForm.nome}</p>
              <p className="text-sm text-[#9A7B5C]">
                {recoveryData.addressForm.rua}, {recoveryData.addressForm.numero} — {recoveryData.addressForm.bairro}
              </p>
            </div>

            {/* Ações */}
            <div className="space-y-3">
              {/* Tentar pagar novamente */}
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  limparRecovery();
                  window.location.href = recoveryData.linkPagamento;
                }}
              >
                Tentar pagar novamente
              </Button>

              {/* Ver status do pedido */}
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  limparRecovery();
                  router.push(`/pedido/${recoveryData.pedidoId}`);
                }}
              >
                Ver status do pedido
              </Button>

              {/* Cancelar e refazer */}
              <button
                onClick={() => {
                  limparRecovery();
                  router.push('/');
                }}
                className="w-full text-sm text-[#9A7B5C] hover:text-[#F4E8CC] transition-colors py-2"
              >
                Cancelar e voltar ao cardápio
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
      <AppBar
        title="Finalizar Pedido"
        onBack={() => currentStep === 'address' ? router.back() : handlePreviousStep()}
      />

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="container py-6 max-w-2xl">

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {(['address', 'payment', 'review'] as CheckoutStep[]).map((step, i) => {
              const labels = ['Endereço', 'Pagamento', 'Revisão'];
              const isActive = currentStep === step;
              const isDone = (currentStep === 'payment' && i === 0) || (currentStep === 'review' && i <= 1);
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isActive ? 'bg-[#D4601C] text-white' :
                      isDone ? 'bg-[#4A7840] text-white' :
                      'bg-[#3E2214] text-[#9A7B5C]'
                    }`}>
                      {isDone ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className="text-xs mt-2 font-semibold text-[#9A7B5C]">{labels[i]}</span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${isDone || (isActive && i < 1) ? 'bg-[#D4601C]' : 'bg-[#3E2214]'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── STEP 1: ENDEREÇO ── */}
          {currentStep === 'address' && (
            <div className="space-y-4">
              <h2 className="font-brand text-xl font-black uppercase text-[#F4E8CC]">Seus dados</h2>

              <Input label="Nome completo *" value={addressForm.nome}
                onChange={e => setAddressForm(p => ({ ...p, nome: e.target.value }))}
                error={errors.nome} placeholder="Seu nome" />

              <div className="grid grid-cols-2 gap-4">
                <Input label="Telefone / WhatsApp *" value={addressForm.telefone}
                  onChange={e => setAddressForm(p => ({ ...p, telefone: formatarTelefone(e.target.value) }))}
                  error={errors.telefone} placeholder="(00) 00000-0000" inputMode="tel" />
                <Input label="E-mail (opcional)" value={addressForm.email}
                  onChange={e => setAddressForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="seu@email.com" type="email" />
              </div>

              <div className="border-t border-[#3E2214] pt-4">
                <h2 className="font-brand text-xl font-black uppercase text-[#F4E8CC] mb-4">Endereço de entrega</h2>

                {/* CEP */}
                <div className="flex gap-2 items-end mb-4">
                  <div className="flex-1">
                    <Input
                      label="CEP *"
                      value={addressForm.cep}
                      onChange={e => {
                        setAddressForm(p => ({ ...p, cep: formatarCep(e.target.value) }));
                        setCepAtendido(false);
                        setDeliveryFee(0);
                        setCartDeliveryFee(0);
                      }}
                      onBlur={handleCepBlur}
                      error={errors.cep}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                    />
                  </div>
                  {loadingCep && (
                    <div className="mb-1 w-10 h-11 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#D4601C] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {cepAtendido && !loadingCep && (
                    <div className="mb-1 w-10 h-11 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-[#4A7840]/20 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7840" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rua e Bairro — travados quando CEP validado */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-[#E8D4B0]">Rua</label>
                    <div className={`h-11 px-4 flex items-center rounded-lg text-sm ${
                      cepAtendido ? 'text-[#9A7B5C] bg-[#1A0D06] border border-[#3E2214]' : 'text-[#5C3418] bg-[#1A0D06] border border-[#3E2214]'
                    }`}>
                      {addressForm.rua || <span className="text-[#5C3418]">Preenchido pelo CEP</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-[#E8D4B0]">Bairro</label>
                    <div className={`h-11 px-4 flex items-center rounded-lg text-sm ${
                      cepAtendido ? 'text-[#9A7B5C] bg-[#1A0D06] border border-[#3E2214]' : 'text-[#5C3418] bg-[#1A0D06] border border-[#3E2214]'
                    }`}>
                      {addressForm.bairro || <span className="text-[#5C3418]">Preenchido pelo CEP</span>}
                    </div>
                  </div>
                </div>

                {/* Número, Quadra, Lote */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Input label="Número *" value={addressForm.numero}
                    onChange={e => setAddressForm(p => ({ ...p, numero: e.target.value }))}
                    error={errors.numero} placeholder="Ex: 123" />
                  <Input label="Quadra" value={addressForm.quadra}
                    onChange={e => setAddressForm(p => ({ ...p, quadra: e.target.value }))}
                    placeholder="Ex: A" />
                  <Input label="Lote" value={addressForm.lote}
                    onChange={e => setAddressForm(p => ({ ...p, lote: e.target.value }))}
                    placeholder="Ex: 5" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Complemento" value={addressForm.complemento}
                    onChange={e => setAddressForm(p => ({ ...p, complemento: e.target.value }))}
                    placeholder="Apto, bloco..." />
                  <Input label="Ponto de referência" value={addressForm.pontoReferencia}
                    onChange={e => setAddressForm(p => ({ ...p, pontoReferencia: e.target.value }))}
                    placeholder="Próximo ao..." />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: PAGAMENTO ── */}
          {currentStep === 'payment' && (
            <div className="space-y-4">
              <h2 className="font-brand text-xl font-black uppercase text-[#F4E8CC]">Forma de pagamento</h2>

              {[
                { value: 'pix', label: 'Pix', icon: '⚡', desc: 'Pagamento instantâneo' },
                { value: 'cartao_credito', label: 'Cartão de Crédito', icon: '💳', desc: 'Na entrega' },
                { value: 'cartao_debito', label: 'Cartão de Débito', icon: '💳', desc: 'Na entrega' },
                { value: 'dinheiro', label: 'Dinheiro', icon: '💵', desc: 'Na entrega' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentForm(p => ({ ...p, formaPagamento: opt.value as any }))}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-[1.5px] transition-all text-left ${
                    paymentForm.formaPagamento === opt.value
                      ? 'border-[#D4601C] bg-[#D4601C]/10'
                      : 'border-[#3E2214] bg-[#251208] hover:border-[#5C3418]'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-[#F4E8CC] text-sm">{opt.label}</p>
                    <p className="text-xs text-[#9A7B5C]">{opt.desc}</p>
                  </div>
                  {paymentForm.formaPagamento === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-[#D4601C] flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}

              {paymentForm.formaPagamento === 'dinheiro' && (
                <Input
                  label="Troco para quanto?"
                  type="number"
                  min={totalWithDelivery}
                  step="0.01"
                  value={paymentForm.trocoParaValor?.toString() || ''}
                  onChange={e => setPaymentForm(p => ({ ...p, trocoParaValor: parseFloat(e.target.value) || undefined }))}
                  placeholder={`Mínimo ${formatCurrency(totalWithDelivery)}`}
                  hint="Deixe em branco se não precisar de troco"
                />
              )}
            </div>
          )}

          {/* ── STEP 3: REVISÃO ── */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h2 className="font-brand text-xl font-black uppercase text-[#F4E8CC]">Revisar pedido</h2>

              {/* Endereço */}
              <div className="rounded-xl p-4 space-y-1" style={{ background: '#251208', border: '1.5px solid #3E2214' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9A7B5C] mb-2">Entrega</p>
                <p className="font-semibold text-[#F4E8CC] text-sm">{addressForm.nome}</p>
                <p className="text-sm text-[#9A7B5C]">{addressForm.telefone}</p>
                <p className="text-sm text-[#9A7B5C]">
                  {addressForm.rua}, {addressForm.numero}
                  {addressForm.quadra && ` — Quadra ${addressForm.quadra}`}
                  {addressForm.lote && `, Lote ${addressForm.lote}`}
                  {addressForm.complemento && ` — ${addressForm.complemento}`}
                </p>
                <p className="text-sm text-[#9A7B5C]">{addressForm.bairro} — CEP {addressForm.cep}</p>
                {addressForm.pontoReferencia && (
                  <p className="text-xs text-[#5C3418]">Ref: {addressForm.pontoReferencia}</p>
                )}
              </div>

              {/* Itens */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: '#251208', border: '1.5px solid #3E2214' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9A7B5C] mb-2">Itens</p>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-[#F4E8CC]">{item.quantity}x {item.name}</span>
                    <span className="text-[#E87830] font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-[#3E2214] pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm text-[#9A7B5C]">
                    <span>Subtotal</span><span>{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#9A7B5C]">
                    <span>Entrega</span><span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-brand font-black text-base pt-1">
                    <span className="text-[#F4E8CC]">Total</span>
                    <span className="text-[#E87830]">{formatCurrency(totalWithDelivery)}</span>
                  </div>
                </div>
              </div>

              {/* Pagamento */}
              <div className="rounded-xl p-4" style={{ background: '#251208', border: '1.5px solid #3E2214' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9A7B5C] mb-1">Pagamento</p>
                <p className="text-sm text-[#F4E8CC] capitalize">{paymentForm.formaPagamento.replace('_', ' ')}</p>
                {paymentForm.trocoParaValor && (
                  <p className="text-xs text-[#9A7B5C]">Troco para {formatCurrency(paymentForm.trocoParaValor)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: '#1A0D06', borderTop: '1px solid #3E2214' }}>
        <div className="container max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#9A7B5C]">Total</span>
            <span className="font-brand font-black text-xl text-[#E87830]">{formatCurrency(totalWithDelivery)}</span>
          </div>
          {currentStep === 'review' ? (
            <Button size="lg" className="w-full" onClick={handleFinishOrder} loading={loading}>
              Confirmar e Pagar
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={handleNextStep}>
              {currentStep === 'address' ? 'Continuar para Pagamento' : 'Revisar Pedido'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
