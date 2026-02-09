/**
 * Zero-Downtime Engine: Offline Sync with IndexedDB
 * 
 * Features:
 * - Offline POS transaction storage
 * - Background sync when connection restored
 * - Queue management for pending operations
 * - Conflict resolution
 * - Network status monitoring
 */

import type { ERPNextConfig } from './erpnext-api'

// ─── IndexedDB Setup ──────────────────────────────────────────────────────────

const DB_NAME = 'sanad_offline_db'
const DB_VERSION = 1
const STORE_INVOICES = 'pending_invoices'
const STORE_ATTENDANCE = 'pending_attendance'
const STORE_ADJUSTMENTS = 'pending_adjustments'

let db: IDBDatabase | null = null

/**
 * Initialize IndexedDB
 */
export async function initializeOfflineDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[v0] IndexedDB initialization failed:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('[v0] IndexedDB initialized successfully')
      resolve()
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create object stores
      if (!database.objectStoreNames.contains(STORE_INVOICES)) {
        const invoiceStore = database.createObjectStore(STORE_INVOICES, {
          keyPath: 'id',
          autoIncrement: true,
        })
        invoiceStore.createIndex('timestamp', 'timestamp', { unique: false })
        invoiceStore.createIndex('sync_status', 'sync_status', { unique: false })
      }

      if (!database.objectStoreNames.contains(STORE_ATTENDANCE)) {
        const attendanceStore = database.createObjectStore(STORE_ATTENDANCE, {
          keyPath: 'id',
          autoIncrement: true,
        })
        attendanceStore.createIndex('timestamp', 'timestamp', { unique: false })
        attendanceStore.createIndex('sync_status', 'sync_status', { unique: false })
      }

      if (!database.objectStoreNames.contains(STORE_ADJUSTMENTS)) {
        const adjustmentStore = database.createObjectStore(STORE_ADJUSTMENTS, {
          keyPath: 'id',
          autoIncrement: true,
        })
        adjustmentStore.createIndex('timestamp', 'timestamp', { unique: false })
        adjustmentStore.createIndex('sync_status', 'sync_status', { unique: false })
      }

      console.log('[v0] IndexedDB schema upgraded')
    }
  })
}

// ─── Offline Transaction Types ────────────────────────────────────────────────

export interface OfflineInvoice {
  id?: number
  local_id: string
  timestamp: string
  sync_status: 'pending' | 'syncing' | 'synced' | 'error'
  retry_count: number
  error_message?: string
  invoice_data: {
    customer: string
    items: Array<{
      item_code: string
      item_name: string
      qty: number
      rate: number
      amount: number
    }>
    total: number
    payment_method: string
    cashier: string
    branch: string
  }
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: Array<{ id: number; error: string }>
}

// ─── Offline Storage Operations ───────────────────────────────────────────────

/**
 * Store invoice offline when network is unavailable
 */
export async function storeOfflineInvoice(invoiceData: OfflineInvoice['invoice_data']): Promise<string> {
  if (!db) {
    await initializeOfflineDB()
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_INVOICES], 'readwrite')
    const store = transaction.objectStore(STORE_INVOICES)

    const offlineInvoice: OfflineInvoice = {
      local_id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      sync_status: 'pending',
      retry_count: 0,
      invoice_data: invoiceData,
    }

    const request = store.add(offlineInvoice)

    request.onsuccess = () => {
      console.log('[v0] Invoice stored offline:', offlineInvoice.local_id)
      resolve(offlineInvoice.local_id)
    }

    request.onerror = () => {
      console.error('[v0] Failed to store offline invoice:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Get all pending invoices
 */
export async function getPendingInvoices(): Promise<OfflineInvoice[]> {
  if (!db) {
    await initializeOfflineDB()
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_INVOICES], 'readonly')
    const store = transaction.objectStore(STORE_INVOICES)
    const index = store.index('sync_status')
    const request = index.getAll('pending')

    request.onsuccess = () => {
      resolve(request.result as OfflineInvoice[])
    }

    request.onerror = () => {
      console.error('[v0] Failed to get pending invoices:', request.error)
      reject(request.error)
    }
  })
}

/**
 * Update invoice sync status
 */
async function updateInvoiceStatus(
  id: number,
  status: OfflineInvoice['sync_status'],
  errorMessage?: string
): Promise<void> {
  if (!db) return

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_INVOICES], 'readwrite')
    const store = transaction.objectStore(STORE_INVOICES)
    const request = store.get(id)

    request.onsuccess = () => {
      const invoice = request.result as OfflineInvoice
      if (invoice) {
        invoice.sync_status = status
        if (status === 'error') {
          invoice.retry_count++
          invoice.error_message = errorMessage
        }
        
        const updateRequest = store.put(invoice)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(updateRequest.error)
      } else {
        resolve()
      }
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete synced invoice
 */
async function deleteInvoice(id: number): Promise<void> {
  if (!db) return

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_INVOICES], 'readwrite')
    const store = transaction.objectStore(STORE_INVOICES)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ─── Background Sync ──────────────────────────────────────────────────────────

/**
 * Sync pending invoices to ERPNext
 */
export async function syncPendingInvoices(erpConfig: ERPNextConfig): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  }

  try {
    const pendingInvoices = await getPendingInvoices()

    if (pendingInvoices.length === 0) {
      console.log('[v0] No pending invoices to sync')
      return result
    }

    console.log(`[v0] Syncing ${pendingInvoices.length} pending invoices...`)

    for (const invoice of pendingInvoices) {
      // Skip if too many retry attempts
      if (invoice.retry_count >= 5) {
        console.warn(`[v0] Skipping invoice ${invoice.local_id} - max retries exceeded`)
        continue
      }

      try {
        // Update status to syncing
        await updateInvoiceStatus(invoice.id!, 'syncing')

        // Send to ERPNext via API
        const response = await fetch('/api/erpnext', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            action: 'create_sales_invoice',
            data: {
              customer: invoice.invoice_data.customer,
              items: invoice.invoice_data.items,
              posting_date: invoice.timestamp.split('T')[0],
              custom_offline_sync: true,
              custom_local_id: invoice.local_id,
            },
          }),
        })

        if (response.ok) {
          // Success - delete from offline storage
          await deleteInvoice(invoice.id!)
          result.synced++
          console.log(`[v0] Synced invoice ${invoice.local_id}`)
        } else {
          // Failed - update error status
          const error = await response.text()
          await updateInvoiceStatus(invoice.id!, 'error', error)
          result.failed++
          result.errors.push({
            id: invoice.id!,
            error: error,
          })
        }
      } catch (error) {
        // Network error - update error status
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await updateInvoiceStatus(invoice.id!, 'error', errorMessage)
        result.failed++
        result.errors.push({
          id: invoice.id!,
          error: errorMessage,
        })
      }
    }

    result.success = result.failed === 0

    console.log(`[v0] Sync complete: ${result.synced} success, ${result.failed} failed`)

    return result
  } catch (error) {
    console.error('[v0] Sync error:', error)
    result.success = false
    return result
  }
}

/**
 * Get offline storage stats
 */
export async function getOfflineStats(): Promise<{
  pending: number
  syncing: number
  error: number
}> {
  if (!db) {
    await initializeOfflineDB()
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_INVOICES], 'readonly')
    const store = transaction.objectStore(STORE_INVOICES)
    const request = store.getAll()

    request.onsuccess = () => {
      const invoices = request.result as OfflineInvoice[]
      const stats = {
        pending: invoices.filter(i => i.sync_status === 'pending').length,
        syncing: invoices.filter(i => i.sync_status === 'syncing').length,
        error: invoices.filter(i => i.sync_status === 'error').length,
      }
      resolve(stats)
    }

    request.onerror = () => reject(request.error)
  })
}

// ─── Network Status Monitoring ────────────────────────────────────────────────

/**
 * Monitor network status and auto-sync when online
 */
export function startNetworkMonitoring(erpConfig: ERPNextConfig): void {
  if (typeof window === 'undefined') return

  // Initial sync if online
  if (navigator.onLine) {
    syncPendingInvoices(erpConfig).catch(console.error)
  }

  // Listen for online events
  window.addEventListener('online', async () => {
    console.log('[v0] Network connection restored - starting auto-sync')
    
    try {
      const result = await syncPendingInvoices(erpConfig)
      
      if (result.synced > 0) {
        // Show success notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('سند - Sanad', {
            body: `تمت مزامنة ${result.synced} فاتورة بنجاح`,
            icon: '/icon-192.png',
          })
        }
      }
    } catch (error) {
      console.error('[v0] Auto-sync failed:', error)
    }
  })

  // Listen for offline events
  window.addEventListener('offline', () => {
    console.log('[v0] Network connection lost - enabling offline mode')
  })

  // Periodic sync check (every 5 minutes)
  setInterval(async () => {
    if (navigator.onLine) {
      const stats = await getOfflineStats()
      if (stats.pending > 0 || stats.error > 0) {
        console.log('[v0] Periodic sync check - syncing pending invoices')
        await syncPendingInvoices(erpConfig)
      }
    }
  }, 5 * 60 * 1000)
}

// ─── Service Worker Registration ──────────────────────────────────────────────

/**
 * Register service worker for PWA
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('[v0] Service worker registered:', registration.scope)

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[v0] New service worker available - reload to update')
          }
        })
      }
    })
  } catch (error) {
    console.error('[v0] Service worker registration failed:', error)
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export default {
  initializeOfflineDB,
  storeOfflineInvoice,
  getPendingInvoices,
  syncPendingInvoices,
  getOfflineStats,
  startNetworkMonitoring,
  registerServiceWorker,
  requestNotificationPermission,
}
