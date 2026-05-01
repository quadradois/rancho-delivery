'use client';

import { useRouter } from 'next/navigation';
import AppBar from '@/components/layout/AppBar';
import OrderCard from '@/components/product/OrderCard';
import Button from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import useLojaStatus from '@/hooks/useLojaStatus';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, totalPrice, itemCount } = useCart();
  const { showError } = useToast();
  const { status: lojaStatus, lojaAberta, mensagem: lojaMensagem } = useLojaStatus();

  const lojaIndisponivelTitulo = lojaStatus?.status === 'PAUSADO' ? 'Loja pausada' : 'Loja fechada';

  const handleCheckout = () => {
    if (items.length === 0) {
      return;
    }
    if (!lojaAberta) {
      showError(lojaIndisponivelTitulo, lojaMensagem || 'No momento não estamos recebendo novos pedidos.');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
        <AppBar title="Meu Carrinho" onBack={() => router.back()} />

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ background: '#251208' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9A7B5C" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl text-[#F4E8CC]">Carrinho Vazio</h2>
            <p className="text-[#9A7B5C]">Adicione itens deliciosos ao seu carrinho para começar seu pedido</p>
            <Button onClick={() => router.push('/')}>Ver Cardápio</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>
      <AppBar title="Meu Carrinho" onBack={() => router.back()} />

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="container py-6 space-y-4">
          {!lojaAberta && lojaStatus && (
            <div className="rounded-2xl p-4 border border-[#E8A040]/35 bg-[#251208]">
              <p className="font-brand font-black uppercase tracking-wider text-[#E8A040]">
                {lojaStatus.status === 'PAUSADO' ? 'Loja pausada' : 'Loja fechada'}
              </p>
              <p className="text-sm text-[#E8D4B0] mt-1">{lojaMensagem}</p>
            </div>
          )}

          {items.map((item) => (
            <OrderCard key={item.id} {...item} onQuantityChange={updateQuantity} />
          ))}
        </div>
      </main>

      {/* Footer with Summary */}
      <div className="fixed bottom-0 left-0 right-0 p-6 space-y-4" style={{ background: '#251208', borderTop: '1px solid #3E2214' }}>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-[#9A7B5C]">
            <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</span>
            <span>{formatCurrency(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#9A7B5C]">
            <span>Taxa de entrega</span>
            <span>Calculada no checkout</span>
          </div>
          <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #3E2214' }}>
            <span className="font-body font-extrabold text-md uppercase text-[#F4E8CC]">Total</span>
            <span className="font-display text-xl text-[#E87830]">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={handleCheckout} disabled={!lojaAberta}>
          Finalizar Pedido
        </Button>
      </div>
    </div>
  );
}
