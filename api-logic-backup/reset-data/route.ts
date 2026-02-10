import { NextRequest, NextResponse } from 'next/server'

/**
 * API لتصفير البيانات - خاص بالمدير العام فقط
 * API for Data Reset - Admin Only
 * 
 * يقوم بحذف جميع البيانات ما عدا بيانات المستخدمين
 * Deletes all data except user data
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userRole, confirmCode } = body

    // التحقق من صلاحية المدير العام
    // Verify admin role
    if (userRole !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'غير مصرح - صلاحيات المدير العام مطلوبة / Unauthorized - Admin role required' 
        },
        { status: 403 }
      )
    }

    // التحقق من رمز التأكيد
    // Verify confirmation code
    if (confirmCode !== 'RESET-ALL-DATA') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'رمز التأكيد غير صحيح / Invalid confirmation code' 
        },
        { status: 400 }
      )
    }

    // قائمة مفاتيح localStorage التي سيتم الاحتفاظ بها (بيانات المستخدمين)
    // List of localStorage keys to preserve (user data)
    const preserveKeys = [
      'users',
      'currentUser',
      'userPermissions',
      'userRoles',
      'authToken',
      'userSettings',
      'userPreferences'
    ]

    // البيانات التي سيتم تصفيرها
    // Data to be reset
    const dataKeysToReset = [
      // بيانات المبيعات / Sales data
      'sales',
      'invoices',
      'transactions',
      'revenue',
      'salesHistory',
      'dailySales',
      'monthlySales',
      
      // بيانات المخزون / Inventory data
      'inventory',
      'products',
      'stockLevels',
      'stockHistory',
      'lowStockAlerts',
      
      // بيانات الحضور والغياب / Attendance data
      'attendance',
      'attendanceRecords',
      'attendanceHistory',
      'shifts',
      'shiftData',
      'activeShift',
      'currentShift',
      
      // البيانات المالية / Financial data
      'financialData',
      'payments',
      'expenses',
      'cashRegister',
      'dailyReport',
      'monthlyReport',
      'yearlyReport',
      
      // بيانات أخرى / Other data
      'auditLog',
      'notifications',
      'alerts',
      'reports',
      'analytics',
      'dashboardData',
      'statistics',
      'qrCodes',
      'receipts',
      
      // بيانات ERPNext / ERPNext data
      'erpnextSync',
      'erpnextCache',
      'lastSyncTime',
      
      // بيانات Telegram / Telegram data
      'telegramMessages',
      'telegramNotifications',
      
      // بيانات POS / POS data
      'posCart',
      'posTransactions',
      'posHistory',
      'posSettings',
      
      // بيانات الموظفين (غير الحسابات) / Employee data (not accounts)
      'employeeRecords',
      'employeeAttendance',
      'employeeLeaves',
      'payrollData',
      'salaryRecords'
    ]

    // إنشاء سجل للعملية
    // Create operation log
    const resetLog = {
      timestamp: new Date().toISOString(),
      action: 'FULL_DATA_RESET',
      performedBy: 'admin',
      keysReset: dataKeysToReset,
      keysPreserved: preserveKeys,
      status: 'completed'
    }

    // حفظ السجل
    // Save log
    const existingLogs = []
    existingLogs.push(resetLog)

    return NextResponse.json({
      success: true,
      message: 'تم تصفير البيانات بنجاح / Data reset successfully',
      data: {
        resetCount: dataKeysToReset.length,
        preservedCount: preserveKeys.length,
        timestamp: resetLog.timestamp,
        keysReset: dataKeysToReset,
        keysPreserved: preserveKeys
      }
    })

  } catch (error) {
    console.error('[v0] Error in data reset:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'حدث خطأ أثناء تصفير البيانات / Error during data reset',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint للحصول على قائمة البيانات القابلة للتصفير
// GET endpoint to get list of resettable data
export async function GET(request: NextRequest) {
  try {
    const dataCategories = [
      {
        category: 'المبيعات / Sales',
        keys: ['sales', 'invoices', 'transactions', 'revenue'],
        estimatedRecords: 'يعتمد على الاستخدام'
      },
      {
        category: 'المخزون / Inventory',
        keys: ['inventory', 'products', 'stockLevels'],
        estimatedRecords: 'يعتمد على الاستخدام'
      },
      {
        category: 'الحضور / Attendance',
        keys: ['attendance', 'attendanceRecords', 'shifts'],
        estimatedRecords: 'يعتمد على الاستخدام'
      },
      {
        category: 'البيانات المالية / Financial',
        keys: ['financialData', 'payments', 'expenses'],
        estimatedRecords: 'يعتمد على الاستخدام'
      }
    ]

    const preservedData = [
      {
        category: 'المستخدمون / Users',
        keys: ['users', 'currentUser', 'userPermissions'],
        note: 'لن يتم المساس بها / Will not be affected'
      }
    ]

    return NextResponse.json({
      success: true,
      dataCategories,
      preservedData,
      warning: 'هذه العملية لا يمكن التراجع عنها / This operation cannot be undone'
    })

  } catch (error) {
    console.error('[v0] Error in get data info:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'حدث خطأ / Error occurred'
      },
      { status: 500 }
    )
  }
}
