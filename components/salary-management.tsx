'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet, Edit, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/number-format'

interface Employee {
  id: string
  name: string
  nameEn: string
  designation: string
  designationEn: string
  department: string
  departmentEn: string
  status: string
}

interface SalaryRecord {
  id: string
  employeeId: string
  employeeName: string
  designation: string
  basicSalary: number
  allowances: Array<{ type: string; amount: number; reason: string }>
  deductions: Array<{ type: string; amount: number; reason: string }>
  netSalary: number
  effectiveDate: string
  status: 'active' | 'inactive'
  history: Array<{
    date: string
    type: 'increase' | 'decrease' | 'allowance' | 'deduction'
    amount: number
    reason: string
  }>
}

interface SalaryManagementProps {
  employees: Employee[]
  language: 'ar' | 'en'
  t: (key: string) => string
}

export function SalaryManagement({ employees, language, t }: SalaryManagementProps) {
  const { toast } = useToast()
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    basicSalary: '',
  })
  
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'allowance' as 'allowance' | 'deduction',
    adjustmentType: '',
    amount: '',
    reason: '',
  })

  // Fetch salary records from API
  const fetchSalaryRecords = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/employees?action=get_salary_records&userRole=hr_manager')
      const result = await res.json()
      if (result.success) {
        setSalaryRecords(result.data)
      }
    } catch (e) {
      console.error('[v0] Failed to fetch salary records:', e)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchSalaryRecords()
  }, [fetchSalaryRecords])

  // Save salary record via API
  const saveSalaryRecord = async (record: SalaryRecord) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_salary_record',
          data: record,
          userRole: 'hr_manager',
        }),
      })
      const result = await res.json()
      if (result.success) {
        await fetchSalaryRecords()
        return result.data
      }
    } catch (e) {
      console.error('[v0] Failed to save salary record:', e)
    }
    return null
  }

  // Calculate net salary
  const calculateNetSalary = (basic: number, allowances: SalaryRecord['allowances'], deductions: SalaryRecord['deductions']) => {
    const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0)
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
    return basic + totalAllowances - totalDeductions
  }

  // Open edit dialog for new or existing record
  const handleEdit = (employee: Employee) => {
    const existingRecord = salaryRecords.find(r => r.employeeId === employee.id)
    
    if (existingRecord) {
      setSelectedRecord(existingRecord)
      setSalaryForm({
        employeeId: employee.id,
        basicSalary: existingRecord.basicSalary.toString(),
      })
    } else {
      setSelectedRecord(null)
      setSalaryForm({
        employeeId: employee.id,
        basicSalary: '',
      })
    }
    setShowEditDialog(true)
  }

  // Save salary record
  const handleSaveSalary = async () => {
    if (!salaryForm.basicSalary || Number.parseFloat(salaryForm.basicSalary) <= 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال راتب أساسي صحيح' : 'Please enter a valid basic salary',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    
    const employee = employees.find(e => e.id === salaryForm.employeeId)
    if (!employee) { setLoading(false); return }

    const basicSalary = Number.parseFloat(salaryForm.basicSalary)
    
    if (selectedRecord) {
      // Update existing record
      const history = [...selectedRecord.history]
      if (basicSalary !== selectedRecord.basicSalary) {
        history.push({
          date: new Date().toISOString(),
          type: basicSalary > selectedRecord.basicSalary ? 'increase' : 'decrease',
          amount: Math.abs(basicSalary - selectedRecord.basicSalary),
          reason: language === 'ar' ? 'تعديل الراتب الأساسي' : 'Basic salary adjustment',
        })
      }
      
      const updatedRecord = {
        ...selectedRecord,
        basicSalary,
        netSalary: calculateNetSalary(basicSalary, selectedRecord.allowances, selectedRecord.deductions),
        history,
      }
      
      await saveSalaryRecord(updatedRecord)
      
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث الراتب بنجاح' : 'Salary updated successfully',
      })
    } else {
      // Create new record
      const newRecord: SalaryRecord = {
        id: `SAL-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        designation: language === 'ar' ? employee.designation : employee.designationEn,
        basicSalary,
        allowances: [],
        deductions: [],
        netSalary: basicSalary,
        effectiveDate: new Date().toISOString(),
        status: 'active',
        history: [{
          date: new Date().toISOString(),
          type: 'increase',
          amount: basicSalary,
          reason: language === 'ar' ? 'إنشاء سجل الراتب' : 'Initial salary record',
        }],
      }
      
      await saveSalaryRecord(newRecord)
      
      toast({
        title: language === 'ar' ? 'تم الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة الراتب بنجاح' : 'Salary added successfully',
      })
    }
    
    setLoading(false)
    setShowEditDialog(false)
  }

  // Open adjustment dialog
  const handleOpenAdjustment = (record: SalaryRecord) => {
    setSelectedRecord(record)
    setAdjustmentForm({
      type: 'allowance',
      adjustmentType: '',
      amount: '',
      reason: '',
    })
    setShowAdjustmentDialog(true)
  }

  // Save adjustment
  const handleSaveAdjustment = async () => {
    if (!selectedRecord || !adjustmentForm.amount || !adjustmentForm.reason) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    
    const amount = Number.parseFloat(adjustmentForm.amount)
    
    const newItem = {
      type: adjustmentForm.adjustmentType,
      amount,
      reason: adjustmentForm.reason,
    }
    
    const allowances = adjustmentForm.type === 'allowance' 
      ? [...selectedRecord.allowances, newItem]
      : selectedRecord.allowances
    
    const deductions = adjustmentForm.type === 'deduction'
      ? [...selectedRecord.deductions, newItem]
      : selectedRecord.deductions
    
    const history = [...selectedRecord.history, {
      date: new Date().toISOString(),
      type: adjustmentForm.type,
      amount,
      reason: adjustmentForm.reason,
    }]
    
    const updatedRecord = {
      ...selectedRecord,
      allowances,
      deductions,
      netSalary: calculateNetSalary(selectedRecord.basicSalary, allowances, deductions),
      history,
    }
    
    await saveSalaryRecord(updatedRecord)
    
    toast({
      title: language === 'ar' ? 'تم الإضافة' : 'Added',
      description: adjustmentForm.type === 'allowance'
        ? (language === 'ar' ? 'تم إضافة البدل' : 'Allowance added')
        : (language === 'ar' ? 'تم إضافة الخصم' : 'Deduction added'),
    })
    
    setLoading(false)
    setShowAdjustmentDialog(false)
  }

  // Delete a specific adjustment via API
  const handleDeleteAdjustment = async (record: SalaryRecord, type: 'allowance' | 'deduction', index: number) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_salary_adjustment_item',
          data: { employeeId: record.employeeId, adjustmentType: type, index },
          userRole: 'hr_manager',
        }),
      })
      const result = await res.json()
      
      if (result.success) {
        await fetchSalaryRecords()
        // Update selectedRecord if it's the one being modified
        if (selectedRecord?.id === record.id) {
          setSelectedRecord(result.data)
        }
        toast({
          title: language === 'ar' ? 'تم الحذف' : 'Deleted',
          description: language === 'ar' ? 'تم حذف العنصر' : 'Item deleted',
        })
      }
    } catch (e) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {language === 'ar' ? 'إدارة الرواتب' : 'Salary Management'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة رواتب الموظفين والزيادات والخصومات' : 'Manage employee salaries, allowances and deductions'}
              </CardDescription>
            </div>
            <Button onClick={fetchSalaryRecords} variant="outline" size="sm" className="gap-2 bg-transparent" disabled={fetching}>
              <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                <TableHead className="text-foreground">{language === 'ar' ? 'المنصب' : 'Position'}</TableHead>
                <TableHead className="text-foreground">{language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</TableHead>
                <TableHead className="text-foreground">{language === 'ar' ? 'البدلات' : 'Allowances'}</TableHead>
                <TableHead className="text-foreground">{language === 'ar' ? 'الخصومات' : 'Deductions'}</TableHead>
                <TableHead className="text-foreground">{language === 'ar' ? 'صافي الراتب' : 'Net Salary'}</TableHead>
                <TableHead className="text-foreground">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.filter(e => e.status !== 'inactive').map(employee => {
                const record = salaryRecords.find(r => r.employeeId === employee.id)
                const totalAllowances = record?.allowances.reduce((sum, a) => sum + a.amount, 0) || 0
                const totalDeductions = record?.deductions.reduce((sum, d) => sum + d.amount, 0) || 0
                
                return (
                  <TableRow key={employee.id} className="border-border">
                    <TableCell className="text-foreground font-medium">
                      {language === 'ar' ? employee.name : employee.nameEn}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {language === 'ar' ? employee.designation : employee.designationEn}
                    </TableCell>
                    <TableCell className="text-foreground font-mono">
                      {record ? formatCurrency(record.basicSalary) : '-'}
                    </TableCell>
                    <TableCell className="text-primary font-mono">
                      {record && totalAllowances > 0 ? `+${formatCurrency(totalAllowances)}` : '-'}
                    </TableCell>
                    <TableCell className="text-destructive font-mono">
                      {record && totalDeductions > 0 ? `-${formatCurrency(totalDeductions)}` : '-'}
                    </TableCell>
                    <TableCell className="text-foreground font-bold font-mono">
                      {record ? formatCurrency(record.netSalary) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(employee)}
                          className="gap-1"
                        >
                          {record ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          {record ? (language === 'ar' ? 'تعديل' : 'Edit') : (language === 'ar' ? 'إضافة' : 'Add')}
                        </Button>
                        {record && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAdjustment(record)}
                            className="gap-1"
                          >
                            <DollarSign className="h-3 w-3" />
                            {language === 'ar' ? 'تعديلات' : 'Adjustments'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Salary Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord 
                ? (language === 'ar' ? 'تعديل الراتب' : 'Edit Salary')
                : (language === 'ar' ? 'إضافة راتب' : 'Add Salary')}
            </DialogTitle>
            <DialogDescription>
              {employees.find(e => e.id === salaryForm.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basic-salary">
                {language === 'ar' ? 'الراتب الأساسي (ر.س)' : 'Basic Salary (SAR)'}
              </Label>
              <Input
                id="basic-salary"
                type="number"
                value={salaryForm.basicSalary}
                onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveSalary} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'إدارة الزيادات والخصومات' : 'Manage Allowances & Deductions'}
            </DialogTitle>
            <DialogDescription>
              {selectedRecord?.employeeName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Add New Adjustment */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-foreground">
                {language === 'ar' ? 'إضافة جديد' : 'Add New'}
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                  <Select
                    value={adjustmentForm.type}
                    onValueChange={(value: 'allowance' | 'deduction') => 
                      setAdjustmentForm({ ...adjustmentForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allowance">
                        {language === 'ar' ? 'بدل (زيادة)' : 'Allowance (Increase)'}
                      </SelectItem>
                      <SelectItem value="deduction">
                        {language === 'ar' ? 'خصم (نقصان)' : 'Deduction (Decrease)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'نوع التعديل' : 'Adjustment Type'}</Label>
                  <Input
                    value={adjustmentForm.adjustmentType}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustmentType: e.target.value })}
                    placeholder={language === 'ar' ? 'مثال: بدل سكن، خصم تأخير' : 'e.g: Housing, Late penalty'}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المبلغ (ر.س)' : 'Amount (SAR)'}</Label>
                <Input
                  type="number"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
                <Textarea
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  placeholder={language === 'ar' ? 'اكتب السبب...' : 'Enter reason...'}
                  rows={2}
                />
              </div>
              
              <Button onClick={handleSaveAdjustment} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>
            
            {/* Current Adjustments */}
            {selectedRecord && (
              <div className="space-y-4">
                {/* Allowances */}
                {selectedRecord.allowances.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {language === 'ar' ? 'البدلات الحالية' : 'Current Allowances'}
                    </h4>
                    <div className="space-y-2">
                      {selectedRecord.allowances.map((allowance, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{allowance.type}</p>
                            <p className="text-xs text-muted-foreground">{allowance.reason}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">+{formatCurrency(allowance.amount)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAdjustment(selectedRecord, 'allowance', index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Deductions */}
                {selectedRecord.deductions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      {language === 'ar' ? 'الخصومات الحالية' : 'Current Deductions'}
                    </h4>
                    <div className="space-y-2">
                      {selectedRecord.deductions.map((deduction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{deduction.type}</p>
                            <p className="text-xs text-muted-foreground">{deduction.reason}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-destructive">-{formatCurrency(deduction.amount)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAdjustment(selectedRecord, 'deduction', index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
