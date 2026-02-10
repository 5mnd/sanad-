import { NextRequest, NextResponse } from 'next/server'

/**
 * Analytics API - يجلب البيانات الحقيقية من localStorage و ERPNext
 * Fetches real data from localStorage and ERPNext for analytics dashboard
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  nameEn: string
  branchId: string
  branchName: string
  designation: string
  sales: number
  transactions: number
  lastCheckIn?: string
  status: 'active' | 'on_leave' | 'terminated'
}

interface Branch {
  id: string
  name: string
  nameEn: string
  revenue: number
  transactions: number
  employees: number
}

interface SalesData {
  date: string
  revenue: number
  transactions: number
}

interface AnalyticsData {
  employees: Employee[]
  branches: Branch[]
  salesHistory: SalesData[]
  totals: {
    totalRevenue: number
    totalTransactions: number
    activeEmployees: number
    averageBasket: number
  }
  topPerformers: {
    topEmployee: Employee | null
    topBranch: Branch | null
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function parseLocalStorageData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key)
    if (!data) return defaultValue
    return JSON.parse(data) as T
  } catch (error) {
    console.error(`[v0] Error parsing localStorage key ${key}:`, error)
    return defaultValue
  }
}

function aggregateSalesByEmployee(invoices: any[]): Map<string, { sales: number; transactions: number }> {
  const employeeMap = new Map<string, { sales: number; transactions: number }>()

  for (const invoice of invoices) {
    const employeeId = invoice.employeeId || invoice.cashier_id || 'UNKNOWN'
    const total = invoice.total || invoice.grand_total || 0

    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, { sales: 0, transactions: 0 })
    }

    const stats = employeeMap.get(employeeId)!
    stats.sales += total
    stats.transactions += 1
  }

  return employeeMap
}

function aggregateSalesByBranch(invoices: any[]): Map<string, { revenue: number; transactions: number }> {
  const branchMap = new Map<string, { revenue: number; transactions: number }>()

  for (const invoice of invoices) {
    const branchId = invoice.branchId || invoice.branch || 'UNKNOWN'
    const total = invoice.total || invoice.grand_total || 0

    if (!branchMap.has(branchId)) {
      branchMap.set(branchId, { revenue: 0, transactions: 0 })
    }

    const stats = branchMap.get(branchId)!
    stats.revenue += total
    stats.transactions += 1
  }

  return branchMap
}

function aggregateSalesByDate(invoices: any[]): SalesData[] {
  const dateMap = new Map<string, { revenue: number; transactions: number }>()

  for (const invoice of invoices) {
    const date = invoice.posting_date || invoice.date || new Date().toISOString().split('T')[0]
    const total = invoice.total || invoice.grand_total || 0

    if (!dateMap.has(date)) {
      dateMap.set(date, { revenue: 0, transactions: 0 })
    }

    const stats = dateMap.get(date)!
    stats.revenue += total
    stats.transactions += 1
  }

  // Convert to array and sort by date
  return Array.from(dateMap.entries())
    .map(([date, stats]) => ({
      date,
      revenue: stats.revenue,
      transactions: stats.transactions,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30) // Last 30 days
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    console.log('[v0] Analytics API: Fetching real data...')

    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return NextResponse.json(
        {
          success: false,
          message: 'Analytics data can only be fetched from client-side',
          error: 'SERVER_SIDE_CALL',
        },
        { status: 400 }
      )
    }

    // Fetch data from localStorage
    const invoices = parseLocalStorageData<any[]>('sanad_invoices', [])
    const employees = parseLocalStorageData<any[]>('sanad_employees', [])
    const branches = parseLocalStorageData<any[]>('sanad_branches', [])
    const attendanceRecords = parseLocalStorageData<any[]>('sanad_attendance', [])
    const shiftData = parseLocalStorageData<any>('sanad_current_shift', null)

    console.log('[v0] Analytics: Data loaded from localStorage', {
      invoices: invoices.length,
      employees: employees.length,
      branches: branches.length,
      attendance: attendanceRecords.length,
    })

    // Aggregate sales by employee
    const employeeSalesMap = aggregateSalesByEmployee(invoices)

    // Build employee analytics
    const employeeAnalytics: Employee[] = employees.map((emp) => {
      const stats = employeeSalesMap.get(emp.id) || { sales: 0, transactions: 0 }
      const lastAttendance = attendanceRecords
        .filter((rec: any) => rec.employeeId === emp.id && rec.action === 'check_in')
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

      return {
        id: emp.id,
        name: emp.name || emp.employee_name || 'موظف غير معروف',
        nameEn: emp.nameEn || emp.employee_name_en || 'Unknown Employee',
        branchId: emp.branchId || emp.branch || 'BRANCH-001',
        branchName: emp.branchName || 'الفرع الرئيسي',
        designation: emp.designation || emp.job_title || 'موظف',
        sales: stats.sales,
        transactions: stats.transactions,
        lastCheckIn: lastAttendance?.timestamp,
        status: emp.status || 'active',
      }
    })

    // Aggregate sales by branch
    const branchSalesMap = aggregateSalesByBranch(invoices)

    // Build branch analytics
    const branchAnalytics: Branch[] = branches.map((branch) => {
      const stats = branchSalesMap.get(branch.id) || { revenue: 0, transactions: 0 }
      const branchEmployees = employees.filter((emp: any) => emp.branchId === branch.id || emp.branch === branch.id)

      return {
        id: branch.id,
        name: branch.name || branch.branch_name || 'فرع غير معروف',
        nameEn: branch.nameEn || branch.branch_name_en || 'Unknown Branch',
        revenue: stats.revenue,
        transactions: stats.transactions,
        employees: branchEmployees.length,
      }
    })

    // Build sales history
    const salesHistory = aggregateSalesByDate(invoices)

    // Calculate totals
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || inv.grand_total || 0), 0)
    const totalTransactions = invoices.length
    const activeEmployees = employees.filter((emp: any) => emp.status === 'active').length
    const averageBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Find top performers
    const topEmployee =
      employeeAnalytics.length > 0
        ? employeeAnalytics.reduce((top, emp) => (emp.sales > top.sales ? emp : top))
        : null

    const topBranch =
      branchAnalytics.length > 0 ? branchAnalytics.reduce((top, branch) => (branch.revenue > top.revenue ? branch : top)) : null

    // Build response
    const analyticsData: AnalyticsData = {
      employees: employeeAnalytics,
      branches: branchAnalytics,
      salesHistory,
      totals: {
        totalRevenue,
        totalTransactions,
        activeEmployees,
        averageBasket,
      },
      topPerformers: {
        topEmployee,
        topBranch,
      },
    }

    console.log('[v0] Analytics: Data aggregated successfully', {
      employees: employeeAnalytics.length,
      branches: branchAnalytics.length,
      salesHistory: salesHistory.length,
      totalRevenue,
      totalTransactions,
    })

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Analytics API Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'خطأ في جلب بيانات التحليلات / Error fetching analytics data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
