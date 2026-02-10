/**
 * Universal Number Formatting Utility for Sanad Platform
 * 
 * Forces ALL numbers to use English numerals (1, 2, 3...) regardless of language
 * Prevents Eastern Arabic numerals (١, ٢, ٣...) from being displayed
 */

/**
 * Format a number using English numerals with proper separators
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || value === '') return '0'
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return '0'
  
  // Force English locale for number formatting
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format currency with SAR symbol and English numerals
 */
export function formatCurrency(value: number | string | null | undefined, showSymbol: boolean = true): string {
  if (value === null || value === undefined || value === '') return showSymbol ? 'SAR 0.00' : '0.00'
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return showSymbol ? 'SAR 0.00' : '0.00'
  
  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return showSymbol ? `SAR ${formatted}` : formatted
}

/**
 * Format percentage with English numerals
 */
export function formatPercentage(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || value === '') return '0%'
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return '0%'
  
  return `${numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

/**
 * Format quantity (integer numbers) with English numerals
 */
export function formatQuantity(value: number | string | null | undefined): string {
  return formatNumber(value, 0)
}

/**
 * Format price with 2 decimal places and English numerals
 */
export function formatPrice(value: number | string | null | undefined): string {
  return formatNumber(value, 2)
}

/**
 * Format date components to use English numerals
 */
export function formatDateEnglish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(d.getTime())) return ''
  
  // Extract components and force English numerals
  const year = d.getFullYear().toString()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Format time components to use English numerals
 */
export function formatTimeEnglish(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(d.getTime())) return ''
  
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  
  return `${hours}:${minutes}`
}

/**
 * Format datetime to use English numerals
 */
export function formatDateTimeEnglish(date: Date | string): string {
  const dateStr = formatDateEnglish(date)
  const timeStr = formatTimeEnglish(date)
  
  return dateStr && timeStr ? `${dateStr} ${timeStr}` : ''
}

/**
 * Convert any string containing Arabic numerals to English numerals
 */
export function convertArabicNumeralsToEnglish(text: string): string {
  if (!text) return text
  
  const arabicToEnglish: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  }
  
  return text.replace(/[٠-٩]/g, (match) => arabicToEnglish[match] || match)
}

/**
 * Sanitize number from any format to standard number
 */
export function parseNumberSafe(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  
  if (typeof value === 'number') return value
  
  // Convert Arabic numerals to English first
  const englishValue = convertArabicNumeralsToEnglish(value)
  
  // Remove any non-numeric characters except decimal point and minus sign
  const cleaned = englishValue.replace(/[^\d.-]/g, '')
  
  const parsed = parseFloat(cleaned)
  
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format ID or code (alphanumeric) ensuring English numerals
 */
export function formatID(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return ''
  
  const idStr = id.toString()
  return convertArabicNumeralsToEnglish(idStr)
}

/**
 * Format invoice number ensuring English numerals
 */
export function formatInvoiceNumber(invoiceNum: string | number | null | undefined, prefix: string = 'INV-'): string {
  if (invoiceNum === null || invoiceNum === undefined) return ''
  
  const num = invoiceNum.toString()
  const englishNum = convertArabicNumeralsToEnglish(num)
  
  return num.startsWith(prefix) ? englishNum : `${prefix}${englishNum}`
}

/**
 * Format file size with English numerals
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  
  return `${formatNumber(size, 2)} ${sizes[i]}`
}

/**
 * Format phone number ensuring English numerals
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  
  const englishPhone = convertArabicNumeralsToEnglish(phone)
  
  // Remove any non-numeric characters
  const cleaned = englishPhone.replace(/\D/g, '')
  
  // Format as +966 XX XXX XXXX for Saudi numbers
  if (cleaned.startsWith('966') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  
  // Format as 05X XXX XXXX for local numbers
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  
  return englishPhone
}
