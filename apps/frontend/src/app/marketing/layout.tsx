import type { Metadata } from 'next';
import './marketing.css';

export const metadata: Metadata = {
  title: 'FoodFlow — o sistema de delivery com IA que vende por você',
  description:
    'Cardápio, pedidos, entregas e pagamento num lugar só — com a AURA, sua IA que atende, prospecta e faz campanhas. Comece grátis.',
  openGraph: {
    title: 'FoodFlow — delivery com IA para o seu restaurante',
    description: 'Tudo do seu delivery em um lugar, turbinado pela IA AURA. Comece grátis.',
    type: 'website',
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // `foodflow` traz os tokens (--color-*); `foodflow-site` aplica a base do site.
  return <div className="foodflow foodflow-site">{children}</div>;
}
