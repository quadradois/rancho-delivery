import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@/styles/design-system.css'
import { CartProvider } from '@/contexts/CartContext'
import { ToastProvider } from '@/contexts/ToastContext'
import ClientErrorBoundary from '@/components/ClientErrorBoundary'

export const metadata: Metadata = {
  title: 'Rancho Comida Caseira - Tão gostoso quanto parece',
  description: 'Delivery de comida caseira. Peça agora!',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#e8231a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientErrorBoundary>
          <CartProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </CartProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  )
}
