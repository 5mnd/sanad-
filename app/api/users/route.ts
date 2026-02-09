import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, verifyPassword } from '@/lib/password-hash'

// تعريف هيكل بيانات المستخدم
// User data structure
export interface User {
  id: string
  username: string
  password: string // hashed
  nameAr: string
  nameEn: string
  email?: string
  phone?: string
  role: 'admin' | 'hr_manager' | 'branch_manager' | 'cashier' | 'employee'
  branchId?: string
  permissions: string[]
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

// GET: جلب جميع المستخدمين
// GET: Fetch all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // جلب المستخدمين من localStorage (في الإنتاج سيكون من قاعدة البيانات)
    // Fetch users from localStorage (in production would be from database)
    const usersJson = typeof window !== 'undefined' 
      ? localStorage.getItem('sanad_users')
      : null
    
    const users: User[] = usersJson ? JSON.parse(usersJson) : []
    
    // إذا كان هناك userId محدد، إرجاع مستخدم واحد
    // If specific userId, return single user
    if (userId) {
      const user = users.find(u => u.id === userId)
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'المستخدم غير موجود / User not found' },
          { status: 404 }
        )
      }
      
      // إزالة كلمة المرور من الاستجابة
      // Remove password from response
      const { password, ...userWithoutPassword } = user
      return NextResponse.json({ success: true, user: userWithoutPassword })
    }
    
    // إرجاع جميع المستخدمين بدون كلمات المرور
    // Return all users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user)
    
    return NextResponse.json({
      success: true,
      users: usersWithoutPasswords,
      total: users.length
    })
  } catch (error) {
    console.error('[v0] Error fetching users:', error)
    return NextResponse.json(
      { success: false, message: 'خطأ في جلب المستخدمين / Error fetching users' },
      { status: 500 }
    )
  }
}

// POST: إنشاء مستخدم جديد
// POST: Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, nameAr, nameEn, email, phone, role, branchId, permissions, currentUserId } = body
    
    // التحقق من الصلاحيات (يجب أن يكون المستخدم الحالي admin)
    // Verify permissions (current user must be admin)
    const usersJson = typeof window !== 'undefined' 
      ? localStorage.getItem('sanad_users')
      : null
    const users: User[] = usersJson ? JSON.parse(usersJson) : []
    
    const currentUser = users.find(u => u.id === currentUserId)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح / Unauthorized' },
        { status: 403 }
      )
    }
    
    // التحقق من عدم تكرار اسم المستخدم
    // Check username uniqueness
    if (users.some(u => u.username === username)) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم موجود بالفعل / Username already exists' },
        { status: 400 }
      )
    }
    
    // تشفير كلمة المرور
    // Hash password
    const hashedPassword = await hashPassword(password)
    
    // إنشاء مستخدم جديد
    // Create new user
    const newUser: User = {
      id: `USER-${Date.now()}`,
      username,
      password: hashedPassword,
      nameAr,
      nameEn,
      email,
      phone,
      role,
      branchId,
      permissions: permissions || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    users.push(newUser)
    
    // حفظ في localStorage
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanad_users', JSON.stringify(users))
    }
    
    // إرجاع المستخدم بدون كلمة المرور
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح / User created successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('[v0] Error creating user:', error)
    return NextResponse.json(
      { success: false, message: 'خطأ في إنشاء المستخدم / Error creating user' },
      { status: 500 }
    )
  }
}

// PUT: تعديل مستخدم
// PUT: Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, updates, currentUserId, newPassword } = body
    
    const usersJson = typeof window !== 'undefined' 
      ? localStorage.getItem('sanad_users')
      : null
    const users: User[] = usersJson ? JSON.parse(usersJson) : []
    
    // التحقق من الصلاحيات
    // Verify permissions
    const currentUser = users.find(u => u.id === currentUserId)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح / Unauthorized' },
        { status: 403 }
      )
    }
    
    // البحث عن المستخدم المراد تعديله
    // Find user to update
    const userIndex = users.findIndex(u => u.id === userId)
    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود / User not found' },
        { status: 404 }
      )
    }
    
    // تحديث البيانات
    // Update data
    const updatedUser = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    // إذا كانت هناك كلمة مرور جديدة
    // If there's a new password
    if (newPassword) {
      updatedUser.password = await hashPassword(newPassword)
    }
    
    users[userIndex] = updatedUser
    
    // حفظ التحديثات
    // Save updates
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanad_users', JSON.stringify(users))
    }
    
    const { password, ...userWithoutPassword } = updatedUser
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح / User updated successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('[v0] Error updating user:', error)
    return NextResponse.json(
      { success: false, message: 'خطأ في تحديث المستخدم / Error updating user' },
      { status: 500 }
    )
  }
}

// DELETE: حذف مستخدم
// DELETE: Delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const currentUserId = searchParams.get('currentUserId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'معرف المستخدم مطلوب / User ID required' },
        { status: 400 }
      )
    }
    
    const usersJson = typeof window !== 'undefined' 
      ? localStorage.getItem('sanad_users')
      : null
    const users: User[] = usersJson ? JSON.parse(usersJson) : []
    
    // التحقق من الصلاحيات
    // Verify permissions
    const currentUser = users.find(u => u.id === currentUserId)
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح / Unauthorized' },
        { status: 403 }
      )
    }
    
    // منع حذف المستخدم نفسه
    // Prevent self-deletion
    if (userId === currentUserId) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف حسابك الخاص / Cannot delete your own account' },
        { status: 400 }
      )
    }
    
    // حذف المستخدم
    // Delete user
    const filteredUsers = users.filter(u => u.id !== userId)
    
    if (filteredUsers.length === users.length) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود / User not found' },
        { status: 404 }
      )
    }
    
    // حفظ التحديثات
    // Save updates
    if (typeof window !== 'undefined') {
      localStorage.setItem('sanad_users', JSON.stringify(filteredUsers))
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح / User deleted successfully'
    })
  } catch (error) {
    console.error('[v0] Error deleting user:', error)
    return NextResponse.json(
      { success: false, message: 'خطأ في حذف المستخدم / Error deleting user' },
      { status: 500 }
    )
  }
}
