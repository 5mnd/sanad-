'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Database, Package, Receipt, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  type: 'products' | 'invoices' | 'employees' | 'data'
  language: 'ar' | 'en'
  onAction?: () => void
  actionLabel?: string
}

export function EmptyState({ type, language, onAction, actionLabel }: EmptyStateProps) {
  const isArabic = language === 'ar'

  const config = {
    products: {
      icon: Package,
      titleAr: 'لا توجد منتجات',
      titleEn: 'No Products Found',
      descriptionAr: 'قم بإضافة منتجات من نظام ERPNext لعرضها هنا',
      descriptionEn: 'Add products from ERPNext to display them here',
      color: 'text-blue-500'
    },
    invoices: {
      icon: Receipt,
      titleAr: 'لا توجد فواتير',
      titleEn: 'No Invoices Found',
      descriptionAr: 'لم يتم إنشاء أي فواتير بعد. ابدأ البيع من نقاط البيع',
      descriptionEn: 'No invoices created yet. Start selling from the POS',
      color: 'text-green-500'
    },
    employees: {
      icon: Users,
      titleAr: 'لا يوجد موظفون',
      titleEn: 'No Employees Found',
      descriptionAr: 'قم بإضافة موظفين من نظام ERPNext لعرضهم هنا',
      descriptionEn: 'Add employees from ERPNext to display them here',
      color: 'text-purple-500'
    },
    data: {
      icon: Database,
      titleAr: 'لا توجد بيانات',
      titleEn: 'No Data Available',
      descriptionAr: 'قاعدة البيانات فارغة. تأكد من الاتصال بـ ERPNext',
      descriptionEn: 'Database is empty. Ensure ERPNext connection is active',
      color: 'text-gray-500'
    }
  }

  const { icon: Icon, titleAr, titleEn, descriptionAr, descriptionEn, color } = config[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <Card className="max-w-md w-full border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center text-center p-12 space-y-4">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse'
            }}
          >
            <Icon className={`h-16 w-16 ${color}`} />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              {isArabic ? titleAr : titleEn}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {isArabic ? descriptionAr : descriptionEn}
            </p>
          </div>

          {onAction && actionLabel && (
            <Button onClick={onAction} variant="outline" className="mt-4 bg-transparent">
              {actionLabel}
            </Button>
          )}

          {/* ERPNext Connection Hint */}
          <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>
              {isArabic 
                ? 'تأكد من اتصال نظام ERPNext لتحميل البيانات' 
                : 'Ensure ERPNext is connected to load data'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Loading skeleton component
export function LoadingSkeleton({ type = 'grid' }: { type?: 'grid' | 'list' | 'table' }) {
  return (
    <div className="space-y-4 p-4">
      {type === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-48 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {type === 'list' && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-16 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {type === 'table' && (
        <div className="space-y-2">
          <div className="h-12 bg-muted rounded-t-lg animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-16 bg-muted/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}
    </div>
  )
}
