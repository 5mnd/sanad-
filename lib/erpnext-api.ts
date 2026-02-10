/**
 * Centralized ERPNext v14+ API Client for Sanad
 * 
 * Production-ready features:
 * - Centralized configuration with environment variables
 * - Global error handling with Arabic/English toast support
 * - Automatic retry mechanism with exponential backoff
 * - Request timeout handling
 * - Type-safe API calls
 * - Server-side security (API secrets never exposed to client)
 */

// ─── Types & Interfaces ───────────────────────────────────────────────────────

export interface ERPNextConfig {
  url: string
  apiKey: string
  apiSecret: string
  connected: boolean
}

export interface ERPNextError {
  message: string
  exception?: string
  exc_type?: string
  _server_messages?: string
}

export interface APIResponse<T = any> {
  data: T
  message?: string
}

export interface SalesInvoicePayload {
  doctype: 'Sales Invoice'
  customer: string
  posting_date: string
  due_date?: string
  update_stock: 1
  items: Array<{
    item_code: string
    qty: number
    rate: number
    amount?: number
  }>
  company?: string
  branch?: string
  custom_zatca_status?: string
}

export interface AttendancePayload {
  doctype: 'Attendance'
  employee: string
  attendance_date: string
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day'
  custom_check_in_time?: string
  custom_check_out_time?: string
  custom_break_start?: string
  custom_break_end?: string
  custom_permission_time?: string
  branch?: string
  company?: string
}

export interface ItemPayload {
  doctype: 'Item'
  item_code: string
  item_name: string
  item_group: string
  stock_uom: string
  is_stock_item: 1
  valuation_rate?: number
  standard_rate?: number
  image?: string
  branch?: string
}

export interface LeaveApplicationPayload {
  doctype: 'Leave Application'
  employee: string
  leave_type: string
  from_date: string
  to_date: string
  description?: string
  status: 'Open' | 'Approved' | 'Rejected'
  leave_approver?: string
}

export interface AdditionalSalaryPayload {
  doctype: 'Additional Salary'
  employee: string
  salary_component: string
  amount: number
  payroll_date: string
  overwrite_salary_structure_amount: 0 | 1
  ref_doctype?: string
  ref_docname?: string
  company?: string
  custom_applied_by?: string
  custom_applied_by_name?: string
  custom_manager_role?: string
  remarks?: string
}

export interface FileUploadPayload {
  doctype: 'File'
  file_name: string
  file_url?: string
  is_private: 0 | 1
  attached_to_doctype?: string
  attached_to_name?: string
  content?: string // Base64 encoded file content
}

// ─── Configuration ────────────────────────────────────────────────────────────

const API_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 1 second

// ─── Error Handling ───────────────────────────────────────────────────────────

/**
 * Parses ERPNext/Frappe error response and extracts meaningful message
 */
export function parseERPNextError(error: any, language: 'ar' | 'en' = 'en'): string {
  console.error('[ERPNext API] Error:', error)

  // Handle network errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return language === 'ar' 
      ? 'انتهت مهلة الاتصال بـ ERPNext. يرجى المحاولة مرة أخرى.'
      : 'ERPNext connection timeout. Please try again.'
  }

  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return language === 'ar'
      ? 'فشل الاتصال بـ ERPNext. تحقق من اتصال الإنترنت.'
      : 'Failed to connect to ERPNext. Check your internet connection.'
  }

  // Handle ERPNext-specific errors
  if (error._server_messages) {
    try {
      const messages = JSON.parse(error._server_messages)
      if (Array.isArray(messages) && messages.length > 0) {
        const firstMsg = JSON.parse(messages[0])
        return firstMsg.message || firstMsg.title || 'Unknown error'
      }
    } catch (e) {
      // Fall through to default handling
    }
  }

  if (error.exception) {
    return error.exception
  }

  if (error.message) {
    return error.message
  }

  return language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Core API Client ──────────────────────────────────────────────────────────

export class ERPNextAPIClient {
  private config: ERPNextConfig
  private controller: AbortController | null = null

  constructor(config: ERPNextConfig) {
    this.config = config
    console.log('[ERPNext API] Client initialized with URL:', config.url)
  }

  /**
   * Update configuration dynamically (useful when user changes settings in UI)
   */
  updateConfig(config: ERPNextConfig): void {
    this.config = config
    console.log('[ERPNext API] Configuration updated:', {
      url: config.url,
      connected: config.connected,
      hasApiKey: !!config.apiKey,
      hasApiSecret: !!config.apiSecret,
    })
  }

  /**
   * Builds authorization headers for ERPNext API with UTF-8 encoding
   * Fetches latest config dynamically to ensure UI changes are reflected
   */
  private getHeaders(): Record<string, string> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      console.warn('[ERPNext API] Missing API credentials')
    }

    return {
      'Authorization': `token ${this.config.apiKey}:${this.config.apiSecret}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
      'Accept-Charset': 'utf-8',
    }
  }

  /**
   * Makes an API request with timeout and retry logic
   */
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<APIResponse<T>> {
    if (!this.config.connected || !this.config.url) {
      throw new Error('ERPNext is not configured or connected')
    }

    // Ensure URL has protocol prefix
    let rawUrl = this.config.url.replace(/\/+$/, '')
    if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`
    }
    const url = `${rawUrl}${endpoint}`

    // Create abort controller for timeout
    this.controller = new AbortController()
    const timeoutId = setTimeout(() => this.controller?.abort(), API_TIMEOUT)

    try {
      console.log(`[ERPNext API] ${options.method || 'GET'} ${endpoint}`)

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: this.controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
          status: response.status,
          statusText: response.statusText,
          ...errorData,
        }
      }

      const data = await response.json()
      return data as APIResponse<T>

    } catch (error: any) {
      clearTimeout(timeoutId)

      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && 
          (error.name === 'AbortError' || 
           error.message?.includes('fetch') ||
           error.status >= 500)) {
        
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount)
        console.log(`[ERPNext API] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`)
        await sleep(delay)
        return this.makeRequest<T>(endpoint, options, retryCount + 1)
      }

      throw error
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<APIResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
        }
      })
      url += `?${searchParams.toString()}`
    }

    return this.makeRequest<T>(url, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data: any): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ data }),
    })
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data: any): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * Test connection to ERPNext
   */
  async testConnection(): Promise<{ connected: boolean; user?: string; error?: string }> {
    try {
      console.log('[ERPNext API] Testing connection to:', this.config.url)
      const result = await this.get('/api/method/frappe.auth.get_logged_user')
      const user = result?.message || result?.data
      console.log('[ERPNext API] Connection test OK, user:', user)
      return { connected: true, user: String(user) }
    } catch (error: any) {
      let errMsg = 'Unknown error'
      if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
        errMsg = 'Connection timed out - server may be unreachable'
      } else if (error?.message?.includes('fetch') || error?.message?.includes('ENOTFOUND') || error?.message?.includes('NetworkError')) {
        errMsg = 'Cannot reach server - check URL and network'
      } else if (error?.status === 401) {
        errMsg = 'Authentication failed - check API Key and Secret'
      } else if (error?.status === 403) {
        errMsg = 'Permission denied - API user lacks permissions'
      } else if (error?.status >= 500) {
        errMsg = `Server error (${error.status})`
      } else if (error?.message) {
        errMsg = error.message
      } else if (error?.statusText) {
        errMsg = `${error.status} ${error.statusText}`
      }
      console.log('[ERPNext API] Connection test FAILED:', errMsg)
      return { connected: false, error: errMsg }
    }
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(): void {
    if (this.controller) {
      this.controller.abort()
      this.controller = null
    }
  }
}

// ─── Domain-Specific API Methods ──────────────────────────────────────────────

export class SalesAPI extends ERPNextAPIClient {
  /**
   * Create a Sales Invoice with proper ERPNext v14+ schema
   */
  async createInvoice(payload: SalesInvoicePayload): Promise<APIResponse<any>> {
    // Calculate amounts for items
    const itemsWithAmounts = payload.items.map(item => ({
      ...item,
      amount: item.rate * item.qty,
    }))

    const invoiceData = {
      ...payload,
      items: itemsWithAmounts,
      docstatus: 0, // Draft
    }

    const result = await this.post('/api/resource/Sales Invoice', invoiceData)
    console.log('[ERPNext API] Sales Invoice created:', result.data.name)
    return result
  }

  /**
   * Submit (finalize) a Sales Invoice
   */
  async submitInvoice(invoiceName: string): Promise<APIResponse<any>> {
    return this.put(`/api/resource/Sales Invoice/${invoiceName}`, {
      docstatus: 1, // Submitted
    })
  }

  /**
   * Fetch ZATCA QR Code data after invoice submission
   */
  async getZATCAQRCode(invoiceName: string): Promise<string | null> {
    try {
      const result = await this.get(`/api/resource/Sales Invoice/${invoiceName}`, {
        fields: JSON.stringify(['custom_zatca_qr_code', 'custom_zatca_invoice_hash']),
      })
      return result.data?.custom_zatca_qr_code || null
    } catch (error) {
      console.error('[ERPNext API] Failed to fetch ZATCA QR:', error)
      return null
    }
  }

  /**
   * Fetch sales data for leaderboard (aggregated by owner/employee)
   */
  async getEmployeeSalesData(fromDate: string, toDate: string): Promise<any[]> {
    const filters = [
      ['docstatus', '=', 1], // Only submitted invoices
      ['posting_date', '>=', fromDate],
      ['posting_date', '<=', toDate],
    ]

    const result = await this.get('/api/resource/Sales Invoice', {
      filters: JSON.stringify(filters),
      fields: JSON.stringify(['name', 'owner', 'grand_total', 'posting_date']),
      limit_page_length: 1000,
    })

    return result.data || []
  }
}

export class HRAPIClient extends ERPNextAPIClient {
  /**
   * Create or update attendance record
   */
  async createAttendance(payload: AttendancePayload): Promise<APIResponse<any>> {
    return this.post('/api/resource/Attendance', payload)
  }

  /**
   * Fetch attendance for an employee on a specific date
   */
  async getAttendance(employee: string, date: string): Promise<APIResponse<any>> {
    const filters = [
      ['employee', '=', employee],
      ['attendance_date', '=', date],
    ]

    const result = await this.get('/api/resource/Attendance', {
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        'name',
        'status',
        'custom_check_in_time',
        'custom_check_out_time',
        'custom_break_start',
        'custom_break_end',
        'custom_permission_time',
      ]),
      limit_page_length: 1,
    })

    return result
  }

  /**
   * Create leave application
   */
  async createLeaveApplication(payload: LeaveApplicationPayload): Promise<APIResponse<any>> {
    return this.post('/api/resource/Leave Application', payload)
  }

  /**
   * Update leave application status (approve/reject)
   */
  async updateLeaveStatus(
    leaveName: string,
    status: 'Approved' | 'Rejected',
    approver: string
  ): Promise<APIResponse<any>> {
    return this.put(`/api/resource/Leave Application/${leaveName}`, {
      status,
      leave_approver: approver,
    })
  }

  /**
   * Create payroll adjustment (Additional Salary)
   */
  async createPayrollAdjustment(payload: AdditionalSalaryPayload): Promise<APIResponse<any>> {
    return this.post('/api/resource/Additional Salary', payload)
  }

  /**
   * Fetch leave applications with pending status
   */
  async getPendingLeaveApplications(branch?: string): Promise<any[]> {
    const filters: any[] = [['status', '=', 'Open']]
    
    if (branch) {
      filters.push(['custom_branch', '=', branch])
    }

    const result = await this.get('/api/resource/Leave Application', {
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        'name',
        'employee',
        'leave_type',
        'from_date',
        'to_date',
        'status',
        'description',
      ]),
      limit_page_length: 100,
    })

    return result.data || []
  }
}

export class InventoryAPIClient extends ERPNextAPIClient {
  /**
   * Create or update an Item
   */
  async createItem(payload: ItemPayload): Promise<APIResponse<any>> {
    return this.post('/api/resource/Item', payload)
  }

  /**
   * Upload image and attach to Item
   */
  async uploadItemImage(
    itemCode: string,
    fileName: string,
    base64Content: string
  ): Promise<string | null> {
    try {
      // Upload file
      const filePayload: FileUploadPayload = {
        doctype: 'File',
        file_name: fileName,
        is_private: 0,
        attached_to_doctype: 'Item',
        attached_to_name: itemCode,
        content: base64Content,
      }

      const fileResult = await this.post('/api/resource/File', filePayload)
      const fileUrl = fileResult.data?.file_url

      if (fileUrl) {
        // Update Item with image URL
        await this.put(`/api/resource/Item/${itemCode}`, {
          image: fileUrl,
        })
      }

      return fileUrl
    } catch (error) {
      console.error('[ERPNext API] Failed to upload image:', error)
      return null
    }
  }

  /**
   * Fetch items with filters
   */
  async getItems(filters?: Record<string, any>): Promise<any[]> {
    const result = await this.get('/api/resource/Item', {
      filters: filters ? JSON.stringify(Object.entries(filters).map(([k, v]) => [k, '=', v])) : undefined,
      fields: JSON.stringify(['item_code', 'item_name', 'standard_rate', 'image', 'item_group']),
      limit_page_length: 500,
    })

    return result.data || []
  }
}

// ─── Factory Function ─────────────────────────────────────────────────────────

/**
 * Creates API client instances for different domains
 */
export function createERPNextClients(config: ERPNextConfig) {
  return {
    sales: new SalesAPI(config),
    hr: new HRAPIClient(config),
    inventory: new InventoryAPIClient(config),
    base: new ERPNextAPIClient(config),
  }
}
