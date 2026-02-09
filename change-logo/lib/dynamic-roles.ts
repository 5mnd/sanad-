// Dynamic Role Management System for Sanad - Fully ERPNext Compatible

import type { ERPNextConfig } from './erpnext-api'

// Core Types
export interface Role {
  name: string
  nameAr: string
  nameEn: string
  isCustom: boolean
  permissions: string[]
  createdAt?: string
  modifiedAt?: string
  erpnextSynced?: boolean
}

export interface Permission {
  key: string
  module: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
}

// In-memory role cache (in production, this would be in a database or state management)
let rolesCache: Role[] = []
let permissionsCache: Permission[] = []

// Base permissions that are always available
export const BASE_PERMISSIONS: Permission[] = [
  // Sales Module
  { key: 'sales.view', module: 'sales', nameAr: 'عرض المبيعات', nameEn: 'View Sales', descriptionAr: 'عرض الفواتير وسجلات المبيعات', descriptionEn: 'View invoices and sales records' },
  { key: 'sales.create', module: 'sales', nameAr: 'إنشاء فاتورة', nameEn: 'Create Invoice', descriptionAr: 'إنشاء فواتير جديدة', descriptionEn: 'Create new invoices' },
  { key: 'sales.refund', module: 'sales', nameAr: 'استرجاع', nameEn: 'Refund', descriptionAr: 'عمل استرداد للفواتير', descriptionEn: 'Process invoice refunds' },
  { key: 'sales.delete', module: 'sales', nameAr: 'حذف الفواتير', nameEn: 'Delete Invoices', descriptionAr: 'حذف الفواتير', descriptionEn: 'Delete invoices' },
  { key: 'sales.discount', module: 'sales', nameAr: 'تطبيق خصومات', nameEn: 'Apply Discounts', descriptionAr: 'تطبيق خصومات على الفواتير', descriptionEn: 'Apply discounts to invoices' },
  
  // Inventory Module
  { key: 'inventory.view', module: 'inventory', nameAr: 'عرض المخزون', nameEn: 'View Stock', descriptionAr: 'عرض مستويات المخزون', descriptionEn: 'View stock levels' },
  { key: 'inventory.add', module: 'inventory', nameAr: 'إضافة منتج', nameEn: 'Add Product', descriptionAr: 'إضافة منتجات جديدة', descriptionEn: 'Add new products' },
  { key: 'inventory.edit', module: 'inventory', nameAr: 'تعديل السعر', nameEn: 'Edit Price', descriptionAr: 'تعديل أسعار المنتجات', descriptionEn: 'Edit product prices' },
  { key: 'inventory.audit', module: 'inventory', nameAr: 'جرد المخزون', nameEn: 'Stock Audit', descriptionAr: 'إجراء جرد المخزون', descriptionEn: 'Conduct stock audits' },
  { key: 'inventory.delete', module: 'inventory', nameAr: 'حذف منتج', nameEn: 'Delete Product', descriptionAr: 'حذف المنتجات', descriptionEn: 'Delete products' },
  
  // HR Module
  { key: 'hr.view', module: 'hr', nameAr: 'عرض الكل', nameEn: 'View All', descriptionAr: 'عرض جميع سجلات الموارد البشرية', descriptionEn: 'View all HR records' },
  { key: 'hr.viewOwn', module: 'hr', nameAr: 'عرض بياناتي', nameEn: 'View Own Data', descriptionAr: 'عرض البيانات الشخصية فقط', descriptionEn: 'View own data only' },
  { key: 'hr.approveAttendance', module: 'hr', nameAr: 'الموافقة على الحضور', nameEn: 'Approve Attendance', descriptionAr: 'الموافقة على طلبات الحضور والإجازات', descriptionEn: 'Approve attendance and leave requests' },
  { key: 'hr.editPayroll', module: 'hr', nameAr: 'تعديل الرواتب', nameEn: 'Edit Payroll', descriptionAr: 'تعديل الرواتب والبدلات', descriptionEn: 'Edit payroll and allowances' },
  { key: 'hr.deleteEmployee', module: 'hr', nameAr: 'حذف موظف', nameEn: 'Delete Employee', descriptionAr: 'حذف سجلات الموظفين', descriptionEn: 'Delete employee records' },
  { key: 'hr.viewSalaries', module: 'hr', nameAr: 'عرض الرواتب', nameEn: 'View Salaries', descriptionAr: 'عرض رواتب الموظفين', descriptionEn: 'View employee salaries' },
  
  // Analytics Module
  { key: 'analytics.view', module: 'analytics', nameAr: 'عرض التحليلات', nameEn: 'View Analytics', descriptionAr: 'عرض التقارير والتحليلات', descriptionEn: 'View reports and analytics' },
  { key: 'analytics.export', module: 'analytics', nameAr: 'تصدير البيانات', nameEn: 'Export Data', descriptionAr: 'تصدير التقارير والبيانات', descriptionEn: 'Export reports and data' },
  
  // Settings Module
  { key: 'settings.systemConfig', module: 'settings', nameAr: 'إعدادات النظام', nameEn: 'System Config', descriptionAr: 'تغيير إعدادات النظام', descriptionEn: 'Change system settings' },
  { key: 'settings.apiKeys', module: 'settings', nameAr: 'مفاتيح API', nameEn: 'API Keys', descriptionAr: 'إدارة مفاتيح API', descriptionEn: 'Manage API keys' },
  { key: 'settings.telegram', module: 'settings', nameAr: 'إعدادات Telegram', nameEn: 'Telegram Settings', descriptionAr: 'تكوين إعدادات Telegram', descriptionEn: 'Configure Telegram settings' },
  { key: 'settings.erpnext', module: 'settings', nameAr: 'إعدادات ERPNext', nameEn: 'ERPNext Settings', descriptionAr: 'تكوين اتصال ERPNext', descriptionEn: 'Configure ERPNext connection' },
  { key: 'settings.security', module: 'settings', nameAr: 'إعدادات الأمان', nameEn: 'Security Settings', descriptionAr: 'إدارة إعدادات الأمان', descriptionEn: 'Manage security settings' },
  { key: 'settings.roles', module: 'settings', nameAr: 'إدارة الأدوار', nameEn: 'Manage Roles', descriptionAr: 'إدارة الأدوار والصلاحيات', descriptionEn: 'Manage roles and permissions' },
]

// Default base roles
const BASE_ROLES: Role[] = [
  {
    name: 'System Admin',
    nameAr: 'مدير النظام',
    nameEn: 'System Admin',
    isCustom: false,
    permissions: BASE_PERMISSIONS.map(p => p.key),
    erpnextSynced: true
  },
  {
    name: 'HR Manager',
    nameAr: 'مدير موارد بشرية',
    nameEn: 'HR Manager',
    isCustom: false,
    permissions: [
      'sales.view', 'inventory.view',
      'hr.view', 'hr.approveAttendance', 'hr.editPayroll', 'hr.deleteEmployee', 'hr.viewSalaries',
      'analytics.view', 'settings.telegram'
    ],
    erpnextSynced: true
  },
  {
    name: 'Branch Manager',
    nameAr: 'مدير فرع',
    nameEn: 'Branch Manager',
    isCustom: false,
    permissions: [
      'sales.view', 'sales.create', 'sales.refund', 'sales.discount',
      'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.audit',
      'hr.view', 'hr.approveAttendance',
      'analytics.view'
    ],
    erpnextSynced: true
  },
  {
    name: 'Cashier',
    nameAr: 'كاشير',
    nameEn: 'Cashier',
    isCustom: false,
    permissions: ['sales.view', 'sales.create', 'inventory.view'],
    erpnextSynced: true
  },
  {
    name: 'Employee',
    nameAr: 'موظف',
    nameEn: 'Employee',
    isCustom: false,
    permissions: ['sales.view', 'inventory.view', 'hr.viewOwn'],
    erpnextSynced: true
  }
]

// Initialize roles and permissions
export function initializeRolesAndPermissions() {
  if (rolesCache.length === 0) {
    rolesCache = [...BASE_ROLES]
  }
  if (permissionsCache.length === 0) {
    permissionsCache = [...BASE_PERMISSIONS]
  }
}

// Fetch roles from ERPNext
export async function fetchRolesFromERPNext(erpConfig: ERPNextConfig): Promise<Role[]> {
  if (!erpConfig.connected || !erpConfig.url) {
    console.log('[v0] ERPNext not connected, using local roles')
    initializeRolesAndPermissions()
    return rolesCache
  }

  try {
    const baseUrl = erpConfig.url.replace(/\/+$/, '')
    const headers = {
      'Authorization': `token ${erpConfig.apiKey}:${erpConfig.apiSecret}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    console.log('[v0] Fetching roles from ERPNext...')
    
    const response = await fetch(
      `${baseUrl}/api/resource/Role?fields=["name","disabled"]&filters=[["disabled","=",0]]&limit_page_length=999`,
      { method: 'GET', headers }
    )

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[v0] Fetched roles from ERPNext:', data.data?.length || 0)

    if (data.data && Array.isArray(data.data)) {
      const erpRoles: Role[] = data.data.map((role: any) => {
        // Check if this is a base role
        const baseRole = BASE_ROLES.find(r => r.name === role.name)
        
        return {
          name: role.name,
          nameAr: baseRole?.nameAr || role.name,
          nameEn: baseRole?.nameEn || role.name,
          isCustom: !baseRole,
          permissions: baseRole?.permissions || ['sales.view', 'inventory.view'],
          erpnextSynced: true
        }
      })

      rolesCache = erpRoles
      return erpRoles
    }

    // Fallback to base roles
    initializeRolesAndPermissions()
    return rolesCache
  } catch (error) {
    console.error('[v0] Failed to fetch roles from ERPNext:', error)
    initializeRolesAndPermissions()
    return rolesCache
  }
}

// Get all roles
export function getAllRoles(): Role[] {
  if (rolesCache.length === 0) {
    initializeRolesAndPermissions()
  }
  return rolesCache
}

// Get all permissions
export function getAllPermissions(): Permission[] {
  if (permissionsCache.length === 0) {
    initializeRolesAndPermissions()
  }
  return permissionsCache
}

// Add custom role
export function addCustomRole(role: Omit<Role, 'isCustom' | 'erpnextSynced'>): Role {
  const newRole: Role = {
    ...role,
    isCustom: true,
    erpnextSynced: false,
    createdAt: new Date().toISOString()
  }
  
  rolesCache.push(newRole)
  return newRole
}

// Update role permissions
export function updateRolePermissions(roleName: string, permissions: string[]): Role | null {
  const roleIndex = rolesCache.findIndex(r => r.name === roleName)
  if (roleIndex === -1) return null
  
  rolesCache[roleIndex] = {
    ...rolesCache[roleIndex],
    permissions,
    modifiedAt: new Date().toISOString(),
    erpnextSynced: false
  }
  
  return rolesCache[roleIndex]
}

// Get role by name
export function getRoleByName(roleName: string): Role | undefined {
  return rolesCache.find(r => r.name === roleName)
}

// Check if user has permission
export function hasPermission(
  user: { role?: string; permissions?: string[] } | null,
  permissionKey: string
): boolean {
  if (!user) return false

  // Check explicit permissions array
  if (user.permissions && user.permissions.includes(permissionKey)) {
    return true
  }

  // Check role-based permissions
  if (user.role) {
    const role = getRoleByName(user.role)
    if (role && role.permissions.includes(permissionKey)) {
      return true
    }
  }

  return false
}

// Get permissions for a role
export function getPermissionsForRole(roleName: string): string[] {
  const role = getRoleByName(roleName)
  return role?.permissions || []
}

// Get all unique modules
export function getAllModules(): string[] {
  const modules = new Set(permissionsCache.map(p => p.module))
  return Array.from(modules)
}

// Get permissions by module
export function getPermissionsByModule(module: string): Permission[] {
  return permissionsCache.filter(p => p.module === module)
}

// Sync role to ERPNext
export async function syncRoleToERPNext(
  role: Role,
  erpConfig: ERPNextConfig
): Promise<boolean> {
  if (!erpConfig.connected || !erpConfig.url) {
    console.log('[v0] ERPNext not connected, skipping sync')
    return false
  }

  try {
    const baseUrl = erpConfig.url.replace(/\/+$/, '')
    const headers = {
      'Authorization': `token ${erpConfig.apiKey}:${erpConfig.apiSecret}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Create custom field in ERPNext to store Sanad permissions
    const payload = {
      doctype: 'Role',
      role_name: role.name,
      custom_sanad_permissions: JSON.stringify(role.permissions)
    }

    const response = await fetch(
      `${baseUrl}/api/resource/Role`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }
    )

    if (response.ok) {
      console.log('[v0] Role synced to ERPNext:', role.name)
      // Update local cache
      const roleIndex = rolesCache.findIndex(r => r.name === role.name)
      if (roleIndex !== -1) {
        rolesCache[roleIndex].erpnextSynced = true
      }
      return true
    }

    return false
  } catch (error) {
    console.error('[v0] Failed to sync role to ERPNext:', error)
    return false
  }
}
