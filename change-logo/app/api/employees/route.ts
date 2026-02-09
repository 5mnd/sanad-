import { NextRequest, NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EmployeeData {
  id: string
  name: string
  nameEn: string
  email: string
  phone: string
  designation: string
  designationEn: string
  department: string
  departmentEn: string
  branchId?: string
  branchName?: string
  joinDate: string
  status: 'active' | 'on_leave' | 'terminated'
  salary: {
    basic: number
    allowances: { name: string; amount: number }[]
    currency: string
  }
  attendance: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
  }
  leaves: {
    totalLeaves: number
    usedLeaves: number
    remainingLeaves: number
  }
  image?: string
  nationalId?: string
  emergencyContact?: {
    name: string
    phone: string
    relation: string
  }
  bankAccount?: {
    accountNumber: string
    bankName: string
    iban: string
  }
  createdAt: string
  updatedAt: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  action: 'check_in' | 'check_out' | 'break_start' | 'break_end' | 'permission_start' | 'permission_end'
  timestamp: string
  date: string
  status?: string
  notes?: string
  location?: string
  synced: boolean
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveType: 'vacation' | 'sick' | 'permission' | 'emergency' | 'unpaid'
  fromDate: string
  toDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestDate: string
  approvedBy?: string
  approvedDate?: string
  managerComment?: string
  attachmentUrl?: string
}

export interface SalarySlip {
  id: string
  employeeId: string
  month: string
  year: number
  basicSalary: number
  allowances: { name: string; amount: number }[]
  deductions: { name: string; amount: number }[]
  bonuses: { name: string; amount: number }[]
  netSalary: number
  grossSalary: number
  paymentDate?: string
  status: 'draft' | 'submitted' | 'paid'
  paidBy?: string
  notes?: string
}

export interface SalaryAdjustmentRequest {
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

export interface SystemNotification {
  id: string
  userId: string
  type: 'leave_approved' | 'leave_rejected' | 'salary_set' | 'salary_adjustment' | 'salary_acknowledged'
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: string
}

export interface SalaryRecord {
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

// ─── Server-Side In-Memory Storage ─────────────────────────────────────────────
// Uses global maps that persist across requests in the same server process.
// Compact: only stores what's needed, no duplication.

const globalStore = globalThis as typeof globalThis & {
  _employees?: EmployeeData[]
  _attendance?: AttendanceRecord[]
  _leaveRequests?: LeaveRequest[]
  _salarySlips?: SalarySlip[]
  _salaryAdjustments?: SalaryAdjustmentRequest[]
  _salaryRecords?: SalaryRecord[]
  _notifications?: SystemNotification[]
  _initialized?: boolean
}

function getEmployees(): EmployeeData[] {
  if (!globalStore._employees) globalStore._employees = []
  return globalStore._employees
}

function getAttendance(): AttendanceRecord[] {
  if (!globalStore._attendance) globalStore._attendance = []
  return globalStore._attendance
}

function getLeaveRequests(): LeaveRequest[] {
  if (!globalStore._leaveRequests) globalStore._leaveRequests = []
  return globalStore._leaveRequests
}

function getSalarySlips(): SalarySlip[] {
  if (!globalStore._salarySlips) globalStore._salarySlips = []
  return globalStore._salarySlips
}

function getSalaryAdjustments(): SalaryAdjustmentRequest[] {
  if (!globalStore._salaryAdjustments) globalStore._salaryAdjustments = []
  return globalStore._salaryAdjustments
}

function getSalaryRecords(): SalaryRecord[] {
  if (!globalStore._salaryRecords) globalStore._salaryRecords = []
  return globalStore._salaryRecords
}

function getNotifications(): SystemNotification[] {
  if (!globalStore._notifications) globalStore._notifications = []
  return globalStore._notifications
}

// ─── Auto-cleanup: Remove attendance records older than 90 days ────────────────
function cleanupOldRecords() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  
  const attendance = getAttendance()
  const before = attendance.length
  globalStore._attendance = attendance.filter(r => r.date >= cutoffStr)
  
  if (before !== globalStore._attendance.length) {
    console.log(`[v0] Cleaned up ${before - globalStore._attendance.length} old attendance records`)
  }
}

// ─── API Handlers ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const employeeId = searchParams.get('employeeId')
  const userRole = searchParams.get('userRole') || 'employee'

  // Periodic cleanup
  cleanupOldRecords()

  try {
    switch (action) {
      case 'get_employee': {
        if (!employeeId) {
          return NextResponse.json({ success: false, message: 'Employee ID required' }, { status: 400 })
        }

        const employees = getEmployees()
        const employee = employees.find(emp => emp.id === employeeId)

        if (!employee) {
          return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
        }

        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          const { salary, bankAccount, ...safeData } = employee
          return NextResponse.json({ success: true, data: safeData })
        }

        return NextResponse.json({ success: true, data: employee })
      }

      case 'get_all_employees': {
        if (userRole !== 'admin' && userRole !== 'hr_manager' && userRole !== 'branch_manager' && userRole !== 'general_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        return NextResponse.json({ success: true, data: getEmployees() })
      }

      case 'get_attendance': {
        const attendance = getAttendance()
        
        if (employeeId && userRole !== 'admin' && userRole !== 'hr_manager') {
          const filtered = attendance.filter(record => record.employeeId === employeeId)
          return NextResponse.json({ success: true, data: filtered })
        }

        return NextResponse.json({ success: true, data: attendance })
      }

      case 'get_leave_requests': {
        const leaveRequests = getLeaveRequests()
        
        if (employeeId && userRole !== 'admin' && userRole !== 'hr_manager') {
          const filtered = leaveRequests.filter(req => req.employeeId === employeeId)
          return NextResponse.json({ success: true, data: filtered })
        }

        return NextResponse.json({ success: true, data: leaveRequests })
      }

      case 'get_salary_slips': {
        const salarySlips = getSalarySlips()
        
        if (employeeId && userRole !== 'admin' && userRole !== 'hr_manager') {
          const filtered = salarySlips.filter(slip => slip.employeeId === employeeId)
          return NextResponse.json({ success: true, data: filtered })
        }

        return NextResponse.json({ success: true, data: salarySlips })
      }

      case 'get_salary_adjustments': {
        const adjustments = getSalaryAdjustments()
        
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          // Non-HR users can only see their own requests
          const filtered = adjustments.filter(a => a.requestedBy === employeeId)
          return NextResponse.json({ success: true, data: filtered })
        }

        return NextResponse.json({ success: true, data: adjustments })
      }

      case 'get_notifications': {
        const notifications = getNotifications()
        const userNotifs = employeeId 
          ? notifications.filter(n => n.userId === employeeId)
          : notifications
        return NextResponse.json({ success: true, data: userNotifs })
      }

      case 'get_salary_records': {
        const salaryRecords = getSalaryRecords()
        
        if (employeeId && userRole !== 'admin' && userRole !== 'hr_manager') {
          const myRecord = salaryRecords.find(r => r.employeeId === employeeId)
          return NextResponse.json({ success: true, data: myRecord ? [myRecord] : [] })
        }

        return NextResponse.json({ success: true, data: salaryRecords })
      }

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Error in GET /api/employees:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data, userRole = 'employee', userId } = body

    switch (action) {
      case 'add_employee': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const employees = getEmployees()
        
        const newEmployee: EmployeeData = {
          ...data,
          id: data.id || `EMP-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: data.status || 'active',
          attendance: data.attendance || { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0 },
          leaves: data.leaves || { totalLeaves: 30, usedLeaves: 0, remainingLeaves: 30 },
        }

        employees.push(newEmployee)
        return NextResponse.json({ success: true, data: newEmployee })
      }

      case 'update_employee': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const employees = getEmployees()
        const index = employees.findIndex(emp => emp.id === data.id)

        if (index === -1) {
          return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
        }

        employees[index] = { ...employees[index], ...data, updatedAt: new Date().toISOString() }
        return NextResponse.json({ success: true, data: employees[index] })
      }

      case 'record_attendance': {
        const attendance = getAttendance()
        
        let status = 'present'
        if (data.action === 'check_out') status = 'checked_out'
        else if (data.action === 'break_start') status = 'on_break'
        else if (data.action === 'permission_start') status = 'on_permission'
        else if (data.action === 'break_end' || data.action === 'permission_end') status = 'present'
        
        const newRecord: AttendanceRecord = {
          id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          employeeId: data.employeeId,
          action: data.action,
          timestamp: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          status: data.status || status,
          notes: data.notes,
          location: data.location,
          synced: false,
        }

        attendance.push(newRecord)
        return NextResponse.json({ success: true, data: newRecord })
      }

      case 'submit_leave_request': {
        const leaveRequests = getLeaveRequests()
        
        const newRequest: LeaveRequest = {
          id: `LR-${Date.now()}`,
          employeeId: data.employeeId,
          leaveType: data.leaveType,
          fromDate: data.fromDate,
          toDate: data.toDate,
          days: data.days || 1,
          reason: data.reason,
          status: 'pending',
          requestDate: new Date().toISOString(),
          attachmentUrl: data.attachmentUrl,
        }

        leaveRequests.push(newRequest)
        return NextResponse.json({ success: true, data: newRequest })
      }

      case 'update_leave_status': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const leaveRequests = getLeaveRequests()
        const index = leaveRequests.findIndex(req => req.id === data.id)

        if (index === -1) {
          return NextResponse.json({ success: false, message: 'Leave request not found' }, { status: 404 })
        }

        leaveRequests[index] = {
          ...leaveRequests[index],
          status: data.status,
          approvedBy: userId,
          approvedDate: new Date().toISOString(),
          managerComment: data.managerComment,
        }

        // Create notification for the employee
        const notifications = getNotifications()
        const isApproved = data.status === 'approved'
        notifications.push({
          id: `NOTIF-${Date.now()}`,
          userId: leaveRequests[index].employeeId,
          type: isApproved ? 'leave_approved' : 'leave_rejected',
          title: isApproved ? 'Leave Request Approved' : 'Leave Request Rejected',
          message: data.managerComment || (isApproved ? 'Your leave request has been approved' : 'Your leave request has been rejected'),
          data: { requestId: data.id, status: data.status },
          read: false,
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json({ success: true, data: leaveRequests[index] })
      }

      case 'send_notification': {
        const notifications = getNotifications()
        const newNotification: SystemNotification = {
          id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.extraData,
          read: false,
          createdAt: new Date().toISOString(),
        }
        notifications.push(newNotification)
        return NextResponse.json({ success: true, data: newNotification })
      }

      case 'mark_notification_read': {
        const notifications = getNotifications()
        const notif = notifications.find(n => n.id === data.id)
        if (notif) notif.read = true
        return NextResponse.json({ success: true })
      }

      case 'mark_all_notifications_read': {
        const notifications = getNotifications()
        for (const n of notifications) {
          if (n.userId === data.userId) n.read = true
        }
        return NextResponse.json({ success: true })
      }

      case 'create_salary_slip': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const salarySlips = getSalarySlips()
        const totalAllowances = data.allowances?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) || 0
        const totalDeductions = data.deductions?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) || 0
        const totalBonuses = data.bonuses?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) || 0
        
        const newSlip: SalarySlip = {
          id: `SS-${Date.now()}`,
          employeeId: data.employeeId,
          month: data.month,
          year: data.year,
          basicSalary: data.basicSalary,
          allowances: data.allowances || [],
          deductions: data.deductions || [],
          bonuses: data.bonuses || [],
          grossSalary: data.basicSalary + totalAllowances + totalBonuses,
          netSalary: data.basicSalary + totalAllowances + totalBonuses - totalDeductions,
          status: data.status || 'draft',
          notes: data.notes,
        }

        salarySlips.push(newSlip)
        return NextResponse.json({ success: true, data: newSlip })
      }

      case 'submit_salary_adjustment': {
        const adjustments = getSalaryAdjustments()
        
        const newAdj: SalaryAdjustmentRequest = {
          id: `ADJ-${Date.now()}`,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          type: data.type,
          amount: data.amount,
          reason: data.reason,
          requestedBy: data.requestedBy,
          requestedByName: data.requestedByName,
          requestedByRole: data.requestedByRole,
          status: 'pending',
          requestDate: new Date().toISOString(),
        }

        adjustments.push(newAdj)
        return NextResponse.json({ success: true, data: newAdj })
      }

      case 'process_salary_adjustment': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const adjustments = getSalaryAdjustments()
        const index = adjustments.findIndex(a => a.id === data.id)

        if (index === -1) {
          return NextResponse.json({ success: false, message: 'Adjustment request not found' }, { status: 404 })
        }

        adjustments[index] = {
          ...adjustments[index],
          status: data.status,
          hrComment: data.hrComment,
          processedDate: new Date().toISOString(),
        }

        return NextResponse.json({ success: true, data: adjustments[index] })
      }

      case 'save_salary_record': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const salaryRecords = getSalaryRecords()
        const existingIdx = salaryRecords.findIndex(r => r.employeeId === data.employeeId)

        if (existingIdx !== -1) {
          // Update existing
          salaryRecords[existingIdx] = { ...salaryRecords[existingIdx], ...data }
          return NextResponse.json({ success: true, data: salaryRecords[existingIdx] })
        } else {
          // Create new
          const newRecord: SalaryRecord = {
            id: data.id || `SAL-${Date.now()}`,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            designation: data.designation || '',
            basicSalary: data.basicSalary || 0,
            allowances: data.allowances || [],
            deductions: data.deductions || [],
            netSalary: data.netSalary || data.basicSalary || 0,
            effectiveDate: data.effectiveDate || new Date().toISOString(),
            status: data.status || 'active',
            history: data.history || [],
          }
          salaryRecords.push(newRecord)
          return NextResponse.json({ success: true, data: newRecord })
        }
      }

      case 'delete_salary_adjustment_item': {
        if (userRole !== 'admin' && userRole !== 'hr_manager') {
          return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
        }

        const salRecs = getSalaryRecords()
        const recIdx = salRecs.findIndex(r => r.employeeId === data.employeeId)
        
        if (recIdx === -1) {
          return NextResponse.json({ success: false, message: 'Record not found' }, { status: 404 })
        }

        if (data.adjustmentType === 'allowance') {
          salRecs[recIdx].allowances = salRecs[recIdx].allowances.filter((_: any, i: number) => i !== data.index)
        } else {
          salRecs[recIdx].deductions = salRecs[recIdx].deductions.filter((_: any, i: number) => i !== data.index)
        }

        // Recalculate net salary
        const totalAllowances = salRecs[recIdx].allowances.reduce((sum: number, a: any) => sum + a.amount, 0)
        const totalDeductions = salRecs[recIdx].deductions.reduce((sum: number, d: any) => sum + d.amount, 0)
        salRecs[recIdx].netSalary = salRecs[recIdx].basicSalary + totalAllowances - totalDeductions

        return NextResponse.json({ success: true, data: salRecs[recIdx] })
      }

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Error in POST /api/employees:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')
    const userRole = searchParams.get('userRole') || 'employee'

    if (userRole !== 'admin' && userRole !== 'hr_manager') {
      return NextResponse.json({ success: false, message: 'Insufficient permissions' }, { status: 403 })
    }

    switch (action) {
      case 'delete_employee': {
        const employees = getEmployees()
        const idx = employees.findIndex(e => e.id === id)
        if (idx !== -1) employees.splice(idx, 1)
        return NextResponse.json({ success: true })
      }

      case 'delete_leave_request': {
        const leaveRequests = getLeaveRequests()
        const idx = leaveRequests.findIndex(r => r.id === id)
        if (idx !== -1) leaveRequests.splice(idx, 1)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Error in DELETE /api/employees:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
