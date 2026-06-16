import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@/styles/site-theme.css'
import { CartProvider } from '@/contexts/CartContext'
import { ToastProvider } from '@/contexts/ToastContext'
import ClientErrorBoundary from '@/components/ClientErrorBoundary'
import { getBranding } from '@/lib/branding'
import { BrandProvider } from '@/contexts/BrandContext'

// Título/descrição vêm da marca do restaurante atual (white-label), não cravados.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBranding()
  return {
    title: brand.nome,
    description: 'Delivery de comida caseira. Peça agora!',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#e8231a',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const brand = await getBranding()
  return (
    <html lang="pt-BR">
      <body className="site-mode">
        <ClientErrorBoundary>
          <BrandProvider brand={brand}>
            <CartProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </CartProvider>
          </BrandProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  )
}
