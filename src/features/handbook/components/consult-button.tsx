'use client'

import { ArrowRight, CalendarClock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'

interface ConsultButtonProps {
  /** `solid` là nút chính ở trang chi tiết mẫu; `link` là liên kết ở trang bài viết. */
  variant?: 'solid' | 'link'
  className?: string
  templateId?: string
  pulse?: boolean
  mobileSticky?: boolean
}

/**
 * Nút "Đặt lịch tư vấn 1:1" (Phần 2.3, 2.4, 3.3).
 *
 * Trước đây nút mở hộp thoại gọi hotline / Zalo vì chưa có luồng đặt lịch. Bên A
 * đã chốt trang Tư vấn 1:1 (mục VIII) nên nút đưa thẳng sang đó — chọn kiến trúc
 * sư, chọn khung giờ và xác nhận ở một chỗ.
 */
export function ConsultButton({
  variant = 'solid',
  className,
  templateId,
  pulse = false,
  mobileSticky = false
}: ConsultButtonProps) {
  const t = useTranslations('handbook.consult')
  const href = templateId ? `${ROUTES.CONSULT}?template=${encodeURIComponent(templateId)}` : ROUTES.CONSULT

  if (variant === 'link') {
    return (
      <Link
        data-consult-link
        href={href}
        className={cn('text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline', className)}
      >
        <CalendarClock className='size-4' />
        {t('cta')}
        <ArrowRight
          data-consult-arrow
          className='size-4 transition-transform duration-200 motion-reduce:transition-none'
        />
      </Link>
    )
  }

  return (
    <div
      data-consult-glow-shell
      data-consult-pulse={pulse}
      data-consult-mobile-sticky={mobileSticky}
      className={cn('relative rounded-lg', className)}
    >
      <Button asChild size='lg' data-consult-cta data-consult-pulse={pulse} className='w-full justify-between'>
        <Link href={href}>
          {t('cta')}
          <ArrowRight className='size-4' />
        </Link>
      </Button>
    </div>
  )
}
