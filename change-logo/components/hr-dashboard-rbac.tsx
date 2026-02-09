'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Users, UserCheck, UserX, Clock, CheckCircle, XCircle, 
  DollarSign, Plus, Minus, Send, Bell, Calendar, LogOut 
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  nameEn: string
  designation: string
  department: string
  role: 'employee' | 'hr_manager' | 'general_manager' | 'branch_manager'
  managerId?: string
  branchId?: string
}

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  action: 'check_in' | 'check_out' | 'break' | 'permission' | 'return'
  timestamp: string
  date: string
  status: 'working' | 'on_break' | 'on_permission' | 'checked_out' | 'absent'
}

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  leaveType: 'vacation' | 'sick' | 'permission'
  fromDate: string
  toDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  managerId?: string
  managerComment?: string
  requestDate: string
}

interface SummonRequest {
  id: string
  fromId: string
  fromName: string
  toId: string
  toName: string
  reason: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt?: string
}

interface SalaryRecord {
  userId: string
  userName: string
  basicSalary: number
  allowances: { type: string; amount: number }[]
  bonus: number
  deduction: number
  notes: string
  lastUpdated: string
}

interface HRDashboardRBACProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  currentUser: Employee
  branchName: string
  erpConfig: {
    url: string
    apiKey: string
    apiSecret: string
    connected: boolean
  }
  allUsers?: Array<{ id: string; name: string; email?: string; username?: string; role?: string; position?: string; branchId?: string }>
  onAutoCheckIn?: (employeeId: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function HRDashboardRBAC({ language, t, currentUser, allUsers }: HRDashboardRBACProps) {
  const { toast } = useToast()
  // All users who reach this component have HR permission - no role restrictions
  const isHRManager = true // Everyone with hr permission has full access

  // States
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [summonRequests, setSummonRequests] = useState<SummonRequest[]>([])
  const [salaries, setSalaries] = useState<SalaryRecord[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [summonReason, setSummonReason] = useState('')
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; request: LeaveRequest | null }>({ open: false, request: null })
  const [comment, setComment] = useState('')

  // Load employees from allUsers prop
  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      const employeesFromUsers = allUsers.map(u => ({
        id: u.id,
        name: u.name || u.username || 'Unknown',
        nameEn: u.name || u.username || 'Unknown',
        designation: u.position || u.role || 'Employee',
        department: 'General',
        role: (u.role === 'مدير عام' || u.role === 'General Manager' || u.role === 'admin') ? 'hr_manager' as const : 
              (u.role === 'مدير فرع' || u.role === 'Branch Manager') ? 'branch_manager' as const : 'employee' as const,
        branchId: u.branchId || 'BR-001',
      }))
      setAllEmployees(employeesFromUsers)
    } else {
      // Fallback to localStorage
      try {
        const usersJson = localStorage.getItem('sanad_users')
        if (usersJson) {
          const users = JSON.parse(usersJson)
          const employeesFromStorage = users.map((u: any) => ({
            id: u.id,
            name: u.name || u.username,
            nameEn: u.name || u.username,
            designation: u.position || u.role || 'Employee',
            department: 'General',
            role: (u.role === 'مدير عام' || u.role === 'admin') ? 'hr_manager' : 'employee',
            branchId: u.branchId || 'BR-001',
          }))
          setAllEmployees(employeesFromStorage)
        }
      } catch (e) {
        console.error('[v0] Error loading employees:', e)
      }
    }
  }, [allUsers])

  // Load attendance records
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_attendance')
      if (stored) {
        const parsed = JSON.parse(stored)
        const today = new Date().toISOString().split('T')[0]
        const todayRecords = parsed.filter((r: AttendanceRecord) => r.date === today)
        setAttendance(todayRecords)
      }
    } catch (e) {
      console.error('[v0] Error loading attendance:', e)
    }
  }, [])

  // Load leave requests
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_leave_requests')
      if (stored) {
        setLeaveRequests(JSON.parse(stored))
      }
    } catch (e) {
      console.error('[v0] Error loading leave requests:', e)
    }
  }, [])

  // Load summon requests
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_summon_requests')
      if (stored) {
        setSummonRequests(JSON.parse(stored))
      }
    } catch (e) {
      console.error('[v0] Error loading summon requests:', e)
    }
  }, [])

  // Load salaries
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sanad_salaries')
      if (stored) {
        setSalaries(JSON.parse(stored))
      } else {
        // Initialize with employees
      // Load salary data from users if available
      let usersData: any[] = []
      try {
        const usersJson = localStorage.getItem('sanad_users')
        if (usersJson) {
          usersData = JSON.parse(usersJson)
        }
      } catch (e) {}

      const initialSalaries = allEmployees.map(emp => {
        const userData = usersData.find(u => u.id === emp.id)
        return {
          userId: emp.id,
          userName: emp.name,
          basicSalary: userData?.baseSalary || 0,
          allowances: userData?.allowances || [],
          bonus: 0,
          deduction: 0,
          notes: '',
          lastUpdated: new Date().toISOString()
        }
      })
      setSalaries(initialSalaries)
      localStorage.setItem('sanad_salaries', JSON.stringify(initialSalaries))
      }
    } catch (e) {
      console.error('[v0] Error loading salaries:', e)
    }
  }, [allEmployees])

  // Calculate attendance statistics
  const attendanceStats = {
    present: attendance.filter(a => a.status === 'working').length,
    presentList: attendance.filter(a => a.status === 'working'),
    onBreak: attendance.filter(a => a.status === 'on_break').length,
    onBreakList: attendance.filter(a => a.status === 'on_break'),
    onPermission: attendance.filter(a => a.status === 'on_permission').length,
    onPermissionList: attendance.filter(a => a.status === 'on_permission'),
    checkedOut: attendance.filter(a => a.status === 'checked_out').length,
    checkedOutList: attendance.filter(a => a.status === 'checked_out'),
  }

  const pendingLeaveRequests = leaveRequests.filter(r => r.status === 'pending')
  const pendingCount = pendingLeaveRequests.length

  // Handle leave approval/rejection
  const handleLeaveAction = (request: LeaveRequest, action: 'approved' | 'rejected') => {
    const updated = leaveRequests.map(r => 
      r.id === request.id 
        ? { ...r, status: action, managerId: currentUser.id, managerComment: comment }
        : r
    )
    setLeaveRequests(updated)
    localStorage.setItem('sanad_leave_requests', JSON.stringify(updated))
    
    toast({
      title: language === 'ar' 
        ? (action === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب')
        : (action === 'approved' ? 'Request Approved' : 'Request Rejected'),
    })
    
    setApprovalDialog({ open: false, request: null })
    setComment('')
  }

  // Send summon request
  const handleSendSummon = () => {
    if (!selectedEmployee || !summonReason) {
      toast({
        title: language === 'ar' ? 'يرجى اختيار موظف وإدخال السبب' : 'Please select employee and enter reason',
        variant: 'destructive',
      })
      return
    }

    const employee = allEmployees.find(e => e.id === selectedEmployee)
    if (!employee) return

    const newSummon: SummonRequest = {
      id: `SUM-${Date.now()}`,
      fromId: currentUser.id,
      fromName: currentUser.name,
      toId: employee.id,
      toName: employee.name,
      reason: summonReason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    const updated = [...summonRequests, newSummon]
    setSummonRequests(updated)
    localStorage.setItem('sanad_summon_requests', JSON.stringify(updated))

    toast({
      title: language === 'ar' ? 'تم إرسال طلب الاستدعاء' : 'Summon request sent',
    })

    setSelectedEmployee('')
    setSummonReason('')
  }

  // Update salary
  const handleUpdateSalary = (userId: string, field: 'basicSalary' | 'bonus' | 'deduction' | 'notes', value: string | number) => {
    const updated = salaries.map(s => 
      s.userId === userId 
        ? { ...s, [field]: value, lastUpdated: new Date().toISOString() }
        : s
    )
    setSalaries(updated)
    localStorage.setItem('sanad_salaries', JSON.stringify(updated))
  }

  // No access check needed - if user reached here, they have HR permission
  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Notifications */}
      {pendingCount > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="pt-6 flex items-center gap-3">
            <Bell className="h-5 w-5 text-orange-500" />
            <p className="text-sm font-medium">
              {language === 'ar' 
                ? `لديك ${pendingCount} طلب إجازة معلق`
                : `You have ${pendingCount} pending leave request(s)`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 1. Employee Status Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'ar' ? 'حالة الموظفين' : 'Employee Status'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'حالة الموظفين اليوم' : "Today's employee status"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Present */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">{language === 'ar' ? 'مسجلين حضور' : 'Present'}</h3>
              <Badge variant="secondary">{attendanceStats.present}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {attendanceStats.presentList.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-green-500 text-white text-xs">
                      {emp.employeeName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(emp.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {attendanceStats.present === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  {language === 'ar' ? 'لا يوجد موظفين مسجلين حضور' : 'No employees present'}
                </p>
              )}
            </div>
          </div>

          {/* On Permission */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">{language === 'ar' ? 'مستأذنين' : 'On Permission'}</h3>
              <Badge variant="secondary">{attendanceStats.onPermission}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {attendanceStats.onPermissionList.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-yellow-500 text-white text-xs">
                      {emp.employeeName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(emp.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {attendanceStats.onPermission === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  {language === 'ar' ? 'لا يوجد موظفين مستأذنين' : 'No employees on permission'}
                </p>
              )}
            </div>
          </div>

          {/* On Break */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">{language === 'ar' ? 'في استراحة' : 'On Break'}</h3>
              <Badge variant="secondary">{attendanceStats.onBreak}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {attendanceStats.onBreakList.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {emp.employeeName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(emp.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {attendanceStats.onBreak === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  {language === 'ar' ? 'لا يوجد موظفين في استراحة' : 'No employees on break'}
                </p>
              )}
            </div>
          </div>

          {/* Checked Out */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LogOut className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">{language === 'ar' ? 'منصرفين' : 'Checked Out'}</h3>
              <Badge variant="secondary">{attendanceStats.checkedOut}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {attendanceStats.checkedOutList.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-500/10 border border-gray-500/20">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-500 text-white text-xs">
                      {emp.employeeName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(emp.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              {attendanceStats.checkedOut === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  {language === 'ar' ? 'لا يوجد موظفين منصرفين' : 'No employees checked out'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Leave Requests Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'ar' ? 'طلبات الإجازات' : 'Leave Requests'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'جميع طلبات الإجازات من الموظفين' : 'All employee leave requests'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'ar' ? 'لا توجد طلبات إجازة' : 'No leave requests'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead>{language === 'ar' ? 'نوع الإجازة' : 'Leave Type'}</TableHead>
                  <TableHead>{language === 'ar' ? 'من تاريخ' : 'From'}</TableHead>
                  <TableHead>{language === 'ar' ? 'إلى تاريخ' : 'To'}</TableHead>
                  <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.employeeName}</TableCell>
                    <TableCell>
                      {request.leaveType === 'vacation' ? (language === 'ar' ? 'إجازة سنوية' : 'Vacation') :
                       request.leaveType === 'sick' ? (language === 'ar' ? 'إجازة مرضية' : 'Sick Leave') :
                       (language === 'ar' ? 'إذن' : 'Permission')}
                    </TableCell>
                    <TableCell>{new Date(request.fromDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</TableCell>
                    <TableCell>{new Date(request.toDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>
                      {request.status === 'pending' && <Badge variant="secondary">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>}
                      {request.status === 'approved' && <Badge className="bg-green-500">{language === 'ar' ? 'موافق' : 'Approved'}</Badge>}
                      {request.status === 'rejected' && <Badge variant="destructive">{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>}
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setApprovalDialog({ open: true, request })}
                        >
                          {language === 'ar' ? 'إجراء' : 'Action'}
                        </Button>
                      )}
                      {request.status !== 'pending' && request.managerComment && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost">{language === 'ar' ? 'عرض' : 'View'}</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{language === 'ar' ? 'تفاصيل الرد' : 'Response Details'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                              <p className="text-sm"><strong>{language === 'ar' ? 'التعليق:' : 'Comment:'}</strong> {request.managerComment}</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 3. Summon Request Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {language === 'ar' ? 'طلب استدعاء' : 'Summon Request'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'إرسال طلب استدعاء لموظف' : 'Send summon request to employee'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{language === 'ar' ? 'اختر الموظف' : 'Select Employee'}</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر موظف' : 'Select employee'} />
              </SelectTrigger>
              <SelectContent>
                {allEmployees.filter(e => e.id !== currentUser.id).map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{language === 'ar' ? 'سبب الاستدعاء' : 'Reason'}</Label>
            <Textarea
              value={summonReason}
              onChange={(e) => setSummonReason(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل سبب الاستدعاء' : 'Enter reason for summon'}
              rows={3}
            />
          </div>
          <Button onClick={handleSendSummon} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إرسال طلب الاستدعاء' : 'Send Summon Request'}
          </Button>
        </CardContent>
      </Card>

      {/* 4. Salaries Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {language === 'ar' ? 'الرواتب' : 'Salaries'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'إدارة رواتب الموظفين' : 'Manage employee salaries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'ar' ? 'لا توجد بيانات رواتب' : 'No salary data'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</TableHead>
                  <TableHead>{language === 'ar' ? 'البدلات' : 'Allowances'}</TableHead>
                  <TableHead>{language === 'ar' ? 'بونص' : 'Bonus'}</TableHead>
                  <TableHead>{language === 'ar' ? 'خصم' : 'Deduction'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.map(salary => {
                  const allowancesTotal = salary.allowances?.reduce((sum, a) => sum + (a.amount || 0), 0) || 0
                  const total = salary.basicSalary + allowancesTotal + salary.bonus - salary.deduction
                  return (
                    <TableRow key={salary.userId}>
                      <TableCell className="font-medium">{salary.userName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={salary.basicSalary}
                          onChange={(e) => handleUpdateSalary(salary.userId, 'basicSalary', Number(e.target.value))}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {salary.allowances?.length > 0 ? (
                            <div className="space-y-1">
                              {salary.allowances.map((allow, idx) => (
                                <div key={idx} className="text-muted-foreground">
                                  {allow.type}: {allow.amount.toLocaleString()}
                                </div>
                              ))}
                              <div className="font-semibold text-primary">
                                {allowancesTotal.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={salary.bonus}
                            onChange={(e) => handleUpdateSalary(salary.userId, 'bonus', Number(e.target.value))}
                            className="w-24"
                          />
                          <Plus className="h-4 w-4 text-green-500" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={salary.deduction}
                            onChange={(e) => handleUpdateSalary(salary.userId, 'deduction', Number(e.target.value))}
                            className="w-24"
                          />
                          <Minus className="h-4 w-4 text-red-500" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${total < salary.basicSalary ? 'text-red-500' : total > salary.basicSalary ? 'text-green-500' : ''}`}>
                          {total.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={salary.notes}
                          onChange={(e) => handleUpdateSalary(salary.userId, 'notes', e.target.value)}
                          placeholder={language === 'ar' ? 'ملاحظات' : 'Notes'}
                          className="w-40"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ open, request: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إجراء على طلب الإجازة' : 'Leave Request Action'}</DialogTitle>
          </DialogHeader>
          {approvalDialog.request && (
            <div className="space-y-2 mt-4 text-sm">
              <p><strong>{language === 'ar' ? 'الموظف:' : 'Employee:'}</strong> {approvalDialog.request.employeeName}</p>
              <p><strong>{language === 'ar' ? 'النوع:' : 'Type:'}</strong> {approvalDialog.request.leaveType === 'vacation' ? (language === 'ar' ? 'إجازة سنوية' : 'Vacation') : approvalDialog.request.leaveType === 'sick' ? (language === 'ar' ? 'إجازة مرضية' : 'Sick Leave') : (language === 'ar' ? 'إذن' : 'Permission')}</p>
              <p><strong>{language === 'ar' ? 'من:' : 'From:'}</strong> {new Date(approvalDialog.request.fromDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
              <p><strong>{language === 'ar' ? 'إلى:' : 'To:'}</strong> {new Date(approvalDialog.request.toDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
              <p><strong>{language === 'ar' ? 'السبب:' : 'Reason:'}</strong> {approvalDialog.request.reason}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)'}</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={language === 'ar' ? 'أضف تعليق' : 'Add comment'}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => approvalDialog.request && handleLeaveAction(approvalDialog.request, 'approved')}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'موافقة' : 'Approve'}
              </Button>
              <Button
                onClick={() => approvalDialog.request && handleLeaveAction(approvalDialog.request, 'rejected')}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'رفض' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
