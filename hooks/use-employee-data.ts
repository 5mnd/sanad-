'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EmployeeData, AttendanceRecord, LeaveRequest, SalarySlip } from '@/app/api/employees/route'

interface UseEmployeeDataOptions {
  employeeId?: string
  userRole?: string
  autoFetch?: boolean
}

interface UseEmployeeDataReturn {
  employee: EmployeeData | null
  employees: EmployeeData[]
  attendance: AttendanceRecord[]
  leaveRequests: LeaveRequest[]
  salarySlips: SalarySlip[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchEmployee: (id: string) => Promise<void>
  fetchAllEmployees: () => Promise<void>
  fetchAttendance: (empId?: string) => Promise<void>
  fetchLeaveRequests: (empId?: string) => Promise<void>
  fetchSalarySlips: (empId?: string) => Promise<void>
  
  addEmployee: (data: Partial<EmployeeData>) => Promise<EmployeeData | null>
  updateEmployee: (data: Partial<EmployeeData>) => Promise<EmployeeData | null>
  recordAttendance: (data: { employeeId: string; action: string; notes?: string }) => Promise<AttendanceRecord | null>
  submitLeaveRequest: (data: Partial<LeaveRequest>) => Promise<LeaveRequest | null>
  updateLeaveStatus: (id: string, status: 'approved' | 'rejected', comment?: string) => Promise<LeaveRequest | null>
  createSalarySlip: (data: Partial<SalarySlip>) => Promise<SalarySlip | null>
  
  refresh: () => Promise<void>
}

export function useEmployeeData(options: UseEmployeeDataOptions = {}): UseEmployeeDataReturn {
  const { employeeId, userRole = 'employee', autoFetch = true } = options
  
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch single employee
  const fetchEmployee = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/employees?action=get_employee&employeeId=${id}&userRole=${userRole}`)
      const result = await response.json()
      
      if (result.success) {
        setEmployee(result.data)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('[v0] Error fetching employee:', err)
      setError('Failed to fetch employee data')
    } finally {
      setIsLoading(false)
    }
  }, [userRole])

  // Fetch all employees (HR only)
  const fetchAllEmployees = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/employees?action=get_all_employees&userRole=${userRole}`)
      const result = await response.json()
      
      if (result.success) {
        setEmployees(result.data)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('[v0] Error fetching employees:', err)
      setError('Failed to fetch employees')
    } finally {
      setIsLoading(false)
    }
  }, [userRole])

  // Fetch attendance records
  const fetchAttendance = useCallback(async (empId?: string) => {
    const targetId = empId || employeeId
    
    try {
      const params = new URLSearchParams({
        action: 'get_attendance',
        userRole,
      })
      
      if (targetId) params.append('employeeId', targetId)
      
      const response = await fetch(`/api/employees?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setAttendance(result.data)
      }
    } catch (err) {
      console.error('[v0] Error fetching attendance:', err)
    }
  }, [employeeId, userRole])

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async (empId?: string) => {
    const targetId = empId || employeeId
    
    try {
      const params = new URLSearchParams({
        action: 'get_leave_requests',
        userRole,
      })
      
      if (targetId) params.append('employeeId', targetId)
      
      const response = await fetch(`/api/employees?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setLeaveRequests(result.data)
      }
    } catch (err) {
      console.error('[v0] Error fetching leave requests:', err)
    }
  }, [employeeId, userRole])

  // Fetch salary slips
  const fetchSalarySlips = useCallback(async (empId?: string) => {
    const targetId = empId || employeeId
    
    try {
      const params = new URLSearchParams({
        action: 'get_salary_slips',
        userRole,
      })
      
      if (targetId) params.append('employeeId', targetId)
      
      const response = await fetch(`/api/employees?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setSalarySlips(result.data)
      }
    } catch (err) {
      console.error('[v0] Error fetching salary slips:', err)
    }
  }, [employeeId, userRole])

  // Add employee
  const addEmployee = useCallback(async (data: Partial<EmployeeData>): Promise<EmployeeData | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_employee', data, userRole }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchAllEmployees()
        return result.data
      } else {
        setError(result.message)
        return null
      }
    } catch (err) {
      console.error('[v0] Error adding employee:', err)
      setError('Failed to add employee')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [userRole, fetchAllEmployees])

  // Update employee
  const updateEmployee = useCallback(async (data: Partial<EmployeeData>): Promise<EmployeeData | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_employee', data, userRole }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchAllEmployees()
        return result.data
      } else {
        setError(result.message)
        return null
      }
    } catch (err) {
      console.error('[v0] Error updating employee:', err)
      setError('Failed to update employee')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [userRole, fetchAllEmployees])

  // Record attendance
  const recordAttendance = useCallback(async (data: { employeeId: string; action: string; notes?: string }): Promise<AttendanceRecord | null> => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_attendance', data, userRole }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchAttendance(data.employeeId)
        return result.data
      }
      
      return null
    } catch (err) {
      console.error('[v0] Error recording attendance:', err)
      return null
    }
  }, [userRole, fetchAttendance])

  // Submit leave request
  const submitLeaveRequest = useCallback(async (data: Partial<LeaveRequest>): Promise<LeaveRequest | null> => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_leave_request', data, userRole }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchLeaveRequests(data.employeeId)
        return result.data
      }
      
      return null
    } catch (err) {
      console.error('[v0] Error submitting leave request:', err)
      return null
    }
  }, [userRole, fetchLeaveRequests])

  // Update leave status
  const updateLeaveStatus = useCallback(async (id: string, status: 'approved' | 'rejected', comment?: string): Promise<LeaveRequest | null> => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_leave_status',
          data: { id, status, managerComment: comment },
          userRole,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchLeaveRequests()
        return result.data
      }
      
      return null
    } catch (err) {
      console.error('[v0] Error updating leave status:', err)
      return null
    }
  }, [userRole, fetchLeaveRequests])

  // Create salary slip
  const createSalarySlip = useCallback(async (data: Partial<SalarySlip>): Promise<SalarySlip | null> => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_salary_slip', data, userRole }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchSalarySlips(data.employeeId)
        return result.data
      }
      
      return null
    } catch (err) {
      console.error('[v0] Error creating salary slip:', err)
      return null
    }
  }, [userRole, fetchSalarySlips])

  // Refresh all data
  const refresh = useCallback(async () => {
    if (userRole === 'admin' || userRole === 'hr_manager') {
      await Promise.all([
        fetchAllEmployees(),
        fetchAttendance(),
        fetchLeaveRequests(),
        fetchSalarySlips(),
      ])
    } else if (employeeId) {
      await Promise.all([
        fetchEmployee(employeeId),
        fetchAttendance(employeeId),
        fetchLeaveRequests(employeeId),
        fetchSalarySlips(employeeId),
      ])
    }
  }, [employeeId, userRole, fetchEmployee, fetchAllEmployees, fetchAttendance, fetchLeaveRequests, fetchSalarySlips])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refresh()
    }
  }, [autoFetch, refresh])

  return {
    employee,
    employees,
    attendance,
    leaveRequests,
    salarySlips,
    isLoading,
    error,
    
    fetchEmployee,
    fetchAllEmployees,
    fetchAttendance,
    fetchLeaveRequests,
    fetchSalarySlips,
    
    addEmployee,
    updateEmployee,
    recordAttendance,
    submitLeaveRequest,
    updateLeaveStatus,
    createSalarySlip,
    
    refresh,
  }
}
