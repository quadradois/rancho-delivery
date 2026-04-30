'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/layout/AppBar';
import TabBar from '@/components/layout/TabBar';
import ProductCard from '@/components/product/ProductCard';
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton';
import PromoBanner from '@/components/ui/PromoBanner';
import Chip from '@/components/ui/Chip';
import FlameIcon from '@/components/ui/FlameIcon';
import BottomSheet from '@/components/ui/BottomSheet';
import ModalVerificacaoCep, { salvarCepValidado } from '@/components/ui/ModalVerificacaoCep';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils';
import api, { Produto } from '@/lib/api';

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'Lanche', label: 'Pratos' },
  { id: 'Combo', label: 'Combos' },
  { id: 'Sobremesa', label: 'Acompan.' },
  { id: 'Bebida', label: 'Bebidas' },
];

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxaEntrega, setTaxaEntrega] = useState<number | undefined>(undefined);
  const [tempoEntrega, setTempoEntrega] = useState<number | undefined>(undefined);

  // Drawers
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { addItem, removeItem, updateQuantity, items, itemCount, totalPrice, deliveryFee, total } = useCart();
  const { showSuccess, showError } = useToast();

  // Carregar produtos da API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.produtos.listar(
          activeCategory !== 'all' ? activeCategory : undefined
        );
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar produtos';
        setError(msg);
        showError('Erro ao carregar produtos', msg);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [activeCategory, showError]);

  // Produtos filtrados pela busca
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      addItem({
        id: product.id,
        name: product.nome,
        description: product.descricao,
        price: product.preco,
        imageUrl: product.midia || product.imagemUrl,
      });
      showSuccess('Adicionado!', `${product.nome} foi adicionado ao carrinho`);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'cart') setCartOpen(true);
    else if (tabId === 'search') setSearchOpen(true);
    else if (tabId === 'profile') setProfileOpen(true);
  };

  const handleCartClose = () => { setCartOpen(false); setActiveTab('home'); };
  const handleSearchClose = () => { setSearchOpen(false); setSearchQuery(''); setActiveTab('home'); };
  const handleProfileClose = () => { setProfileOpen(false); setActiveTab('home'); };

  const tabBarItems = [
    {
      id: 'home', label: 'Início',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" fill="white" />
        </svg>
      ),
    },
    {
      id: 'search', label: 'Buscar',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      id: 'cart', label: 'Carrinho',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      badge: itemCount,
    },
    {
      id: 'profile', label: 'Perfil',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1A0D06' }}>

      {/* Modal de verificação de CEP — não bloqueante */}
      <ModalVerificacaoCep
        onAtendido={(dados) => {
          salvarCepValidado(dados);
          setTaxaEntrega(dados.taxa);
          setTempoEntrega(dados.tempoEntrega);
        }}
      />

      {/* App Bar */}
      <AppBar
        title="Cardápio"
        onSearch={() => { setSearchOpen(true); setActiveTab('search'); }}
        cartCount={itemCount}
        onCartClick={() => { setCartOpen(true); setActiveTab('cart'); }}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="w-full max-w-[1160px] mx-auto px-4 md:px-6 py-6 space-y-6">
          {/* Promo Banner */}
          <PromoBanner
            title={"Frete Grátis\nHoje!"}
            badge="Oferta Relâmpago"
            price={0}
            priceLabel="na entrega"
            buttonText="Pedir Agora"
            onButtonClick={() => { setCartOpen(true); setActiveTab('cart'); }}
          />

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category.id}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                icon={category.id === 'all' ? <FlameIcon width={14} height={14} /> : undefined}
              >
                {category.label}
              </Chip>
            ))}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: '#3E2214' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4601C" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="font-display text-xl text-[#F4E8CC] mb-2">Erro ao carregar produtos</h3>
              <p className="text-[#9A7B5C] mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="text-[#D4601C] font-semibold hover:underline">
                Tentar novamente
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9A7B5C]">Nenhum produto disponível nesta categoria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.nome}
                  description={product.descricao}
                  price={product.preco}
                  category={product.categoria}
                  imageUrl={product.midia || product.imagemUrl}
                  tempoPreparo={product.tempoPreparo}
                  tempoEntrega={tempoEntrega}
                  taxaEntrega={taxaEntrega}
                  onAddToCart={handleAddToCart}
                  onFavoriteToggle={(id, isFav) => console.log(`fav ${id}: ${isFav}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <TabBar
          items={tabBarItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCenterAction={() => { setCartOpen(true); setActiveTab('cart'); }}
        />
      </div>

      {/* ── CARRINHO BOTTOM SHEET ── */}
      <BottomSheet isOpen={cartOpen} onClose={handleCartClose} title="Meu Carrinho" maxHeight="85vh">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9A7B5C" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p className="text-[#9A7B5C] font-semibold">Carrinho vazio</p>
            <p className="text-[#5C3418] text-sm">Adicione produtos para começar</p>
            <button onClick={handleCartClose}
              className="mt-2 px-6 py-2 bg-[#D4601C] text-white rounded-full font-bold text-sm hover:bg-[#E87830] transition-colors">
              Ver Cardápio
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#251208' }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#1A0D06] flex items-center justify-center">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#F4E8CC] text-sm truncate">{item.name}</p>
                    <p className="text-[#E87830] font-brand font-black text-sm">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-[#3E2214] text-[#F4E8CC] flex items-center justify-center hover:bg-[#D4601C] transition-colors font-bold text-lg leading-none"
                      aria-label="Diminuir quantidade">−</button>
                    <span className="text-[#F4E8CC] font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-[#D4601C] text-white flex items-center justify-center hover:bg-[#E87830] transition-colors font-bold text-lg leading-none"
                      aria-label="Aumentar quantidade">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#3E2214] pt-4 space-y-2">
              <div className="flex justify-between text-sm text-[#9A7B5C]">
                <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-[#9A7B5C]">
                  <span>Taxa de entrega</span><span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#3E2214]">
                <span className="font-brand font-black uppercase text-[#F4E8CC]">Total</span>
                <span className="font-brand font-black text-xl text-[#E87830]">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={() => { handleCartClose(); router.push('/checkout'); }}
              className="w-full py-4 bg-[#D4601C] text-white rounded-full font-brand font-black uppercase tracking-wider text-lg hover:bg-[#E87830] transition-colors shadow-[0_4px_14px_rgba(212,96,28,0.45)]">
              Finalizar Pedido
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── BUSCA BOTTOM SHEET ── */}
      <BottomSheet isOpen={searchOpen} onClose={handleSearchClose} title="Buscar Produtos" maxHeight="90vh">
        <div className="flex flex-col gap-4 pb-4">
          <div className="relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A7B5C]">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input type="text" autoFocus placeholder="Buscar por nome, descrição ou categoria..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl text-[#F4E8CC] text-sm outline-none border border-[#3E2214] focus:border-[#D4601C] transition-colors"
              style={{ background: '#251208' }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A7B5C] hover:text-[#F4E8CC] transition-colors"
                aria-label="Limpar busca">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {searchQuery.trim() === '' ? (
            <p className="text-center text-[#5C3418] text-sm py-8">Digite para buscar produtos</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-[#9A7B5C] text-sm py-8">Nenhum produto encontrado para &ldquo;{searchQuery}&rdquo;</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[#9A7B5C] font-semibold uppercase tracking-wider">
                {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
              </p>
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#251208' }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#1A0D06] flex items-center justify-center">
                    {product.midia || product.imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.midia || product.imagemUrl} alt={product.nome} className="w-full h-full object-cover" />
                    ) : <span className="text-2xl">🍽️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#F4E8CC] text-sm truncate">{product.nome}</p>
                    <p className="text-xs text-[#9A7B5C] truncate">{product.descricao}</p>
                    <p className="text-[#E87830] font-brand font-black text-sm mt-0.5">{formatCurrency(product.preco)}</p>
                  </div>
                  <button onClick={() => { handleAddToCart(product.id); handleSearchClose(); }}
                    className="w-9 h-9 bg-[#D4601C] rounded-full flex items-center justify-center flex-shrink-0 hover:bg-[#E87830] transition-colors"
                    aria-label={`Adicionar ${product.nome} ao carrinho`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── PERFIL BOTTOM SHEET ── */}
      <BottomSheet isOpen={profileOpen} onClose={handleProfileClose} title="Meu Perfil" maxHeight="70vh">
        <div className="flex flex-col gap-6 pb-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-20 h-20 rounded-full bg-[#3E2214] flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9A7B5C" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-[#F4E8CC] font-semibold">Visitante</p>
            <p className="text-[#9A7B5C] text-sm">Faça seu pedido para se cadastrar</p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => { handleProfileClose(); router.push('/checkout'); }}
              className="flex items-center gap-3 p-4 rounded-xl text-left hover:opacity-80 transition-opacity"
              style={{ background: '#251208' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4601C" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <p className="text-[#F4E8CC] font-semibold text-sm">Meus Pedidos</p>
                <p className="text-[#9A7B5C] text-xs">Acompanhe seus pedidos</p>
              </div>
            </button>

            <button onClick={() => { handleProfileClose(); setCartOpen(true); }}
              className="flex items-center gap-3 p-4 rounded-xl text-left hover:opacity-80 transition-opacity"
              style={{ background: '#251208' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4601C" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <div>
                <p className="text-[#F4E8CC] font-semibold text-sm">Carrinho</p>
                <p className="text-[#9A7B5C] text-xs">{itemCount} {itemCount === 1 ? 'item' : 'itens'} no carrinho</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
