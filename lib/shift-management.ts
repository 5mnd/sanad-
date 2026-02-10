/**
 * Financial Grip: Shift & Cash Management System
 * 
 * Features:
 * - Shift lifecycle management (Open/Close)
 * - X-Report calculator (Expected vs Actual cash)
 * - Cash discrepancy tracking
 * - Automatic PDF report generation
 * - Telegram notifications to managers
 * - Full ERPNext POS Shift integration
 */

import { logShiftAction, logCashDiscrepancy } from './audit-logger'
import type { ERPNextConfig } from './erpnext-api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface POSShift {
  id: string
  name: string // ERPNext document name
  user: string
  user_name: string
  branch: string
  pos_profile?: string
  opening_time: string
  closing_time?: string
  status: 'Open' | 'Closed'
  opening_cash: number
  expected_cash: number
  actual_cash?: number
  cash_discrepancy?: number
  total_sales: number
  total_returns: number
  total_transactions: number
  payment_methods: PaymentMethodSummary[]
}

export interface PaymentMethodSummary {
  mode: string // 'Cash', 'mada', 'STC Pay'
  amount: number
  count: number
}

export interface XReportData {
  shift_id: string
  shift_name: string
  user: string
  user_name: string
  branch: string
  opening_time: string
  closing_time: string
  opening_cash: number
  expected_cash_sales: number
  expected_total_cash: number
  actual_cash_in_drawer: number
  cash_discrepancy: number
  discrepancy_percentage: number
  total_sales: number
  total_transactions: number
  payment_breakdown: PaymentMethodSummary[]
  top_selling_items?: Array<{ item: string; qty: number; revenue: number }>
}

export interface ShiftOpenPayload {
  user: string
  user_name: string
  branch: string
  pos_profile?: string
  opening_cash: number
}

export interface ShiftClosePayload {
  shift_id: string
  shift_name: string
  actual_cash: number
  closing_notes?: string
}

// ─── Shift Manager Class ──────────────────────────────────────────────────────

export class ShiftManager {
  private static currentShift: POSShift | null = null

  /**
   * Open a new POS shift
   */
  static async openShift(payload: ShiftOpenPayload, erpConfig: ERPNextConfig): Promise<POSShift> {
    try {
      // Check if shift already open
      if (this.currentShift && this.currentShift.status === 'Open') {
        throw new Error('A shift is already open. Please close it first.')
      }

      // Create shift in ERPNext
      const response = await fetch('/api/shift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          action: 'open',
          ...payload,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to open shift in ERPNext')
      }

      const { data } = await response.json()

      const shift: POSShift = {
        id: data.name,
        name: data.name,
        user: payload.user,
        user_name: payload.user_name,
        branch: payload.branch,
        pos_profile: payload.pos_profile,
        opening_time: new Date().toISOString(),
        status: 'Open',
        opening_cash: payload.opening_cash,
        expected_cash: payload.opening_cash,
        total_sales: 0,
        total_returns: 0,
        total_transactions: 0,
        payment_methods: [],
      }

      this.currentShift = shift

      // Log audit trail
      await logShiftAction(
        payload.user,
        payload.user_name,
        'OPEN',
        shift.id,
        payload.branch,
        { opening_cash: payload.opening_cash }
      )

      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('sanad_current_shift', JSON.stringify(shift))
      }

      return shift

    } catch (error) {
      console.error('[v0] Shift open error:', error)
      throw error
    }
  }

  /**
   * Close current shift and generate X-Report
   */
  static async closeShift(payload: ShiftClosePayload, erpConfig: ERPNextConfig): Promise<XReportData> {
    try {
      if (!this.currentShift || this.currentShift.status === 'Closed') {
        throw new Error('No open shift to close')
      }

      // Calculate X-Report
      const xReport = await this.generateXReport(payload.actual_cash)

      // Close shift in ERPNext
      const response = await fetch('/api/shift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          action: 'close',
          shift_id: payload.shift_id,
          shift_name: payload.shift_name,
          actual_cash: payload.actual_cash,
          closing_notes: payload.closing_notes,
          x_report: xReport,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to close shift in ERPNext')
      }

      // Log audit trail
      await logShiftAction(
        this.currentShift.user,
        this.currentShift.user_name,
        'CLOSE',
        this.currentShift.id,
        this.currentShift.branch,
        {
          expected_cash: xReport.expected_total_cash,
          actual_cash: payload.actual_cash,
          discrepancy: xReport.cash_discrepancy,
        }
      )

      // Log cash discrepancy if exists
      if (Math.abs(xReport.cash_discrepancy) > 0) {
        await logCashDiscrepancy(
          this.currentShift.user,
          this.currentShift.user_name,
          this.currentShift.id,
          xReport.expected_total_cash,
          payload.actual_cash,
          this.currentShift.branch
        )
      }

      // Generate PDF report
      await this.generatePDFReport(xReport)

      // Send Telegram notification
      await this.sendManagerNotification(xReport)

      // Clear current shift
      this.currentShift = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sanad_current_shift')
      }

      return xReport

    } catch (error) {
      console.error('[v0] Shift close error:', error)
      throw error
    }
  }

  /**
   * Generate X-Report (Cash reconciliation report)
   */
  private static async generateXReport(actualCash: number): Promise<XReportData> {
    if (!this.currentShift) {
      throw new Error('No active shift')
    }

    const cashPayments = this.currentShift.payment_methods.find(p => p.mode === 'Cash')
    const expectedCashSales = cashPayments?.amount || 0
    const expectedTotalCash = this.currentShift.opening_cash + expectedCashSales
    const cashDiscrepancy = actualCash - expectedTotalCash
    const discrepancyPercentage = expectedTotalCash > 0 
      ? (cashDiscrepancy / expectedTotalCash) * 100 
      : 0

    return {
      shift_id: this.currentShift.id,
      shift_name: this.currentShift.name,
      user: this.currentShift.user,
      user_name: this.currentShift.user_name,
      branch: this.currentShift.branch,
      opening_time: this.currentShift.opening_time,
      closing_time: new Date().toISOString(),
      opening_cash: this.currentShift.opening_cash,
      expected_cash_sales: expectedCashSales,
      expected_total_cash: expectedTotalCash,
      actual_cash_in_drawer: actualCash,
      cash_discrepancy: cashDiscrepancy,
      discrepancy_percentage: discrepancyPercentage,
      total_sales: this.currentShift.total_sales,
      total_transactions: this.currentShift.total_transactions,
      payment_breakdown: this.currentShift.payment_methods,
    }
  }

  /**
   * Generate PDF report for X-Report
   */
  private static async generatePDFReport(xReport: XReportData): Promise<void> {
    try {
      // Send to PDF generation endpoint
      await fetch('/api/generate-x-report-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(xReport),
      })

      console.log('[v0] X-Report PDF generated')
    } catch (error) {
      console.error('[v0] PDF generation error:', error)
    }
  }

  /**
   * Send Telegram notification to manager
   */
  private static async sendManagerNotification(xReport: XReportData): Promise<void> {
    try {
      const message = this.buildTelegramMessage(xReport)

      await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          type: 'shift_closed',
          message,
          priority: Math.abs(xReport.cash_discrepancy) > 100 ? 'high' : 'normal',
        }),
      })

      console.log('[v0] Manager notification sent')
    } catch (error) {
      console.error('[v0] Telegram notification error:', error)
    }
  }

  /**
   * Build Telegram message for shift closure
   */
  private static buildTelegramMessage(xReport: XReportData): string {
    const discrepancyEmoji = xReport.cash_discrepancy > 0 ? '📈' : xReport.cash_discrepancy < 0 ? '📉' : '✅'
    const statusEmoji = Math.abs(xReport.cash_discrepancy) <= 10 ? '✅' : '⚠️'

    return [
      `${statusEmoji} *إغلاق وردية - نظام سند*`,
      '',
      `👤 *الموظف:* ${xReport.user_name}`,
      `🏢 *الفرع:* ${xReport.branch}`,
      `⏰ *وقت الإغلاق:* ${new Date(xReport.closing_time).toLocaleString('ar-SA')}`,
      '',
      `💰 *النقد المتوقع:* ${xReport.expected_total_cash.toFixed(2)} ر.س`,
      `💵 *النقد الفعلي:* ${xReport.actual_cash_in_drawer.toFixed(2)} ر.س`,
      `${discrepancyEmoji} *الفرق:* ${xReport.cash_discrepancy.toFixed(2)} ر.س (${xReport.discrepancy_percentage.toFixed(2)}%)`,
      '',
      `📊 *إجمالي المبيعات:* ${xReport.total_sales.toFixed(2)} ر.س`,
      `🧾 *عدد المعاملات:* ${xReport.total_transactions}`,
    ].join('\n')
  }

  /**
   * Get current active shift
   */
  static getCurrentShift(): POSShift | null {
    // Try to restore from localStorage if not in memory
    if (!this.currentShift && typeof window !== 'undefined') {
      const stored = localStorage.getItem('sanad_current_shift')
      if (stored) {
        try {
          this.currentShift = JSON.parse(stored)
        } catch {
          localStorage.removeItem('sanad_current_shift')
        }
      }
    }
    return this.currentShift
  }

  /**
   * Update shift sales data
   */
  static updateShiftSales(
    amount: number, 
    paymentMethod: string,
    isReturn = false
  ): void {
    if (!this.currentShift || this.currentShift.status !== 'Open') {
      return
    }

    if (isReturn) {
      this.currentShift.total_returns += amount
    } else {
      this.currentShift.total_sales += amount
      this.currentShift.total_transactions += 1

      // Update expected cash
      if (paymentMethod === 'cash') {
        this.currentShift.expected_cash += amount
      }

      // Update payment method summary
      const paymentIndex = this.currentShift.payment_methods.findIndex(
        p => p.mode === paymentMethod
      )

      if (paymentIndex >= 0) {
        this.currentShift.payment_methods[paymentIndex].amount += amount
        this.currentShift.payment_methods[paymentIndex].count += 1
      } else {
        this.currentShift.payment_methods.push({
          mode: paymentMethod,
          amount,
          count: 1,
        })
      }
    }

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanad_current_shift', JSON.stringify(this.currentShift))
    }
  }
}

export default ShiftManager
