import { NextResponse } from 'next/server'
import type { AuditLogEntry, SanadAuditLogDocType } from '@/lib/audit-logger'

/**
 * Audit Log API Route
 * 
 * Securely sends audit logs to ERPNext "Sanad Audit Log" custom DocType
 */

export async function POST(request: Request) {
  try {
    const { logs } = await request.json() as { logs: AuditLogEntry[] }

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid audit logs payload' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // Get ERPNext config from environment
    const erpConfig = {
      url: process.env.ERPNEXT_URL || '',
      apiKey: process.env.ERPNEXT_API_KEY || '',
      apiSecret: process.env.ERPNEXT_API_SECRET || '',
    }

    if (!erpConfig.url || !erpConfig.apiKey || !erpConfig.apiSecret) {
      console.warn('[v0] ERPNext not configured, audit logs stored locally only')
      return NextResponse.json(
        { success: true, message: 'Logs queued (ERPNext not configured)' },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    // Transform logs to ERPNext DocType format
    const erpLogs: Partial<SanadAuditLogDocType>[] = logs.map(log => ({
      doctype: 'Sanad Audit Log',
      timestamp: log.timestamp,
      user_id: log.user_id,
      user_name: log.user_name,
      action_type: log.action_type,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      old_value: log.old_value?.toString() || '',
      new_value: log.new_value?.toString() || '',
      ip_address: log.ip_address,
      user_agent: log.user_agent || '',
      branch_id: log.branch_id || '',
      metadata_json: log.metadata ? JSON.stringify(log.metadata) : '',
      severity: log.severity,
    }))

    // Send to ERPNext (batch insert)
    const results = await Promise.allSettled(
      erpLogs.map(async (log) => {
        const response = await fetch(`${erpConfig.url}/api/resource/Sanad Audit Log`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${erpConfig.apiKey}:${erpConfig.apiSecret}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(log),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`ERPNext error: ${error}`)
        }

        return response.json()
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[v0] Audit logs: ${successful} success, ${failed} failed`)

    return NextResponse.json(
      { 
        success: true, 
        message: `${successful}/${logs.length} logs synced to ERPNext`,
        successful,
        failed 
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )

  } catch (error) {
    console.error('[v0] Audit log API error:', error)
    return NextResponse.json(
      { error: 'Failed to process audit logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
}
