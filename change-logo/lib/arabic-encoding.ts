/**
 * Arabic Text Encoding Utilities for Sanad Platform
 * 
 * Ensures proper handling of Arabic characters across:
 * - ERPNext API calls
 * - PDF generation
 * - Telegram/WhatsApp messaging
 * - URL encoding
 * - File operations
 * 
 * IMPORTANT: This utility handles TEXT only. For numbers, use lib/number-format.ts
 * which ensures all numbers use English numerals (1, 2, 3) not Arabic (١, ٢, ٣)
 */

import { convertArabicNumeralsToEnglish } from './number-format'

/**
 * Normalizes Arabic text to ensure consistent encoding
 * Handles various Arabic character representations
 */
export function normalizeArabicText(text: string): string {
  if (!text) return ''
  
  return text
    // Normalize Arabic characters
    .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics (Tashkeel)
    .replace(/\u0640/g, '') // Remove Tatweel (Arabic kashida)
    // Normalize different forms of Alef
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // أ، إ، آ → ا
    // Normalize different forms of Yeh
    .replace(/\u0649/g, '\u064A') // ى → ي
    // Normalize Teh Marbuta
    .replace(/\u0629/g, '\u0647') // ة → ه
    .trim()
}

/**
 * Sanitizes Arabic text from ERPNext responses
 * Fixes common encoding issues and converts Arabic numerals to English
 */
export function sanitizeArabicFromERPNext(text: string): string {
  if (!text) return ''
  
  try {
    // Check if text is double-encoded
    if (text.includes('\\u')) {
      // Decode Unicode escapes
      text = JSON.parse(`"${text}"`)
    }
    
    // Convert any Arabic numerals to English numerals
    text = convertArabicNumeralsToEnglish(text)
    
    // Fix mojibake issues (common with improper UTF-8 handling)
    if (text.match(/[Ã�Â]/)) {
      // Try to decode as UTF-8
      const encoder = new TextEncoder()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const bytes = encoder.encode(text)
      text = decoder.decode(bytes)
    }
    
    return normalizeArabicText(text)
  } catch (error) {
    console.error('[Arabic Encoding] Failed to sanitize text:', error)
    return text
  }
}

/**
 * Prepares Arabic text for ERPNext API submission
 * Ensures proper UTF-8 encoding
 */
export function prepareArabicForERPNext(text: string): string {
  if (!text) return ''
  
  // Ensure proper UTF-8 encoding
  const encoder = new TextEncoder()
  const decoder = new TextDecoder('utf-8')
  const bytes = encoder.encode(text)
  return decoder.decode(bytes)
}

/**
 * Encodes Arabic text for URL parameters
 * Properly handles Arabic characters in URLs
 */
export function encodeArabicForURL(text: string): string {
  if (!text) return ''
  
  return encodeURIComponent(text)
    .replace(/[!'()*]/g, (c) => {
      // Further encode characters that might cause issues
      return '%' + c.charCodeAt(0).toString(16).toUpperCase()
    })
}

/**
 * Prepares Arabic text for Telegram/WhatsApp messages
 * Ensures proper encoding for messaging APIs
 */
export function prepareArabicForMessaging(text: string): string {
  if (!text) return ''
  
  // Normalize the text
  let normalized = normalizeArabicText(text)
  
  // Ensure proper line breaks
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // URL encode for API transmission
  return encodeURIComponent(normalized)
}

/**
 * Decodes Arabic text from messaging API responses
 */
export function decodeArabicFromMessaging(text: string): string {
  if (!text) return ''
  
  try {
    return decodeURIComponent(text)
  } catch (error) {
    console.error('[Arabic Encoding] Failed to decode messaging text:', error)
    return text
  }
}

/**
 * Prepares Arabic text for PDF generation
 * Handles RTL direction and proper character spacing
 */
export function prepareArabicForPDF(text: string): string {
  if (!text) return ''
  
  // Normalize the text
  let normalized = normalizeArabicText(text)
  
  // Add Zero-Width Joiner (ZWJ) for proper Arabic ligatures
  normalized = normalized.replace(/([ا-ي])([ا-ي])/g, '$1\u200D$2')
  
  return normalized
}

/**
 * Validates if a string contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  if (!text) return false
  
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return arabicRegex.test(text)
}

/**
 * Converts Arabic numerals to Western numerals (if needed)
 */
export function arabicToWesternNumerals(text: string): string {
  if (!text) return ''
  
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  let result = text
  arabicNumerals.forEach((arabic, index) => {
    result = result.replace(new RegExp(arabic, 'g'), westernNumerals[index])
  })
  
  return result
}

/**
 * Converts Western numerals to Arabic numerals (for display)
 */
export function westernToArabicNumerals(text: string): string {
  if (!text) return ''
  
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  let result = text
  westernNumerals.forEach((western, index) => {
    result = result.replace(new RegExp(western, 'g'), arabicNumerals[index])
  })
  
  return result
}

/**
 * Safely converts Arabic text to Base64 for file operations
 */
export function arabicToBase64(text: string): string {
  if (!text) return ''
  
  try {
    // Encode as UTF-8 first
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    
    // Convert to base64
    let binary = ''
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte)
    })
    
    return btoa(binary)
  } catch (error) {
    console.error('[Arabic Encoding] Failed to encode to Base64:', error)
    return ''
  }
}

/**
 * Safely decodes Base64 to Arabic text
 */
export function base64ToArabic(base64: string): string {
  if (!base64) return ''
  
  try {
    // Decode from base64
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    
    // Decode as UTF-8
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  } catch (error) {
    console.error('[Arabic Encoding] Failed to decode from Base64:', error)
    return ''
  }
}

/**
 * Escapes Arabic text for JSON stringification
 */
export function escapeArabicForJSON(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Comprehensive sanitization for all Arabic text operations
 * Use this as a general-purpose sanitizer
 */
export function sanitizeArabicText(text: string, context: 'erpnext' | 'url' | 'messaging' | 'pdf' | 'json' = 'erpnext'): string {
  if (!text) return ''
  
  // First normalize
  let sanitized = normalizeArabicText(text)
  
  // Apply context-specific sanitization
  switch (context) {
    case 'erpnext':
      sanitized = prepareArabicForERPNext(sanitized)
      break
    case 'url':
      sanitized = encodeArabicForURL(sanitized)
      break
    case 'messaging':
      sanitized = prepareArabicForMessaging(sanitized)
      break
    case 'pdf':
      sanitized = prepareArabicForPDF(sanitized)
      break
    case 'json':
      sanitized = escapeArabicForJSON(sanitized)
      break
  }
  
  return sanitized
}

/**
 * Batch process an array of Arabic strings
 */
export function sanitizeArabicArray(texts: string[], context: 'erpnext' | 'url' | 'messaging' | 'pdf' | 'json' = 'erpnext'): string[] {
  return texts.map(text => sanitizeArabicText(text, context))
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeArabicObject<T extends Record<string, any>>(
  obj: T,
  context: 'erpnext' | 'url' | 'messaging' | 'pdf' | 'json' = 'erpnext'
): T {
  const sanitized: any = Array.isArray(obj) ? [] : {}
  
  for (const key in obj) {
    const value = obj[key]
    
    if (typeof value === 'string') {
      sanitized[key] = containsArabic(value) ? sanitizeArabicText(value, context) : value
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeArabicObject(value, context)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}
