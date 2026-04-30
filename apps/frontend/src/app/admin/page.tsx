'use client';

import Link from 'next/link';

export default function AdminPage() {
  const cards = [
    {
      title: 'Produtos',
      description: 'Gerencie o cardápio',
      href: '/admin/produtos',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      title: 'Bairros',
      description: 'Taxas de entrega',
      href: '/admin/bairros',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold-500">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      title: 'Pedidos',
      description: 'Acompanhe os pedidos',
      href: '/admin/pedidos',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-600">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-brand text-3xl font-black uppercase text-neutral-900">Dashboard</h1>
          <p className="text-neutral-500 mt-1">Bem-vindo ao painel administrativo do Rancho</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
              {card.icon}
            </div>
            <div>
              <h2 className="font-brand text-xl font-black uppercase text-neutral-900">{card.title}</h2>
              <p className="text-sm text-neutral-500">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
