'use client'

import React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, Shield, AlertTriangle, Info } from 'lucide-react'

/**
 * مكون لعرض معلومات البيانات القابلة للتصفير
 * Component to display information about resettable data
 */

interface DataCategory {
  nameAr: string
  nameEn: string
  icon: React.ReactNode
  items: string[]
  color: string
}

export function DataResetInfo() {
  const resettableData: DataCategory[] = [
    {
      nameAr: 'البيانات المالية',
      nameEn: 'Financial Data',
      icon: <Database className="h-4 w-4" />,
      items: [
        'الفواتير والإيصالات / Invoices & Receipts',
        'المعاملات المالية / Financial Transactions',
        'التقارير اليومية والشهرية / Daily & Monthly Reports',
        'سجلات الإيرادات / Revenue Records'
      ],
      color: 'text-chart-1'
    },
    {
      nameAr: 'المبيعات',
      nameEn: 'Sales',
      icon: <Database className="h-4 w-4" />,
      items: [
        'سجلات المبيعات / Sales Records',
        'معاملات نقاط البيع / POS Transactions',
        'سلة التسوق / Shopping Cart',
        'تاريخ المبيعات / Sales History'
      ],
      color: 'text-chart-2'
    },
    {
      nameAr: 'المخزون',
      nameEn: 'Inventory',
      icon: <Database className="h-4 w-4" />,
      items: [
        'مستويات المخزون / Stock Levels',
        'تاريخ المخزون / Inventory History',
        'تنبيهات المخزون المنخفض / Low Stock Alerts',
        'سجلات الجرد / Audit Records'
      ],
      color: 'text-chart-3'
    },
    {
      nameAr: 'الحضور والموارد البشرية',
      nameEn: 'Attendance & HR',
      icon: <Database className="h-4 w-4" />,
      items: [
        'سجلات الحضور والغياب / Attendance Records',
        'بيانات الورديات / Shift Data',
        'سجلات الإجازات / Leave Records',
        'بيانات الرواتب / Payroll Data'
      ],
      color: 'text-chart-4'
    },
    {
      nameAr: 'البيانات الأخرى',
      nameEn: 'Other Data',
      icon: <Database className="h-4 w-4" />,
      items: [
        'سجلات التدقيق / Audit Logs',
        'الإشعارات / Notifications',
        'التنبيهات / Alerts',
        'رموز QR / QR Codes'
      ],
      color: 'text-chart-5'
    }
  ]

  const preservedData: DataCategory[] = [
    {
      nameAr: 'البيانات المحفوظة',
      nameEn: 'Preserved Data',
      icon: <Shield className="h-4 w-4" />,
      items: [
        'حسابات المستخدمين / User Accounts',
        'الصلاحيات والأدوار / Permissions & Roles',
        'إعدادات النظام / System Settings',
        'معلومات المصادقة / Authentication Info'
      ],
      color: 'text-primary'
    }
  ]

  return (
    <div className="space-y-6">
      {/* البيانات التي سيتم تصفيرها */}
      <Card className="border-destructive/30 bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-foreground">البيانات التي سيتم تصفيرها</CardTitle>
              <CardDescription>Data that will be reset</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resettableData.map((category, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className={category.color}>{category.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {category.nameAr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.nameEn}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <span className="text-destructive mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* البيانات المحفوظة */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">البيانات المحفوظة (لن يتم المساس بها)</CardTitle>
              <CardDescription>Preserved Data (Will NOT be affected)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {preservedData.map((category, index) => (
              <div
                key={index}
                className="rounded-lg border border-primary/30 bg-background p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className={category.color}>{category.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {category.nameAr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.nameEn}
                    </p>
                  </div>
                  <Badge className="mr-auto bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                    محمي / Protected
                  </Badge>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ملاحظة هامة */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                ملاحظة هامة: هذه العملية لا يمكن التراجع عنها
              </p>
              <p className="font-medium text-foreground">
                Important Note: This operation cannot be undone
              </p>
              <p className="text-muted-foreground">
                تأكد من أخذ نسخة احتياطية من البيانات قبل التصفير إذا كنت بحاجة إليها مستقبلاً.
              </p>
              <p className="text-muted-foreground">
                Make sure to backup your data before resetting if you need it in the future.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
