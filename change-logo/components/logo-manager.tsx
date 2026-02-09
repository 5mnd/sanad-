'use client'

import React from "react"
import { useRef } from 'react'
import { Shield, Upload, Trash2, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { compressImageFile } from '@/lib/image-compress'
import { onToast } from '@/lib/toast' // Import onToast function

interface LogoDisplayProps {
  companyLogo: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  altText?: string
}

export function LogoDisplay({ companyLogo, size = 'md', className = '', altText = 'Logo' }: LogoDisplayProps) {
  const sizeClasses = {
    sm: 'h-10 w-10 rounded-lg',
    md: 'h-16 w-16 rounded-2xl',
    lg: 'h-20 w-20 rounded-2xl',
  }
  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  if (companyLogo) {
    return <img src={companyLogo || "/placeholder.svg"} alt={altText} className={`${sizeClasses[size]} object-contain ${className}`} />
  }
  return (
    <div className={`flex ${sizeClasses[size]} shrink-0 items-center justify-center bg-primary ${className}`}>
      <Shield className={`${iconSizes[size]} text-primary-foreground`} />
    </div>
  )
}

interface LogoUploadSectionProps {
  companyLogo: string
  language: string
  t: (key: string) => string
  onLogoChange: (dataUrl: string) => void
  onLogoRemove: () => void // Declare onLogoRemove function
}

export function LogoUploadSection({ companyLogo, language, t, onLogoChange, onLogoRemove }: LogoUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert(language === 'ar' ? 'يرجى اختيار ملف صورة' : 'Please select an image file')
      return
    }
    try {
      const result = await compressImageFile(file, { maxWidth: 256, maxHeight: 256, maxSizeKB: 80 })
      onLogoChange(result.dataUrl)
    } catch {
      alert(language === 'ar' ? 'فشل رفع الشعار' : 'Failed to upload logo')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <Label className="text-foreground">{t('settings.companyLogo')}</Label>
      <div className="flex items-center gap-4">
        <div className="relative group">
          <LogoDisplay companyLogo={companyLogo} size="lg" altText={t('settings.companyLogo')} />
          {!companyLogo && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 bg-transparent"
          >
            <Upload className="h-4 w-4" />
            {t('settings.uploadLogo')}
          </Button>
          {companyLogo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onLogoChange('')}
              className="gap-2 text-destructive hover:text-destructive bg-transparent"
            >
              <Trash2 className="h-4 w-4" />
              {t('settings.removeLogo')}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('settings.logoHint')}</p>
    </div>
  )
}
