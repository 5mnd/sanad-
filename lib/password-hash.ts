// Password Hashing Utility for Sanad System
// Uses Web Crypto API for secure password hashing

/**
 * تشفير كلمة المرور باستخدام SHA-256
 * Hash password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  // تحويل كلمة المرور إلى bytes
  // Convert password to bytes
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  
  // إضافة salt عشوائي
  // Add random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltedData = new Uint8Array([...salt, ...data])
  
  // تشفير البيانات
  // Hash the data
  const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData)
  
  // تحويل إلى hex string
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // تحويل salt إلى hex
  // Convert salt to hex
  const saltArray = Array.from(salt)
  const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // إرجاع salt + hash معاً
  // Return salt + hash together
  return `${saltHex}:${hashHex}`
}

/**
 * التحقق من كلمة المرور
 * Verify password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // فصل salt عن hash
    // Separate salt from hash
    const [saltHex, hashHex] = hashedPassword.split(':')
    
    if (!saltHex || !hashHex) {
      return false
    }
    
    // تحويل salt من hex إلى bytes
    // Convert salt from hex to bytes
    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    )
    
    // تشفير كلمة المرور المدخلة بنفس الـ salt
    // Hash the input password with the same salt
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const saltedData = new Uint8Array([...salt, ...data])
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const newHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // مقارنة الـ hash
    // Compare hashes
    return newHashHex === hashHex
  } catch (error) {
    console.error('[v0] Error verifying password:', error)
    return false
  }
}

/**
 * التحقق من قوة كلمة المرور
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number // 0-4
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  // الطول
  // Length
  if (password.length >= 8) {
    score++
  } else {
    feedback.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل / Password must be at least 8 characters')
  }

  // أحرف كبيرة وصغيرة
  // Upper and lowercase
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++
  } else {
    feedback.push('يجب أن تحتوي على أحرف كبيرة وصغيرة / Must contain upper and lowercase letters')
  }

  // أرقام
  // Numbers
  if (/\d/.test(password)) {
    score++
  } else {
    feedback.push('يجب أن تحتوي على أرقام / Must contain numbers')
  }

  // رموز خاصة
  // Special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++
  } else {
    feedback.push('يفضل أن تحتوي على رموز خاصة / Should contain special characters')
  }

  return { score, feedback }
}

/**
 * توليد كلمة مرور عشوائية قوية
 * Generate strong random password
 */
export function generateStrongPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = uppercase + lowercase + numbers + symbols
  const randomValues = crypto.getRandomValues(new Uint8Array(length))
  
  let password = ''
  
  // التأكد من وجود حرف واحد على الأقل من كل نوع
  // Ensure at least one character from each type
  password += uppercase[randomValues[0] % uppercase.length]
  password += lowercase[randomValues[1] % lowercase.length]
  password += numbers[randomValues[2] % numbers.length]
  password += symbols[randomValues[3] % symbols.length]
  
  // إكمال باقي الأحرف
  // Fill the rest
  for (let i = 4; i < length; i++) {
    password += allChars[randomValues[i] % allChars.length]
  }
  
  // خلط الأحرف
  // Shuffle characters
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
