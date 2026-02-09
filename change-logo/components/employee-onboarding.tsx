'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Shield, Briefcase, Mail, Phone, Building2, CalendarDays } from 'lucide-react'
import { fetchRolesFromERPNext, getAllRoles, type Role } from '@/lib/dynamic-roles'
import type { ERPNextConfig } from '@/lib/erpnext-api'

interface EmployeeOnboardingProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  erpConfig: ERPNextConfig
  branchOptions: Array<{ id: string; name: string; nameAr: string }>
  onEmployeeCreated: (employee: any) => void
}

interface EmployeeForm {
  // Personal Information
  firstName: string
  middleName: string
  lastName: string
  firstNameEn: string
  lastNameEn: string
  email: string
  phone: string
  nationalId: string
  dateOfBirth: string
  gender: 'Male' | 'Female'
  
  // Employment Information
  designation: string
  department: string
  branchId: string
  dateOfJoining: string
  employeeType: 'Full Time' | 'Part Time' | 'Contract'
  
  // Role & Access
  selectedRoles: string[]
  
  // Salary Information
  monthlySalary: string
  
  // ERPNext User Creation
  createUser: boolean
  username: string
}

export function EmployeeOnboarding({ language, t, erpConfig, branchOptions, onEmployeeCreated }: EmployeeOnboardingProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  
  const [form, setForm] = useState<EmployeeForm>({
    firstName: '',
    middleName: '',
    lastName: '',
    firstNameEn: '',
    lastNameEn: '',
    email: '',
    phone: '',
    nationalId: '',
    dateOfBirth: '',
    gender: 'Male',
    designation: '',
    department: '',
    branchId: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employeeType: 'Full Time',
    selectedRoles: [],
    monthlySalary: '',
    createUser: true,
    username: ''
  })

  // Fetch available roles from ERPNext
  useEffect(() => {
    const loadRoles = async () => {
      setIsLoadingRoles(true)
      console.log('[v0] Loading available roles from ERPNext...')
      
      try {
        const roles = await fetchRolesFromERPNext(erpConfig)
        console.log('[v0] Loaded roles:', roles.length)
        setAvailableRoles(roles)
      } catch (error) {
        console.error('[v0] Failed to load roles:', error)
        // Fallback to base roles
        setAvailableRoles(getAllRoles())
        toast({
          title: language === 'ar' ? 'تحذير' : 'Warning',
          description: language === 'ar' 
            ? 'تعذر تحميل الأدوار من ERPNext، استخدام الأدوار المحلية' 
            : 'Failed to load roles from ERPNext, using local roles',
          variant: 'destructive'
        })
      } finally {
        setIsLoadingRoles(false)
      }
    }

    loadRoles()
  }, [erpConfig, language, toast])

  const handleInputChange = (field: keyof EmployeeForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    
    // Auto-generate username from email
    if (field === 'email' && value) {
      const username = value.split('@')[0]
      setForm(prev => ({ ...prev, username }))
    }
  }

  const handleRoleToggle = (roleName: string) => {
    setForm(prev => {
      const roles = prev.selectedRoles.includes(roleName)
        ? prev.selectedRoles.filter(r => r !== roleName)
        : [...prev.selectedRoles, roleName]
      return { ...prev, selectedRoles: roles }
    })
  }

  const validateForm = (): boolean => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى ملء جميع الحقول المطلوبة' 
          : 'Please fill all required fields',
        variant: 'destructive'
      })
      return false
    }

    if (form.selectedRoles.length === 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يجب اختيار دور واحد على الأقل' 
          : 'Please select at least one role',
        variant: 'destructive'
      })
      return false
    }

    if (form.createUser && !form.username) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يرجى إدخال اسم المستخدم' 
          : 'Please enter username',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    console.log('[v0] Creating new employee with dual ERPNext creation...')

    try {
      const employeeName = `${form.firstName} ${form.middleName} ${form.lastName}`.trim()
      const employeeNameEn = `${form.firstNameEn} ${form.lastNameEn}`.trim()
      const branch = branchOptions.find(b => b.id === form.branchId)

      // Step 1: Create Employee Record in ERPNext
      const employeePayload = {
        doctype: 'Employee',
        first_name: form.firstName,
        middle_name: form.middleName,
        last_name: form.lastName,
        employee_name: employeeName,
        gender: form.gender,
        date_of_birth: form.dateOfBirth,
        date_of_joining: form.dateOfJoining,
        designation: form.designation,
        department: form.department,
        status: 'Active',
        company: 'Sanad Company',
        // Custom fields for Sanad
        custom_branch: form.branchId,
        custom_branch_name: language === 'ar' ? branch?.nameAr : branch?.name,
        custom_phone: form.phone,
        custom_email: form.email,
        custom_national_id: form.nationalId,
        custom_employee_type: form.employeeType,
        custom_monthly_salary: parseFloat(form.monthlySalary) || 0,
        owner: form.username || form.email
      }

      console.log('[v0] Creating Employee record in ERPNext...')
      const employeeResponse = await fetch('/api/erpnext', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_document',
          doctype: 'Employee',
          data: employeePayload
        })
      })

      if (!employeeResponse.ok) {
        throw new Error('Failed to create Employee in ERPNext')
      }

      const employeeData = await employeeResponse.json()
      const employeeId = employeeData.data?.name

      console.log('[v0] Employee created:', employeeId)

      // Step 2: Create User Record in ERPNext (if requested)
      let userId = null
      if (form.createUser) {
        const userPayload = {
          doctype: 'User',
          email: form.email,
          username: form.username,
          first_name: form.firstName,
          last_name: form.lastName,
          enabled: 1,
          send_welcome_email: 0,
          // Link to employee
          custom_employee_id: employeeId,
          // Assign roles (Has Role table)
          roles: form.selectedRoles.map(role => ({
            role: role
          }))
        }

        console.log('[v0] Creating User record with roles:', form.selectedRoles)
        const userResponse = await fetch('/api/erpnext', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_document',
            doctype: 'User',
            data: userPayload
          })
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          userId = userData.data?.name
          console.log('[v0] User created:', userId)
        } else {
          console.warn('[v0] User creation failed, employee created without user account')
        }
      }

      // Step 3: Notify parent component
      const newEmployee = {
        id: employeeId,
        name: employeeName,
        nameEn: employeeNameEn,
        email: form.email,
        phone: form.phone,
        designation: form.designation,
        department: form.department,
        branchId: form.branchId,
        roles: form.selectedRoles,
        userId: userId,
        createdAt: new Date().toISOString()
      }

      onEmployeeCreated(newEmployee)

      toast({
        title: language === 'ar' ? 'نجح' : 'Success',
        description: language === 'ar' 
          ? `تم إنشاء الموظف ${employeeName} بنجاح${userId ? ' وحساب المستخدم' : ''}` 
          : `Employee ${employeeName} created successfully${userId ? ' with user account' : ''}`,
      })

      // Reset form
      setForm({
        firstName: '', middleName: '', lastName: '', firstNameEn: '', lastNameEn: '',
        email: '', phone: '', nationalId: '', dateOfBirth: '', gender: 'Male',
        designation: '', department: '', branchId: '', 
        dateOfJoining: new Date().toISOString().split('T')[0],
        employeeType: 'Full Time', selectedRoles: [], monthlySalary: '',
        createUser: true, username: ''
      })

    } catch (error) {
      console.error('[v0] Failed to create employee:', error)
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'فشل في إنشاء الموظف. يرجى المحاولة مرة أخرى' 
          : 'Failed to create employee. Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {language === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'إنشاء سجل موظف وحساب مستخدم في ERPNext مع تعيين الأدوار' 
              : 'Create Employee and User records in ERPNext with role assignment'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'} *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder={language === 'ar' ? 'أحمد' : 'Ahmed'}
                  dir="rtl"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'اسم الأب' : 'Middle Name'}</Label>
                <Input
                  value={form.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                  dir="rtl"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'اسم العائلة (عربي)' : 'Last Name (Arabic)'} *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder={language === 'ar' ? 'المحمد' : 'Al-Mohammad'}
                  dir="rtl"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الاسم الأول (إنجليزي)' : 'First Name (English)'}</Label>
                <Input
                  value={form.firstNameEn}
                  onChange={(e) => handleInputChange('firstNameEn', e.target.value)}
                  placeholder="Ahmed"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'اسم العائلة (إنجليزي)' : 'Last Name (English)'}</Label>
                <Input
                  value={form.lastNameEn}
                  onChange={(e) => handleInputChange('lastNameEn', e.target.value)}
                  placeholder="Al-Mohammad"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="ahmed@company.com"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone'} *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+966 50 123 4567"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'رقم الهوية الوطنية' : 'National ID'}</Label>
                <Input
                  value={form.nationalId}
                  onChange={(e) => handleInputChange('nationalId', e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الجنس' : 'Gender'}</Label>
                <Select value={form.gender} onValueChange={(v) => handleInputChange('gender', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{language === 'ar' ? 'ذكر' : 'Male'}</SelectItem>
                    <SelectItem value="Female">{language === 'ar' ? 'أنثى' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {language === 'ar' ? 'معلومات التوظيف' : 'Employment Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{language === 'ar' ? 'المسمى الوظيفي' : 'Designation'} *</Label>
                <Input
                  value={form.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  placeholder={language === 'ar' ? 'مدير مبيعات' : 'Sales Manager'}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'القسم' : 'Department'} *</Label>
                <Input
                  value={form.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder={language === 'ar' ? 'المبيعات' : 'Sales'}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'} *</Label>
                <Select value={form.branchId} onValueChange={(v) => handleInputChange('branchId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select Branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' ? branch.nameAr : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'تاريخ التوظيف' : 'Date of Joining'}</Label>
                <Input
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'نوع التوظيف' : 'Employment Type'}</Label>
                <Select value={form.employeeType} onValueChange={(v) => handleInputChange('employeeType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Time">{language === 'ar' ? 'دوام كامل' : 'Full Time'}</SelectItem>
                    <SelectItem value="Part Time">{language === 'ar' ? 'دوام جزئي' : 'Part Time'}</SelectItem>
                    <SelectItem value="Contract">{language === 'ar' ? 'عقد' : 'Contract'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'الراتب الشهري' : 'Monthly Salary'}</Label>
                <Input
                  type="number"
                  value={form.monthlySalary}
                  onChange={(e) => handleInputChange('monthlySalary', e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>
          </div>

          {/* Role Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {language === 'ar' ? 'تعيين الأدوار' : 'Role Assignment'}
            </h3>
            {isLoadingRoles ? (
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'جاري تحميل الأدوار من ERPNext...' : 'Loading roles from ERPNext...'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableRoles.map(role => (
                  <div
                    key={role.name}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      form.selectedRoles.includes(role.name)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleRoleToggle(role.name)}
                  >
                    <Checkbox
                      checked={form.selectedRoles.includes(role.name)}
                      onCheckedChange={() => handleRoleToggle(role.name)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{language === 'ar' ? role.nameAr : role.nameEn}</p>
                      {role.isCustom && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {language === 'ar' ? 'مخصص' : 'Custom'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Account Creation */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={form.createUser}
                onCheckedChange={(checked) => handleInputChange('createUser', checked)}
              />
              <Label className="cursor-pointer">
                {language === 'ar' ? 'إنشاء حساب مستخدم في ERPNext' : 'Create User Account in ERPNext'}
              </Label>
            </div>
            {form.createUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                <div>
                  <Label>{language === 'ar' ? 'اسم المستخدم' : 'Username'} *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="ahmed.mohammad"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading 
                ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') 
                : (language === 'ar' ? 'إنشاء الموظف' : 'Create Employee')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
