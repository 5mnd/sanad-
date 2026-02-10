'use client';

/**
 * Client-Side ERPNext API Wrapper
 * 
 * Uses the secure server-side API route to make ERPNext calls
 * without exposing API secrets to the browser
 */

import { parseERPNextError } from './erpnext-api'
import type {
  SalesInvoicePayload,
  AttendancePayload,
  ItemPayload,
  LeaveApplicationPayload,
  AdditionalSalaryPayload,
} from './erpnext-api'

export interface ClientAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Makes a secure API call through the server-side proxy
 */
async function callSecureAPI(action: string, params: any = {}): Promise<ClientAPIResponse> {
  try {
    const response = await fetch('/api/erpnext', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...params,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'API request failed')
    }

    return result
  } catch (error: any) {
    console.error('[ERPNext Client] Error:', error)
    return {
      success: false,
      error: error.message || 'An error occurred',
    }
  }
}

/**
 * Sales API Client
 */
export const salesAPI = {
  /**
   * Create and optionally submit a sales invoice
   */
  async createInvoice(payload: SalesInvoicePayload, autoSubmit = false): Promise<ClientAPIResponse> {
    return callSecureAPI('create_invoice', { payload, autoSubmit })
  },

  /**
   * Submit an existing invoice
   */
  async submitInvoice(invoiceName: string): Promise<ClientAPIResponse> {
    return callSecureAPI('submit_invoice', { invoiceName })
  },

  /**
   * Get ZATCA QR code for an invoice
   */
  async getZATCAQR(invoiceName: string): Promise<ClientAPIResponse<{ qr_code: string | null }>> {
    return callSecureAPI('get_zatca_qr', { invoiceName })
  },

  /**
   * Get sales leaderboard data
   */
  async getLeaderboard(fromDate: string, toDate: string): Promise<ClientAPIResponse<any[]>> {
    return callSecureAPI('get_sales_leaderboard', { fromDate, toDate })
  },
}

/**
 * HR API Client
 */
export const hrAPI = {
  /**
   * Create or update attendance record
   */
  async createAttendance(payload: AttendancePayload): Promise<ClientAPIResponse> {
    return callSecureAPI('create_attendance', { payload })
  },

  /**
   * Get attendance for specific employee and date
   */
  async getAttendance(employee: string, date: string): Promise<ClientAPIResponse> {
    return callSecureAPI('get_attendance', { employee, date })
  },

  /**
   * Create leave application
   */
  async createLeaveApplication(payload: LeaveApplicationPayload): Promise<ClientAPIResponse> {
    return callSecureAPI('create_leave_application', { payload })
  },

  /**
   * Update leave application status
   */
  async updateLeaveStatus(
    leaveName: string,
    status: 'Approved' | 'Rejected',
    approver: string
  ): Promise<ClientAPIResponse> {
    return callSecureAPI('update_leave_status', { leaveName, status, approver })
  },

  /**
   * Create payroll adjustment
   */
  async createPayrollAdjustment(payload: AdditionalSalaryPayload): Promise<ClientAPIResponse> {
    return callSecureAPI('create_payroll_adjustment', { payload })
  },

  /**
   * Get pending leave applications
   */
  async getPendingLeaves(branch?: string): Promise<ClientAPIResponse<any[]>> {
    return callSecureAPI('get_pending_leaves', { branch })
  },
}

/**
 * Inventory API Client
 */
export const inventoryAPI = {
  /**
   * Create item in ERPNext
   */
  async createItem(payload: ItemPayload): Promise<ClientAPIResponse> {
    return callSecureAPI('create_item', { payload })
  },

  /**
   * Upload item image (Base64)
   */
  async uploadItemImage(
    itemCode: string,
    fileName: string,
    base64Content: string
  ): Promise<ClientAPIResponse<{ image_url: string | null }>> {
    return callSecureAPI('upload_item_image', { itemCode, fileName, base64Content })
  },

  /**
   * Get items from ERPNext
   */
  async getItems(filters?: Record<string, any>): Promise<ClientAPIResponse<any[]>> {
    return callSecureAPI('get_items', { filters })
  },
}

/**
 * Test ERPNext connection
 */
export async function testERPNextConnection(): Promise<boolean> {
  const result = await callSecureAPI('test_connection')
  return result.success && result.data?.connected === true
}

/**
 * Polling utility for real-time updates
 * Prevents memory leaks and excessive API calls
 */
export class PollingManager {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false

  constructor(
    private callback: () => Promise<void>,
    private intervalMs: number = 30000
  ) {}

  start(): void {
    if (this.isPolling) {
      console.warn('[PollingManager] Already polling')
      return
    }

    this.isPolling = true
    
    // Initial call
    this.callback().catch(err => 
      console.error('[PollingManager] Callback error:', err)
    )

    // Set up interval
    this.intervalId = setInterval(() => {
      if (this.isPolling) {
        this.callback().catch(err =>
          console.error('[PollingManager] Callback error:', err)
        )
      }
    }, this.intervalMs)

    console.log(`[PollingManager] Started polling every ${this.intervalMs}ms`)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isPolling = false
    console.log('[PollingManager] Stopped polling')
  }

  restart(): void {
    this.stop()
    this.start()
  }

  isActive(): boolean {
    return this.isPolling
  }
}

/**
 * Create a polling manager with automatic cleanup
 * Usage in React components:
 * 
 * useEffect(() => {
 *   const poller = createPollingManager(async () => {
 *     await fetchData()
 *   }, 30000)
 *   
 *   poller.start()
 *   
 *   return () => poller.stop()
 * }, [])
 */
export function createPollingManager(
  callback: () => Promise<void>,
  intervalMs: number = 30000
): PollingManager {
  return new PollingManager(callback, intervalMs)
}
