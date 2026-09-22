'use client'

import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES, supervisionRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDayMonth } from '@/shared/utils'
import { useSupervisionProject } from '../hooks/use-supervision'
import { currentStage, daysUntil, elapsedPercent, progressPercent } from '../services/supervision.service'

interface SupervisionSummaryProps {
  projectId: string
}

/**
 * Thẻ "GIÁM SÁT CỦA TÔI" ở CỘT TRÁI trang Tài khoản (Hình S24).
 *
 * Thẻ hẹp (~300px) nên không có sợi chỉ 6 nút hay lưới 4 ô như bảng điều khiển:
 * chỉ hai thanh tiến độ và một dòng ngày. Ai cần chi tiết thì bấm nút xuống
 * thẳng bảng điều khiển.
 *
 * Mọi con số lấy từ `services/supervision.service`, đúng nguồn với bảng điều
 * khiển, nên hai màn không thể nói hai con số khác nhau.
 */
export function SupervisionSummary({ projectId }: SupervisionSummaryProps) {
  const t = useTranslations('supervision.account')
  const tAlias = useTranslations('supervision.tierAlias')

  const { data: project, isPending } = useSupervisionProject(projectId)

  if (isPending) return <Skeleton className='h-64 rounded-xl' />

  // Dự án chưa mua gói: R8 — chỗ này là nút "Chọn cách quản lý thi công", link
  // thẳng tới tab Gói giám sát chứ không mở popup.
  if (!project) {
    return (
      <section className='bg-card space-y-3 rounded-xl border border-dashed p-4'>
        <p className='text-muted-foreground text-sm text-pretty'>{t('selfManaged')}</p>
        <Button asChild variant='outline' className='w-full'>
          <Link href={ROUTES.PLANS_SUPERVISION}>{t('chooseManagement')}</Link>
        </Button>
      </section>
    )
  }

  const stage = currentStage(project)
  const percent = progressPercent(project)
  const elapsed = elapsedPercent(project)
  const remaining = daysUntil(stage.plannedEnd)
  const inspections = Math.round((project.inspectionsUsed / project.inspectionsTotal) * 100)

  return (
    <section className='border-brand-orange/40 bg-brand-orange-soft/50 rounded-xl border p-4'>
      <h2 className='text-brand-orange text-[11px] font-semibold tracking-wide uppercase'>{t('title')}</h2>

      <div className='mt-3 flex items-start gap-3'>
        <span className='border-brand-orange/40 text-brand-orange bg-card flex size-10 shrink-0 items-center justify-center rounded-full border'>
          <ShieldCheck className='size-5' />
        </span>
        <div className='min-w-0'>
          <span className='border-brand-orange/50 text-brand-orange inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
            {tAlias(project.packageTier)}
          </span>
          <p className='mt-1.5 font-semibold text-pretty'>{project.projectName}</p>
          <p className='text-muted-foreground font-mono text-xs'>{project.packageCode}</p>
        </div>
      </div>

      <div className='border-brand-orange/25 mt-3 space-y-3 border-t pt-3'>
        <div>
          <p className='text-xs text-pretty'>{t('progressLine', { percent, current: stage.index, days: remaining })}</p>
          {/* Vạch cam trên thanh = phần thời gian đã trôi, giống bảng điều
              khiển: nhìn là biết tiến độ đang chạy trước hay sau kế hoạch. */}
          <div className='bg-muted relative mt-1.5 h-2 overflow-hidden rounded-full'>
            <span className='bg-primary absolute inset-y-0 left-0 rounded-full' style={{ width: `${percent}%` }} />
            <span className='bg-brand-orange absolute inset-y-0 w-0.5' style={{ left: `${elapsed}%` }} />
          </div>
        </div>

        <div>
          <p className='text-xs'>
            {t('inspections', { used: project.inspectionsUsed, total: project.inspectionsTotal })}
          </p>
          <div className='bg-muted mt-1.5 h-2 overflow-hidden rounded-full'>
            <span className='bg-primary block h-full rounded-full' style={{ width: `${inspections}%` }} />
          </div>
        </div>

        <p className='text-muted-foreground text-xs text-pretty'>
          {t('dates', {
            expires: formatDayMonth(project.expiresAt, { year: true }),
            handover: formatDayMonth(project.handoverDate, { year: true })
          })}
        </p>
      </div>

      <Button
        asChild
        className={cn(
          'mt-4 w-full',
          'bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90 bg-none shadow-none'
        )}
      >
        <Link href={supervisionRoute(project.id)}>
          {t('open')}
          <ArrowRight className='size-4' />
        </Link>
      </Button>
    </section>
  )
}
