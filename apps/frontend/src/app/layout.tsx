import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Sabor Express - Delivery de Marmitas',
  description: 'Marmitas deliciosas entregues na sua casa. Peça agora!',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#ef4444',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
