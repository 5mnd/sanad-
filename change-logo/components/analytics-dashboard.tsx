'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Award, TrendingUp, TrendingDown, Users, DollarSign, Target, Trophy, Star, Zap, Building2, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAnalytics } from '@/hooks/use-analytics'
import { formatCurrency, formatNumber } from '@/lib/number-format'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface AnalyticsDashboardProps {
  language: 'ar' | 'en'
  t: (key: string) => string
  erpConfig: {
    connected: boolean
    url: string
    apiKey: string
    apiSecret: string
  }
  currentUser: {
    id: string
    role: string
    branchId?: string
  }
}

interface Employee {
  id: string
  name: string
  branchId: string
  sales: number
  transactions: number
  avgOrderValue: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

interface Branch {
  id: string
  name: string
  nameEn: string
  revenue: number
  growth: number
  employees: number
  status: 'active' | 'inactive'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function AnalyticsDashboard({ language, t, erpConfig, currentUser }: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')

  // استخدام البيانات الحقيقية من النظام
  // Use real data from the system
  const { data: analyticsData, isLoading, error, refresh } = useAnalytics()

  // تحويل البيانات الحقيقية إلى الصيغة المطلوبة
  // Transform real data to required format
  const employeesData: Employee[] = useMemo(() => {
    if (!analyticsData) return []
    
    return analyticsData.employees.map(emp => {
      const avgOrderValue = emp.transactions > 0 ? emp.sales / emp.transactions : 0
      
      // حساب الاتجاه بناءً على متوسط السلة
      // Calculate trend based on average basket
      let trend: 'up' | 'down' | 'stable' = 'stable'
      let trendPercent = 0
      
      if (avgOrderValue > 500) {
        trend = 'up'
        trendPercent = Math.min(((avgOrderValue - 500) / 500) * 100, 50)
      } else if (avgOrderValue < 400) {
        trend = 'down'
        trendPercent = Math.max(((avgOrderValue - 400) / 400) * 100, -50)
      }
      
      return {
        id: emp.id,
        name: language === 'ar' ? emp.name : emp.nameEn,
        branchId: emp.branchId,
        sales: emp.sales,
        transactions: emp.transactions,
        avgOrderValue,
        trend,
        trendPercent,
      }
    })
  }, [analyticsData, language])

  const branchesData: Branch[] = useMemo(() => {
    if (!analyticsData) return []
    
    return analyticsData.branches.map(branch => {
      // حساب النمو بناءً على الإيرادات
      // Calculate growth based on revenue
      const avgRevenue = analyticsData.totals.totalRevenue / analyticsData.branches.length
      const growth = avgRevenue > 0 ? ((branch.revenue - avgRevenue) / avgRevenue) * 100 : 0
      
      return {
        id: branch.id,
        name: branch.name,
        nameEn: branch.nameEn,
        revenue: branch.revenue,
        growth: Math.round(growth * 10) / 10,
        employees: branch.employees,
        status: 'active' as const,
      }
    })
  }, [analyticsData])

  // Filter employees by selected branch
  const filteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employeesData
    return employeesData.filter(emp => emp.branchId === selectedBranch)
  }, [employeesData, selectedBranch])

  // Sort employees by sales for leaderboard
  const leaderboard = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => b.sales - a.sales)
  }, [filteredEmployees])

  // تحويل بيانات المبيعات التاريخية إلى بيانات الرسم البياني
  // Transform sales history to chart data
  const growthData = useMemo(() => {
    if (!analyticsData || !analyticsData.salesHistory.length) return []
    
    // تجميع البيانات حسب الفترة المحددة
    // Group data by selected period
    const groupedData = analyticsData.salesHistory.slice(-7).map(item => {
      const date = new Date(item.date)
      const periodLabel = selectedPeriod === 'daily' 
        ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        : selectedPeriod === 'weekly'
        ? `Week ${Math.ceil(date.getDate() / 7)}`
        : date.toLocaleDateString('en-US', { month: 'short' })
      
      return {
        period: periodLabel,
        revenue: item.revenue,
        transactions: item.transactions,
      }
    })
    
    return groupedData
  }, [analyticsData, language, selectedPeriod])

  // Revenue distribution by branch
  const revenueDistribution = useMemo(() => 
    branchesData.map(branch => ({
      name: language === 'ar' ? branch.name : branch.nameEn,
      value: branch.revenue
    })), [branchesData, language])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  }

  const leaderboardItemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.5,
        ease: 'easeOut'
      }
    })
  }

  const glowVariants = {
    initial: { boxShadow: '0 0 0 rgba(34, 197, 94, 0)' },
    animate: {
      boxShadow: [
        '0 0 0 rgba(34, 197, 94, 0)',
        '0 0 20px rgba(34, 197, 94, 0.5)',
        '0 0 0 rgba(34, 197, 94, 0)'
      ],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: 1
      }
    }
  }

  const counterVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: 'backOut' }
    }
  }

  // عرض حالة التحميل
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري تحميل بيانات التحليلات...' : 'Loading analytics data...'}
          </p>
        </div>
      </div>
    )
  }

  // عرض حالة الخطأ
  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{language === 'ar' ? 'خطأ في تحميل البيانات' : 'Error Loading Data'}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error}</p>
          <Button onClick={refresh} variant="outline" size="sm" className="mt-2 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // عرض رسالة عدم وجود بيانات
  // Show no data message
  if (!analyticsData || (employeesData.length === 0 && branchesData.length === 0)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{language === 'ar' ? 'لا توجد بيانات' : 'No Data Available'}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {language === 'ar' 
              ? 'لا توجد بيانات تحليلات حالياً. ابدأ بإدخال الموظفين والفروع والمبيعات لعرض التحليلات.'
              : 'No analytics data available. Start by adding employees, branches, and sales to view analytics.'}
          </p>
          <Button onClick={refresh} variant="outline" size="sm" className="mt-2 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            {language === 'ar' ? 'لوحة التحليلات المتقدمة' : 'Advanced Analytics Dashboard'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'تحليلات الأداء ومقارنة الفروع' : 'Performance Analytics & Branch Comparison'}
          </p>
        </div>

        {/* Period Selector & Refresh Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as typeof selectedPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
              <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
              <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
            </SelectContent>
          </Select>

          {currentUser.role !== 'branch_manager' && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</SelectItem>
                {branchesData.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {language === 'ar' ? branch.name : branch.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="performance">
            {language === 'ar' ? 'أداء الموظفين' : 'Employee Performance'}
          </TabsTrigger>
          <TabsTrigger value="branches">
            {language === 'ar' ? 'مقارنة الفروع' : 'Branch Comparison'}
          </TabsTrigger>
          <TabsTrigger value="trends">
            {language === 'ar' ? 'الاتجاهات' : 'Trends'}
          </TabsTrigger>
        </TabsList>

        {/* Employee Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* Stats Cards */}
            <motion.div variants={itemVariants}>
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}
                      </p>
                      <motion.p
                        variants={counterVariants}
                        className="text-3xl font-bold text-primary mt-1"
                      >
                        {(filteredEmployees.reduce((sum, emp) => sum + emp.sales, 0) / 1000).toFixed(0)}K
                      </motion.p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'عدد المعاملات' : 'Transactions'}
                      </p>
                      <motion.p
                        variants={counterVariants}
                        className="text-3xl font-bold text-blue-500 mt-1"
                      >
                        {filteredEmployees.reduce((sum, emp) => sum + emp.transactions, 0)}
                      </motion.p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'متوسط القيمة' : 'Avg Order Value'}
                      </p>
                      <motion.p
                        variants={counterVariants}
                        className="text-3xl font-bold text-green-500 mt-1"
                      >
                        {Math.round(filteredEmployees.reduce((sum, emp) => sum + emp.avgOrderValue, 0) / filteredEmployees.length)}
                      </motion.p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'عدد الموظفين' : 'Active Employees'}
                      </p>
                      <motion.p
                        variants={counterVariants}
                        className="text-3xl font-bold text-purple-500 mt-1"
                      >
                        {filteredEmployees.length}
                      </motion.p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {language === 'ar' ? 'لوحة المتصدرين' : 'Leaderboard'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'أفضل أداء حسب المبيعات' : 'Top performers by sales'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence>
                    {leaderboard.map((employee, index) => (
                      <motion.div
                        key={employee.id}
                        custom={index}
                        variants={leaderboardItemVariants}
                        initial="hidden"
                        animate="visible"
                        className={`flex items-center gap-4 p-4 rounded-lg border ${
                          index === 0 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-card'
                        }`}
                        {...(index === 0 && {
                          variants: glowVariants,
                          initial: 'initial',
                          animate: 'animate'
                        })}
                      >
                        {/* Rank Badge */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index === 0 ? <Trophy className="h-6 w-6" /> : index + 1}
                        </div>

                        {/* Employee Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{employee.name}</p>
                            {index === 0 && (
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
                              >
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {employee.transactions} {language === 'ar' ? 'معاملة' : 'transactions'} • 
                            {language === 'ar' ? ' متوسط ' : ' avg '}{employee.avgOrderValue} {language === 'ar' ? 'ر.س' : 'SAR'}
                          </p>
                        </div>

                        {/* Sales Amount */}
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {(employee.sales / 1000).toFixed(1)}K
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {employee.trend === 'up' && (
                              <>
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                                <span className="text-green-500">+{employee.trendPercent}%</span>
                              </>
                            )}
                            {employee.trend === 'down' && (
                              <>
                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                                <span className="text-red-500">{employee.trendPercent}%</span>
                              </>
                            )}
                            {employee.trend === 'stable' && (
                              <span className="text-muted-foreground">{employee.trendPercent}%</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Branch Comparison Tab */}
        <TabsContent value="branches" className="space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {branchesData.map((branch, index) => (
              <motion.div key={branch.id} variants={itemVariants}>
                <Card className="border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {language === 'ar' ? branch.name : branch.nameEn}
                      </CardTitle>
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الإيرادات' : 'Revenue'}
                      </p>
                      <motion.p
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                        className="text-2xl font-bold text-primary"
                      >
                        {(branch.revenue / 1000).toFixed(0)}K {language === 'ar' ? 'ر.س' : 'SAR'}
                      </motion.p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={branch.growth > 15 ? 'default' : 'secondary'} className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{branch.growth}%
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'نمو' : 'growth'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'عدد الموظفين' : 'Employees'}
                      </span>
                      <span className="font-semibold">{branch.employees}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'الحالة' : 'Status'}
                      </span>
                      <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                        {branch.status === 'active' 
                          ? (language === 'ar' ? 'نشط' : 'Active')
                          : (language === 'ar' ? 'غير نشط' : 'Inactive')
                        }
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Revenue Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'توزيع الإيرادات حسب الفرع' : 'Revenue Distribution by Branch'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${(entry.value / 1000).toFixed(0)}K`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {revenueDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'اتجاهات النمو الشهري' : 'Monthly Growth Trends'}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'مقارنة الإيرادات عبر الفروع' : 'Revenue comparison across branches'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="period" 
                      className="text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-muted-foreground"
                      tickFormatter={(value) => formatCurrency(value, language)}
                    />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value, language)}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0088FE"
                      strokeWidth={3}
                      name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
                      animationDuration={1000}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'مقارنة شهرية' : 'Monthly Comparison'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="period" 
                      className="text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-muted-foreground"
                      tickFormatter={(value) => formatNumber(value, language)}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === (language === 'ar' ? 'الإيرادات' : 'Revenue')) {
                          return formatCurrency(value, language)
                        }
                        return formatNumber(value, language)
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="#0088FE"
                      name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
                      animationDuration={800}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="transactions"
                      fill="#00C49F"
                      name={language === 'ar' ? 'المعاملات' : 'Transactions'}
                      animationDuration={800}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
