'use client'

import { Crown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants/routes'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDayMonth } from '@/shared/utils'
import { useAccountPlan } from '../hooks/use-account-plan'
import type { PlanAllowance } from '../types/account.types'

/**
 * Một hàng hạn mức: nhãn "còn {x}/{y}" bên TRÁI, thanh tiến độ bên PHẢI, cùng
 * một dòng (Hình S24). Xếp thanh xuống dưới nhãn làm thẻ cao gấp đôi mà không
 * thêm thông tin gì.
 */
function AllowanceRow({ label, allowance }: { label: string; allowance: PlanAllowance }) {
  // Thanh thể hiện phần CÒN LẠI, không phải phần đã dùng — nhãn cũng nói "còn".
  const percent = allowance.total > 0 ? Math.round((allowance.remaining / allowance.total) * 100) : 0

  return (
    <li className='flex items-center gap-3'>
      <span className='min-w-0 flex-1 truncate text-xs'>{label}</span>
      <span
        role='progressbar'
        aria-valuenow={allowance.remaining}
        aria-valuemin={0}
        aria-valuemax={allowance.total}
        className='bg-card block h-1.5 w-24 shrink-0 overflow-hidden rounded-full'
      >
        <span className='bg-primary block h-full rounded-full' style={{ width: `${percent}%` }} />
      </span>
    </li>
  )
}

interface PlanCardProps {
  /**
   * Hạn mức lượt thiết kế lấy từ CÙNG nguồn với dòng hạn mức ở Bước 1
   * (mục IX: "Số hạn mức đồng bộ thời gian thực với Bước 1 (IV.3.c)").
   * `features/account` không được import `features/design`, nên app layer đọc
   * `useDesignQuota()` rồi truyền xuống đây.
   */
  designAllowance?: PlanAllowance
}

/**
 * Thẻ "GÓI CỦA TÔI" ở cột trái trang Tài khoản (mục IX, Hình 17): tên gói, hạn
 * dùng, hai hàng hạn mức kèm thanh tiến độ và nút "Nâng cấp gói".
 */
export function PlanCard({ designAllowance }: PlanCardProps = {}) {
  const t = useTranslations('account.plan')
  const { data: plan, isPending } = useAccountPlan()

  if (isPending) return <Skeleton className='h-52 w-full rounded-xl' />
  if (!plan) return null

  const design = designAllowance ?? plan.design

  return (
    <section className='bg-accent/60 border-primary/25 rounded-xl border p-4'>
      <h2 className='text-primary-strong text-[11px] font-semibold tracking-wide uppercase'>{t('title')}</h2>

      {/* Icon vương miện bên trái, tên gói và hạn dùng bên phải — Hình S24. */}
      <div className='mt-3 flex items-center gap-3'>
        <span className='bg-card text-primary-strong flex size-10 shrink-0 items-center justify-center rounded-full'>
          <Crown className='size-5' />
        </span>
        <div className='min-w-0'>
          <p className='truncate font-semibold'>{plan.name}</p>
          <p className='text-muted-foreground truncate text-xs'>
            {t('expiresAt', { date: formatDayMonth(plan.expiresAt, { year: true }) })}
          </p>
        </div>
      </div>

      <ul className='border-primary/20 mt-4 space-y-2.5 border-t pt-4'>
        {/* Số lượt thiết kế ưu tiên nguồn dùng chung với Bước 1; chỉ rơi về
            số của gói khi lớp app chưa truyền vào. */}
        <AllowanceRow
          label={t('designAllowance', { remaining: design.remaining, total: design.total })}
          allowance={design}
        />
        <AllowanceRow
          label={t('libraryAllowance', { remaining: plan.library.remaining, total: plan.library.total })}
          allowance={plan.library}
        />
      </ul>

      {/* Dẫn sang trang Gói đăng ký (mục VII). Nút VIỀN, không tô đặc: hành
          động chính của cột trái là "Bảng điều khiển giám sát" ở thẻ dưới. */}
      <Button asChild variant='outline' size='sm' className='bg-card mt-4 h-8 w-full text-xs'>
        <Link href={ROUTES.PLANS}>{t('upgrade')}</Link>
      </Button>
    </section>
  )
}
