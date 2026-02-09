'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Clock, LogIn, Coffee, DoorOpen, Calendar, Wallet, 
  CheckCircle2, XCircle, Sun, Moon, Sunrise, Sunset,
  MessageSquare, FileText, AlertCircle, Users
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, formatDateEnglish } from '@/lib/number-format'
import { SalaryAdjustments } from './salary-adjustments'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface EmployeePortalProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  currentUser: {
    id: string
    name: string
    email: string
    role: string
    position: string
    branchId?: string
  }
  erpConfig: {
    url: string
    apiKey: string
    apiSecret: string
    connected: boolean
  }
}

interface AttendanceSession {
  checkInTime: string | null
  status: 'absent' | 'present' | 'on_break' | 'on_permission' | 'checked_out'
  breakStartTime: string | null
  permissionStartTime: string | null
  workDuration: number
  breakDuration: number
  permissionDuration: number
}

interface LeaveRequest {
  id: string
  employeeId: string
  leaveType: 'vacation' | 'sick' | 'emergency'
  fromDate: string
  toDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestDate: string
  managerComment?: string
}

interface MeetingRequest {
  id: string
  employeeId: string
  requestType: 'meeting' | 'summon'
  requestedBy: 'employee' | 'hr'
  date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestDate: string
  responseComment?: string
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function EmployeePortal({ language, t, currentUser }: EmployeePortalProps) {
  const { toast } = useToast()
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Admin controls - for managing other employees
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id)
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'مدير عام'
  
  // Resolve user name
  const [resolvedUserName, setResolvedUserName] = useState(currentUser.name)
  const [resolvedPosition, setResolvedPosition] = useState(currentUser.position)
  const [salary, setSalary] = useState<number>(0)
  
  useEffect(() => {
    try {
      const usersJson = localStorage.getItem('sanad_users')
      if (usersJson) {
        const users = JSON.parse(usersJson)
        
        // Load all users for admin
        if (isAdmin) {
          setAllUsers(users)
        }
        
        const user = users.find((u: any) => u.id === currentUser.id)
        if (user) {
          const name = language === 'ar' 
            ? (user.name || user.nameAr || user.username) 
            : (user.nameEn || user.name || user.username)
          setResolvedUserName(name)
          setResolvedPosition(user.designation || user.role || currentUser.position)
          setSalary(user.salary || 5000)
        }
      }
    } catch (_) {}
  }, [currentUser.id, language, isAdmin])

  // Time update
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Attendance State
  const [session, setSession] = useState<AttendanceSession>(() => {
    try {
      const stored = localStorage.getItem(`sanad_session_${currentUser.id}`)
      if (stored) return JSON.parse(stored)
    } catch (_) {}
    return {
      checkInTime: null,
      status: 'absent',
      breakStartTime: null,
      permissionStartTime: null,
      workDuration: 0,
      breakDuration: 0,
      permissionDuration: 0,
    }
  })

  // Save session to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`sanad_session_${currentUser.id}`, JSON.stringify(session))
    } catch (_) {}
  }, [session, currentUser.id])

  // Timer update
  useEffect(() => {
    if (session.status === 'absent' || session.status === 'checked_out') return
    
    const interval = setInterval(() => {
      setSession(prev => {
        const now = Date.now()
        const updates: Partial<AttendanceSession> = {}
        
        if (prev.status === 'present' && prev.checkInTime) {
          updates.workDuration = Math.floor((now - new Date(prev.checkInTime).getTime()) / 1000)
        } else if (prev.status === 'on_break' && prev.breakStartTime) {
          updates.breakDuration = Math.floor((now - new Date(prev.breakStartTime).getTime()) / 1000)
        } else if (prev.status === 'on_permission' && prev.permissionStartTime) {
          updates.permissionDuration = Math.floor((now - new Date(prev.permissionStartTime).getTime()) / 1000)
        }
        
        return { ...prev, ...updates }
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [session.status])

  // Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([])
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'vacation',
    fromDate: '',
    toDate: '',
    reason: '',
  })
  const [meetingForm, setMeetingForm] = useState({
    date: '',
    reason: '',
  })

  // Load leave requests from localStorage
  useEffect(() => {
    const loadRequests = () => {
      try {
        const stored = localStorage.getItem('sanad_leave_requests')
        if (stored) {
          const all = JSON.parse(stored)
          const mine = all.filter((r: any) => r.employeeId === currentUser.id)
          setLeaveRequests(mine)
        }
      } catch (_) {}
    }
    loadRequests()
    const interval = setInterval(loadRequests, 5000)
    return () => clearInterval(interval)
  }, [currentUser.id])

  // Load meeting requests
  useEffect(() => {
    const loadMeetings = () => {
      try {
        const stored = localStorage.getItem('sanad_meeting_requests')
        if (stored) {
          const all = JSON.parse(stored)
          const mine = all.filter((r: any) => r.employeeId === currentUser.id)
          setMeetingRequests(mine)
        }
      } catch (_) {}
    }
    loadMeetings()
    const interval = setInterval(loadMeetings, 5000)
    return () => clearInterval(interval)
  }, [currentUser.id])

  // Actions - work for selected employee (admin) or current user
  const handleCheckIn = () => {
    const targetUserId = isAdmin ? selectedEmployeeId : currentUser.id
    console.log('[v0] CheckIn - isAdmin:', isAdmin, '| selectedEmployeeId:', selectedEmployeeId, '| currentUser.id:', currentUser.id, '| targetUserId:', targetUserId)
    
    const now = new Date().toISOString()
    const newSession = {
      checkInTime: now,
      status: 'present' as const,
      breakStartTime: null,
      permissionStartTime: null,
      workDuration: 0,
      breakDuration: 0,
      permissionDuration: 0,
    }
    
    // Save to localStorage for target user
    localStorage.setItem(`sanad_session_${targetUserId}`, JSON.stringify(newSession))
    console.log('[v0] Session saved to localStorage for user:', targetUserId)
    
    // Update local state only if it's current user
    if (targetUserId === currentUser.id) {
      setSession(newSession)
      console.log('[v0] Local session state updated')
    } else {
      console.log('[v0] NOT updating local state - target is different user')
    }
    
    const targetUserName = isAdmin && targetUserId !== currentUser.id 
      ? allUsers.find(u => u.id === targetUserId)?.name || 'Employee'
      : resolvedUserName
    
    toast({ 
      title: language === 'ar' 
        ? `تم تسجيل حضور ${targetUserName}` 
        : `Checked in ${targetUserName}` 
    })
  }

  const handleBreak = () => {
    const targetUserId = isAdmin ? selectedEmployeeId : currentUser.id
    const storedSession = localStorage.getItem(`sanad_session_${targetUserId}`)
    const currentSession = storedSession ? JSON.parse(storedSession) : session
    
    const newSession = currentSession.status === 'on_break'
      ? { ...currentSession, status: 'present', breakStartTime: null }
      : { ...currentSession, status: 'on_break', breakStartTime: new Date().toISOString() }
    
    localStorage.setItem(`sanad_session_${targetUserId}`, JSON.stringify(newSession))
    
    if (targetUserId === currentUser.id) {
      setSession(newSession as AttendanceSession)
    }
    
    const isStarting = currentSession.status !== 'on_break'
    toast({ 
      title: language === 'ar' 
        ? (isStarting ? 'بدء الاستراحة' : 'العودة من الاستراحة')
        : (isStarting ? 'Break Started' : 'Break Ended')
    })
  }

  const handlePermission = () => {
    const targetUserId = isAdmin ? selectedEmployeeId : currentUser.id
    const storedSession = localStorage.getItem(`sanad_session_${targetUserId}`)
    const currentSession = storedSession ? JSON.parse(storedSession) : session
    
    const newSession = currentSession.status === 'on_permission'
      ? { ...currentSession, status: 'present', permissionStartTime: null }
      : { ...currentSession, status: 'on_permission', permissionStartTime: new Date().toISOString() }
    
    localStorage.setItem(`sanad_session_${targetUserId}`, JSON.stringify(newSession))
    
    if (targetUserId === currentUser.id) {
      setSession(newSession as AttendanceSession)
    }
    
    const isStarting = currentSession.status !== 'on_permission'
    toast({ 
      title: language === 'ar' 
        ? (isStarting ? 'استئذان' : 'العودة من الاستئذان')
        : (isStarting ? 'Permission Started' : 'Permission Ended')
    })
  }

  const handleCheckOut = () => {
    const targetUserId = isAdmin ? selectedEmployeeId : currentUser.id
    const storedSession = localStorage.getItem(`sanad_session_${targetUserId}`)
    const currentSession = storedSession ? JSON.parse(storedSession) : session
    
    const newSession = { 
      ...currentSession,
      status: 'checked_out' as const,
      breakStartTime: null,
      permissionStartTime: null,
    }
    
    localStorage.setItem(`sanad_session_${targetUserId}`, JSON.stringify(newSession))
    
    if (targetUserId === currentUser.id) {
      setSession(newSession)
    }
    
    toast({ title: language === 'ar' ? 'تم تسجيل الانصراف' : 'Checked Out' })
  }

  const handleLeaveSubmit = () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) {
      toast({ title: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' })
      return
    }

    const newRequest: LeaveRequest = {
      id: `LR-${Date.now()}`,
      employeeId: currentUser.id,
      leaveType: leaveForm.leaveType as any,
      fromDate: leaveForm.fromDate,
      toDate: leaveForm.toDate,
      reason: leaveForm.reason,
      status: 'pending',
      requestDate: new Date().toISOString(),
    }

    try {
      const stored = localStorage.getItem('sanad_leave_requests')
      const all = stored ? JSON.parse(stored) : []
      all.push(newRequest)
      localStorage.setItem('sanad_leave_requests', JSON.stringify(all))
      setLeaveRequests(prev => [...prev, newRequest])
      setShowLeaveDialog(false)
      setLeaveForm({ leaveType: 'vacation', fromDate: '', toDate: '', reason: '' })
      toast({ title: language === 'ar' ? 'تم إرسال الطلب' : 'Request Submitted' })
    } catch (_) {
      toast({ title: language === 'ar' ? 'فشل الإرسال' : 'Failed to submit', variant: 'destructive' })
    }
  }

  const handleMeetingSubmit = () => {
    if (!meetingForm.date || !meetingForm.reason) {
      toast({ title: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' })
      return
    }

    const newRequest: MeetingRequest = {
      id: `MT-${Date.now()}`,
      employeeId: currentUser.id,
      requestType: 'meeting',
      requestedBy: 'employee',
      date: meetingForm.date,
      reason: meetingForm.reason,
      status: 'pending',
      requestDate: new Date().toISOString(),
    }

    try {
      const stored = localStorage.getItem('sanad_meeting_requests')
      const all = stored ? JSON.parse(stored) : []
      all.push(newRequest)
      localStorage.setItem('sanad_meeting_requests', JSON.stringify(all))
      setMeetingRequests(prev => [...prev, newRequest])
      setShowMeetingDialog(false)
      setMeetingForm({ date: '', reason: '' })
      toast({ title: language === 'ar' ? 'تم إرسال الطلب' : 'Request Submitted' })
    } catch (_) {
      toast({ title: language === 'ar' ? 'فشل الإرسال' : 'Failed to submit', variant: 'destructive' })
    }
  }

  // Helpers
  const getTimeIcon = () => {
    const hour = currentTime.getHours()
    if (hour >= 5 && hour < 12) return <Sunrise className="h-8 w-8" />
    if (hour >= 12 && hour < 17) return <Sun className="h-8 w-8" />
    if (hour >= 17 && hour < 21) return <Sunset className="h-8 w-8" />
    return <Moon className="h-8 w-8" />
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (language === 'ar') {
      if (hour >= 5 && hour < 12) return 'صباح الخير'
      if (hour >= 12 && hour < 17) return 'مساء الخير'
      if (hour >= 17 && hour < 21) return 'مساء الخير'
      return 'مساء الخير'
    } else {
      if (hour >= 5 && hour < 12) return 'Good Morning'
      if (hour >= 12 && hour < 17) return 'Good Afternoon'
      if (hour >= 17 && hour < 21) return 'Good Evening'
      return 'Good Night'
    }
  }

  const getStatusText = () => {
    const statusMap = {
      absent: language === 'ar' ? 'غائب' : 'Absent',
      present: language === 'ar' ? 'حاضر' : 'Present',
      on_break: language === 'ar' ? 'في استراحة' : 'On Break',
      on_permission: language === 'ar' ? 'مستأذن' : 'On Permission',
      checked_out: language === 'ar' ? 'منصرف' : 'Checked Out',
    }
    return statusMap[session.status]
  }

  const getStatusColor = () => {
    const colorMap = {
      absent: 'bg-gray-500',
      present: 'bg-green-500',
      on_break: 'bg-yellow-500',
      on_permission: 'bg-orange-500',
      checked_out: 'bg-blue-500',
    }
    return colorMap[session.status]
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const pendingLeaves = leaveRequests.filter(r => r.status === 'pending').length
  const approvedLeaves = leaveRequests.filter(r => r.status === 'approved').length

  return (
    <div className="space-y-6 p-6 bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="text-primary">
                {getTimeIcon()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{getGreeting()}, {resolvedUserName}</h2>
                <p className="text-muted-foreground">{resolvedPosition}</p>
              </div>
              <div className="text-center">
                <Badge className={`${getStatusColor()} text-white px-4 py-2 text-sm`}>
                  {getStatusText()}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentTime.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Admin Controls for Managing Employee Actions */}
      {isAdmin && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              {language === 'ar' ? 'إدارة حضور الموظفين' : 'Manage Employee Attendance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium min-w-fit">
                {language === 'ar' ? 'اختر الموظف:' : 'Select Employee:'}
              </Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {language === 'ar' 
                        ? (user.nameAr || user.name || user.username) 
                        : (user.nameEn || user.name || user.username)
                      } - {user.designation || user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
            {isAdmin && selectedEmployeeId !== currentUser.id && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({language === 'ar' ? 'للموظف المحدد' : 'For selected employee'})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button
              onClick={handleCheckIn}
              disabled={session.status !== 'absent'}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-xs">{language === 'ar' ? 'تسجيل حضور' : 'Check In'}</span>
            </Button>
            <Button
              onClick={handleBreak}
              disabled={session.status !== 'present' && session.status !== 'on_break'}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <Coffee className="h-5 w-5" />
              <span className="text-xs">
                {session.status === 'on_break' 
                  ? (language === 'ar' ? 'العودة' : 'Return')
                  : (language === 'ar' ? 'بريك' : 'Break')}
              </span>
            </Button>
            <Button
              onClick={handlePermission}
              disabled={session.status !== 'present' && session.status !== 'on_permission'}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs">
                {session.status === 'on_permission'
                  ? (language === 'ar' ? 'العودة' : 'Return')
                  : (language === 'ar' ? 'استئذان' : 'Permission')}
              </span>
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={session.status === 'absent' || session.status === 'checked_out'}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <DoorOpen className="h-5 w-5" />
              <span className="text-xs">{language === 'ar' ? 'تسجيل انصراف' : 'Check Out'}</span>
            </Button>
            <Button
              onClick={() => setShowLeaveDialog(true)}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">{language === 'ar' ? 'طلب إجازة' : 'Request Leave'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracker - Dynamic Clock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {language === 'ar' ? 'تتبع الوقت' : 'Time Tracker'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono">
                {formatDuration(session.workDuration)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'وقت العمل' : 'Work Time'}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 font-mono">
                {formatDuration(session.breakDuration)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'وقت الاستراحة' : 'Break Time'}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                {formatDuration(session.permissionDuration)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'وقت الاستئذان' : 'Permission Time'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Actions Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Salary Management */}
        <div className="md:col-span-2">
          <SalaryAdjustments 
            language={language}
            employeeId={selectedEmployeeId}
            baseSalary={salary}
            isAdmin={isAdmin}
          />
        </div>

        {/* Requests Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'حالة الطلبات' : 'Requests Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{pendingLeaves}</div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{approvedLeaves}</div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'موافق عليها' : 'Approved'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Request */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              {language === 'ar' ? 'طلب مقابلة' : 'Request Meeting'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowMeetingDialog(true)}
              className="w-full bg-transparent"
              variant="outline"
            >
              <MessageSquare className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'طلب مقابلة مع الموارد البشرية' : 'Request HR Meeting'}
            </Button>
          </CardContent>
        </Card>

        {/* Meeting Requests Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {language === 'ar' ? 'طلبات المقابلات' : 'Meeting Requests'}
              {meetingRequests.filter(r => r.status !== 'pending' && !r.responseComment?.includes('__seen__')).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {meetingRequests.filter(r => r.status !== 'pending' && !r.responseComment?.includes('__seen__')).length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {meetingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {language === 'ar' ? 'لا توجد طلبات' : 'No requests'}
                </p>
              ) : (
                meetingRequests.slice(0, 3).map(req => (
                  <div key={req.id} className="border-b pb-3 mb-2 last:border-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">
                        {new Date(req.requestDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                      <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {req.status === 'pending' ? (language === 'ar' ? 'قيد الانتظار' : 'Pending') :
                         req.status === 'approved' ? (language === 'ar' ? 'موافق' : 'Approved') :
                         (language === 'ar' ? 'مرفوض' : 'Rejected')}
                      </Badge>
                    </div>
                    {req.responseComment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {language === 'ar' ? 'الرد: ' : 'Response: '}{req.responseComment.replace('__seen__', '')}
                      </p>
                    )}
                    {req.respondedBy && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {language === 'ar' ? 'بواسطة: ' : 'By: '}{req.respondedBy}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">
            {language === 'ar' ? 'طلبات الإجازات' : 'Leave Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaveRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === 'ar' ? 'لا توجد طلبات إجازة' : 'No leave requests'}
              </p>
            ) : (
              leaveRequests.map(request => (
                <div key={request.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {request.leaveType === 'vacation' ? (language === 'ar' ? 'إجازة' : 'Vacation') :
                           request.leaveType === 'sick' ? (language === 'ar' ? 'مرضية' : 'Sick') :
                           (language === 'ar' ? 'طارئة' : 'Emergency')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDateEnglish(request.fromDate)} - {formatDateEnglish(request.toDate)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{request.reason}</p>
                      {request.managerComment && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <p className="font-semibold">{language === 'ar' ? 'تعليق المدير:' : 'Manager Comment:'}</p>
                          <p className="text-muted-foreground">{request.managerComment}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</Badge>}
                      {request.status === 'approved' && <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />{language === 'ar' ? 'موافق عليه' : 'Approved'}</Badge>}
                      {request.status === 'rejected' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{language === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'طلب إجازة' : 'Request Leave'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'نوع الإجازة' : 'Leave Type'}</Label>
              <Select value={leaveForm.leaveType} onValueChange={(v) => setLeaveForm({...leaveForm, leaveType: v})}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">{language === 'ar' ? 'إجازة عادية' : 'Vacation'}</SelectItem>
                  <SelectItem value="sick">{language === 'ar' ? 'إجازة مرضية' : 'Sick Leave'}</SelectItem>
                  <SelectItem value="emergency">{language === 'ar' ? 'إجازة طارئة' : 'Emergency Leave'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'من تاريخ' : 'From Date'}</Label>
              <Input
                type="date"
                value={leaveForm.fromDate}
                onChange={(e) => setLeaveForm({...leaveForm, fromDate: e.target.value})}
                className="bg-background"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'إلى تاريخ' : 'To Date'}</Label>
              <Input
                type="date"
                value={leaveForm.toDate}
                onChange={(e) => setLeaveForm({...leaveForm, toDate: e.target.value})}
                className="bg-background"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                className="bg-background"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)} className="bg-transparent">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleLeaveSubmit}>
              {language === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Request Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'طلب مقابلة' : 'Request Meeting'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'التاريخ المفضل' : 'Preferred Date'}</Label>
              <Input
                type="datetime-local"
                value={meetingForm.date}
                onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})}
                className="bg-background"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
              <Textarea
                value={meetingForm.reason}
                onChange={(e) => setMeetingForm({...meetingForm, reason: e.target.value})}
                className="bg-background"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)} className="bg-transparent">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleMeetingSubmit}>
              {language === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
