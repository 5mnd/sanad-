'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Shield, Lock, AlertTriangle, CheckCircle2, MonitorSmartphone, Globe, Clock, Activity, Trash2, Database, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { DataResetInfo } from '@/components/data-reset-info'

export default function SecurityPage() {
  const [isResetting, setIsResetting] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showDataInfo, setShowDataInfo] = useState(false)
  const { toast } = useToast()
  
  // محاكاة دور المستخدم - في الإنتاج يجب جلبه من نظام المصادقة
  // Simulating user role - in production, should be fetched from auth system
  const [currentUserRole] = useState('admin')
  
  const handleDataReset = async () => {
    if (confirmCode !== 'RESET-ALL-DATA') {
      toast({
        title: 'خطأ / Error',
        description: 'رمز التأكيد غير صحيح / Invalid confirmation code',
        variant: 'destructive',
      })
      return
    }

    setIsResetting(true)
    
    try {
      const response = await fetch('/api/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRole: currentUserRole,
          confirmCode: confirmCode,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // تصفير البيانات من localStorage
        // Reset data from localStorage
        const keysToReset = data.data.keysReset || []
        keysToReset.forEach((key: string) => {
          localStorage.removeItem(key)
        })

        toast({
          title: 'تم التصفير بنجاح / Reset Successful',
          description: `تم تصفير ${data.data.resetCount} نوع من البيانات / ${data.data.resetCount} data types reset`,
        })
        
        setConfirmCode('')
        setShowResetDialog(false)
        
        // إعادة تحميل الصفحة بعد 2 ثانية
        // Reload page after 2 seconds
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        toast({
          title: 'فشل التصفير / Reset Failed',
          description: data.message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[v0] Error resetting data:', error)
      toast({
        title: 'خطأ / Error',
        description: 'حدث خطأ أثناء تصفير البيانات / Error during data reset',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const loginAttempts = [
    { id: 1, user: 'admin@sanad.sa', ip: '192.168.1.100', location: 'الرياض، السعودية', status: 'success', time: '2024-01-15 14:23:15' },
    { id: 2, user: 'manager@sanad.sa', ip: '192.168.1.105', location: 'جدة، السعودية', status: 'success', time: '2024-01-15 14:18:42' },
    { id: 3, user: 'unknown@test.com', ip: '45.142.120.45', location: 'Unknown', status: 'failed', time: '2024-01-15 14:12:08' },
    { id: 4, user: 'accountant@sanad.sa', ip: '192.168.1.110', location: 'الدمام، السعودية', status: 'success', time: '2024-01-15 13:55:33' },
    { id: 5, user: 'admin@sanad.sa', ip: '178.45.67.23', location: 'Unknown', status: 'failed', time: '2024-01-15 13:42:19' },
    { id: 6, user: 'sales@sanad.sa', ip: '192.168.1.115', location: 'مكة، السعودية', status: 'success', time: '2024-01-15 13:30:05' },
  ]

  const activeSessions = [
    { id: 1, user: 'admin@sanad.sa', device: 'Windows Desktop', browser: 'Chrome 120', ip: '192.168.1.100', location: 'الرياض', duration: '2h 45m' },
    { id: 2, user: 'manager@sanad.sa', device: 'MacBook Pro', browser: 'Safari 17', ip: '192.168.1.105', location: 'جدة', duration: '1h 12m' },
    { id: 3, user: 'accountant@sanad.sa', device: 'iPad Pro', browser: 'Safari Mobile', ip: '192.168.1.110', location: 'الدمام', duration: '45m' },
    { id: 4, user: 'sales@sanad.sa', device: 'iPhone 15', browser: 'Safari Mobile', ip: '192.168.1.115', location: 'مكة', duration: '28m' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-l border-sidebar-border bg-sidebar p-6">
        <Link href="/" className="block mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">سند</h1>
              <p className="text-xs text-muted-foreground">Sanad</p>
            </div>
          </div>
        </Link>

        <nav className="space-y-2">
          <Link href="/" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            الرئيسية
          </Link>
          <Link href="/pos" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            نقاط البيع (POS)
          </Link>
          <Link href="/security" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground">
            الأمان المالي
          </Link>
          <Link href="/integrations" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
            التكاملات
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">الأمان المالي</h2>
            <p className="mt-1 text-muted-foreground">مراقبة الأمان والتشفير المتقدم</p>
          </div>

          {/* AI Encryption Status */}
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card className="border-primary/30 bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardDescription className="text-muted-foreground">تشفير AI نشط</CardDescription>
                    <CardTitle className="text-2xl text-foreground">AES-256</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                  <div className="mr-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Active
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                    <Lock className="h-6 w-6 text-chart-2" />
                  </div>
                  <div>
                    <CardDescription className="text-muted-foreground">الجلسات النشطة</CardDescription>
                    <CardTitle className="text-2xl text-foreground">{activeSessions.length}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">محمية بالكامل</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <CardDescription className="text-muted-foreground">محاولات فاشلة</CardDescription>
                    <CardTitle className="text-2xl text-foreground">
                      {loginAttempts.filter(a => a.status === 'failed').length}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">آخر 24 ساعة</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Encryption Report */}
          <Card className="mb-6 border-primary/30 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">تقرير التشفير بالذكاء الاصطناعي</CardTitle>
                    <CardDescription>AI-Encryption Status Report</CardDescription>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                  آخر تحديث: منذ دقيقتين
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">تشفير البيانات المالية</p>
                      <p className="text-xs text-muted-foreground">256-bit Advanced Encryption Standard</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">مصادقة ثنائية (2FA)</p>
                      <p className="text-xs text-muted-foreground">Time-based One-Time Password</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">حماية SSL/TLS</p>
                      <p className="text-xs text-muted-foreground">Transport Layer Security Active</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">مراقبة AI للتهديدات</p>
                      <p className="text-xs text-muted-foreground">Real-time Threat Detection</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">نسخ احتياطي تلقائي</p>
                      <p className="text-xs text-muted-foreground">Encrypted Backup Every 6 Hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">امتثال ZATCA</p>
                      <p className="text-xs text-muted-foreground">Saudi Tax Authority Compliant</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Login Attempts Table */}
          <Card className="mb-6 border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-foreground">محاولات تسجيل الدخول</CardTitle>
                  <CardDescription>Login Attempts History</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-right text-foreground">المستخدم</TableHead>
                    <TableHead className="text-right text-foreground">عنوان IP</TableHead>
                    <TableHead className="text-right text-foreground">الموقع</TableHead>
                    <TableHead className="text-right text-foreground">الحالة</TableHead>
                    <TableHead className="text-right text-foreground">الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginAttempts.map((attempt) => (
                    <TableRow key={attempt.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">{attempt.user}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{attempt.ip}</TableCell>
                      <TableCell className="text-foreground">{attempt.location}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            attempt.status === 'success'
                              ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
                              : 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30'
                          }
                        >
                          {attempt.status === 'success' ? 'نجح' : 'فشل'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{attempt.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Active Sessions Table */}
          <Card className="mb-6 border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <MonitorSmartphone className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-foreground">الجلسات النشطة</CardTitle>
                  <CardDescription>Active User Sessions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-right text-foreground">المستخدم</TableHead>
                    <TableHead className="text-right text-foreground">الجهاز</TableHead>
                    <TableHead className="text-right text-foreground">المتصفح</TableHead>
                    <TableHead className="text-right text-foreground">الموقع</TableHead>
                    <TableHead className="text-right text-foreground">المدة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">{session.user}</TableCell>
                      <TableCell className="text-foreground">{session.device}</TableCell>
                      <TableCell className="text-muted-foreground">{session.browser}</TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          {session.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {session.duration}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Data Reset Section - Admin Only */}
          {currentUserRole === 'admin' && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/20">
                      <Database className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">منطقة الخطر - تصفير البيانات</CardTitle>
                      <CardDescription>Danger Zone - Data Reset (Admin Only)</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">
                    مدير عام فقط / Admin Only
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-background p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        تحذير: هذه العملية خطيرة ولا يمكن التراجع عنها
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Warning: This operation is dangerous and cannot be undone
                      </p>
                    </div>
                  </div>
                </div>

                {/* زر لإظهار/إخفاء تفاصيل البيانات */}
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={() => setShowDataInfo(!showDataInfo)}
                >
                  {showDataInfo ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      إخفاء التفاصيل / Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      عرض تفاصيل البيانات / Show Data Details
                    </>
                  )}
                </Button>

                {/* معلومات تفصيلية عن البيانات */}
                {showDataInfo && (
                  <div className="animate-in fade-in-50 duration-300">
                    <DataResetInfo />
                  </div>
                )}

                <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      disabled={isResetting}
                    >
                      <Trash2 className="h-4 w-4" />
                      تصفير جميع البيانات / Reset All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        تأكيد تصفير البيانات / Confirm Data Reset
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4 text-right">
                        <p className="text-base font-medium text-foreground">
                          أنت على وشك حذف جميع البيانات باستثناء المستخدمين!
                        </p>
                        <p className="text-base font-medium text-foreground">
                          You are about to delete all data except users!
                        </p>
                        
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                          <p className="text-sm font-medium text-destructive">
                            للتأكيد، يرجى كتابة الرمز التالي:
                          </p>
                          <p className="text-sm font-medium text-destructive">
                            To confirm, please type the following code:
                          </p>
                          <p className="font-mono text-lg font-bold text-destructive text-center p-2 bg-background rounded">
                            RESET-ALL-DATA
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmCode" className="text-foreground">
                            رمز التأكيد / Confirmation Code
                          </Label>
                          <Input
                            id="confirmCode"
                            type="text"
                            value={confirmCode}
                            onChange={(e) => setConfirmCode(e.target.value)}
                            placeholder="RESET-ALL-DATA"
                            className="font-mono text-center"
                            disabled={isResetting}
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isResetting}>
                        إلغاء / Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault()
                          handleDataReset()
                        }}
                        disabled={confirmCode !== 'RESET-ALL-DATA' || isResetting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isResetting ? 'جاري التصفير... / Resetting...' : 'تأكيد التصفير / Confirm Reset'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
