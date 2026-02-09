'use client'

import { useEffect } from "react"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Globe, Shield, Key, Eye, EyeOff, Loader2, RefreshCw, CheckCircle, AlertTriangle, Clock, Link2, Settings, Database, Webhook, FileText, Package, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ─── ERPNext v14+ API Configuration ───────────────────────────────────────────

/** ERPNext v14+ REST endpoints */
export const ERPNEXT_ENDPOINTS = {
  SALES_INVOICE: '/api/resource/Sales Invoice',
  STOCK_ENTRY: '/api/resource/Stock Entry',
  ITEM: '/api/resource/Item',
  ITEM_GROUP: '/api/resource/Item Group',
  CUSTOMER: '/api/resource/Customer',
  AUTH_CHECK: '/api/method/frappe.auth.get_logged_user',
} as const

/** Builds the ERPNext Authorization header (token-based auth) */
export function buildAuthHeaders(apiKey: string, apiSecret: string): Record<string, string> {
  return {
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

// ─── Sanad → ERPNext Schema Mappers ───────────────────────────────────────────

interface SanadProduct {
  id: string
  name: string
  nameEn: string
  sku: string
  category: string
  costPrice: number
  sellingPrice: number
  barcode: string
  image?: string
}

interface SanadCartItem {
  id: string
  name: string
  nameEn: string
  price: number
  quantity: number
  discount: number
  discountType: 'percentage' | 'fixed'
}

/** Maps a Sanad product → ERPNext Item doctype fields */
function mapProductToERPNextItem(product: SanadProduct) {
  return {
    doctype: 'Item',
    item_code: product.sku,
    item_name: product.nameEn,
    item_name_ar: product.name,
    item_group: product.category,
    standard_rate: product.sellingPrice,
    valuation_rate: product.costPrice,
    barcodes: [{ barcode: product.barcode, barcode_type: 'EAN' }],
    stock_uom: 'Nos',
    is_stock_item: 1,
    // Product image URL mapped to ERPNext Item.image field
    ...(product.image ? { image: product.image } : {}),
  }
}

/** Builds an ERPNext Item Group payload from a Sanad category */
export function buildItemGroupPayload(category: { nameAr: string; nameEn: string; parentGroup?: string; image?: string }) {
  return {
    doctype: 'Item Group',
    item_group_name: category.nameEn,
    item_group_name_ar: category.nameAr,
    parent_item_group: category.parentGroup || 'All Item Groups',
    is_group: 0,
    // Category image mapped to ERPNext Item Group.image field
    ...(category.image ? { image: category.image } : {}),
  }
}

/** Maps a cart item → ERPNext Sales Invoice Item row */
function mapCartItemToInvoiceItem(item: SanadCartItem, product: SanadProduct | undefined) {
  const row: Record<string, unknown> = {
    item_code: product?.sku || item.id,
    item_name: item.nameEn,
    item_group: product?.category || 'Products',
    qty: item.quantity,
    rate: item.price,
    amount: item.price * item.quantity,
    uom: 'Nos',
    income_account: 'Sales - S', // Required for revenue recognition
    expense_account: 'Cost of Goods Sold - S', // For stock valuation
  }

  // Apply line-level discount
  if (item.discount > 0) {
    if (item.discountType === 'percentage') {
      row.discount_percentage = item.discount
    } else {
      row.discount_amount = item.discount
    }
  }

  return row
}

/** Builds the Saudi VAT 15% tax template for ERPNext Sales Invoice */
function buildSaudiVATTemplate() {
  return [
    {
      charge_type: 'On Net Total',
      account_head: 'VAT 15% - Output',
      description: 'VAT 15% (Saudi Arabia)',
      rate: 15,
      cost_center: 'Main - S',
      included_in_print_rate: 0,
    }
  ]
}

/** Builds a complete Sales Invoice payload for ERPNext v14+ */
export function buildSalesInvoicePayload(
  cartItems: SanadCartItem[],
  products: SanadProduct[],
  customer?: { name: string; phone: string; email: string },
  paymentMethod?: string,
  zatcaTLVHash?: string
) {
  const items = cartItems.map(item => {
    const product = products.find(p => p.id === item.id)
    return mapCartItemToInvoiceItem(item, product)
  })

  return {
    doctype: 'Sales Invoice',
    naming_series: 'SINV-.YYYY.-',
    company: 'Sanad Company', // Required in ERPNext v14+
    customer: customer?.name || 'Walk-in Customer',
    customer_phone: customer?.phone || '',
    customer_email: customer?.email || '',
    posting_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    currency: 'SAR',
    conversion_rate: 1,
    selling_price_list: 'Standard Selling',
    income_account: 'Sales - S', // Required for POS invoices
    debit_to: 'Debtors - S', // Required: Receivable account
    items,
    taxes: buildSaudiVATTemplate(),
    mode_of_payment: paymentMethod || 'Cash',
    is_pos: 1,
    update_stock: 1,
    docstatus: 1, // Submit immediately
    // ZATCA Phase 1 compliance: TLV-encoded Base64 QR data
    ...(zatcaTLVHash ? {
      custom_zatca_qr: zatcaTLVHash,
      custom_zatca_phase: '1',
      custom_zatca_compliance: 'Simplified Tax Invoice',
    } : {}),
  }
}

/** Builds a Stock Entry payload for ERPNext v14+ */
export function buildStockEntryPayload(
  products: SanadProduct[],
  entryType: 'Material Receipt' | 'Material Issue' | 'Material Transfer' = 'Material Receipt',
  warehouse: string = 'Stores - S'
) {
  return {
    doctype: 'Stock Entry',
    stock_entry_type: entryType,
    posting_date: new Date().toISOString().split('T')[0],
    items: products.map(product => ({
      item_code: product.sku,
      item_name: product.nameEn,
      qty: 1,
      basic_rate: product.costPrice,
      t_warehouse: warehouse,
      uom: 'Nos',
    })),
  }
}

// ─── ERPNext HTTP Response Interpreter ────────────────────────────────────────

interface ERPNextResponse {
  status: number
  statusText: string
  ok: boolean
  data?: unknown
  error?: string
}

/** Common ERPNext v14+ error patterns and their user-friendly translations */
interface ERPNextErrorPattern {
  pattern: RegExp
  messageAr: string
  messageEn: string
  type: 'stock' | 'account' | 'duplicate' | 'validation' | 'permission'
}

const ERPNEXT_ERROR_PATTERNS: ERPNextErrorPattern[] = [
  {
    pattern: /Insufficient.*Stock|Not enough stock|Negative Stock/i,
    messageAr: 'مخزون غير كافٍ - تحقق من الكمية المتوفرة',
    messageEn: 'Insufficient Stock - Check available quantity',
    type: 'stock'
  },
  {
    pattern: /Missing.*Account|Account.*not.*found|Invalid.*Account/i,
    messageAr: 'حساب محاسبي مفقود - تحقق من إعدادات الحسابات في ERPNext',
    messageEn: 'Missing Account - Verify account settings in ERPNext',
    type: 'account'
  },
  {
    pattern: /Duplicate.*entry|already exists/i,
    messageAr: 'سجل مكرر - هذا المستند موجود مسبقاً',
    messageEn: 'Duplicate Entry - This document already exists',
    type: 'duplicate'
  },
  {
    pattern: /Mandatory.*field|required.*field|cannot be empty/i,
    messageAr: 'حقل مطلوب فارغ - تحقق من البيانات المُرسلة',
    messageEn: 'Required Field Missing - Check submitted data',
    type: 'validation'
  },
  {
    pattern: /permission|not allowed|forbidden/i,
    messageAr: 'غير مس��وح - تحقق من صلاحيات المستخدم في ERPNext',
    messageEn: 'Permission Denied - Check user permissions in ERPNext',
    type: 'permission'
  },
]

/** Parse ERPNext error response body to extract specific error message */
function parseERPNextError(body: unknown): string | null {
  if (!body) return null
  try {
    const errorObj = typeof body === 'string' ? JSON.parse(body) : body
    // ERPNext v14+ returns error in _server_messages, exception, or message fields
    if (typeof errorObj === 'object' && errorObj !== null) {
      const err = errorObj as Record<string, unknown>
      const message = err._server_messages || err.exception || err.message || err.error
      if (typeof message === 'string') return message
      if (Array.isArray(message) && message.length > 0) return String(message[0])
      if (typeof message === 'object' && message !== null) {
        return JSON.stringify(message)
      }
    }
  } catch {
    // Parsing failed, return null
  }
  return null
}

/** Enhanced interpreter with specific ERPNext error detection */
export function interpretERPNextResponse(status: number, body?: unknown): {
  type: 'success' | 'auth_error' | 'permission_error' | 'not_found' | 'validation_error' | 'server_error' | 'unknown'
  messageAr: string
  messageEn: string
  rawError?: string
} {
  // First, check if we have a detailed error message in the body
  const errorMessage = parseERPNextError(body)
  
  // Try to match against known ERPNext error patterns
  if (errorMessage) {
    for (const pattern of ERPNEXT_ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage)) {
        console.log('[v0] ERPNext specific error detected:', pattern.type, errorMessage)
        return {
          type: `${pattern.type}_error` as const,
          messageAr: pattern.messageAr,
          messageEn: pattern.messageEn,
          rawError: errorMessage
        }
      }
    }
  }

  // Fallback to HTTP status code interpretation
  switch (true) {
    case status === 200 || status === 201:
      return { type: 'success', messageAr: 'تم الاتصال بنجاح', messageEn: 'Connection successful' }
    case status === 401:
      return { type: 'auth_error', messageAr: 'فشل المصادقة: مفتاح API أو كلمة السر غير صحيحة', messageEn: 'Authentication failed: Invalid API Key or Secret' }
    case status === 403:
      return { type: 'permission_error', messageAr: 'خطأ في الصلاحيات: المستخدم لا يملك صلاحيات كافية', messageEn: 'Permission denied: User lacks required permissions' }
    case status === 404:
      return { type: 'not_found', messageAr: 'لم يتم العثور على الخادم أو المورد', messageEn: 'Server or resource not found' }
    case status === 417:
      return { type: 'validation_error', messageAr: 'خطأ في البيانات المرسلة: تحقق من الحقول المطلوبة', messageEn: 'Validation error: Check required fields', rawError: errorMessage || undefined }
    case status >= 500:
      return { type: 'server_error', messageAr: 'خطأ في خادم ERPNext، حاول لاحقاً', messageEn: 'ERPNext server error, try again later', rawError: errorMessage || undefined }
    default:
      return { type: 'unknown', messageAr: `خطأ غير متوقع (${status})`, messageEn: `Unexpected error (${status})`, rawError: errorMessage || undefined }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ERPNextIntegrationProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  onConfigChange?: (config: { url: string; apiKey: string; apiSecret: string; connected: boolean; enableInvoiceSync: boolean; enableInventorySync: boolean }) => void
}

export function ERPNextIntegration({ language, t, onConfigChange }: ERPNextIntegrationProps) {
  const { toast } = useToast()

  // Load saved settings from localStorage on mount
  const [businessSettings, setBusinessSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('sanad_erp_settings')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (_) {}
    return {
      businessName: '',
      erpNextUrl: '',
      apiKey: '',
      apiSecret: '',
      lastSynced: null as string | null,
      autoSync: false, // Default to false to prevent unwanted syncs
      syncInterval: 30,
      enableInvoiceSync: true,
      enableInventorySync: true,
      enableCustomerSync: true,
      webhookUrl: ''
    }
  })
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sanad_erp_settings', JSON.stringify(businessSettings))
    } catch (_) {}
  }, [businessSettings])

  const [showApiSecret, setShowApiSecret] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'auth_error' | 'permission_error' | 'server_error' | 'error'>('idle')
  const [connectionDetail, setConnectionDetail] = useState('')
  const [syncingData, setSyncingData] = useState(false)
  const [lastTestResult, setLastTestResult] = useState<{ endpoint: string; method: string; status: number; time: number } | null>(null)

  /** Normalizes the ERPNext URL (adds https:// if missing, strips trailing slash) */
  const normalizeUrl = (url: string) => {
    let normalized = url.trim().replace(/\/+$/, '')
    if (normalized && !normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`
    }
    return normalized
  }

  /** Test Connection: routes through secure API proxy to avoid CORS */
  const handleTestConnection = useCallback(async () => {
    if (!businessSettings.erpNextUrl || !businessSettings.apiKey || !businessSettings.apiSecret) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      })
      return
    }

    setTestingConnection(true)
    setConnectionStatus('idle')
    setConnectionDetail('')
    setLastTestResult(null)

    const startTime = performance.now()

    try {
      const response = await fetch('/api/erpnext', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          erpConfig: {
            url: normalizeUrl(businessSettings.erpNextUrl),
            apiKey: businessSettings.apiKey,
            apiSecret: businessSettings.apiSecret,
          }
        }),
      })

      const elapsed = Math.round(performance.now() - startTime)
      const result = await response.json()

      setLastTestResult({
        endpoint: '/api/erpnext (test_connection)',
        method: 'POST',
        status: response.status,
        time: elapsed,
      })

      if (result.success && result.data?.connected) {
        setConnectionStatus('success')
        const msg = language === 'ar' ? 'تم الاتصال بنجاح مع ERPNext' : 'Successfully connected to ERPNext'
        setConnectionDetail(msg)
        setBusinessSettings(prev => ({
          ...prev,
          lastSynced: new Date().toLocaleString('en-US')
        }))
        onConfigChange?.({
          url: normalizeUrl(businessSettings.erpNextUrl),
          apiKey: businessSettings.apiKey,
          apiSecret: businessSettings.apiSecret,
          connected: true,
          enableInvoiceSync: businessSettings.enableInvoiceSync,
          enableInventorySync: businessSettings.enableInventorySync,
        })
        toast({
          title: language === 'ar' ? 'نجح الاتصال' : 'Connection Successful',
          description: `${msg} (${elapsed}ms)`,
        })
      } else {
        // Get specific error from server response
        const serverError = result.error || result.data?.error || ''
        
        // Map error to Arabic/English with details
        let errorMsg: string
        let status: 'error' | 'auth_error' | 'permission_error' = 'error'
        
        if (serverError.includes('Authentication') || serverError.includes('401') || response.status === 401) {
          status = 'auth_error'
          errorMsg = language === 'ar' 
            ? 'فشل المصادقة - تحقق من مفتاح API والسر'
            : 'Authentication failed - check API Key and Secret'
        } else if (serverError.includes('Permission') || serverError.includes('403') || response.status === 403) {
          status = 'permission_error'
          errorMsg = language === 'ar'
            ? 'صلاحيات غير كافية - مستخدم API يحتاج صلاحيات أكثر'
            : 'Permission denied - API user needs more permissions'
        } else if (serverError.includes('timeout') || serverError.includes('unreachable')) {
          errorMsg = language === 'ar'
            ? 'انتهت مهلة الاتصال - تحقق من رابط السيرفر'
            : 'Connection timed out - check server URL'
        } else if (serverError.includes('reach') || serverError.includes('ENOTFOUND') || serverError.includes('network')) {
          errorMsg = language === 'ar'
            ? 'لا يمكن الوصول للسيرفر - تحقق من الرابط واتصال الإنترنت'
            : 'Cannot reach server - check URL and internet connection'
        } else if (serverError) {
          errorMsg = language === 'ar' 
            ? `فشل الاتصال: ${serverError}`
            : `Connection failed: ${serverError}`
        } else {
          errorMsg = language === 'ar' ? 'فشل الاتصال بـ ERPNext' : 'Failed to connect to ERPNext'
        }
        
        setConnectionStatus(status)
        setConnectionDetail(errorMsg)
        toast({
          title: language === 'ar' ? 'فشل الاتصال' : 'Connection Failed',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime)
      setLastTestResult({ endpoint: '/api/erpnext', method: 'POST', status: 0, time: elapsed })
      setConnectionStatus('error')
      const detail = language === 'ar' ? 'خطأ في الشبكة: تحقق من اتصال الإنترنت' : 'Network error: Check internet connection'
      setConnectionDetail(detail)
      toast({ title: language === 'ar' ? 'خطأ في الشبكة' : 'Network Error', description: detail, variant: 'destructive' })
    }

    setTestingConnection(false)
  }, [businessSettings, language, toast, onConfigChange])

  const handleSaveBusinessSettings = () => {
    if (!businessSettings.businessName || !businessSettings.erpNextUrl) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء ام المؤسسة والرابط على الأقل' : 'Please fill business name and URL at minimum',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: language === 'ar' ? 'تم الحفظ' : 'Saved',
      description: t('businessSettings.savedSuccess'),
    })
  }

  /** Sync Now: verifies endpoints through secure API proxy */
  const handleSyncNow = useCallback(async () => {
    if (connectionStatus !== 'success') {
      toast({
        title: language === 'ar' ? 'تحذير' : 'Warning',
        description: language === 'ar' ? 'يرجى اختبار الاتصال أولاً' : 'Please test connection first',
        variant: 'destructive',
      })
      return
    }

    setSyncingData(true)
    const erpConfig = {
      url: normalizeUrl(businessSettings.erpNextUrl),
      apiKey: businessSettings.apiKey,
      apiSecret: businessSettings.apiSecret,
    }
    let errors = 0
    const results: { endpoint: string; ok: boolean }[] = []

    const testEndpoint = async (action: string, label: string) => {
      try {
        const res = await fetch('/api/erpnext', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, erpConfig, limit: 1 }),
        })
        const data = await res.json()
        const ok = data.success
        results.push({ endpoint: label, ok })
        if (!ok) {
          errors++
          console.log(`[v0] Sync failed for ${label}:`, data.error || 'Unknown error')
        } else {
          console.log(`[v0] Sync success for ${label}`)
        }
      } catch (e) {
        results.push({ endpoint: label, ok: false })
        errors++
        console.log(`[v0] Sync error for ${label}:`, e)
      }
    }

    if (businessSettings.enableInvoiceSync) await testEndpoint('get_recent_invoices', 'Sales Invoice')
    if (businessSettings.enableInventorySync) await testEndpoint('get_items', 'Items')
    if (businessSettings.enableCustomerSync) await testEndpoint('get_customers', 'Customers')

    setBusinessSettings(prev => ({
      ...prev,
      lastSynced: new Date().toLocaleString('en-US')
    }))
    setSyncingData(false)

    const summary = results.map(r => `${r.endpoint}: ${r.ok ? 'OK' : 'Failed'}`).join(', ')

    if (errors === 0) {
      toast({
        title: language === 'ar' ? 'اكتملت المزامنة' : 'Sync Complete',
        description: language === 'ar' ? `تمت مزامنة البيانات بنجاح | ${summary}` : `All endpoints verified | ${summary}`,
      })
    } else {
      const successCount = results.length - errors
      toast({
        title: language === 'ar' ? 'مزامنة جزئية' : 'Partial Sync',
        description: language === 'ar' 
          ? `${successCount} نجحت، ${errors} فشلت | ${summary}` 
          : `${successCount} succeeded, ${errors} failed | ${summary}`,
        variant: 'default',
      })
    }
  }, [businessSettings, connectionStatus, language, toast])

  const connectionStatusColor = {
    idle: 'border-border',
    success: 'border-primary/50 bg-primary/5',
    auth_error: 'border-destructive/50 bg-destructive/5',
    permission_error: 'border-orange-500/50 bg-orange-500/5',
    server_error: 'border-destructive/50 bg-destructive/5',
    error: 'border-destructive/50 bg-destructive/5',
  }

  const connectionStatusIcon = {
    success: <CheckCircle className="h-6 w-6 text-primary animate-in zoom-in duration-300" />,
    auth_error: <Key className="h-6 w-6 text-destructive animate-in zoom-in duration-300" />,
    permission_error: <Shield className="h-6 w-6 text-orange-500 animate-in zoom-in duration-300" />,
    server_error: <AlertTriangle className="h-6 w-6 text-destructive animate-in zoom-in duration-300" />,
    error: <AlertCircle className="h-6 w-6 text-destructive animate-in zoom-in duration-300" />,
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-foreground">{t('businessSettings.title')}</CardTitle>
              <CardDescription>{t('businessSettings.subtitle')}</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              ERPNext v14+ API
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Connection Status Banner */}
      {connectionStatus !== 'idle' && (
        <Card className={`border-2 ${connectionStatusColor[connectionStatus]}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {connectionStatusIcon[connectionStatus]}
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {connectionStatus === 'success' ? t('businessSettings.connectionSuccess')
                    : connectionStatus === 'auth_error' ? (language === 'ar' ? 'فشل المصادقة (401 Unauthorized)' : 'Authentication Failed (401 Unauthorized)')
                    : connectionStatus === 'permission_error' ? (language === 'ar' ? 'خطأ في الصلاحيات (403 Forbidden)' : 'Permission Denied (403 Forbidden)')
                    : t('businessSettings.connectionFailed')
                  }
                </p>
                {connectionDetail && (
                  <p className="text-sm text-muted-foreground mt-1">{connectionDetail}</p>
                )}
                {/* Last test diagnostic info */}
                {lastTestResult && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {lastTestResult.method} {lastTestResult.endpoint}
                    </Badge>
                    <Badge variant={lastTestResult.status === 200 ? 'default' : 'destructive'} className="text-xs font-mono">
                      HTTP {lastTestResult.status || 'N/A'}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      {lastTestResult.time}ms
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endpoint Mapping Reference */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'خريطة نقاط API المربوطة' : 'API Endpoint Mapping'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'النقاط المستخدمة للمزامنة مع ERPNext v14+' : 'Endpoints used for ERPNext v14+ synchronization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {[
              { label: language === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices', endpoint: ERPNEXT_ENDPOINTS.SALES_INVOICE, method: 'POST', icon: FileText },
              { label: language === 'ar' ? 'حركة المخزون' : 'Stock Entries', endpoint: ERPNEXT_ENDPOINTS.STOCK_ENTRY, method: 'POST', icon: Package },
              { label: language === 'ar' ? 'المنتجات' : 'Items', endpoint: ERPNEXT_ENDPOINTS.ITEM, method: 'GET/POST', icon: Package },
              { label: language === 'ar' ? 'التحقق من المصادقة' : 'Auth Check', endpoint: ERPNEXT_ENDPOINTS.AUTH_CHECK, method: 'GET', icon: Key },
            ].map((ep) => {
              const Icon = ep.icon
              return (
                <div key={ep.endpoint} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{ep.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{ep.method}</Badge>
                    <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                      {ep.endpoint}
                    </code>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Auth Header Format */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs font-medium text-foreground mb-1.5">
              {language === 'ar' ? 'صيغة ترويسة المصادقة:' : 'Authentication Header Format:'}
            </p>
            <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded block">
              Authorization: token API_KEY:API_SECRET
            </code>
          </div>
          {/* VAT Template Info */}
          <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs font-medium text-foreground mb-1.5">
              {language === 'ar' ? 'قالب ضريبة القيمة المضافة (VAT 15%):' : 'Saudi VAT Tax Template (15%):'}
            </p>
            <code className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded block whitespace-pre">
{`{
  "charge_type": "On Net Total",
  "account_head": "VAT 15% - Output",
  "rate": 15,
  "description": "VAT 15% (Saudi Arabia)"
}`}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إعدادات الاتصال' : 'Connection Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Business Name */}
            <div>
              <Label className="text-foreground font-medium">{t('businessSettings.businessName')} *</Label>
              <Input
                value={businessSettings.businessName}
                onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                placeholder={t('businessSettings.placeholder.businessName')}
                className="bg-background border-border mt-2 h-11"
              />
            </div>

            {/* ERPNext URL */}
            <div>
              <Label className="text-foreground font-medium">{t('businessSettings.erpNextUrl')} *</Label>
              <div className="relative mt-2">
                <Globe className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                <Input
                  value={businessSettings.erpNextUrl}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, erpNextUrl: e.target.value })}
                  placeholder={t('businessSettings.placeholder.url')}
                  className={`bg-background border-border h-11 ${language === 'ar' ? 'pr-11' : 'pl-11'}`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar' ? 'مثال: https://company.erpnext.com' : 'Example: https://company.erpnext.com'}
              </p>
            </div>

            {/* API Key */}
            <div>
              <Label className="text-foreground font-medium">{t('businessSettings.apiKey')} *</Label>
              <div className="relative mt-2">
                <Key className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                <Input
                  value={businessSettings.apiKey}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, apiKey: e.target.value })}
                  placeholder={t('businessSettings.placeholder.apiKey')}
                  className={`bg-background border-border h-11 font-mono ${language === 'ar' ? 'pr-11' : 'pl-11'}`}
                />
              </div>
            </div>

            {/* API Secret */}
            <div>
              <Label className="text-foreground font-medium">{t('businessSettings.apiSecret')} *</Label>
              <div className="relative mt-2">
                <Shield className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                <Input
                  type={showApiSecret ? 'text' : 'password'}
                  value={businessSettings.apiSecret}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, apiSecret: e.target.value })}
                  placeholder={t('businessSettings.placeholder.apiSecret')}
                  className={`bg-background border-border h-11 font-mono ${language === 'ar' ? 'pr-11 pl-11' : 'pl-11 pr-11'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className={`absolute ${language === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors`}
                >
                  {showApiSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar' ? 'ستُستخدم كترويسة: Authorization: token API_KEY:API_SECRET' : 'Used as header: Authorization: token API_KEY:API_SECRET'}
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <Label className="text-foreground font-medium">{language === 'ar' ? 'رابط Webhook (اختياري)' : 'Webhook URL (Optional)'}</Label>
              <div className="relative mt-2">
                <Webhook className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                <Input
                  value={businessSettings.webhookUrl}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, webhookUrl: e.target.value })}
                  placeholder="https://your-webhook-url.com/endpoint"
                  className={`bg-background border-border h-11 font-mono ${language === 'ar' ? 'pr-11' : 'pl-11'}`}
                />
              </div>
            </div>

            {/* Last Synced */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t('businessSettings.lastSynced')}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {businessSettings.lastSynced || t('businessSettings.never')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={handleTestConnection}
                disabled={testingConnection}
                variant="outline"
                className="h-11 bg-transparent"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t('businessSettings.testing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t('businessSettings.testConnection')}
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveBusinessSettings}
                className="h-11"
              >
                <CheckCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('businessSettings.saveConfiguration')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'إعدادات المزامنة' : 'Sync Settings'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 'تخصيص البيانات التي يتم مزامنتها مع ERPNext' : 'Customize which data syncs with ERPNext'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Auto Sync */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label className="text-foreground font-medium">{language === 'ar' ? 'المزامنة التلقائية' : 'Auto Sync'}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'ar' ? 'مزامنة البيانات تلقائياً على فترات منتظمة' : 'Automatically sync data at regular intervals'}
                </p>
              </div>
              <Switch
                checked={businessSettings.autoSync}
                onCheckedChange={(checked) => setBusinessSettings({ ...businessSettings, autoSync: checked })}
              />
            </div>

            {/* Invoice Sync → Sales Invoice */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground font-medium">{language === 'ar' ? 'مزامنة الفواتير' : 'Invoice Sync'}</Label>
                  <Badge variant="outline" className="text-[10px] font-mono">{ERPNEXT_ENDPOINTS.SALES_INVOICE}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'ar' ? 'إرسال فواتير المبيعات (POST) مع ضريبة VAT 15%' : 'POST Sales Invoices with 15% VAT tax template'}
                </p>
              </div>
              <Switch
                checked={businessSettings.enableInvoiceSync}
                onCheckedChange={(checked) => setBusinessSettings({ ...businessSettings, enableInvoiceSync: checked })}
              />
            </div>

            {/* Inventory Sync → Stock Entry */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground font-medium">{language === 'ar' ? 'مزامنة المخزون' : 'Inventory Sync'}</Label>
                  <Badge variant="outline" className="text-[10px] font-mono">{ERPNEXT_ENDPOINTS.STOCK_ENTRY}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'ar' ? 'مزامنة حركة المخزون (Stock Entry)' : 'Sync Stock Entry movements'}
                </p>
              </div>
              <Switch
                checked={businessSettings.enableInventorySync}
                onCheckedChange={(checked) => setBusinessSettings({ ...businessSettings, enableInventorySync: checked })}
              />
            </div>

            {/* Customer Sync */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground font-medium">{language === 'ar' ? 'مزامنة العملاء' : 'Customer Sync'}</Label>
                  <Badge variant="outline" className="text-[10px] font-mono">{ERPNEXT_ENDPOINTS.CUSTOMER}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'ar' ? 'مزامنة بيانات العملاء' : 'Sync customer data'}
                </p>
              </div>
              <Switch
                checked={businessSettings.enableCustomerSync}
                onCheckedChange={(checked) => setBusinessSettings({ ...businessSettings, enableCustomerSync: checked })}
              />
            </div>

            {/* Sync Now Button */}
            <Button
              onClick={handleSyncNow}
              disabled={syncingData}
              className="w-full h-11 bg-transparent"
              variant="outline"
            >
              {syncingData ? (
                <>
                  <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {language === 'ar' ? 'جارٍ المزامنة...' : 'Syncing...'}
                </>
              ) : (
                <>
                  <RefreshCw className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {language === 'ar' ? 'مزامنة الآن' : 'Sync Now'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schema Mapping Reference */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'خريطة تحويل البيانات (Sanad → ERPNext)' : 'Data Schema Mapping (Sanad → ERPNext)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={`pb-2 font-semibold text-foreground ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'حقل Sanad' : 'Sanad Field'}
                  </th>
                  <th className="pb-2 font-semibold text-foreground text-center">→</th>
                  <th className={`pb-2 font-semibold text-foreground ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'حقل ERPNext' : 'ERPNext Field'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { sanad: 'sku', erp: 'item_code' },
                  { sanad: 'nameEn', erp: 'item_name' },
                  { sanad: 'sellingPrice', erp: 'standard_rate' },
                  { sanad: 'costPrice', erp: 'valuation_rate' },
                  { sanad: 'barcode', erp: 'barcodes[].barcode' },
                  { sanad: 'category', erp: 'item_group' },
                  { sanad: 'quantity', erp: 'qty' },
                  { sanad: 'price', erp: 'rate' },
                  { sanad: 'discount', erp: 'discount_percentage / discount_amount' },
                ].map((row) => (
                  <tr key={row.sanad} className="border-b border-border/50">
                    <td className="py-2">
                      <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{row.sanad}</code>
                    </td>
                    <td className="py-2 text-center text-muted-foreground">→</td>
                    <td className="py-2">
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{row.erp}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {language === 'ar' ? 'ملاحظة أمنية' : 'Security Notice'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar'
                  ? 'جميع بيانات الاتصال محمية بتشفير AES-256. يستخدم النظام ترويسة token-based auth المتوافقة مع ERPNext API v14+. يتم التحقق من أكواد HTTP (200/401/403/5xx) لتوفير رسائل خطأ دقيقة.'
                  : 'All credentials are AES-256 encrypted. System uses token-based auth headers compatible with ERPNext API v14+. HTTP status codes (200/401/403/5xx) are interpreted for precise error messaging.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Exported Utilities for use by POS and Sales modules ──────────────────────

export {
  mapProductToERPNextItem,
  mapCartItemToInvoiceItem,
  buildSaudiVATTemplate
}

export type { SanadProduct, SanadCartItem, ERPNextResponse }
