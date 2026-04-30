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
import { checkoutAddressSchema } from '@/schemas/checkoutSchema';
import { ZodError } from 'zod';

type CheckoutStep = 'address' | 'payment' | 'review';

interface AddressForm {
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  pontoReferencia: string;
}

interface PaymentForm {
  formaPagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix';
  trocoParaValor?: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { showSuccess, showError } = useToast();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [loading, setLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadingCep, setLoadingCep] = useState(false);

  const [addressForm, setAddressForm] = useState<AddressForm>({
    nome: '',
    telefone: '',
    email: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    pontoReferencia: '',
  });

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    formaPagamento: 'pix',
    trocoParaValor: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});

  // Redirecionar se carrinho vazio
  useEffect(() => {
    if (items.length === 0) {
      router.push('/');
    }
  }, [items, router]);

  // Buscar endereço por CEP
  const handleCepBlur = async () => {
    const cep = addressForm.cep.replace(/\D/g, '');
    
    if (cep.length !== 8) return;

    setLoadingCep(true);
    try {
      // Buscar endereço via ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        showError('CEP não encontrado', 'Verifique o CEP digitado');
        return;
      }

      setAddressForm(prev => ({
        ...prev,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
      }));

    } catch (error) {
      showError('Erro ao buscar CEP', 'Tente novamente');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleBairroBlur = async (bairroNome: string) => {
    if (!bairroNome.trim()) return;

    try {
      const validacao = await api.bairros.validar(bairroNome.trim());
      if (validacao.valido) {
        setDeliveryFee(validacao.taxa);
      }
    } catch {
      setDeliveryFee(0);
      showError('Bairro não atendido', 'Este bairro não está na nossa área de entrega');
    }
  };

  // Validar formulário de endereço com Zod
  const validateAddress = (): boolean => {
    try {
      checkoutAddressSchema.parse(addressForm);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Partial<Record<keyof AddressForm, string>> = {};
        err.errors.forEach((e) => {
          const field = e.path[0] as keyof AddressForm;
          if (field) fieldErrors[field] = e.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  // Validar campo individual em tempo real
  const validateField = (field: keyof AddressForm, value: string) => {
    try {
      checkoutAddressSchema.pick({ [field]: true } as any).parse({ [field]: value });
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      if (err instanceof ZodError) {
        setErrors((prev) => ({ ...prev, [field]: err.errors[0]?.message }));
      }
    }
  };

  // Avançar para próxima etapa
  const handleNextStep = () => {
    if (currentStep === 'address') {
      if (!validateAddress()) {
        showError('Preencha todos os campos obrigatórios');
        return;
      }
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('review');
    }
  };

  // Voltar etapa
  const handlePreviousStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('address');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
    }
  };

  // Finalizar pedido
  const handleFinishOrder = async () => {
    setLoading(true);
    try {
      const pedidoData: CriarPedidoDTO = {
        cliente: {
          nome: addressForm.nome,
          telefone: addressForm.telefone.replace(/\D/g, ''),
          endereco: `${addressForm.rua}, ${addressForm.numero}${addressForm.complemento ? ` - ${addressForm.complemento}` : ''}`,
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
      
      showSuccess('Pedido realizado com sucesso!', `Pedido #${pedido.id.slice(-8)}`);
      clearCart();
      if (pedido.linkPagamento) {
        window.location.href = pedido.linkPagamento;
        return;
      }
      router.push(`/pedido/${pedido.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar pedido';
      showError('Erro ao finalizar pedido', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalWithDelivery = totalPrice + deliveryFee;

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
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep === 'address' ? 'bg-[#D4601C] text-white' : 'bg-[#3E2214] text-[#9A7B5C]'
              }`}>1</div>
              <span className="text-xs mt-2 font-semibold text-[#9A7B5C]">Endereço</span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep !== 'address' ? 'bg-[#D4601C]' : 'bg-[#3E2214]'}`} />
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep === 'payment' ? 'bg-[#D4601C] text-white' :
                currentStep === 'review' ? 'bg-[#4A7840] text-white' : 'bg-[#3E2214] text-[#9A7B5C]'
              }`}>2</div>
              <span className="text-xs mt-2 font-semibold text-[#9A7B5C]">Pagamento</span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep === 'review' ? 'bg-[#D4601C]' : 'bg-[#3E2214]'}`} />
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep === 'review' ? 'bg-[#D4601C] text-white' : 'bg-[#3E2214] text-[#9A7B5C]'
              }`}>3</div>
              <span className="text-xs mt-2 font-semibold text-[#9A7B5C]">Revisão</span>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 'address' && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl text-[#F4E8CC] mb-4">
                Dados de Entrega
              </h2>

              <Input
                label="Nome completo *"
                value={addressForm.nome}
                onChange={(e) => setAddressForm({ ...addressForm, nome: e.target.value })}
                onBlur={(e) => validateField('nome', e.target.value)}
                error={errors.nome}
                placeholder="Seu nome"
              />

              <Input
                label="Telefone *"
                value={addressForm.telefone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                  setAddressForm({ ...addressForm, telefone: formatted });
                }}
                onBlur={(e) => validateField('telefone', e.target.value)}
                error={errors.telefone}
                placeholder="(11) 99999-9999"
              />

              <Input
                label="E-mail"
                type="email"
                value={addressForm.email}
                onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                onBlur={(e) => validateField('email', e.target.value)}
                placeholder="seu@email.com"
                error={errors.email}
              />

              <Input
                label="CEP *"
                value={addressForm.cep}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/(\d{5})(\d{3})/, '$1-$2');
                  setAddressForm({ ...addressForm, cep: formatted });
                }}
                onBlur={handleCepBlur}
                error={errors.cep}
                placeholder="00000-000"
                hint={loadingCep ? 'Buscando endereço...' : undefined}
              />

              <Input
                label="Rua *"
                value={addressForm.rua}
                onChange={(e) => setAddressForm({ ...addressForm, rua: e.target.value })}
                onBlur={(e) => validateField('rua', e.target.value)}
                error={errors.rua}
                placeholder="Nome da rua"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Número *"
                  value={addressForm.numero}
                  onChange={(e) => setAddressForm({ ...addressForm, numero: e.target.value })}
                  onBlur={(e) => validateField('numero', e.target.value)}
                  error={errors.numero}
                  placeholder="123"
                />

                <Input
                  label="Complemento"
                  value={addressForm.complemento}
                  onChange={(e) => setAddressForm({ ...addressForm, complemento: e.target.value })}
                  placeholder="Apto 45"
                />
              </div>

              <Input
                label="Bairro *"
                value={addressForm.bairro}
                onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })}
                onBlur={async (e) => {
                  validateField('bairro', e.target.value);
                  await handleBairroBlur(e.target.value);
                }}
                error={errors.bairro}
                placeholder="Nome do bairro"
              />

              <Input
                label="Ponto de referência"
                value={addressForm.pontoReferencia}
                onChange={(e) => setAddressForm({ ...addressForm, pontoReferencia: e.target.value })}
                placeholder="Próximo ao mercado"
              />
            </div>
          )}

          {currentStep === 'payment' && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl text-[#F4E8CC] mb-4">
                Forma de Pagamento
              </h2>

              <div className="space-y-3">
                {[
                  { value: 'pix', label: 'PIX', icon: '💳' },
                  { value: 'cartao_credito', label: 'Cartão de Crédito', icon: '💳' },
                  { value: 'cartao_debito', label: 'Cartão de Débito', icon: '💳' },
                  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPaymentForm({ ...paymentForm, formaPagamento: option.value as any })}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      paymentForm.formaPagamento === option.value
                        ? 'border-[#D4601C] bg-[#D4601C]/10'
                        : 'border-[#3E2214] bg-[#251208] hover:border-[#5C3418]'
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span className="font-semibold text-[#F4E8CC]">{option.label}</span>
                    {paymentForm.formaPagamento === option.value && (
                      <span className="ml-auto text-[#D4601C]">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {paymentForm.formaPagamento === 'dinheiro' && (
                <Input
                  label="Troco para quanto?"
                  type="number"
                  value={paymentForm.trocoParaValor || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, trocoParaValor: parseFloat(e.target.value) || undefined })}
                  placeholder="Ex: 50.00"
                  hint="Deixe em branco se não precisar de troco"
                />
              )}
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl text-[#F4E8CC] mb-4">
                Revisar Pedido
              </h2>

              {/* Endereço */}
              <div className="rounded-xl p-4" style={{ background: '#251208', border: '1px solid #3E2214' }}>
                <h3 className="font-bold text-sm uppercase text-[#9A7B5C] mb-3">Entregar em:</h3>
                <p className="font-semibold text-[#F4E8CC]">{addressForm.nome}</p>
                <p className="text-sm text-[#9A7B5C]">{addressForm.telefone}</p>
                <p className="text-sm text-[#9A7B5C] mt-2">
                  {addressForm.rua}, {addressForm.numero}
                  {addressForm.complemento && ` - ${addressForm.complemento}`}
                </p>
                <p className="text-sm text-[#9A7B5C]">
                  {addressForm.bairro} - CEP {addressForm.cep}
                </p>
              </div>

              {/* Pagamento */}
              <div className="rounded-xl p-4" style={{ background: '#251208', border: '1px solid #3E2214' }}>
                <h3 className="font-bold text-sm uppercase text-[#9A7B5C] mb-3">Pagamento:</h3>
                <p className="font-semibold text-[#F4E8CC]">
                  {paymentForm.formaPagamento === 'pix' && 'PIX'}
                  {paymentForm.formaPagamento === 'cartao_credito' && 'Cartão de Crédito'}
                  {paymentForm.formaPagamento === 'cartao_debito' && 'Cartão de Débito'}
                  {paymentForm.formaPagamento === 'dinheiro' && 'Dinheiro'}
                </p>
                {paymentForm.trocoParaValor && (
                  <p className="text-sm text-[#9A7B5C]">
                    Troco para: {formatCurrency(paymentForm.trocoParaValor)}
                  </p>
                )}
              </div>

              {/* Itens */}
              <div className="rounded-xl p-4" style={{ background: '#251208', border: '1px solid #3E2214' }}>
                <h3 className="font-bold text-sm uppercase text-[#9A7B5C] mb-3">Itens do Pedido:</h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-[#E8D4B0]">{item.quantity}x {item.name}</span>
                      <span className="font-semibold text-[#F4E8CC]">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="rounded-xl p-4" style={{ background: '#251208', border: '1px solid #3E2214' }}>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-[#9A7B5C]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#9A7B5C]">
                    <span>Taxa de entrega</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #3E2214' }}>
                    <span className="font-body font-extrabold text-md uppercase text-[#F4E8CC]">Total</span>
                    <span className="font-display text-xl text-[#E87830]">
                      {formatCurrency(totalWithDelivery)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer with Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 space-y-3" style={{ background: '#251208', borderTop: '1px solid #3E2214' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#9A7B5C]">Total com entrega</span>
          <span className="font-display text-xl text-[#E87830]">
            {formatCurrency(totalWithDelivery)}
          </span>
        </div>

        {currentStep === 'review' ? (
          <Button size="lg" className="w-full" onClick={handleFinishOrder} loading={loading} disabled={loading}>
            {loading ? 'Finalizando...' : 'Confirmar Pedido'}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={handleNextStep}>
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
}
