'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Minus, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/number-format'

interface SalaryAdjustment {
  id: string
  employeeId: string
  type: 'bonus' | 'deduction'
  amount: number
  reason: string
  month: string // Format: YYYY-MM
  createdAt: string
  createdBy: string
}

interface SalaryAdjustmentsProps {
  language: 'ar' | 'en'
  employeeId: string
  baseSalary: number
  currentMonth?: string
  isAdmin?: boolean
}

export function SalaryAdjustments({ 
  language, 
  employeeId, 
  baseSalary,
  currentMonth,
  isAdmin = false 
}: SalaryAdjustmentsProps) {
  const { toast } = useToast()
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'deduction'>('bonus')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  
  const activeMonth = currentMonth || getCurrentMonth()

  // Load adjustments from localStorage
  useEffect(() => {
    loadAdjustments()
  }, [employeeId, activeMonth])

  const loadAdjustments = () => {
    try {
      const stored = localStorage.getItem('sanad_salary_adjustments')
      if (stored) {
        const allAdjustments: SalaryAdjustment[] = JSON.parse(stored)
        // Filter by employee and current month
        const filtered = allAdjustments.filter(
          adj => adj.employeeId === employeeId && adj.month === activeMonth
        )
        setAdjustments(filtered)
      }
    } catch (error) {
      console.error('Error loading salary adjustments:', error)
    }
  }

  const handleAddAdjustment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount',
        variant: 'destructive',
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال السبب' : 'Please enter a reason',
        variant: 'destructive',
      })
      return
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem('sanad_current_user') || '{}')
      
      const newAdjustment: SalaryAdjustment = {
        id: `ADJ-${Date.now()}`,
        employeeId,
        type: adjustmentType,
        amount: parseFloat(amount),
        reason: reason.trim(),
        month: activeMonth,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id || 'system'
      }

      // Load all adjustments
      const stored = localStorage.getItem('sanad_salary_adjustments')
      const allAdjustments: SalaryAdjustment[] = stored ? JSON.parse(stored) : []
      
      // Add new adjustment
      allAdjustments.push(newAdjustment)
      localStorage.setItem('sanad_salary_adjustments', JSON.stringify(allAdjustments))

      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: language === 'ar' 
          ? `تم إضافة ${adjustmentType === 'bonus' ? 'البونص' : 'الخصم'} بنجاح`
          : `${adjustmentType === 'bonus' ? 'Bonus' : 'Deduction'} added successfully`,
      })

      // Reset form
      setAmount('')
      setReason('')
      setShowAddDialog(false)
      loadAdjustments()
    } catch (error) {
      console.error('Error adding adjustment:', error)
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إضافة التعديل' : 'Failed to add adjustment',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAdjustment = (id: string) => {
    try {
      const stored = localStorage.getItem('sanad_salary_adjustments')
      if (stored) {
        const allAdjustments: SalaryAdjustment[] = JSON.parse(stored)
        const filtered = allAdjustments.filter(adj => adj.id !== id)
        localStorage.setItem('sanad_salary_adjustments', JSON.stringify(filtered))
        
        toast({
          title: language === 'ar' ? 'نجاح' : 'Success',
          description: language === 'ar' ? 'تم حذف التعديل' : 'Adjustment deleted',
        })
        
        loadAdjustments()
      }
    } catch (error) {
      console.error('Error deleting adjustment:', error)
    }
  }

  // Calculate total adjustments
  const totalBonus = adjustments
    .filter(adj => adj.type === 'bonus')
    .reduce((sum, adj) => sum + adj.amount, 0)
  
  const totalDeduction = adjustments
    .filter(adj => adj.type === 'deduction')
    .reduce((sum, adj) => sum + adj.amount, 0)
  
  const finalSalary = baseSalary + totalBonus - totalDeduction

  return (
    <div className="space-y-4">
      {/* Salary Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {language === 'ar' ? 'ملخص الراتب' : 'Salary Summary'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? `الشهر: ${new Date(activeMonth + '-01').toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}`
              : `Month: ${new Date(activeMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Base Salary */}
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">
                {language === 'ar' ? 'الراتب الأساسي' : 'Base Salary'}
              </span>
              <span className="font-semibold">
                {formatCurrency(baseSalary, language)}
              </span>
            </div>

            {/* Bonus */}
            {totalBonus > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {language === 'ar' ? 'البونص' : 'Bonus'}
                </span>
                <span className="font-semibold">
                  + {formatCurrency(totalBonus, language)}
                </span>
              </div>
            )}

            {/* Deduction */}
            {totalDeduction > 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  {language === 'ar' ? 'الخصم' : 'Deduction'}
                </span>
                <span className="font-semibold">
                  - {formatCurrency(totalDeduction, language)}
                </span>
              </div>
            )}

            {/* Final Salary */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-bold text-lg">
                {language === 'ar' ? 'الراتب النهائي' : 'Final Salary'}
              </span>
              <span className="font-bold text-2xl text-primary">
                {formatCurrency(finalSalary, language)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments List */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {language === 'ar' ? 'التعديلات الشهرية' : 'Monthly Adjustments'}
              </CardTitle>
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="h-4 w-4 ml-2" />
                {language === 'ar' ? 'إضافة تعديل' : 'Add Adjustment'}
              </Button>
            </div>
            <CardDescription>
              {language === 'ar' 
                ? 'التعديلات تطبق لهذا الشهر فقط وتعود للراتب الأساسي الشهر القادم'
                : 'Adjustments apply to this month only and reset to base salary next month'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adjustments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {language === 'ar' ? 'لا توجد تعديلات لهذا الشهر' : 'No adjustments for this month'}
              </p>
            ) : (
              <div className="space-y-3">
                {adjustments.map(adj => (
                  <div 
                    key={adj.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {adj.type === 'bonus' ? (
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {adj.type === 'bonus' 
                            ? (language === 'ar' ? 'بونص' : 'Bonus')
                            : (language === 'ar' ? 'خصم' : 'Deduction')
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">{adj.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${adj.type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.type === 'bonus' ? '+' : '-'} {formatCurrency(adj.amount, language)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAdjustment(adj.id)}
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Adjustment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'إضافة تعديل على الراتب' : 'Add Salary Adjustment'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
              <Select value={adjustmentType} onValueChange={(val: 'bonus' | 'deduction') => setAdjustmentType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">
                    {language === 'ar' ? '✅ بونص (إضافة)' : '✅ Bonus (Add)'}
                  </SelectItem>
                  <SelectItem value="deduction">
                    {language === 'ar' ? '❌ خصم (طرح)' : '❌ Deduction (Subtract)'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ (ر.س)' : 'Amount (SAR)'}</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل المبلغ' : 'Enter amount'}
                min="0"
                step="50"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={language === 'ar' ? 'اذكر سبب التعديل...' : 'Enter reason for adjustment...'}
                rows={3}
              />
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {language === 'ar' 
                  ? 'سيتم تطبيق هذا التعديل لهذا الشهر فقط ويعود الراتب للمبلغ الأساسي الشهر القادم'
                  : 'This adjustment will apply to this month only and salary will reset to base amount next month'
                }
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddAdjustment}>
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
