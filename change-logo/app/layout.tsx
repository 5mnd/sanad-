import React from "react"
import type { Metadata } from 'next'
import { Cairo, Inter } from 'next/font/google'

import './globals.css'
import './thermal-print.css'
import { LanguageProvider } from '@/lib/language-context'
import PWAInit from './pwa-init'

const cairo = Cairo({ 
  subsets: ['latin', 'arabic'],
  variable: '--font-cairo'
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'سند - Sanad | نظام المحاسبة',
  description: 'نظام محاسبة سعودي متقدم',
  generator: 'v0.app',
  metadataBase: new URL('https://sanad.sa'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sanad POS',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#0a0a0a',
  other: {
    'charset': 'utf-8',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${cairo.variable} ${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <PWAInit />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
