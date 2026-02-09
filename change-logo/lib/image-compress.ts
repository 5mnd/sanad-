/**
 * Client-side image compression utility for Sanad POS
 * - Resizes images to max 500x500px (ideal for POS thumbnails)
 * - Converts to WebP format for maximum efficiency
 * - Targets under 100KB per image
 * - Returns a base64 data URL ready for state/display
 */

export interface CompressionResult {
  dataUrl: string
  originalSize: number
  compressedSize: number
  width: number
  height: number
  format: string
}

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  maxSizeKB?: number
  quality?: number
  format?: 'image/webp' | 'image/jpeg' | 'image/png'
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 500,
  maxHeight: 500,
  maxSizeKB: 100,
  quality: 0.8,
  format: 'image/webp',
}

/**
 * Compresses a File object (from <input type="file">) to a small data URL.
 * Uses Canvas API for resizing and re-encoding.
 */
export async function compressImageFile(
  file: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = file.size

  // 1. Load File into an Image element
  const bitmap = await createImageBitmap(file)
  
  // 2. Calculate new dimensions while preserving aspect ratio
  let { width, height } = bitmap
  if (width > opts.maxWidth || height > opts.maxHeight) {
    const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  // 3. Draw onto an OffscreenCanvas (or regular canvas) at target size
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // 4. Encode to target format, progressively lowering quality if over size limit
  let quality = opts.quality
  let dataUrl = canvas.toDataURL(opts.format, quality)
  let compressedSize = estimateBase64ByteSize(dataUrl)

  // If WebP not supported, fall back to JPEG
  if (opts.format === 'image/webp' && dataUrl.startsWith('data:image/png')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    compressedSize = estimateBase64ByteSize(dataUrl)
  }

  const targetBytes = opts.maxSizeKB * 1024
  let attempts = 0
  while (compressedSize > targetBytes && quality > 0.1 && attempts < 10) {
    quality -= 0.08
    const format = dataUrl.startsWith('data:image/webp') ? 'image/webp' as const : 'image/jpeg' as const
    dataUrl = canvas.toDataURL(format, quality)
    compressedSize = estimateBase64ByteSize(dataUrl)
    attempts++
  }

  // 5. If still too large, scale down further
  if (compressedSize > targetBytes) {
    const scaleFactor = Math.sqrt(targetBytes / compressedSize)
    const newW = Math.round(width * scaleFactor)
    const newH = Math.round(height * scaleFactor)
    canvas.width = newW
    canvas.height = newH
    const ctx2 = canvas.getContext('2d')!
    ctx2.imageSmoothingEnabled = true
    ctx2.imageSmoothingQuality = 'high'
    // Reload the image from the current dataUrl
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = dataUrl
    })
    ctx2.drawImage(img, 0, 0, newW, newH)
    const format = dataUrl.startsWith('data:image/webp') ? 'image/webp' as const : 'image/jpeg' as const
    dataUrl = canvas.toDataURL(format, 0.6)
    compressedSize = estimateBase64ByteSize(dataUrl)
  }

  const detectedFormat = dataUrl.startsWith('data:image/webp') ? 'webp' : dataUrl.startsWith('data:image/jpeg') ? 'jpeg' : 'png'

  return {
    dataUrl,
    originalSize,
    compressedSize,
    width: canvas.width,
    height: canvas.height,
    format: detectedFormat,
  }
}

/**
 * Compresses an image from a URL (fetches, draws to canvas, re-encodes).
 */
export async function compressImageFromUrl(
  url: string,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })

  let { width, height } = img
  const originalSize = width * height * 4 // rough estimate

  if (width > opts.maxWidth || height > opts.maxHeight) {
    const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  let quality = opts.quality
  let dataUrl = canvas.toDataURL(opts.format, quality)
  let compressedSize = estimateBase64ByteSize(dataUrl)

  if (opts.format === 'image/webp' && dataUrl.startsWith('data:image/png')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    compressedSize = estimateBase64ByteSize(dataUrl)
  }

  const targetBytes = opts.maxSizeKB * 1024
  let attempts = 0
  while (compressedSize > targetBytes && quality > 0.1 && attempts < 10) {
    quality -= 0.08
    const format = dataUrl.startsWith('data:image/webp') ? 'image/webp' as const : 'image/jpeg' as const
    dataUrl = canvas.toDataURL(format, quality)
    compressedSize = estimateBase64ByteSize(dataUrl)
    attempts++
  }

  const detectedFormat = dataUrl.startsWith('data:image/webp') ? 'webp' : dataUrl.startsWith('data:image/jpeg') ? 'jpeg' : 'png'

  return {
    dataUrl,
    originalSize,
    compressedSize,
    width,
    height,
    format: detectedFormat,
  }
}

/** Estimates byte size of a base64 data URL */
function estimateBase64ByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || ''
  return Math.ceil((base64.length * 3) / 4)
}

/** Formats bytes into a human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
