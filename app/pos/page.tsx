'use client'

import React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, Scan, ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  barcode: string
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [barcode, setBarcode] = useState('')

  const products = [
    { id: '1', name: 'قهوة عربية فاخرة', price: 85.00, barcode: '8901234567890', category: 'مشروبات' },
    { id: '2', name: 'تمر المدينة - كيلو', price: 45.50, barcode: '8901234567891', category: 'تمور' },
    { id: '3', name: 'زيت زيتون بكر', price: 125.00, barcode: '8901234567892', category: 'زيوت' },
    { id: '4', name: 'عسل سدر جبلي', price: 250.00, barcode: '8901234567893', category: 'عسل' },
    { id: '5', name: 'بهارات مشكلة', price: 35.00, barcode: '8901234567894', category: 'بهارات' },
    { id: '6', name: 'أرز بسمتي - 5 كيلو', price: 65.00, barcode: '8901234567895', category: 'حبوب' },
    { id: '7', name: 'حليب طازج', price: 18.50, barcode: '8901234567896', category: 'ألبان' },
    { id: '8', name: 'معجون طماطم', price: 12.00, barcode: '8901234567897', category: 'معلبات' },
    { id: '9', name: 'شاي أخضر ممتاز', price: 28.00, barcode: '8901234567898', category: 'مشروبات' },
    { id: '10', name: 'طحين فاخر - 2 كيلو', price: 22.50, barcode: '8901234567899', category: 'حبوب' },
    { id: '11', name: 'سكر ناعم', price: 15.00, barcode: '8901234567800', category: 'سكريات' },
    { id: '12', name: 'زبدة نباتية', price: 32.00, barcode: '8901234567801', category: 'ألبان' },
  ]

  const addToCart = (product: typeof products[0]) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ))
  }

  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addToCart(product)
      setBarcode('')
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-l border-sidebar-border bg-sidebar p-6">
        <Link href="/" className="block mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">سند</h1>
              <p className="text-xs text-muted-foreground">Sanad</p>
            </div>
          </div>
        </Link>

        <nav className="space-y-2">
          <Link href="/" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            الرئيسية
          </Link>
          <Link href="/pos" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground">
            نقاط البيع (POS)
          </Link>
          <Link href="/security" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            الأمان المالي
          </Link>
          <Link href="/integrations" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            التكاملات
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="flex gap-6 h-[calc(100vh-4rem)]">
          {/* Products Grid */}
          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-4">نقاط البيع</h2>
              
              {/* Barcode Search */}
              <form onSubmit={handleBarcodeSearch} className="relative">
                <Scan className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ابحث بالباركود..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="pr-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground"
                />
              </form>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer border-border bg-card hover:border-primary/50 transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">{product.name}</CardTitle>
                      <CardDescription className="text-xs">{product.category}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">ر.س {product.price.toFixed(2)}</span>
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          {product.barcode}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Checkout Sidebar */}
          <Card className="w-96 border-border bg-card flex flex-col">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">سلة المشتريات</CardTitle>
                  <CardDescription>عناصر: {cart.length}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">السلة فارغة</p>
                  <p className="text-xs text-muted-foreground mt-1">أضف منتجات للبدء</p>
                </div>
              ) : (
                cart.map((item) => (
                  <Card key={item.id} className="bg-muted/30 border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-foreground">{item.name}</h4>
                          <p className="text-xs text-primary font-mono mt-1">ر.س {item.price.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-border bg-transparent"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="flex-1 text-center text-sm font-semibold text-foreground">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-border bg-transparent"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold text-foreground mr-2">
                          ر.س {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>

            {/* Totals */}
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>المجموع الفرعي:</span>
                <span>ر.س {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span>ر.س {vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-foreground border-t border-border pt-3">
                <span>الإجمالي:</span>
                <span className="text-primary">ر.س {total.toFixed(2)}</span>
              </div>
              
              <Button 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={cart.length === 0}
              >
                <CreditCard className="ml-2 h-5 w-5" />
                إتمام الدفع
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
