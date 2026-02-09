'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Users, UserPlus, Edit, Trash2, Eye, EyeOff, Key, RefreshCw, CheckCircle, XCircle, AlertCircle, Shield, LayoutDashboard, ShoppingCart, Receipt, Package, TrendingUp, Globe, Zap, User, Monitor } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { checkPasswordStrength, generateStrongPassword } from '@/lib/password-hash'
import type { User as UserType } from '@/app/api/users/route'

interface SystemPermissions {
  dashboard: boolean
  pos: boolean
  sales: boolean
  inventory: boolean
  hr: boolean
  analytics: boolean
  users: boolean
  erpnext: boolean
  integrations: boolean
  security: boolean
  employees: boolean
  promotions: boolean
  permissions: boolean
  manageCategories: boolean
  [key: string]: boolean
}

const DEFAULT_PERMISSIONS: SystemPermissions = {
  dashboard: true,
  pos: true,
  sales: false,
  inventory: false,
  hr: true, // جميع المستخدمين لديهم صلاحية الموارد البشرية بشكل افتراضي
  analytics: false,
  users: false,
  erpnext: false,
  integrations: false,
  security: false,
  employees: false,
  promotions: false,
  permissions: false,
  manageCategories: false,
}

const ADMIN_PERMISSIONS: SystemPermissions = {
  dashboard: true,
  pos: true,
  sales: true,
  inventory: true,
  hr: true,
  analytics: true,
  users: true,
  erpnext: true,
  integrations: true,
  security: true,
  employees: true,
  promotions: true,
  permissions: true,
  manageCategories: true,
}

// Permission sections definition for the UI
const PERMISSION_SECTIONS = [
  { key: 'dashboard', icon: LayoutDashboard, labelAr: 'القائمة الرئيسية', labelEn: 'Dashboard' },
  { key: 'pos', icon: Monitor, labelAr: 'مساحة العمل / نقاط البيع', labelEn: 'Workspace / POS' },
  { key: 'sales', icon: Receipt, labelAr: 'المبيعات', labelEn: 'Sales' },
  { key: 'inventory', icon: Package, labelAr: 'المخزون', labelEn: 'Inventory' },
  { key: 'hr', icon: Users, labelAr: 'الموارد البشرية', labelEn: 'Human Resources' },
  { key: 'analytics', icon: TrendingUp, labelAr: 'التحليلات المتقدمة', labelEn: 'Advanced Analytics' },
  { key: 'users', icon: Shield, labelAr: 'إدارة المستخدمين', labelEn: 'User Management' },
  { key: 'erpnext', icon: Globe, labelAr: 'ربط ERPNext', labelEn: 'ERPNext Integration' },
  { key: 'integrations', icon: Zap, labelAr: 'إدارة المنصات', labelEn: 'Platform Management' },
] as const

interface UserManagementProps {
  language: 'ar' | 'en'
  currentUserId: string
}

export function UserManagement({ language, currentUserId }: UserManagementProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState<Omit<UserType, 'password'>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Omit<UserType, 'password'> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // نموذج إضافة/تعديل مستخدم
  // Add/Edit user form
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nameAr: '',
    nameEn: '',
    email: '',
    phone: '',
    role: 'employee' as UserType['role'],
    branchId: '',
    status: 'active' as UserType['status'],
    permissions: { ...DEFAULT_PERMISSIONS } as SystemPermissions,
    salary: '',
  })

  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] })

  // جلب المستخدمين
  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const usersJson = localStorage.getItem('sanad_users')
      const allUsers: any[] = usersJson ? JSON.parse(usersJson) : []
      
      // Map stored user data to consistent format and remove passwords
      const usersWithoutPasswords = allUsers.map(({ password, passwordHash, passwordSalt, ...user }) => ({
        ...user,
        nameAr: user.nameAr || user.name || user.username,
        nameEn: user.nameEn || user.name || user.username,
      }))
      setUsers(usersWithoutPasswords)
    } catch (error) {
      // Error fetching users
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // تحديث قوة كلمة المرور
  // Update password strength
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(checkPasswordStrength(formData.password))
    }
  }, [formData.password])

  // إضافة مستخدم جديد
  // Add new user
  const handleAddUser = async () => {
    if (!formData.username || !formData.password || !formData.nameAr || !formData.nameEn) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (passwordStrength.score < 2) {
      toast({
        title: language === 'ar' ? 'تحذير' : 'Warning',
        description: language === 'ar' ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak',
        variant: 'destructive',
      })
      return
    }

    try {

      
      // تشفير كلمة المرور بنفس الطريقة المستخدمة في handleLogin
      // Hash password the same way as handleLogin
      const crypto = window.crypto || (window as any).msCrypto
      const encoder = new TextEncoder()
      
      // إنشاء salt عشوائي
      // Generate random salt
      const saltArray = crypto.getRandomValues(new Uint8Array(16))
      const passwordSalt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('')
      
      // تشفير كلمة المرور مع الـ salt
      // Hash password with salt
      const data = encoder.encode(formData.password + passwordSalt)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      


      // إنشاء المستخدم
      // Create user
      const usersJson = localStorage.getItem('sanad_users')
      const users: any[] = usersJson ? JSON.parse(usersJson) : []

      // التحقق من عدم تكرار اسم المستخدم
      // Check username uniqueness
      if (users.some(u => u.username === formData.username)) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'اسم المستخدم موجود بالفعل' : 'Username already exists',
          variant: 'destructive',
        })
        return
      }

      const newUser = {
        id: `USER-${Date.now()}`,
        username: formData.username,
        passwordHash: passwordHash,
        passwordSalt: passwordSalt,
        name: formData.nameAr,
        nameAr: formData.nameAr,
        nameEn: formData.nameEn,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        designation: formData.role === 'admin' ? 'مدير' : 'موظف',
        designationEn: formData.role === 'admin' ? 'Manager' : 'Employee',
        branchId: formData.branchId || 'MAIN',
        permissions: formData.role === 'admin' ? { ...ADMIN_PERMISSIONS } : { ...formData.permissions },
        status: formData.status,
        salary: parseFloat(formData.salary) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      users.push(newUser)
      localStorage.setItem('sanad_users', JSON.stringify(users))
      


      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: language === 'ar' ? 'تم إضافة المستخدم بنجاح' : 'User added successfully',
      })

      setShowAddDialog(false)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('[v0] Error adding user:', error)
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إضافة المستخدم' : 'Failed to add user',
        variant: 'destructive',
      })
    }
  }

  // تعديل مستخدم
  // Edit user
  const handleEditUser = async () => {
    if (!selectedUser) return
    
    // Validate required fields
    if (!formData.username || !formData.nameAr || !formData.nameEn) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      })
      return
    }

    // Validate password match if changing
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    try {
      const usersJson = localStorage.getItem('sanad_users')
      const users: any[] = usersJson ? JSON.parse(usersJson) : []
      
      const userIndex = users.findIndex(u => u.id === selectedUser.id)
      if (userIndex === -1) return

      // تحديث كلمة المرور إذا تم تغييرها
      // Update password if changed
      let passwordHash = users[userIndex].passwordHash
      let passwordSalt = users[userIndex].passwordSalt
      
      if (formData.password && formData.password.length > 0) {

        
        // تشفير كلمة المرور الجديدة
        // Hash new password
        const crypto = window.crypto || (window as any).msCrypto
        const encoder = new TextEncoder()
        
        // إنشاء salt جديد
        // Generate new salt
        const saltArray = crypto.getRandomValues(new Uint8Array(16))
        passwordSalt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('')
        
        // تشفير كلمة المرور
        // Hash password
        const data = encoder.encode(formData.password + passwordSalt)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      }

      // تحديث البيانات
      // Update data
      const roleLabels: Record<string, { ar: string, en: string }> = {
        admin: { ar: 'مدير عام', en: 'Admin' },
        hr_manager: { ar: 'مدير موارد بشرية', en: 'HR Manager' },
        branch_manager: { ar: 'مدير فرع', en: 'Branch Manager' },
        cashier: { ar: 'كاشير', en: 'Cashier' },
        employee: { ar: 'موظف', en: 'Employee' },
      }
      
      users[userIndex] = {
        ...users[userIndex],
        username: formData.username,
        name: formData.nameAr,
        nameAr: formData.nameAr,
        nameEn: formData.nameEn,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        designation: roleLabels[formData.role]?.ar || users[userIndex].designation,
        designationEn: roleLabels[formData.role]?.en || users[userIndex].designationEn,
        passwordHash: passwordHash,
        passwordSalt: passwordSalt,
        branchId: formData.branchId,
        status: formData.status,
        permissions: formData.role === 'admin' ? { ...ADMIN_PERMISSIONS } : { ...formData.permissions },
        salary: parseFloat(formData.salary) || users[userIndex].salary || 0,
        updatedAt: new Date().toISOString()
      }
      


      localStorage.setItem('sanad_users', JSON.stringify(users))
  
    

      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: language === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully',
      })

      setShowEditDialog(false)
      setSelectedUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('[v0] Error updating user:', error)
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحديث المستخدم' : 'Failed to update user',
        variant: 'destructive',
      })
    }
  }

  // حذف مستخدم
  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'لا يمك�� حذف حسابك الخاص' : 'Cannot delete your own account',
        variant: 'destructive',
      })
      return
    }

    try {
      const usersJson = localStorage.getItem('sanad_users')
      const users: UserType[] = usersJson ? JSON.parse(usersJson) : []
      
      const filteredUsers = users.filter(u => u.id !== userId)
      localStorage.setItem('sanad_users', JSON.stringify(filteredUsers))

      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: language === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully',
      })

      fetchUsers()
    } catch (error) {
      console.error('[v0] Error deleting user:', error)
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  // فتح نموذج التعديل
  // Open edit form
  const openEditDialog = (user: Omit<UserType, 'password'>) => {
    setSelectedUser(user)
    // Load permissions from localStorage (full user object)
    let userPermissions = { ...DEFAULT_PERMISSIONS }
    try {
      const usersJson = localStorage.getItem('sanad_users')
      if (usersJson) {
        const allUsers = JSON.parse(usersJson)
        const fullUser = allUsers.find((u: any) => u.id === user.id)
        if (fullUser?.permissions && typeof fullUser.permissions === 'object' && !Array.isArray(fullUser.permissions)) {
          userPermissions = { ...DEFAULT_PERMISSIONS, ...fullUser.permissions }
        }
      }
    } catch (e) {
      // fallback to defaults
    }
    // Load salary data
    let salary = ''
    try {
      const usersJson = localStorage.getItem('sanad_users')
      if (usersJson) {
        const allUsers = JSON.parse(usersJson)
        const fullUser = allUsers.find((u: any) => u.id === user.id)
        if (fullUser && fullUser.salary) {
          salary = fullUser.salary.toString()
        }
      }
    } catch (e) {
      // fallback to defaults
    }
    
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      nameAr: user.nameAr || (user as any).name || '',
      nameEn: user.nameEn || (user as any).name || '',
      email: user.email || '',
      phone: user.phone || '',
      salary: salary,
      role: user.role,
      branchId: user.branchId || '',
      status: user.status,
      permissions: userPermissions,
    })
    setShowEditDialog(true)
  }

  // إعادة تعيين النموذج
  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      nameAr: '',
      nameEn: '',
      email: '',
      phone: '',
      role: 'employee',
      branchId: '',
      status: 'active',
      permissions: { ...DEFAULT_PERMISSIONS },
    })
    setPasswordStrength({ score: 0, feedback: [] })
  }

  // توليد كلمة مرور قوية
  // Generate strong password
  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword()
    setFormData({ ...formData, password: newPassword, confirmPassword: newPassword })
  }

  // ألوان قوة كلمة المرور
  // Password strength colors
  const getPasswordStrengthColor = (score: number) => {
    if (score === 0) return 'bg-gray-300'
    if (score === 1) return 'bg-red-500'
    if (score === 2) return 'bg-orange-500'
    if (score === 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Toggle a single permission
  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }))
  }

  // Toggle all permissions on/off
  const toggleAllPermissions = (enabled: boolean) => {
    const newPerms = { ...formData.permissions }
    for (const section of PERMISSION_SECTIONS) {
      newPerms[section.key] = enabled
    }
    setFormData(prev => ({ ...prev, permissions: newPerms }))
  }

  // Render permissions section UI
  const renderPermissionsSection = () => {
    const isAdmin = formData.role === 'admin'
    return (
      <div className="space-y-4">
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">
              {language === 'ar' ? 'صلاحيات النظام' : 'System Permissions'}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'ar' 
                ? 'حدد الأقسام المتاحة لهذا المستخدم'
                : 'Select which sections this user can access'}
            </p>
          </div>
          {!isAdmin && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => toggleAllPermissions(true)}
              >
                {language === 'ar' ? 'تحديد الكل' : 'Select All'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => toggleAllPermissions(false)}
              >
                {language === 'ar' ? 'إلغاء الكل' : 'Deselect All'}
              </Button>
            </div>
          )}
        </div>
        
        {isAdmin && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {language === 'ar' 
                ? 'المدير العام يملك صلاحيات كاملة على جميع أقسام النظام تلقائياً'
                : 'Admin has full access to all system sections automatically'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {PERMISSION_SECTIONS.map((section) => {
            const Icon = section.icon
            const isEnabled = isAdmin ? true : formData.permissions[section.key]
            return (
              <div
                key={section.key}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border'
                } ${isAdmin ? 'opacity-80' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {language === 'ar' ? section.labelAr : section.labelEn}
                  </span>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => !isAdmin && togglePermission(section.key)}
                  disabled={isAdmin}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'hr_manager': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'branch_manager': return 'bg-green-100 text-green-800 border-green-200'
      case 'cashier': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      admin: { ar: 'مدير عام', en: 'Admin' },
      hr_manager: { ar: 'مدير موارد بشرية', en: 'HR Manager' },
      branch_manager: { ar: 'مدير فرع', en: 'Branch Manager' },
      cashier: { ar: 'كاشير', en: 'Cashier' },
      employee: { ar: 'موظف', en: 'Employee' }
    }
    return language === 'ar' ? labels[role]?.ar : labels[role]?.en
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'إضافة وتعديل وحذف مستخدمي النظام' : 'Add, edit, and delete system users'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' 
                    ? 'أدخل بيانات المستخدم الجديد. جميع الحقول المطلوبة مميزة بعلامة *'
                    : 'Enter the new user details. All required fields are marked with *'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* اسم المستخدم */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    {language === 'ar' ? 'اسم المستخدم *' : 'Username *'}
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                  />
                </div>

                {/* كلمة المرور */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="password" className="text-right pt-2">
                    {language === 'ar' ? 'كلمة المرور *' : 'Password *'}
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" onClick={handleGeneratePassword} variant="outline" size="sm">
                        <Key className="h-4 w-4 mr-2" />
                        {language === 'ar' ? 'توليد' : 'Generate'}
                      </Button>
                    </div>
                    
                    {formData.password && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded ${
                                i < passwordStrength.score ? getPasswordStrengthColor(passwordStrength.score) : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {passwordStrength.feedback.map((feedback, i) => (
                              <li key={i}>• {feedback}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* تأكيد كلمة المرور */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="confirmPassword" className="text-right">
                    {language === 'ar' ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                  </Label>
                  <div className="relative col-span-3">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {formData.password && formData.confirmPassword && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="col-start-2 col-span-3">
                      {formData.password === formData.confirmPassword ? (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {language === 'ar' ? 'كلمتا المرور متطابقتان' : 'Passwords match'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <XCircle className="h-4 w-4" />
                          {language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* الاسم بالعربي */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nameAr" className="text-right">
                    {language === 'ar' ? 'الاسم بالعربي *' : 'Name (Arabic) *'}
                  </Label>
                  <Input
                    id="nameAr"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'أدخل الاسم بالعربي' : 'Enter name in Arabic'}
                  />
                </div>

                {/* الاسم بالإنجليزي */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nameEn" className="text-right">
                    {language === 'ar' ? 'الاسم بالإنجليزي *' : 'Name (English) *'}
                  </Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'أدخل الاسم بالإنجليزي' : 'Enter name in English'}
                  />
                </div>

                {/* البريد الإلكتروني */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
                  />
                </div>

                {/* رقم الهاتف */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
                  />
                </div>

                {/* الد��ر */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    {language === 'ar' ? 'الدور *' : 'Role *'}
                  </Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{language === 'ar' ? 'مدير عام' : 'Admin'}</SelectItem>
                      <SelectItem value="hr_manager">{language === 'ar' ? 'مدير موارد بشرية' : 'HR Manager'}</SelectItem>
                      <SelectItem value="branch_manager">{language === 'ar' ? 'مدير فرع' : 'Branch Manager'}</SelectItem>
                      <SelectItem value="cashier">{language === 'ar' ? 'كاشير' : 'Cashier'}</SelectItem>
                      <SelectItem value="employee">{language === 'ar' ? 'موظف' : 'Employee'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* معرف الفرع */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branchId" className="text-right">
                    {language === 'ar' ? 'الفرع' : 'Branch'}
                  </Label>
                  <Input
                    id="branchId"
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'معرف الفرع (اختياري)' : 'Branch ID (optional)'}
                  />
                </div>

                {/* الحالة */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    {language === 'ar' ? 'الحالة *' : 'Status *'}
                  </Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                      <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* الراتب */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="salary" className="text-right">
                    {language === 'ar' ? 'الراتب (ر.س)' : 'Salary (SAR)'}
                  </Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="col-span-3"
                    placeholder={language === 'ar' ? 'أدخل الراتب الأساسي' : 'Enter base salary'}
                    min="0"
                    step="100"
                  />
                </div>

                {/* صلاحيات النظام */}
                {renderPermissionsSection()}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="bg-transparent">
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleAddUser}>
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'قائمة المستخدمين' : 'Users List'}</CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? `إجمالي المستخدمين: ${users.length}`
              : `Total Users: ${users.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' 
                  ? 'لا يوجد مستخدمون مسجلون في النظام'
                  : 'No users registered in the system'}
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'البريد' : 'Email'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الراتب + البدلات' : 'Salary + Allowances'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const baseSalary = (user as any).baseSalary || 0
                  const allowances = (user as any).allowances || []
                  const allowancesTotal = allowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
                  const totalSalary = baseSalary + allowancesTotal
                  
                  return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{language === 'ar' ? user.nameAr : user.nameEn}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {language === 'ar' ? 'نشط' : 'Active'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {language === 'ar' ? 'غير نشط' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {totalSalary > 0 ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-primary">
                              {totalSalary.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                            </div>
                            {allowances.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {baseSalary.toLocaleString()} + {allowancesTotal.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={user.id === currentUserId}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {language === 'ar'
                                  ? `هل أنت متأكد من حذف المستخدم "${language === 'ar' ? user.nameAr : user.nameEn}"؟ لا يمكن التراجع عن هذا الإجراء.`
                                  : `Are you sure you want to delete user "${language === 'ar' ? user.nameAr : user.nameEn}"? This action cannot be undone.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {language === 'ar' ? 'حذف' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تعديل المستخدم' : 'Edit User'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'تعديل بيانات المستخدم. اترك كلمة المرور فارغة إذا كنت لا تريد تغييرها.'
                : 'Edit user details. Leave password empty if you don\'t want to change it.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* نفس الحقول كما في نموذج الإضافة */}
            {/* Same fields as add form */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                {language === 'ar' ? 'اسم المستخدم *' : 'Username *'}
              </Label>
              <Input
                id="edit-username"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                {language === 'ar' ? 'كلمة مرور جديدة' : 'New Password'}
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={language === 'ar' ? 'اتركها فارغة للإبقاء على القديمة' : 'Leave empty to keep current'}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nameAr" className="text-right">
                {language === 'ar' ? 'الاسم بالعربي *' : 'Name (Arabic) *'}
              </Label>
              <Input
                id="edit-nameAr"
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nameEn" className="text-right">
                {language === 'ar' ? 'الاسم بالإنجليزي *' : 'Name in English *'}
              </Label>
              <Input
                id="edit-nameEn"
                value={formData.nameEn || ''}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">
                {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
              </Label>
              <Input
                id="edit-phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                {language === 'ar' ? 'الدور *' : 'Role *'}
              </Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{language === 'ar' ? 'مدير عام' : 'Admin'}</SelectItem>
                  <SelectItem value="hr_manager">{language === 'ar' ? 'مدير موارد بشرية' : 'HR Manager'}</SelectItem>
                  <SelectItem value="branch_manager">{language === 'ar' ? 'مدير فرع' : 'Branch Manager'}</SelectItem>
                  <SelectItem value="cashier">{language === 'ar' ? 'كاشير' : 'Cashier'}</SelectItem>
                  <SelectItem value="employee">{language === 'ar' ? 'موظف' : 'Employee'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                {language === 'ar' ? 'الحالة *' : 'Status *'}
              </Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-salary" className="text-right">
                {language === 'ar' ? 'الراتب (ر.س)' : 'Salary (SAR)'}
              </Label>
              <Input
                id="edit-salary"
                type="number"
                value={formData.salary || ''}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="col-span-3"
                placeholder={language === 'ar' ? 'أدخل الراتب الأساسي' : 'Enter base salary'}
                min="0"
                step="100"
              />
            </div>

            {/* صلاحيات النظام */}
            {renderPermissionsSection()}
          </div>

          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => {
              setShowEditDialog(false)
              setSelectedUser(null)
              resetForm()
            }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleEditUser}>
              {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
