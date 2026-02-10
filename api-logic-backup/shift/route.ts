import { NextResponse } from 'next/server'
import type { XReportData } from '@/lib/shift-management'

/**
 * POS Shift Management API Route
 * 
 * Handles shift open/close operations with ERPNext integration
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // Get ERPNext config
    const erpConfig = {
      url: process.env.ERPNEXT_URL || '',
      apiKey: process.env.ERPNEXT_API_KEY || '',
      apiSecret: process.env.ERPNEXT_API_SECRET || '',
    }

    if (!erpConfig.url || !erpConfig.apiKey || !erpConfig.apiSecret) {
      return NextResponse.json(
        { error: 'ERPNext not configured' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const headers = {
      'Authorization': `token ${erpConfig.apiKey}:${erpConfig.apiSecret}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
    }

    if (action === 'open') {
      // Open new shift
      const { user, user_name, branch, pos_profile, opening_cash } = body

      const shiftPayload = {
        doctype: 'POS Opening Entry',
        company: 'Sanad',
        pos_profile: pos_profile || 'Default POS Profile',
        user: user,
        period_start_date: new Date().toISOString().split('T')[0],
        posting_date: new Date().toISOString().split('T')[0],
        balance_details: [
          {
            mode_of_payment: 'Cash',
            opening_amount: opening_cash,
          },
        ],
      }

      const response = await fetch(`${erpConfig.url}/api/resource/POS Opening Entry`, {
        method: 'POST',
        headers,
        body: JSON.stringify(shiftPayload),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`ERPNext error: ${error}`)
      }

      const data = await response.json()

      return NextResponse.json(
        { success: true, data: data.data },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )

    } else if (action === 'close') {
      // Close existing shift
      const { shift_name, actual_cash, closing_notes, x_report } = body as {
        shift_name: string
        actual_cash: number
        closing_notes?: string
        x_report: XReportData
      }

      const closePayload = {
        doctype: 'POS Closing Entry',
        pos_opening_entry: shift_name,
        posting_date: new Date().toISOString().split('T')[0],
        period_end_date: new Date().toISOString().split('T')[0],
        payment_reconciliation: [
          {
            mode_of_payment: 'Cash',
            expected_amount: x_report.expected_total_cash,
            closing_amount: actual_cash,
            difference: x_report.cash_discrepancy,
          },
        ],
        custom_closing_notes: closing_notes || '',
        custom_x_report_json: JSON.stringify(x_report),
      }

      const response = await fetch(`${erpConfig.url}/api/resource/POS Closing Entry`, {
        method: 'POST',
        headers,
        body: JSON.stringify(closePayload),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`ERPNext error: ${error}`)
      }

      const data = await response.json()

      return NextResponse.json(
        { success: true, data: data.data },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

  } catch (error) {
    console.error('[v0] Shift API error:', error)
    return NextResponse.json(
      { error: 'Shift operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
}
