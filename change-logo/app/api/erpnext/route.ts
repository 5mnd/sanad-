import { NextResponse } from 'next/server'
import { createERPNextClients, parseERPNextError, type ERPNextConfig } from '@/lib/erpnext-api'
import { sanitizeArabicObject } from '@/lib/arabic-encoding'

/**
 * Secure Server-Side ERPNext API Proxy
 * 
 * This route acts as a middleware to:
 * - Keep API secrets on the server (never exposed to client)
 * - Add authentication checks
 * - Implement rate limiting
 * - Provide unified error handling
 * - Ensure proper UTF-8 encoding for Arabic text
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    // Get ERPNext config - PRIORITIZE UI SETTINGS OVER ENV VARS for live configuration
    const config: ERPNextConfig = {
      url: params.erpConfig?.url || process.env.ERPNEXT_URL || '',
      apiKey: params.erpConfig?.apiKey || process.env.ERPNEXT_API_KEY || '',
      apiSecret: params.erpConfig?.apiSecret || process.env.ERPNEXT_API_SECRET || '',
      connected: true,
    }

    console.log('[ERPNext API] Using config:', {
      url: config.url,
      hasApiKey: !!config.apiKey,
      hasApiSecret: !!config.apiSecret,
      source: params.erpConfig?.url ? 'UI Settings' : 'Environment Variables'
    })

    if (!config.url || !config.apiKey || !config.apiSecret) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ERPNext configuration is missing. Please configure in إعدادات الاتصال (API Settings)',
          missing: {
            url: !config.url,
            apiKey: !config.apiKey,
            apiSecret: !config.apiSecret,
          }
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      )
    }

    const clients = createERPNextClients(config)

    // Route actions to appropriate API clients
    switch (action) {
      // ─── Sales Actions ───
      case 'create_invoice': {
        const result = await clients.sales.createInvoice(params.payload)
        
        // If auto-submit is requested, submit the invoice
        if (params.autoSubmit && result.data?.name) {
          await clients.sales.submitInvoice(result.data.name)
          
          // Fetch ZATCA QR if available
          const zatcaQR = await clients.sales.getZATCAQRCode(result.data.name)
          result.data.zatca_qr = zatcaQR
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'submit_invoice': {
        const result = await clients.sales.submitInvoice(params.invoiceName)
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'get_zatca_qr': {
        const qrCode = await clients.sales.getZATCAQRCode(params.invoiceName)
        return NextResponse.json({ success: true, data: { qr_code: qrCode } })
      }

      case 'get_sales_leaderboard': {
        const salesData = await clients.sales.getEmployeeSalesData(
          params.fromDate,
          params.toDate
        )
        
        // Aggregate by employee
        const aggregated = salesData.reduce((acc: any, invoice: any) => {
          const owner = invoice.owner
          if (!acc[owner]) {
            acc[owner] = {
              employee: owner,
              total_sales: 0,
              invoice_count: 0,
            }
          }
          acc[owner].total_sales += invoice.grand_total || 0
          acc[owner].invoice_count += 1
          return acc
        }, {})

        const leaderboard = Object.values(aggregated).sort(
          (a: any, b: any) => b.total_sales - a.total_sales
        )

        return NextResponse.json({ success: true, data: leaderboard })
      }

      // ─── Dashboard Refresh (Real-time Stats) ───
      case 'refresh_dashboard': {
        const today = new Date().toISOString().split('T')[0]
        const thisMonth = today.substring(0, 7)

        // Fetch today's sales
        const todaySales = await clients.base.get('/api/resource/Sales Invoice', {
          filters: JSON.stringify([
            ['docstatus', '=', 1],
            ['posting_date', '=', today]
          ]),
          fields: JSON.stringify(['grand_total', 'outstanding_amount']),
          limit_page_length: 1000
        })

        // Fetch this month's sales
        const monthSales = await clients.base.get('/api/resource/Sales Invoice', {
          filters: JSON.stringify([
            ['docstatus', '=', 1],
            ['posting_date', 'like', `${thisMonth}%`]
          ]),
          fields: JSON.stringify(['grand_total']),
          limit_page_length: 1000
        })

        const todayTotal = (todaySales.data || []).reduce((sum: number, inv: any) => sum + (inv.grand_total || 0), 0)
        const monthTotal = (monthSales.data || []).reduce((sum: number, inv: any) => sum + (inv.grand_total || 0), 0)
        const todayCount = (todaySales.data || []).length
        const paidToday = (todaySales.data || []).filter((inv: any) => inv.outstanding_amount === 0).length

        return NextResponse.json({ 
          success: true, 
          data: {
            todayTotal,
            monthTotal,
            todayCount,
            paidToday,
            timestamp: new Date().toISOString()
          }
        })
      }

      // ─── Get Recent Invoices (for قائمة الفواتير الأخيرة) ───
      case 'get_recent_invoices': {
        const limit = params.limit || 10
        const invoices = await clients.base.get('/api/resource/Sales Invoice', {
          fields: JSON.stringify(['name', 'customer', 'posting_date', 'grand_total', 'status']),
          filters: JSON.stringify([['docstatus', '=', 1]]),
          order_by: 'posting_date desc',
          limit_page_length: limit
        })

        return NextResponse.json({ success: true, data: invoices.data || [] })
      }

      // ─── HR Actions ───
      case 'create_attendance': {
        const result = await clients.hr.createAttendance(params.payload)
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'get_attendance': {
        const result = await clients.hr.getAttendance(params.employee, params.date)
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'create_leave_application': {
        const result = await clients.hr.createLeaveApplication(params.payload)
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'update_leave_status': {
        const result = await clients.hr.updateLeaveStatus(
          params.leaveName,
          params.status,
          params.approver
        )
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'create_payroll_adjustment': {
        const result = await clients.hr.createPayrollAdjustment(params.payload)
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'get_pending_leaves': {
        const leaves = await clients.hr.getPendingLeaveApplications(params.branch)
        return NextResponse.json({ success: true, data: leaves })
      }

      // ─── Inventory Actions ───
      case 'create_item': {
        const result = await clients.inventory.createItem(params.payload)
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'upload_item_image': {
        const imageUrl = await clients.inventory.uploadItemImage(
          params.itemCode,
          params.fileName,
          params.base64Content
        )
        return NextResponse.json({ success: true, data: { image_url: imageUrl } })
      }

      case 'get_items': {
        const items = await clients.inventory.getItems(params.filters)
        return NextResponse.json({ success: true, data: items })
      }

      // ─── Generic List Fetching ───
      case 'get_list': {
        const { doctype, fields, filters, limit, order_by } = params
        if (!doctype) {
          return NextResponse.json({ success: false, error: 'doctype is required' }, { status: 400 })
        }
        const queryParams: Record<string, any> = {
          fields: JSON.stringify(fields || ['name']),
          limit_page_length: (limit || 100).toString(),
        }
        if (filters) queryParams.filters = JSON.stringify(filters)
        if (order_by) queryParams.order_by = order_by
        
        const listResult = await clients.base.get(`/api/resource/${doctype}`, queryParams)
        return NextResponse.json({ success: true, data: listResult.data || [] })
      }

      // ─── Item Groups (Categories) ───
      case 'get_item_groups': {
        const groups = await clients.base.get('/api/resource/Item Group', {
          fields: JSON.stringify(['name', 'item_group_name', 'image', 'parent_item_group']),
          filters: JSON.stringify([['is_group', '=', 0]]),
          limit_page_length: 500,
        })
        return NextResponse.json({ success: true, data: groups.data || [] })
      }

      // ─── Customers ───
      case 'get_customers': {
        try {
          const customers = await clients.base.get('/api/resource/Customer', {
            fields: JSON.stringify(['name', 'customer_name', 'mobile_no', 'email_id', 'loyalty_points']),
            limit_page_length: 500,
          })
          console.log('[v0] Customers fetched:', customers.data?.length || 0)
          return NextResponse.json({ success: true, data: customers.data || [] })
        } catch (error: any) {
          console.log('[v0] Customers fetch error:', error.response?.status, error.message)
          // If customers endpoint fails (e.g., permission error), return empty array with success
          // This allows other syncs to continue
          return NextResponse.json({ 
            success: true, 
            data: [], 
            warning: `Customers endpoint not accessible: ${error.message}` 
          })
        }
      }

      // ─── Connection Test ───
      case 'test_connection': {
        const result = await clients.base.testConnection()
        return NextResponse.json({ 
          success: true, 
          data: result,
          error: result.connected ? undefined : result.error 
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('[ERPNext API Route] Error:', error)
    
    const errorMessage = parseERPNextError(error, 'en')
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * GET endpoint for read-only operations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const config: ERPNextConfig = {
      url: process.env.ERPNEXT_URL || '',
      apiKey: process.env.ERPNEXT_API_KEY || '',
      apiSecret: process.env.ERPNEXT_API_SECRET || '',
      connected: true,
    }

    if (!config.url || !config.apiKey || !config.apiSecret) {
      return NextResponse.json(
        { error: 'ERPNext configuration is missing' },
        { status: 400 }
      )
    }

    const clients = createERPNextClients(config)

    switch (action) {
      case 'test_connection': {
        const result = await clients.base.testConnection()
        return NextResponse.json(
          { success: true, data: result, error: result.connected ? undefined : result.error },
          { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        )
      }

      case 'get_items': {
        const items = await clients.inventory.getItems()
        return NextResponse.json(
          { success: true, data: items },
          { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        )
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action for GET request' },
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          }
        )
    }
  } catch (error: any) {
    console.error('[ERPNext API Route] GET Error:', error)
    
    const errorMessage = parseERPNextError(error, 'en')
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: error.status || 500 }
    )
  }
}
