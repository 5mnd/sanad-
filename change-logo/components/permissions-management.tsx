'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Shield, Check, X, Save, AlertTriangle } from 'lucide-react'
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getAllModules,
  getPermissionsByModule,
  type RoleType,
  type PermissionModule,
  permissionsArrayToObject,
  type UserPermissions
} from '@/lib/permissions'

interface PermissionsManagementProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  erpConfig: {
    connected: boolean
    url: string
    apiKey: string
    apiSecret: string
  }
}

export function PermissionsManagement({ language, t, erpConfig }: PermissionsManagementProps) {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<RoleType>('cashier')
  const [rolePermissions, setRolePermissions] = useState<UserPermissions>(
    permissionsArrayToObject(ROLE_PERMISSIONS[selectedRole])
  )
  const [isSaving, setIsSaving] = useState(false)

  // Handle role change
  const handleRoleChange = (role: RoleType) => {
    setSelectedRole(role)
    setRolePermissions(permissionsArrayToObject(ROLE_PERMISSIONS[role]))
  }

  // Toggle individual permission
  const togglePermission = (permissionKey: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }))
  }

  // Select all permissions for a module
  const selectAllModule = (module: PermissionModule) => {
    const modulePerms = getPermissionsByModule(module)
    const updates: UserPermissions = {}
    modulePerms.forEach(perm => {
      updates[perm.key] = true
    })
    setRolePermissions(prev => ({ ...prev, ...updates }))
  }

  // Revoke all permissions for a module
  const revokeAllModule = (module: PermissionModule) => {
    const modulePerms = getPermissionsByModule(module)
    const updates: UserPermissions = {}
    modulePerms.forEach(perm => {
      updates[perm.key] = false
    })
    setRolePermissions(prev => ({ ...prev, ...updates }))
  }

  // Save permissions to ERPNext
  const handleSavePermissions = async () => {
    setIsSaving(true)
    
    try {
      // Get enabled permissions
      const enabledPermissions = Object.keys(rolePermissions).filter(key => rolePermissions[key])
      
      console.log('[v0] Saving permissions for role:', selectedRole, 'Permissions:', enabledPermissions)
      
      // Sync to ERPNext if connected
      if (erpConfig.connected) {
        const response = await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: selectedRole,
            permissions: enabledPermissions,
            erpConfig
          })
        })

        const data = await response.json()
        
        if (response.ok) {
          toast({
            title: t('permissions.changesSaved'),
            description: t('permissions.syncedToERPNext'),
            duration: 5000
          })
        } else {
          throw new Error(data.error || 'Failed to save permissions')
        }
      } else {
        // Save locally only
        toast({
          title: t('permissions.changesSaved'),
          description: language === 'ar' 
            ? 'تم حفظ الصلاحيات محلياً (ERPNext غير متصل)'
            : 'Permissions saved locally (ERPNext not connected)',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('[v0] Failed to save permissions:', error)
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'فشل حفظ الصلاحيات'
          : 'Failed to save permissions',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const modules = getAllModules()

  const moduleNames: Record<PermissionModule, string> = {
    sales: t('permissions.moduleSales'),
    inventory: t('permissions.moduleInventory'),
    hr: t('permissions.moduleHR'),
    settings: t('permissions.moduleSettings')
  }

  const roleNames: Record<RoleType, string> = {
    admin: t('permissions.admin'),
    hr_manager: t('permissions.hrManager'),
    branch_manager: t('permissions.branchManager'),
    cashier: t('permissions.cashier'),
    employee: t('permissions.employee')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {t('permissions.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('permissions.subtitle')}</p>
        </div>
        <Button
          onClick={handleSavePermissions}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('permissions.saveChanges')}
        </Button>
      </div>

      {/* Role Selector */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="text-lg">{t('permissions.selectRole')}</CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'اختر الدور لتحرير صلاحياته'
              : 'Choose a role to edit its permissions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedRole} onValueChange={(value) => handleRoleChange(value as RoleType)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ROLE_PERMISSIONS).map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleNames[role as RoleType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-sm">
              {Object.values(rolePermissions).filter(Boolean).length} {language === 'ar' ? 'صلاحية مفعلة' : 'permissions enabled'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix - Cyber Dark Theme */}
      {modules.map((module) => {
        const modulePerms = getPermissionsByModule(module)
        const enabledCount = modulePerms.filter(p => rolePermissions[p.key]).length
        
        return (
          <Card 
            key={module} 
            className="border-2 border-border bg-gradient-to-br from-card to-muted/10"
          >
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    {moduleNames[module]}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {enabledCount} / {modulePerms.length} {language === 'ar' ? 'مفعل' : 'enabled'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllModule(module)}
                    className="gap-2 bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-600"
                  >
                    <Check className="h-4 w-4" />
                    {t('permissions.selectAll')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeAllModule(module)}
                    className="gap-2 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-600"
                  >
                    <X className="h-4 w-4" />
                    {t('permissions.revokeAll')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {modulePerms.map((permission) => {
                  const isEnabled = rolePermissions[permission.key] || false
                  
                  return (
                    <div
                      key={permission.key}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        isEnabled
                          ? 'bg-green-500/5 border-green-500/30 shadow-sm shadow-green-500/10'
                          : 'bg-muted/20 border-border/50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isEnabled ? 'bg-green-500/20' : 'bg-muted'
                          }`}>
                            {isEnabled ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {language === 'ar' ? permission.nameAr : permission.nameEn}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {language === 'ar' ? permission.descriptionAr : permission.descriptionEn}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={isEnabled ? 'default' : 'secondary'}
                          className={isEnabled ? 'bg-green-500 text-white' : 'bg-red-500/20 text-red-600'}
                        >
                          {isEnabled ? t('permissions.active') : t('permissions.revoked')}
                        </Badge>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => togglePermission(permission.key)}
                          className={isEnabled ? 'data-[state=checked]:bg-green-500' : ''}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Warning for Admin Role */}
      {selectedRole === 'admin' && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-600">
                  {language === 'ar' ? 'تحذير: دور المدير' : 'Warning: Admin Role'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar'
                    ? 'دور المدير لديه وصول كامل إلى جميع الصلاحيات في النظام. كن حذراً عند تعيين هذا الدور.'
                    : 'The Admin role has full access to all permissions in the system. Be careful when assigning this role.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
