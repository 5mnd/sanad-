// Authentication Service
// نظام المصادقة الكامل
// Complete Authentication System

import { verifyPassword } from './password-hash'

export interface AuthUser {
  id: string
  username: string
  email: string
  name: string
  nameEn: string
  role: 'admin' | 'hr_manager' | 'branch_manager' | 'cashier' | 'employee'
  department: string
  departmentEn: string
  designation: string
  designationEn: string
  branchId?: string
  status: 'active' | 'inactive' | 'on_leave'
  image?: string
  permissions: Record<string, boolean>
  createdAt: string
  lastLogin?: string
}

interface StoredUser extends AuthUser {
  password: string
}

const STORAGE_KEY = 'sanad_users'
const SESSION_KEY = 'sanad_current_user'

/**
 * جلب جميع المستخدمين من localStorage
 * Get all users from localStorage
 */
export function getAllUsers(): StoredUser[] {
  if (typeof window === 'undefined') return []
  
  try {
    const usersJson = localStorage.getItem(STORAGE_KEY)
    return usersJson ? JSON.parse(usersJson) : []
  } catch (error) {
    console.error('[v0] Error reading users:', error)
    return []
  }
}

/**
 * حفظ المستخدمين في localStorage
 * Save users to localStorage
 */
function saveUsers(users: StoredUser[]): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
    return true
  } catch (error) {
    console.error('[v0] Error saving users:', error)
    return false
  }
}

/**
 * تسجيل الدخول
 * Login function
 */
export async function login(username: string, password: string): Promise<{
  success: boolean
  user?: AuthUser
  error?: string
}> {
  console.log('[v0] Login attempt for username:', username)
  
  const users = getAllUsers()
  console.log('[v0] Total users in system:', users.length)
  console.log('[v0] Usernames available:', users.map(u => u.username))
  
  // البحث عن المستخدم
  // Find user
  const user = users.find(u => u.username === username)
  
  if (!user) {
    console.log('[v0] User not found:', username)
    return {
      success: false,
      error: 'اسم المستخدم أو كلمة المرور غير صحيحة / Invalid username or password',
    }
  }
  
  console.log('[v0] User found, verifying password...')
  
  // التحقق من كلمة المرور
  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password)
  
  if (!isPasswordValid) {
    console.log('[v0] Invalid password for user:', username)
    return {
      success: false,
      error: 'اسم المستخدم أو كلمة المرور غير صحيحة / Invalid username or password',
    }
  }
  
  console.log('[v0] Login successful for:', username)
  
  // تحديث آخر تسجيل دخول
  // Update last login
  user.lastLogin = new Date().toISOString()
  const userIndex = users.findIndex(u => u.id === user.id)
  if (userIndex !== -1) {
    users[userIndex] = user
    saveUsers(users)
  }
  
  // حفظ الجلسة
  // Save session
  const { password: _, ...userWithoutPassword } = user
  setCurrentSession(userWithoutPassword)
  
  return {
    success: true,
    user: userWithoutPassword,
  }
}

/**
 * تسجيل الخروج
 * Logout function
 */
export function logout(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(SESSION_KEY)
    console.log('[v0] User logged out successfully')
  } catch (error) {
    console.error('[v0] Error during logout:', error)
  }
}

/**
 * جلب المستخدم الحالي من الجلسة
 * Get current user from session
 */
export function getCurrentSession(): AuthUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY)
    return sessionJson ? JSON.parse(sessionJson) : null
  } catch (error) {
    console.error('[v0] Error reading session:', error)
    return null
  }
}

/**
 * حفظ الجلسة الحالية
 * Save current session
 */
export function setCurrentSession(user: AuthUser): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    console.log('[v0] Session saved for user:', user.username)
  } catch (error) {
    console.error('[v0] Error saving session:', error)
  }
}

/**
 * التحقق من وجود جلسة نشطة
 * Check if there's an active session
 */
export function hasActiveSession(): boolean {
  return getCurrentSession() !== null
}

/**
 * جلب مستخدم محدد
 * Get specific user
 */
export function getUserById(userId: string): AuthUser | null {
  const users = getAllUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user) return null
  
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * التحقق من صلاحية معينة للمستخدم
 * Check if user has specific permission
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (user.role === 'admin') return true // المدير له صلاحيات كاملة
  return user.permissions[permission] === true
}

/**
 * تهيئة حساب المدير الافتراضي إذا لم يكن موجود
 * Initialize default admin account if not exists
 */
export async function initializeDefaultAdmin(): Promise<void> {
  const users = getAllUsers()
  
  // إذا كان هناك مستخدمون، لا تفعل شيء
  // If users exist, do nothing
  if (users.length > 0) {
    console.log('[v0] Users already exist, skipping default admin creation')
    return
  }
  
  console.log('[v0] No users found, creating default admin account...')
  
  // استيراد دالة التشفير
  // Import hash function
  const { hashPassword } = await import('./password-hash')
  
  const defaultAdmin: StoredUser = {
    id: 'USER-ADMIN-001',
    username: 'admin',
    email: 'admin@sanad.com',
    name: 'مدير النظام',
    nameEn: 'System Administrator',
    role: 'admin',
    department: 'الإدارة',
    departmentEn: 'Administration',
    designation: 'مدير عام',
    designationEn: 'General Manager',
    status: 'active',
    password: await hashPassword('admin123'), // كلمة مرور افتراضية
    permissions: {
      dashboard: true,
      pos: true,
      sales: true,
      inventory: true,
      hr: true,
      security: true,
      erpnext: true,
      integrations: true,
      employees: true,
      promotions: true,
      permissions: true,
      analytics: true,
      manageCategories: true,
      users: true,
    },
    createdAt: new Date().toISOString(),
  }
  
  saveUsers([defaultAdmin])
  console.log('[v0] Default admin created - username: admin, password: admin123')
}
