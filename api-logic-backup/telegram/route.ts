import { NextResponse } from 'next/server'
import { prepareArabicForMessaging, sanitizeArabicText } from '@/lib/arabic-encoding'

/**
 * Telegram Bot API middleware for Sanad attendance notifications.
 * Handles sending attendance alerts and testing bot connections with proper UTF-8 encoding.
 */

interface TelegramRequest {
  action: 'send_attendance' | 'test_connection' | 'send_invoice' | 'send_approval_request'
  botToken?: string
  chatId?: string
  // For attendance notifications
  employeeName?: string
  status?: 'check_in' | 'check_out'
  time?: string
  date?: string
  branch?: string
  // For invoice notifications
  invoice?: {
    id: string
    items: Array<{ name: string; qty: number; price: number }>
    subtotal: number
    vat: number
    total: number
    customer: string
    paymentMethod: string
  }
  zatcaQR?: string
  // For approval requests
  requestType?: 'permission' | 'vacation' | 'sick'
  fromDate?: string
  toDate?: string
  reason?: string
  requestId?: string
  timestamp?: string
}

function buildAttendanceMessage(data: TelegramRequest): string {
  const statusText = data.status === 'check_in' ? '\u2705 تسجيل دخول' : '\u26A0\uFE0F تسجيل خروج'
  
  // Sanitize Arabic text for messaging
  const employeeName = sanitizeArabicText(data.employeeName || '', 'messaging')
  const branch = sanitizeArabicText(data.branch || '', 'messaging')
  
  return [
    '\uD83D\uDD14 *تنبيه حضور جديد - نظام سند*',
    '',
    `\uD83D\uDC64 *الموظف:* ${employeeName}`,
    `\uD83D\uDCDD *الحالة:* ${statusText}`,
    `\u23F0 *الوقت:* ${data.time}`,
    `\uD83D\uDCC5 *التاريخ:* ${data.date}`,
    `\uD83D\uDCCD *الفرع:* ${branch}`,
  ].join('\n')
}

function buildInvoiceMessage(data: TelegramRequest): string {
  if (!data.invoice) return ''
  
  const lines = [
    '\uD83E\uDDFE *فاتورة جديدة - نظام سند*',
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    `\uD83D\uDCCB *رقم الفاتورة:* ${data.invoice.id}`,
    `\uD83D\uDC64 *العميل:* ${data.invoice.customer}`,
    `\uD83D\uDCB3 *طريقة الدفع:* ${data.invoice.paymentMethod}`,
    '',
    '\uD83D\uDED2 *الأصناف:*'
  ]
  
  data.invoice.items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.name}`)
    lines.push(`   الكمية: ${item.qty} × ${item.price.toFixed(2)} ر.س`)
  })
  
  lines.push('')
  lines.push('\uD83D\uDCCA *الملخص المالي:*')
  lines.push(`• المجموع الفرعي: ${data.invoice.subtotal.toFixed(2)} ر.س`)
  lines.push(`• ضريبة القيمة المضافة (15%): ${data.invoice.vat.toFixed(2)} ر.س`)
  lines.push(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`)
  lines.push(`\uD83D\uDCAF *الإجمالي:* *${data.invoice.total.toFixed(2)} ر.س*`)
  
  if (data.zatcaQR) {
    lines.push('')
    lines.push('\u2705 *تم إنشاء رمز ZATCA QR للامتثال للفوترة الإلكترونية*')
  }
  
  return lines.join('\n')
}

function buildApprovalRequestMessage(data: TelegramRequest): string {
  const requestTypeMap: Record<string, string> = {
    'permission': '\uD83D\uDEAA طلب استئذان',
    'vacation': '\uD83C\uDFD6\uFE0F طلب إجازة سنوية',
    'sick': '\uD83E\uDE7A طلب إجازة مرضية'
  }
  
  const requestType = requestTypeMap[data.requestType || ''] || 'طلب موافقة'
  
  const lines = [
    `\uD83D\uDD14 *${requestType} - نظام سند*`,
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    `\uD83D\uDC64 *الموظف:* ${data.employeeName}`,
    ''
  ]
  
  if (data.requestType === 'permission') {
    lines.push(`\u23F0 *الوقت:* ${data.timestamp || 'الآن'}`)
    lines.push(`\uD83D\uDCC5 *التاريخ:* ${data.date || new Date().toLocaleDateString('ar-SA')}`)
  } else {
    lines.push(`\uD83D\uDCC5 *من تاريخ:* ${data.fromDate}`)
    lines.push(`\uD83D\uDCC5 *إلى تاريخ:* ${data.toDate}`)
  }
  
  lines.push('')
  lines.push(`\uD83D\uDCDD *السبب:* ${data.reason}`)
  lines.push('')
  lines.push('\u26A0\uFE0F *يرجى مراجعة لوحة الموافقات في النظام*')
  
  if (data.requestId) {
    lines.push(`\uD83C\uDD94 رقم الطلب: ${data.requestId}`)
  }
  
  return lines.join('\n')
}

export async function POST(request: Request) {
  try {
    const body: TelegramRequest = await request.json()

    if (!body.botToken || !body.chatId) {
      return NextResponse.json(
        { error: 'Bot token and chat ID are required' },
        { status: 400 }
      )
    }

    const telegramApiUrl = `https://api.telegram.org/bot${body.botToken}/sendMessage`

    if (body.action === 'test_connection') {
      const testMessage = '\uD83D\uDD14 *اختبار اتصال - نظام سند*\n\n\u2705 تم الاتصال بنجاح!\nSanad Attendance System - Connection Successful!'
      
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: body.chatId,
          text: testMessage,
          parse_mode: 'Markdown',
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        return NextResponse.json({ success: true, message: 'Test message sent successfully' })
      } else {
        return NextResponse.json(
          { success: false, error: result.description || 'Failed to send test message' },
          { status: 400 }
        )
      }
    }

    if (body.action === 'send_attendance') {
      if (!body.employeeName || !body.status || !body.time || !body.date) {
        return NextResponse.json(
          { error: 'Missing attendance data fields' },
          { status: 400 }
        )
      }

      const message = buildAttendanceMessage(body)

      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: body.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        return NextResponse.json({ success: true, message: 'Attendance notification sent' })
      } else {
        return NextResponse.json(
          { success: false, error: result.description || 'Failed to send notification' },
          { status: 400 }
        )
      }
    }

    if (body.action === 'send_invoice') {
      if (!body.invoice) {
        return NextResponse.json(
          { error: 'Missing invoice data' },
          { status: 400 }
        )
      }

      const message = buildInvoiceMessage(body)

      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: body.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        return NextResponse.json({ success: true, message: 'Invoice sent to Telegram' })
      } else {
        return NextResponse.json(
          { success: false, error: result.description || 'Failed to send invoice' },
          { status: 400 }
        )
      }
    }

    if (body.action === 'send_approval_request') {
      if (!body.employeeName || !body.requestType) {
        return NextResponse.json(
          { error: 'Missing approval request data' },
          { status: 400 }
        )
      }

      const message = buildApprovalRequestMessage(body)

      // For approval requests, we need to get bot token/chat ID from environment or settings
      // In a production system, these would be fetched from the manager's settings
      const managerBotToken = process.env.TELEGRAM_BOT_TOKEN || body.botToken
      const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID || body.chatId
      
      if (!managerBotToken || !managerChatId) {
        console.log('[v0] Telegram credentials not configured for approval requests')
        return NextResponse.json({ success: true, message: 'Notification skipped - credentials not configured' })
      }

      const managerApiUrl = `https://api.telegram.org/bot${managerBotToken}/sendMessage`

      const response = await fetch(managerApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: managerChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      })

      const result = await response.json()
      
      if (result.ok) {
        return NextResponse.json({ success: true, message: 'Approval request sent to manager' })
      } else {
        return NextResponse.json(
          { success: false, error: result.description || 'Failed to send approval request' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
