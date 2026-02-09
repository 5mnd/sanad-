'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, CreditCard, Truck, CheckCircle2, Settings, ExternalLink, Zap } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface Integration {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  category: string
  logo: string
  status: 'connected' | 'disconnected'
  color: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'moyasar',
      name: 'Moyasar',
      nameAr: 'ميسر',
      description: 'Payment Gateway for Saudi Arabia',
      descriptionAr: 'بوابة الدفع الإلكتروني',
      category: 'payments',
      logo: '💳',
      status: 'connected',
      color: 'bg-primary/10 text-primary border-primary/30'
    },
    {
      id: 'jahez',
      name: 'Jahez',
      nameAr: 'جاهز',
      description: 'Food Delivery Platform',
      descriptionAr: 'منصة توصيل الطعام',
      category: 'delivery',
      logo: '🍔',
      status: 'connected',
      color: 'bg-chart-2/10 text-chart-2 border-chart-2/30'
    },
    {
      id: 'hungerstation',
      name: 'HungerStation',
      nameAr: 'هنقرستيشن',
      description: 'Food & Grocery Delivery',
      descriptionAr: 'توصيل الطعام والبقالة',
      category: 'delivery',
      logo: '🚚',
      status: 'disconnected',
      color: 'bg-muted/10 text-muted-foreground border-border'
    },
    {
      id: 'mada',
      name: 'mada',
      nameAr: 'مدى',
      description: 'Saudi Payment Network',
      descriptionAr: 'شبكة المدفوعات السعودية',
      category: 'payments',
      logo: '💰',
      status: 'connected',
      color: 'bg-primary/10 text-primary border-primary/30'
    },
    {
      id: 'toyo',
      name: 'Toyo',
      nameAr: 'طيّو',
      description: 'Delivery Management System',
      descriptionAr: 'نظام إدارة التوصيل',
      category: 'delivery',
      logo: '📦',
      status: 'disconnected',
      color: 'bg-muted/10 text-muted-foreground border-border'
    },
    {
      id: 'stc-pay',
      name: 'STC Pay',
      nameAr: 'STC Pay',
      description: 'Digital Wallet Solution',
      descriptionAr: 'محفظة رقمية',
      category: 'payments',
      logo: '📱',
      status: 'disconnected',
      color: 'bg-muted/10 text-muted-foreground border-border'
    },
  ])

  const toggleIntegration = (id: string) => {
    setIntegrations(integrations.map(int =>
      int.id === id
        ? { ...int, status: int.status === 'connected' ? 'disconnected' : 'connected' as const }
        : int
    ))
  }

  const paymentIntegrations = integrations.filter(i => i.category === 'payments')
  const deliveryIntegrations = integrations.filter(i => i.category === 'delivery')

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
          <Link href="/pos" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            نقاط البيع (POS)
          </Link>
          <Link href="/security" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            الأمان المالي
          </Link>
          <Link href="/integrations" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground">
            التكاملات
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">مركز التكاملات</h2>
            <p className="mt-1 text-muted-foreground">إدارة الاتصالات بالخدمات الخارجية</p>
          </div>

          {/* Stats */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardDescription className="text-muted-foreground">إجمالي التكاملات</CardDescription>
                    <CardTitle className="text-2xl text-foreground">{integrations.length}</CardTitle>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                    <CheckCircle2 className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <CardDescription className="text-muted-foreground">تكاملات نشطة</CardDescription>
                    <CardTitle className="text-2xl text-foreground">
                      {integrations.filter(i => i.status === 'connected').length}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50">
                    <Settings className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardDescription className="text-muted-foreground">متاحة للتفعيل</CardDescription>
                    <CardTitle className="text-2xl text-foreground">
                      {integrations.filter(i => i.status === 'disconnected').length}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Payment Integrations */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">بوابات الدفع</h3>
                <p className="text-sm text-muted-foreground">Payment Gateways</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {paymentIntegrations.map((integration) => (
                <Card key={integration.id} className="border-border bg-card hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-3xl">
                          {integration.logo}
                        </div>
                        <div>
                          <CardTitle className="text-foreground">{integration.nameAr}</CardTitle>
                          <CardDescription className="text-xs">{integration.name}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={
                          integration.status === 'connected'
                            ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
                            : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/30'
                        }
                      >
                        {integration.status === 'connected' ? (
                          <>
                            <CheckCircle2 className="ml-1 h-3 w-3" />
                            متصل
                          </>
                        ) : (
                          'غير متصل'
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {integration.descriptionAr}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                        className={
                          integration.status === 'connected'
                            ? 'border-border'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }
                        onClick={() => toggleIntegration(integration.id)}
                      >
                        {integration.status === 'connected' ? 'قطع الاتصال' : 'ربط الآن'}
                      </Button>
                      <Button variant="outline" size="icon" className="border-border bg-transparent">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="border-border bg-transparent">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Delivery Integrations */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Truck className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">تطبيقات التوصيل</h3>
                <p className="text-sm text-muted-foreground">Delivery Apps</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {deliveryIntegrations.map((integration) => (
                <Card key={integration.id} className="border-border bg-card hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-3xl">
                          {integration.logo}
                        </div>
                        <div>
                          <CardTitle className="text-foreground">{integration.nameAr}</CardTitle>
                          <CardDescription className="text-xs">{integration.name}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={
                          integration.status === 'connected'
                            ? 'bg-chart-2/20 text-chart-2 border-chart-2/30 hover:bg-chart-2/30'
                            : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/30'
                        }
                      >
                        {integration.status === 'connected' ? (
                          <>
                            <CheckCircle2 className="ml-1 h-3 w-3" />
                            متصل
                          </>
                        ) : (
                          'غير متصل'
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {integration.descriptionAr}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                        className={
                          integration.status === 'connected'
                            ? 'border-border'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }
                        onClick={() => toggleIntegration(integration.id)}
                      >
                        {integration.status === 'connected' ? 'قطع الاتصال' : 'ربط الآن'}
                      </Button>
                      <Button variant="outline" size="icon" className="border-border bg-transparent">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="border-border bg-transparent">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <Card className="mt-8 border-primary/30 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">تكاملات آمنة</CardTitle>
                  <CardDescription>جميع الاتصالات محمية بتشفير AES-256</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                يستخدم نظام سند أحدث بروتوكولات الأمان لضمان حماية بياناتك المالية عند الاتصال بالخدمات الخارجية. جميع المعاملات مشفرة ومتوافقة مع معايير هيئة الزكاة والضريبة والجمارك.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
