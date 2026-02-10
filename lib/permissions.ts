// Granular Permission System for Sanad

export type PermissionModule = 'sales' | 'inventory' | 'hr' | 'settings'

export interface Permission {
  key: string
  module: PermissionModule
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
}

// Complete Permission Definitions
export const PERMISSIONS: Record<string, Permission> = {
  // Sales Module
  'sales.view': {
    key: 'sales.view',
    module: 'sales',
    nameAr: 'عرض المبيعات',
    nameEn: 'View Sales',
    descriptionAr: 'القدرة على عرض الفواتير وسجلات المبيعات',
    descriptionEn: 'Ability to view invoices and sales records'
  },
  'sales.create': {
    key: 'sales.create',
    module: 'sales',
    nameAr: 'إنشاء فاتورة',
    nameEn: 'Create Invoice',
    descriptionAr: 'القدرة على إنشاء فواتير جديدة',
    descriptionEn: 'Ability to create new invoices'
  },
  'sales.refund': {
    key: 'sales.refund',
    module: 'sales',
    nameAr: 'استرجاع/استرداد',
    nameEn: 'Refund',
    descriptionAr: 'القدرة على عمل استرداد للفواتير',
    descriptionEn: 'Ability to process invoice refunds'
  },
  'sales.delete': {
    key: 'sales.delete',
    module: 'sales',
    nameAr: 'حذف الفواتير',
    nameEn: 'Delete Invoices',
    descriptionAr: 'القدرة على حذف الفواتير',
    descriptionEn: 'Ability to delete invoices'
  },
  'sales.discount': {
    key: 'sales.discount',
    module: 'sales',
    nameAr: 'تطبيق خصومات',
    nameEn: 'Apply Discounts',
    descriptionAr: 'القدرة على تطبيق خصومات على الفواتير',
    descriptionEn: 'Ability to apply discounts to invoices'
  },

  // Inventory Module
  'inventory.view': {
    key: 'inventory.view',
    module: 'inventory',
    nameAr: 'عرض المخزون',
    nameEn: 'View Stock',
    descriptionAr: 'القدرة على عرض مستويات المخزون',
    descriptionEn: 'Ability to view stock levels'
  },
  'inventory.add': {
    key: 'inventory.add',
    module: 'inventory',
    nameAr: 'إضافة منتج',
    nameEn: 'Add Product',
    descriptionAr: 'القدرة على إضافة منتجات جديدة',
    descriptionEn: 'Ability to add new products'
  },
  'inventory.edit': {
    key: 'inventory.edit',
    module: 'inventory',
    nameAr: 'تعديل السعر',
    nameEn: 'Edit Price',
    descriptionAr: 'القدرة على تعديل أسعار المنتجات',
    descriptionEn: 'Ability to edit product prices'
  },
  'inventory.audit': {
    key: 'inventory.audit',
    module: 'inventory',
    nameAr: 'جرد المخزون',
    nameEn: 'Stock Audit',
    descriptionAr: 'القدرة على إجراء جرد المخزون',
    descriptionEn: 'Ability to conduct stock audits'
  },
  'inventory.delete': {
    key: 'inventory.delete',
    module: 'inventory',
    nameAr: 'حذف منتج',
    nameEn: 'Delete Product',
    descriptionAr: 'القدرة على حذف المنتجات',
    descriptionEn: 'Ability to delete products'
  },

  // HR Module
  'hr.view': {
    key: 'hr.view',
    module: 'hr',
    nameAr: 'عرض الكل',
    nameEn: 'View All',
    descriptionAr: 'القدرة على عرض جميع سجلات الموارد البشرية',
    descriptionEn: 'Ability to view all HR records'
  },
  'hr.approveAttendance': {
    key: 'hr.approveAttendance',
    module: 'hr',
    nameAr: 'الموافقة على الحضور',
    nameEn: 'Approve Attendance',
    descriptionAr: 'القدرة على الموافقة على طلبات الحضور والإجازات',
    descriptionEn: 'Ability to approve attendance and leave requests'
  },
  'hr.editPayroll': {
    key: 'hr.editPayroll',
    module: 'hr',
    nameAr: 'تعديل الرواتب',
    nameEn: 'Edit Payroll',
    descriptionAr: 'القدرة على تعديل الرواتب والبدلات',
    descriptionEn: 'Ability to edit payroll and allowances'
  },
  'hr.deleteEmployee': {
    key: 'hr.deleteEmployee',
    module: 'hr',
    nameAr: 'حذف موظف',
    nameEn: 'Delete Employee',
    descriptionAr: 'القدرة على حذف سجلات الموظفين',
    descriptionEn: 'Ability to delete employee records'
  },
  'hr.viewSalaries': {
    key: 'hr.viewSalaries',
    module: 'hr',
    nameAr: 'عرض الرواتب',
    nameEn: 'View Salaries',
    descriptionAr: 'القدرة على عرض رواتب الموظفين',
    descriptionEn: 'Ability to view employee salaries'
  },

  // Settings Module
  'settings.systemConfig': {
    key: 'settings.systemConfig',
    module: 'settings',
    nameAr: 'إعدادات النظام',
    nameEn: 'System Config',
    descriptionAr: 'القدرة على تغيير إعدادات النظام',
    descriptionEn: 'Ability to change system settings'
  },
  'settings.apiKeys': {
    key: 'settings.apiKeys',
    module: 'settings',
    nameAr: 'مفاتيح API',
    nameEn: 'API Keys',
    descriptionAr: 'القدرة على إدارة مفاتيح API',
    descriptionEn: 'Ability to manage API keys'
  },
  'settings.telegram': {
    key: 'settings.telegram',
    module: 'settings',
    nameAr: 'إعدادات Telegram',
    nameEn: 'Telegram Settings',
    descriptionAr: 'القدرة على تكوين إعدادات Telegram',
    descriptionEn: 'Ability to configure Telegram settings'
  },
  'settings.erpnext': {
    key: 'settings.erpnext',
    module: 'settings',
    nameAr: 'إعدادات ERPNext',
    nameEn: 'ERPNext Settings',
    descriptionAr: 'القدرة على تكوين اتصال ERPNext',
    descriptionEn: 'Ability to configure ERPNext connection'
  },
  'settings.security': {
    key: 'settings.security',
    module: 'settings',
    nameAr: 'إعدادات الأمان',
    nameEn: 'Security Settings',
    descriptionAr: 'القدرة على إدارة إعدادات الأمان',
    descriptionEn: 'Ability to manage security settings'
  },
  'settings.resetData': {
    key: 'settings.resetData',
    module: 'settings',
    nameAr: 'تصفير البيانات',
    nameEn: 'Reset Data',
    descriptionAr: 'القدرة على تصفير جميع بيانات النظام (خطير - مدير عام فقط)',
    descriptionEn: 'Ability to reset all system data (dangerous - admin only)'
  },
  'settings.users': {
    key: 'settings.users',
    module: 'settings',
    nameAr: 'إدارة المستخدمين',
    nameEn: 'User Management',
    descriptionAr: 'القدرة على إضافة وتعديل وحذف المستخدمين',
    descriptionEn: 'Ability to add, edit, and delete users'
  },
}

// Role Permission Mappings (Default Templates)
export type RoleType = 'admin' | 'hr_manager' | 'branch_manager' | 'cashier' | 'employee'

export const ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  admin: Object.keys(PERMISSIONS), // Full access including data reset
  
  hr_manager: [
    'sales.view',
    'inventory.view',
    'hr.view',
    'hr.approveAttendance',
    'hr.editPayroll',
    'hr.deleteEmployee',
    'hr.viewSalaries',
    'settings.telegram',
  ],
  
  branch_manager: [
    'sales.view',
    'sales.create',
    'sales.refund',
    'sales.discount',
    'inventory.view',
    'inventory.add',
    'inventory.edit',
    'inventory.audit',
    'hr.view',
    'hr.approveAttendance',
  ],
  
  cashier: [
    'sales.view',
    'sales.create',
    'inventory.view',
  ],
  
  employee: [
    'sales.view',
    'inventory.view',
  ],
}

// Permission Check Utility
export interface UserPermissions {
  [key: string]: boolean
}

export function hasPermission(
  user: { permissions?: UserPermissions; role?: string } | null,
  permissionKey: string
): boolean {
  if (!user) return false

  // Check if user has explicit permission
  if (user.permissions && user.permissions[permissionKey]) {
    return true
  }

  // Check role-based permissions
  if (user.role) {
    const roleKey = user.role.toLowerCase() as RoleType
    const rolePerms = ROLE_PERMISSIONS[roleKey] || []
    return rolePerms.includes(permissionKey)
  }

  return false
}

// Convert permission keys array to UserPermissions object
export function permissionsArrayToObject(permissionKeys: string[]): UserPermissions {
  const permissions: UserPermissions = {}
  permissionKeys.forEach(key => {
    permissions[key] = true
  })
  return permissions
}

// Get permissions by module
export function getPermissionsByModule(module: PermissionModule): Permission[] {
  return Object.values(PERMISSIONS).filter(p => p.module === module)
}

// Get all modules
export function getAllModules(): PermissionModule[] {
  return ['sales', 'inventory', 'hr', 'settings']
}
