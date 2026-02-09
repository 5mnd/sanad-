'use client'

import { useEffect } from "react"
import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Clock, LogIn, LogOut, Search, Send, CheckCircle, AlertTriangle,
  FileText, Calendar, Building2, UserCheck, UserX, Timer, Loader2,
  MessageCircle, Bot, Info, Eye, EyeOff, Wallet, ClipboardList, RefreshCw,
  Coffee, DoorOpen, TrendingUp, TrendingDown, DollarSign, Bell, XCircle, Check
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useEmployeeData } from '@/hooks/use-employee-data'
import { formatCurrency } from '@/lib/number-format'
import { SalaryManagement } from '@/components/salary-management'
import { HRMeetingRequests } from '@/components/hr-meeting-requests'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface HREmployee {
  id: string
  name: string
  nameEn: string
  designation: string
  designationEn: string
  department: string
  departmentEn: string
  image?: string
  status: 'active' | 'on_leave' | 'terminated'
}

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  action: 'check_in' | 'check_out'
  timestamp: string
  date: string
  synced: boolean
  notified: boolean
}

interface SalarySlip {
  id: string
  employeeId: string
  employeeName: string
  month: string
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  status: 'paid' | 'pending' | 'draft'
}

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  leaveType: 'vacation' | 'sick'
  fromDate: string
  toDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
}

interface SalaryAdjustmentRequest {
  id: string
  employeeId: string
  employeeName: string
  type: 'increase' | 'deduction'
  amount: number
  reason: string
  requestedBy: string
  requestedByName: string
  requestedByRole: string
  status: 'pending' | 'approved' | 'rejected'
  hrComment?: string
  requestDate: string
  processedDate?: string
}

interface TelegramConfig {
  botToken: string
  chatId: string
  enabled: boolean
}

interface HRDashboardProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  branchName: string
  erpConfig: {
    url: string
    apiKey: string
    apiSecret: string
    connected: boolean
  }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function HRDashboard({ language, t, branchName, erpConfig }: HRDashboardProps) {
  const { toast } = useToast()

  const {
    employees: realEmployees,
    attendance: realAttendance,
    leaveRequests: realLeaveRequests,
    salarySlips: realSalarySlips,
    updateLeaveStatus,
    refresh,
    isLoading,
  } = useEmployeeData({
    userRole: 'hr_manager',
    autoFetch: true,
  })

  // Transform employees
  const hrEmployees: HREmployee[] = realEmployees.map(emp => ({
    id: emp.id,
    name: emp.name,
    nameEn: emp.nameEn,
    designation: emp.designation,
    designationEn: emp.designationEn,
    department: emp.department,
    departmentEn: emp.departmentEn,
    image: emp.image,
    status: emp.status,
  }))

  const [employeeSearch, setEmployeeSearch] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const today = new Date().toISOString().split('T')[0]

  // Attendance data
  const attendanceLog: AttendanceRecord[] = realAttendance.map(record => {
    const employee = realEmployees.find(e => e.id === record.employeeId)
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: employee ? employee.name : record.employeeId,
      action: record.action as 'check_in' | 'check_out',
      timestamp: new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: record.date,
      synced: record.synced,
      notified: true,
    }
  })

  // Track employee status from attendance
  const employeeStatusMap = new Map<string, { status: string; lastAction: string }>()
  realAttendance
    .filter(record => record.date === today)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .forEach(record => {
      const statusFromAction = (record as any).status || 
        (record.action === 'check_in' ? 'present' : 
         record.action === 'check_out' ? 'checked_out' : 
         record.action === 'break_start' ? 'on_break' : 
         record.action === 'permission_start' ? 'on_permission' : 'present')
      employeeStatusMap.set(record.employeeId, { 
        status: statusFromAction, 
        lastAction: record.action 
      })
    })

  // Count statuses
  const presentCount = Array.from(employeeStatusMap.values()).filter(s => s.status === 'present').length
  const onBreakCount = Array.from(employeeStatusMap.values()).filter(s => s.status === 'on_break').length
  const onPermissionCount = Array.from(employeeStatusMap.values()).filter(s => s.status === 'on_permission').length
  const checkedOutCount = Array.from(employeeStatusMap.values()).filter(s => s.status === 'checked_out').length
  const absentCount = hrEmployees.length - employeeStatusMap.size

  // Leave requests
  const leaveRequestsData: LeaveRequest[] = realLeaveRequests.map(req => {
    const employee = realEmployees.find(e => e.id === req.employeeId)
    return {
      id: req.id,
      employeeId: req.employeeId,
      employeeName: employee ? employee.name : req.employeeId,
      leaveType: req.leaveType as 'vacation' | 'sick',
      fromDate: req.fromDate,
      toDate: req.toDate,
      reason: req.reason,
      status: req.status,
    }
  })

  const pendingLeaves = leaveRequestsData.filter(r => r.status === 'pending')

  // Salary data
  const salarySlips: SalarySlip[] = realSalarySlips.map(slip => {
    const employee = realEmployees.find(e => e.id === slip.employeeId)
    const totalAllowances = slip.allowances.reduce((sum, item) => sum + item.amount, 0)
    const totalDeductions = slip.deductions.reduce((sum, item) => sum + item.amount, 0)
    return {
      id: slip.id,
      employeeId: slip.employeeId,
      employeeName: employee ? employee.name : slip.employeeId,
      month: slip.month,
      basicSalary: slip.basicSalary,
      allowances: totalAllowances,
      deductions: totalDeductions,
      netSalary: slip.netSalary,
      status: slip.status as 'paid' | 'pending' | 'draft',
    }
  })

  // Salary adjustment requests from managers
  const [salaryAdjustments, setSalaryAdjustments] = useState<SalaryAdjustmentRequest[]>([])
  const [loadingAdjustments, setLoadingAdjustments] = useState(false)

  const fetchSalaryAdjustments = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?action=get_salary_adjustments&userRole=hr_manager')
      const result = await res.json()
      if (result.success) {
        setSalaryAdjustments(result.data)
      }
    } catch (err) {
      console.error('[v0] Error fetching salary adjustments:', err)
    }
  }, [])

  useEffect(() => {
    fetchSalaryAdjustments()
    const interval = setInterval(fetchSalaryAdjustments, 10000)
    return () => clearInterval(interval)
  }, [fetchSalaryAdjustments])

  const pendingAdjustments = salaryAdjustments.filter(a => a.status === 'pending')

  // Meeting requests count
  const [pendingMeetings, setPendingMeetings] = useState(0)
  
  useEffect(() => {
    const loadMeetingCount = () => {
      try {
        const stored = localStorage.getItem('sanad_meeting_requests')
        if (stored) {
          const requests = JSON.parse(stored)
          const pending = requests.filter((r: any) => r.status === 'pending').length
          setPendingMeetings(pending)
        }
      } catch (error) {
        console.error('Error loading meeting requests count:', error)
      }
    }
    
    loadMeetingCount()
    const interval = setInterval(loadMeetingCount, 5000)
    return () => clearInterval(interval)
  }, [])

  // Leave approval/rejection
  const [processingLeave, setProcessingLeave] = useState<string | null>(null)
  const [leaveComment, setLeaveComment] = useState('')
  const [showLeaveResponseDialog, setShowLeaveResponseDialog] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [leaveAction, setLeaveAction] = useState<'approved' | 'rejected'>('approved')

  // Salary adjustment processing
  const [processingAdj, setProcessingAdj] = useState<string | null>(null)
  const [adjComment, setAdjComment] = useState('')
  const [showAdjResponseDialog, setShowAdjResponseDialog] = useState(false)
  const [selectedAdj, setSelectedAdj] = useState<SalaryAdjustmentRequest | null>(null)
  const [adjAction, setAdjAction] = useState<'approved' | 'rejected'>('approved')

  // Leave form
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', leaveType: 'vacation' as 'vacation' | 'sick', fromDate: '', toDate: '', reason: '' })

  // Telegram
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', chatId: '', enabled: false })
  const [showBotToken, setShowBotToken] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [showTelegramGuide, setShowTelegramGuide] = useState(false)

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => { refresh() }, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  const filteredEmployees = hrEmployees.filter(emp => {
    const term = employeeSearch.toLowerCase()
    return emp.name.includes(employeeSearch) ||
      emp.nameEn.toLowerCase().includes(term) ||
      emp.id.toLowerCase().includes(term)
  })

  // Handle leave response
  const handleLeaveResponse = async () => {
    if (!selectedLeave) return
    setProcessingLeave(selectedLeave.id)
    
    try {
      await updateLeaveStatus(selectedLeave.id, leaveAction, leaveComment)
      toast({
        title: leaveAction === 'approved' 
          ? (language === 'ar' ? 'تمت الموافقة' : 'Approved')
          : (language === 'ar' ? 'تم الرفض' : 'Rejected'),
        description: `${selectedLeave.employeeName}`,
      })
      setShowLeaveResponseDialog(false)
      setLeaveComment('')
      refresh()
    } catch {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' })
    }
    
    setProcessingLeave(null)
  }

  // Handle salary adjustment response
  const handleAdjResponse = async () => {
    if (!selectedAdj) return
    setProcessingAdj(selectedAdj.id)
    
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_salary_adjustment',
          data: { id: selectedAdj.id, status: adjAction, hrComment: adjComment },
          userRole: 'hr_manager',
        }),
      })
      const result = await res.json()
      
      if (result.success) {
        toast({
          title: adjAction === 'approved'
            ? (language === 'ar' ? 'تمت الموافقة على التعديل' : 'Adjustment Approved')
            : (language === 'ar' ? 'تم رفض التعديل' : 'Adjustment Rejected'),
          description: `${selectedAdj.employeeName} - ${formatCurrency(selectedAdj.amount)}`,
        })
        setShowAdjResponseDialog(false)
        setAdjComment('')
        fetchSalaryAdjustments()
      }
    } catch {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' })
    }
    
    setProcessingAdj(null)
  }

  // Submit leave
  const handleSubmitLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.fromDate || !leaveForm.toDate) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      })
      return
    }
    
    try {
      await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_leave_request',
          data: {
            employeeId: leaveForm.employeeId,
            leaveType: leaveForm.leaveType,
            fromDate: leaveForm.fromDate,
            toDate: leaveForm.toDate,
            reason: leaveForm.reason,
            days: 1,
          },
          userRole: 'hr_manager',
        }),
      })
      
      setShowLeaveDialog(false)
      setLeaveForm({ employeeId: '', leaveType: 'vacation', fromDate: '', toDate: '', reason: '' })
      refresh()
      toast({
        title: language === 'ar' ? 'تم تقديم الطلب' : 'Request Submitted',
        description: language === 'ar' ? 'تم تقديم طلب الإجازة بنجاح' : 'Leave request submitted successfully',
      })
    } catch {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', variant: 'destructive' })
    }
  }

  // Telegram test
  const handleTestTelegram = useCallback(async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال رمز البوت ومعرف المجموعة' : 'Please enter bot token and chat ID',
        variant: 'destructive',
      })
      return
    }
    setTestingTelegram(true)
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection', botToken: telegramConfig.botToken, chatId: telegramConfig.chatId }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: t('telegram.testSuccess') })
      } else {
        toast({ title: t('telegram.testFailed'), description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: t('telegram.testFailed'), variant: 'destructive' })
    }
    setTestingTelegram(false)
  }, [telegramConfig, language, t, toast])

  const totalEmployees = hrEmployees.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {language === 'ar' ? 'لوحة تحكم الموارد البشرية' : 'HR Dashboard'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? `${hrEmployees.length} موظف - ${branchName}` : `${hrEmployees.length} employees - ${branchName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(pendingLeaves.length > 0 || pendingAdjustments.length > 0) && (
            <Badge className="bg-destructive/20 text-destructive animate-pulse">
              <Bell className="h-3 w-3 me-1" />
              {pendingLeaves.length + pendingAdjustments.length} {language === 'ar' ? 'طلبات معلقة' : 'pending'}
            </Badge>
          )}
          <Button onClick={() => { refresh(); fetchSalaryAdjustments() }} variant="outline" size="sm" className="gap-2 bg-transparent" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-secondary/50 h-11">
          <TabsTrigger value="overview" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الطلبات' : 'Requests'}</span>
            {(pendingLeaves.length + pendingAdjustments.length) > 0 && (
              <span className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {pendingLeaves.length + pendingAdjustments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الرواتب' : 'Payroll'}</span>
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الموظفين' : 'Directory'}</span>
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'المقابلات' : 'Meetings'}</span>
            {pendingMeetings > 0 && (
              <span className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {pendingMeetings}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Status Cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">{language === 'ar' ? 'إجمالي الموظفين' : 'Total'}</p>
                    <p className="text-2xl font-bold text-foreground">{totalEmployees}</p>
                  </div>
                  <Users className="h-7 w-7 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">{language === 'ar' ? 'حاضرين' : 'Present'}</p>
                    <p className="text-2xl font-bold text-primary">{presentCount}</p>
                  </div>
                  <UserCheck className="h-7 w-7 text-primary/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">{language === 'ar' ? 'استراحة' : 'Break'}</p>
                    <p className="text-2xl font-bold text-chart-4">{onBreakCount}</p>
                  </div>
                  <Coffee className="h-7 w-7 text-chart-4/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">{language === 'ar' ? 'مستأذنين' : 'Permission'}</p>
                    <p className="text-2xl font-bold text-chart-3">{onPermissionCount}</p>
                  </div>
                  <DoorOpen className="h-7 w-7 text-chart-3/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">{language === 'ar' ? 'غائبين' : 'Absent'}</p>
                    <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                  </div>
                  <UserX className="h-7 w-7 text-destructive/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Employee Status for Today */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {language === 'ar' ? 'حالة الموظفين اليوم' : "Employee Status Today"}
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {checkedOutCount > 0 && ` | ${language === 'ar' ? `${checkedOutCount} انصرفوا` : `${checkedOutCount} left`}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hrEmployees.map(employee => {
                  const empStatus = employeeStatusMap.get(employee.id)
                  const employeeRecords = realAttendance.filter(r => r.employeeId === employee.id && r.date === today)
                  const checkIn = employeeRecords.find(r => r.action === 'check_in')
                  const checkOut = employeeRecords.find(r => r.action === 'check_out')
                  const currentStatus = empStatus?.status || 'absent'
                  
                  let workDuration = ''
                  if (checkIn) {
                    const checkInTime = new Date(checkIn.timestamp)
                    const endTime = checkOut ? new Date(checkOut.timestamp) : new Date()
                    const diffMs = endTime.getTime() - checkInTime.getTime()
                    const hours = Math.floor(diffMs / (1000 * 60 * 60))
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                    workDuration = `${hours}${language === 'ar' ? 'س' : 'h'} ${minutes}${language === 'ar' ? 'د' : 'm'}`
                  }
                  
                  const statusConfig: Record<string, { label: string; labelEn: string; className: string }> = {
                    present: { label: 'حاضر', labelEn: 'Present', className: 'bg-primary/20 text-primary' },
                    on_break: { label: 'استراحة', labelEn: 'Break', className: 'bg-chart-4/20 text-chart-4' },
                    on_permission: { label: 'مستأذن', labelEn: 'Permission', className: 'bg-chart-3/20 text-chart-3' },
                    checked_out: { label: 'انصرف', labelEn: 'Left', className: 'bg-chart-5/20 text-chart-5' },
                    absent: { label: 'غائب', labelEn: 'Absent', className: 'bg-muted text-muted-foreground' },
                  }
                  
                  const config = statusConfig[currentStatus] || statusConfig.absent
                  
                  return (
                    <div key={employee.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/20 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-9 w-9 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {(language === 'ar' ? employee.name : employee.nameEn).split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {language === 'ar' ? employee.name : employee.nameEn}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {language === 'ar' ? employee.designation : employee.designationEn}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[60px] hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'دخول' : 'In'}</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </p>
                        </div>
                        <div className="text-center min-w-[60px] hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'خروج' : 'Out'}</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </p>
                        </div>
                        <div className="text-center min-w-[50px] hidden md:block">
                          <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'المدة' : 'Dur'}</p>
                          <p className="text-xs font-semibold text-primary">{workDuration || '--'}</p>
                        </div>
                        <Badge className={config.className}>
                          {language === 'ar' ? config.label : config.labelEn}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                {hrEmployees.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{language === 'ar' ? 'لا يوجد موظفين مسجلين' : 'No employees registered'}</p>
                    <p className="text-xs mt-1">{language === 'ar' ? 'سيظهر الموظفون هنا بعد تسجيل دخولهم' : 'Employees will appear after they log in'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Requests Tab (Leaves + Salary Adjustments) ─────────────────────── */}
        <TabsContent value="requests" className="space-y-6 mt-6">
          {/* Pending Leave Requests */}
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {language === 'ar' ? 'طلبات الإجازة والاستئذان' : 'Leave & Permission Requests'}
                  </CardTitle>
                  <CardDescription>
                    {pendingLeaves.length > 0
                      ? (language === 'ar' ? `${pendingLeaves.length} طلبات بانتظار الموافقة` : `${pendingLeaves.length} pending requests`)
                      : (language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests')
                    }
                  </CardDescription>
                </div>
                <Button onClick={() => setShowLeaveDialog(true)} size="sm" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {language === 'ar' ? 'طلب جديد' : 'New Request'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                    <TableHead className="text-foreground">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="text-foreground">{language === 'ar' ? 'من' : 'From'}</TableHead>
                    <TableHead className="text-foreground">{language === 'ar' ? 'إلى' : 'To'}</TableHead>
                    <TableHead className="text-foreground">{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                    <TableHead className="text-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-foreground">{language === 'ar' ? 'إجراء' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequestsData.map(req => (
                    <TableRow key={req.id} className="border-border">
                      <TableCell className="text-foreground font-medium text-sm">{req.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {req.leaveType === 'vacation' ? (language === 'ar' ? 'إجازة' : 'Vacation') : (language === 'ar' ? 'مرضية' : 'Sick')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{req.fromDate}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{req.toDate}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{req.reason}</TableCell>
                      <TableCell>
                        <Badge className={
                          req.status === 'approved' ? 'bg-primary/20 text-primary' :
                          req.status === 'pending' ? 'bg-chart-4/20 text-chart-4' :
                          'bg-destructive/20 text-destructive'
                        }>
                          {req.status === 'approved' ? (language === 'ar' ? 'موافق' : 'Approved') :
                           req.status === 'pending' ? (language === 'ar' ? 'معلق' : 'Pending') :
                           (language === 'ar' ? 'مرفوض' : 'Rejected')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 bg-transparent text-primary hover:bg-primary/10"
                              onClick={() => { setSelectedLeave(req); setLeaveAction('approved'); setShowLeaveResponseDialog(true) }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 bg-transparent text-destructive hover:bg-destructive/10"
                              onClick={() => { setSelectedLeave(req); setLeaveAction('rejected'); setShowLeaveResponseDialog(true) }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaveRequestsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {language === 'ar' ? 'لا توجد طلبات إجازة' : 'No leave requests'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Salary Adjustment Requests from Managers */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {language === 'ar' ? 'طلبات تعديل الرواتب' : 'Salary Adjustment Requests'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'طلبات الزيادة والخصم المقدمة من المدير العام ومدير الفرع والمخازن'
                  : 'Increase/deduction requests from managers'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salaryAdjustments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                      <TableHead className="text-foreground">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="text-foreground">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead className="text-foreground">{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                      <TableHead className="text-foreground">{language === 'ar' ? 'مقدم من' : 'By'}</TableHead>
                      <TableHead className="text-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead className="text-foreground">{language === 'ar' ? 'إجراء' : 'Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryAdjustments.map(adj => (
                      <TableRow key={adj.id} className="border-border">
                        <TableCell className="text-foreground font-medium text-sm">{adj.employeeName}</TableCell>
                        <TableCell>
                          <Badge className={adj.type === 'increase' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}>
                            {adj.type === 'increase'
                              ? (language === 'ar' ? 'زيادة' : 'Increase')
                              : (language === 'ar' ? 'خصم' : 'Deduction')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-sm">
                          {adj.type === 'increase' ? '+' : '-'}{formatCurrency(adj.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{adj.reason}</TableCell>
                        <TableCell className="text-sm">
                          <span className="text-muted-foreground text-xs">{adj.requestedByName}</span>
                          <br />
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            {adj.requestedByRole === 'general_manager' ? (language === 'ar' ? 'مدير عام' : 'GM') :
                             adj.requestedByRole === 'branch_manager' ? (language === 'ar' ? 'مدير فرع' : 'BM') :
                             adj.requestedByRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            adj.status === 'approved' ? 'bg-primary/20 text-primary' :
                            adj.status === 'pending' ? 'bg-chart-4/20 text-chart-4' :
                            'bg-destructive/20 text-destructive'
                          }>
                            {adj.status === 'approved' ? (language === 'ar' ? 'موافق' : 'Approved') :
                             adj.status === 'pending' ? (language === 'ar' ? 'معلق' : 'Pending') :
                             (language === 'ar' ? 'مرفوض' : 'Rejected')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {adj.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs bg-transparent text-primary hover:bg-primary/10"
                                onClick={() => { setSelectedAdj(adj); setAdjAction('approved'); setShowAdjResponseDialog(true) }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs bg-transparent text-destructive hover:bg-destructive/10"
                                onClick={() => { setSelectedAdj(adj); setAdjAction('rejected'); setShowAdjResponseDialog(true) }}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{language === 'ar' ? 'لا توجد طلبات تعديل رواتب' : 'No salary adjustment requests'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payroll Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="payroll" className="space-y-6 mt-6">
          <SalaryManagement 
            employees={hrEmployees}
            language={language}
            t={t}
          />
        </TabsContent>

        {/* ── Employee Directory Tab ──────────────────────────────────────────── */}
        <TabsContent value="directory" className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث عن موظف...' : 'Search employees...'}
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                className="bg-background border-border ps-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map(emp => {
              const empStatus = employeeStatusMap.get(emp.id)
              const currentStatus = empStatus?.status || 'absent'
              
              return (
                <Card key={emp.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {(language === 'ar' ? emp.name : emp.nameEn).split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground truncate">{language === 'ar' ? emp.name : emp.nameEn}</p>
                          <Badge className={
                            currentStatus === 'present' ? 'bg-primary/20 text-primary' :
                            currentStatus === 'on_break' ? 'bg-chart-4/20 text-chart-4' :
                            currentStatus === 'on_permission' ? 'bg-chart-3/20 text-chart-3' :
                            currentStatus === 'checked_out' ? 'bg-chart-5/20 text-chart-5' :
                            emp.status === 'on_leave' ? 'bg-chart-4/20 text-chart-4' :
                            'bg-muted text-muted-foreground'
                          }>
                            {currentStatus === 'present' ? (language === 'ar' ? 'حاضر' : 'Present') :
                             currentStatus === 'on_break' ? (language === 'ar' ? 'استراحة' : 'Break') :
                             currentStatus === 'on_permission' ? (language === 'ar' ? 'مستأذن' : 'Permission') :
                             currentStatus === 'checked_out' ? (language === 'ar' ? 'انصرف' : 'Left') :
                             emp.status === 'on_leave' ? (language === 'ar' ? 'إجازة' : 'Leave') :
                             (language === 'ar' ? 'غائب' : 'Absent')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{emp.id}</p>
                        <div className="flex flex-col gap-1 mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            {language === 'ar' ? emp.department : emp.departmentEn}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            {language === 'ar' ? emp.designation : emp.designationEn}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {filteredEmployees.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>{language === 'ar' ? 'لا يوجد موظفين' : 'No employees found'}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Meetings Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="meetings" className="space-y-6 mt-6">
          <HRMeetingRequests language={language} />
        </TabsContent>

        {/* ── Settings Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="border-primary/30 bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-foreground">{t('telegram.title')}</CardTitle>
                  <CardDescription>{t('telegram.subtitle')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={telegramConfig.enabled} onCheckedChange={enabled => setTelegramConfig({ ...telegramConfig, enabled })} />
                  <Badge className={telegramConfig.enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}>
                    {telegramConfig.enabled ? t('telegram.enabled') : t('telegram.disabled')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-foreground">{t('telegram.botToken')} *</Label>
                <div className="relative">
                  <Input
                    type={showBotToken ? 'text' : 'password'}
                    value={telegramConfig.botToken}
                    onChange={e => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="bg-background border-border font-mono text-xs pe-10"
                  />
                  <button type="button" onClick={() => setShowBotToken(!showBotToken)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-foreground">{t('telegram.chatId')} *</Label>
                <Input
                  value={telegramConfig.chatId}
                  onChange={e => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                  placeholder="-1001234567890"
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTestTelegram} disabled={testingTelegram} className="gap-2">
                  {testingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('telegram.testConnection')}
                </Button>
                <Button variant="outline" onClick={() => setShowTelegramGuide(true)} className="gap-2 bg-transparent">
                  <Info className="h-4 w-4" />
                  {t('telegram.guide')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-foreground text-base">{language === 'ar' ? 'حالة ERPNext' : 'ERPNext Status'}</CardTitle>
                  <CardDescription>
                    {erpConfig.connected
                      ? (language === 'ar' ? 'متصل - المزامنة التلقائية مفعلة' : 'Connected - Auto sync enabled')
                      : (language === 'ar' ? 'غير متصل' : 'Not connected')
                    }
                  </CardDescription>
                </div>
                <Badge className={erpConfig.connected ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}>
                  {erpConfig.connected ? (language === 'ar' ? 'متصل' : 'Connected') : (language === 'ar' ? 'غير متصل' : 'Disconnected')}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Telegram Guide Dialog */}
          <Dialog open={showTelegramGuide} onOpenChange={setShowTelegramGuide}>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  {t('telegram.guide')}
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' ? 'دليل إعداد بوت تيليجرام' : 'Telegram bot setup guide'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {[t('telegram.guideStep1'), t('telegram.guideStep2'), t('telegram.guideStep3'), t('telegram.guideStep4'), t('telegram.guideStep5'), t('telegram.guideStep6')].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">{i + 1}</div>
                    <p className="text-sm text-foreground leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))}
              </div>
              <Button onClick={() => setShowTelegramGuide(false)} className="w-full">{t('settings.close')}</Button>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Leave Response Dialog */}
      <Dialog open={showLeaveResponseDialog} onOpenChange={setShowLeaveResponseDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {leaveAction === 'approved'
                ? (language === 'ar' ? 'موافقة على الطلب' : 'Approve Request')
                : (language === 'ar' ? 'رفض الطلب' : 'Reject Request')}
            </DialogTitle>
            <DialogDescription>
              {selectedLeave?.employeeName} - {selectedLeave?.leaveType === 'vacation' ? (language === 'ar' ? 'إجازة' : 'Vacation') : (language === 'ar' ? 'مرضية' : 'Sick')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'الفترة' : 'Period'}</p>
              <p className="text-sm font-mono">{selectedLeave?.fromDate} - {selectedLeave?.toDate}</p>
              <p className="text-xs text-muted-foreground mt-2 mb-1">{language === 'ar' ? 'السبب' : 'Reason'}</p>
              <p className="text-sm">{selectedLeave?.reason}</p>
            </div>
            <div>
              <Label>{language === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)'}</Label>
              <Textarea
                value={leaveComment}
                onChange={e => setLeaveComment(e.target.value)}
                placeholder={language === 'ar' ? 'أضف تعليقك...' : 'Add your comment...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveResponseDialog(false)} className="bg-transparent">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleLeaveResponse}
              disabled={processingLeave !== null}
              className={leaveAction === 'rejected' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
            >
              {processingLeave && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {leaveAction === 'approved'
                ? (language === 'ar' ? 'موافقة' : 'Approve')
                : (language === 'ar' ? 'رفض' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Adjustment Response Dialog */}
      <Dialog open={showAdjResponseDialog} onOpenChange={setShowAdjResponseDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {adjAction === 'approved'
                ? (language === 'ar' ? 'موافقة على التعديل' : 'Approve Adjustment')
                : (language === 'ar' ? 'رفض التعديل' : 'Reject Adjustment')}
            </DialogTitle>
            <DialogDescription>{selectedAdj?.employeeName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex justify-between items-center mb-2">
                <Badge className={selectedAdj?.type === 'increase' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}>
                  {selectedAdj?.type === 'increase' ? (language === 'ar' ? 'زيادة' : 'Increase') : (language === 'ar' ? 'خصم' : 'Deduction')}
                </Badge>
                <span className="font-bold font-mono">{selectedAdj ? formatCurrency(selectedAdj.amount) : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'السبب' : 'Reason'}</p>
              <p className="text-sm">{selectedAdj?.reason}</p>
              <p className="text-xs text-muted-foreground mt-2">{language === 'ar' ? 'مقدم من' : 'By'}: {selectedAdj?.requestedByName}</p>
            </div>
            <div>
              <Label>{language === 'ar' ? 'تعليق الموارد البشرية' : 'HR Comment'}</Label>
              <Textarea
                value={adjComment}
                onChange={e => setAdjComment(e.target.value)}
                placeholder={language === 'ar' ? 'أضف تعليقك...' : 'Add your comment...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjResponseDialog(false)} className="bg-transparent">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleAdjResponse}
              disabled={processingAdj !== null}
              className={adjAction === 'rejected' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
            >
              {processingAdj && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {adjAction === 'approved'
                ? (language === 'ar' ? 'موافقة' : 'Approve')
                : (language === 'ar' ? 'رفض' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Submit Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{language === 'ar' ? 'طلب إجازة جديد' : 'New Leave Request'}</DialogTitle>
            <DialogDescription>{language === 'ar' ? 'تقديم طلب إجازة للموظف' : 'Submit leave request for employee'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground">{language === 'ar' ? 'الموظف' : 'Employee'} *</Label>
              <Select value={leaveForm.employeeId} onValueChange={v => setLeaveForm({ ...leaveForm, employeeId: v })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الموظف' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent>
                  {hrEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{language === 'ar' ? emp.name : emp.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">{language === 'ar' ? 'نوع الإجازة' : 'Leave Type'} *</Label>
              <Select value={leaveForm.leaveType} onValueChange={v => setLeaveForm({ ...leaveForm, leaveType: v as 'vacation' | 'sick' })}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">{language === 'ar' ? 'إجازة' : 'Vacation'}</SelectItem>
                  <SelectItem value="sick">{language === 'ar' ? 'مرضية' : 'Sick'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <Label className="text-foreground">{language === 'ar' ? 'من' : 'From'} *</Label>
                <Input type="date" value={leaveForm.fromDate} onChange={e => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} className="bg-background border-border" />
              </div>
              <div>
                <Label className="text-foreground">{language === 'ar' ? 'إلى' : 'To'} *</Label>
                <Input type="date" value={leaveForm.toDate} onChange={e => setLeaveForm({ ...leaveForm, toDate: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
            <div>
              <Label className="text-foreground">{language === 'ar' ? 'السبب' : 'Reason'}</Label>
              <Textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder={language === 'ar' ? 'سبب الإجازة...' : 'Reason...'} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)} className="bg-transparent">{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmitLeave}>{language === 'ar' ? 'تقديم' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
