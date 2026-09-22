'use client'

import { AlertTriangle, ArrowRight, CalendarClock, Check, Clock, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { EmptyState } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES, supervisionRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDayMonth } from '@/shared/utils'
import { STAGE_COUNT, STANDARD_SCHEDULE_DAYS } from '../constants/supervision.constants'
import { useSupervisionProject } from '../hooks/use-supervision'
import {
  confirmedCount,
  currentStage,
  daysUntil,
  elapsedPercent,
  handoverDrift,
  needsCustomerApproval,
  progressPercent,
  stageReminder
} from '../services/supervision.service'
import type { SupervisionProject, SupervisionStage } from '../types/supervision.types'
import { StageDetail } from './stage-detail'
import { StageUploadDialog } from './stage-upload-dialog'

interface SupervisionDashboardProps {
  projectId: string
  /** Giai đoạn đang mở, lấy từ `?stage=` để chia sẻ được đường dẫn tới đúng giai đoạn. */
  stageIndex?: number
}

/**
 * Bảng điều khiển giám sát — MỘT trang với bốn trạng thái giai đoạn (S20, S21,
 * S22, S23), không phải bốn trang.
 *
 * Thứ tự khối theo bản mô tả: banner nhắc hạn → thẻ dự án + 5 ô số → sợi chỉ 6
 * giai đoạn → bảng lịch trình → hai cột (danh sách giai đoạn | chi tiết).
 *
 * Bảng lịch trình MỞ SẴN, không có nút gấp: Hình S20/S21 vẽ nó ở trạng thái
 * mở. Đổi lại, phần chi tiết bị đẩy xuống dưới màn hình đầu — chấp nhận, vì
 * ngày tháng của cả sáu giai đoạn là thứ khách mở bảng điều khiển ra để xem.
 */
export function SupervisionDashboard({ projectId, stageIndex }: SupervisionDashboardProps) {
  const t = useTranslations('supervision.dashboard')
  const tStages = useTranslations('supervision.stages')
  const { data: project, isPending } = useSupervisionProject(projectId)

  const [uploadStage, setUploadStage] = useState<SupervisionStage | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const selected =
    project?.stages.find((stage) => stage.index === stageIndex) ?? (project ? currentStage(project) : undefined)

  // Chọn giai đoạn ở cột trái thì cuộn phần chi tiết vào tầm nhìn: trên màn hình
  // hẹp, chi tiết nằm dưới cả danh sách nên bấm xong sẽ tưởng không có gì xảy ra.
  const selectedIndex = selected?.index
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedIndex])

  if (isPending) {
    return (
      <div className='mx-auto w-full max-w-6xl space-y-5 px-4 py-8 lg:px-8'>
        <Skeleton className='h-24 rounded-2xl' />
        <Skeleton className='h-40 rounded-2xl' />
        <Skeleton className='h-96 rounded-2xl' />
      </div>
    )
  }

  if (!project) {
    return (
      <div className='mx-auto w-full max-w-3xl px-4 py-16 lg:px-8'>
        <EmptyState
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            <Button asChild>
              <Link href={ROUTES.PLANS_SUPERVISION}>{t('empty.action')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-6xl space-y-5 px-4 py-8 lg:px-8'>
      <nav className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm'>
        <Link href={ROUTES.ACCOUNT_PROJECTS} className='hover:text-foreground'>
          {t('breadcrumbProjects')}
        </Link>
        <span aria-hidden>›</span>
        <span>{project.projectName}</span>
        <span aria-hidden>›</span>
        <span className='text-foreground'>{t('title')}</span>
      </nav>

      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div className='min-w-0 max-w-3xl'>
          <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>{t('title')}</h1>
          <p className='text-muted-foreground mt-1.5 text-sm text-pretty'>{t('lead')}</p>
        </div>
        <Button asChild variant='outline'>
          <Link href={ROUTES.ACCOUNT}>{t('backToProject')}</Link>
        </Button>
      </header>

      <DashboardBanner project={project} selectedIndex={selected?.index} onUpload={setUploadStage} />
      {/* Thẻ dự án, dải 5 ô số và sợi chỉ 6 giai đoạn là MỘT khối liền, ngăn
          nhau bằng vạch ngang — đúng Hình S20/S21. Tách thành ba thẻ rời làm
          phần đầu bảng điều khiển vỡ vụn. */}
      {/* MỘT khối duy nhất cho cả bảng điều khiển: thẻ dự án, dải 5 ô số, sợi
          chỉ 6 giai đoạn, bảng lịch trình, cột giai đoạn và khung chi tiết đều
          nói về cùng một dự án — tách thành nhiều thẻ rời thì màn hình vỡ vụn.
          `divide-y` lo vạch ngăn giữa các phần, vạch dọc lo cột trong cùng. */}
      <section className='bg-card divide-y overflow-hidden rounded-2xl border'>
        <ProjectCard project={project} />
        <StageThread project={project} />
        <ScheduleTable project={project} />

        {/* Không `items-start`: hai cột cao bằng nhau thì vạch dọc ngăn giữa
            chúng mới chạy hết xuống đáy khối. */}
        <div className='grid lg:grid-cols-[300px_minmax(0,1fr)]'>
          <div className='border-b p-3 lg:border-r lg:border-b-0'>
            <div className='flex items-center justify-between px-1.5 pb-2'>
              <h2 className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                {t('stageList.title')}
              </h2>
              <span className='text-muted-foreground text-[11px]'>
                {t('stageList.doneCount', { count: confirmedCount(project) })}
              </span>
            </div>

            <ul className='space-y-1.5'>
              {project.stages.map((stage) => (
                <li key={stage.key}>
                  <Link
                    href={supervisionRoute(projectId, stage.index)}
                    scroll={false}
                    aria-current={stage.index === selected?.index ? 'true' : undefined}
                    className={cn(
                      'block rounded-xl border p-3 transition-colors',
                      stage.index === selected?.index
                        ? 'border-primary bg-accent/40'
                        : 'border-transparent hover:border-primary/30 hover:bg-muted/50'
                    )}
                  >
                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground font-mono text-[11px]'>GĐ {stage.index}</span>
                      <StageStatusBadge stage={stage} />
                    </div>
                    <p className='mt-1 text-sm font-medium'>{tStages(stage.key)}</p>

                    {/* Ngày dự kiến và mốc nhắc lịch nằm CÙNG một hàng, đúng thẻ
                      trong Hình S21 — nhìn một dòng là biết giai đoạn đó xong
                      sớm hay còn bao nhiêu ngày. */}
                    <p className='text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
                      <span>
                        {formatDayMonth(stage.plannedStart)} – {formatDayMonth(stage.plannedEnd)}
                      </span>
                      <StageReminderChip stage={stage} />
                    </p>

                    <p className='text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-[11px]'>
                      {stage.files.length > 0 ? (
                        <>
                          <span>{t('stageList.fileCount', { count: stage.files.length })}</span>
                          <span className='bg-primary/10 text-primary-strong rounded-md px-1.5 py-0.5 font-medium'>
                            {stage.version}
                          </span>
                        </>
                      ) : null}
                      {needsCustomerApproval(stage) ? (
                        <span className='bg-warning/20 text-warning-strong rounded-md px-2 py-0.5 font-medium'>
                          {t('stageList.needsApproval')}
                        </span>
                      ) : null}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div ref={detailRef} className='min-w-0 scroll-mt-24'>
            {selected ? (
              <StageDetail projectId={projectId} stage={selected} onUpload={() => setUploadStage(selected)} />
            ) : null}
          </div>
        </div>
      </section>

      <StageUploadDialog projectId={projectId} stage={uploadStage} onClose={() => setUploadStage(null)} />
    </div>
  )
}

/**
 * Banner nhắc hạn của giai đoạn đang chạy — hoặc nhắc duyệt yêu cầu sửa đổi khi
 * có cái đang chờ khách (S22). Bổ sung so với bản mô tả: khi quá hạn thì banner
 * đổi hẳn sang màu cảnh báo và nói "quá hạn X ngày", thay vì đếm ngược âm.
 */
function DashboardBanner({
  project,
  selectedIndex,
  onUpload
}: {
  project: SupervisionProject
  /** Giai đoạn đang mở ở khung chi tiết bên dưới. */
  selectedIndex?: number
  onUpload: (stage: SupervisionStage) => void
}) {
  const t = useTranslations('supervision.dashboard.banner')
  const tStages = useTranslations('supervision.stages')

  const stage = currentStage(project)
  const remaining = daysUntil(stage.plannedEnd)
  const overdue = remaining < 0
  const due = formatDayMonth(stage.plannedEnd)

  return (
    <section
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-2xl border p-4',
        overdue ? 'border-destructive/40 bg-destructive/10' : 'border-warning/40 bg-warning/10'
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          overdue ? 'bg-destructive/15 text-destructive' : 'bg-warning/20 text-warning-strong'
        )}
      >
        {overdue ? <AlertTriangle className='size-5' /> : <Clock className='size-5' />}
      </span>

      <p className='min-w-0 flex-1 text-sm text-pretty'>
        <strong className={overdue ? 'text-destructive' : 'text-warning-strong'}>
          {overdue ? t('overdue', { days: Math.abs(remaining) }) : t('remaining', { days: remaining })}
        </strong>{' '}
        {overdue
          ? t('overdueBody', { index: stage.index, stage: tStages(stage.key), due })
          : t('body', { index: stage.index, stage: tStages(stage.key), due })}
      </p>

      {/* Nút tải hồ sơ chỉ hiện khi khung chi tiết ĐANG mở đúng giai đoạn
          đang chạy (Hình S20). Đang xem một giai đoạn khác thì việc cần làm
          trước là quay về giai đoạn đó — Hình S21 ghi "Đến giai đoạn 4". */}
      {stage.status === 'inProgress' && selectedIndex === stage.index ? (
        <Button onClick={() => onUpload(stage)}>
          <Upload className='size-4' />
          {t('upload', { index: stage.index })}
        </Button>
      ) : (
        <Button asChild>
          <Link href={supervisionRoute(project.id, stage.index)}>
            {t('goTo', { index: stage.index })}
            <ArrowRight className='size-4' />
          </Link>
        </Button>
      )}
    </section>
  )
}

/** Thẻ dự án + 5 ô số của bản mô tả. */
function ProjectCard({ project }: { project: SupervisionProject }) {
  const t = useTranslations('supervision.dashboard.project')
  const tStages = useTranslations('supervision.stages')
  const tAlias = useTranslations('supervision.tierAlias')
  const tTiers = useTranslations('supervision.tiers')

  const stage = currentStage(project)
  const percent = progressPercent(project)
  const elapsed = elapsedPercent(project)

  const drift = handoverDrift(project)
  const remaining = daysUntil(stage.plannedEnd)

  return (
    <div className='p-5'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <h2 className='text-lg font-semibold'>{project.projectName}</h2>
        {/* Một gói, một tên: bảng giá bán "SVC CHECK" còn bảng điều khiển gọi
            "Gói An Tâm" — hiện cả hai cạnh nhau để khách không tưởng là hai thứ. */}
        <span className='bg-warning/15 text-warning-strong rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase'>
          {t('service')} · {tTiers(project.packageTier)} — {tAlias(project.packageTier)}
        </span>
      </div>

      <p className='text-muted-foreground mt-1 font-mono text-xs'>
        {project.id} · {t('engineer')}: {project.engineer} · {t('packageCode')}: {project.packageCode}
      </p>

      <dl className='mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5'>
        <div>
          <dt className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>{t('progress')}</dt>
          <dd className='mt-1'>
            <span className='text-2xl font-bold'>{percent}%</span>
            <span className='text-muted-foreground ml-1.5 text-xs'>
              {t('progressDone', { done: confirmedCount(project) })}
            </span>
            {/* Vạch cam = thời gian đã trôi, đặt chồng lên thanh tiến độ công
                việc để so sánh được ngay hai nhịp với nhau. */}
            <span className='bg-muted relative mt-2 block h-2 overflow-hidden rounded-full'>
              <span className='bg-primary absolute inset-y-0 left-0 rounded-full' style={{ width: `${percent}%` }} />
              <span className='bg-warning absolute inset-y-0 w-0.5' style={{ left: `${elapsed}%` }} />
            </span>
            <span className='text-muted-foreground mt-1 block text-[11px]'>{t('elapsed', { percent: elapsed })}</span>
          </dd>
        </div>

        <div>
          <dt className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>{t('currentStage')}</dt>
          <dd className='mt-1 text-sm font-semibold'>
            {stage.index}/{STAGE_COUNT} · {tStages(stage.key)}
          </dd>
        </div>

        <div>
          <dt className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>{t('due')}</dt>
          <dd className='mt-1 text-sm font-semibold'>{formatDayMonth(stage.plannedEnd, { year: true })}</dd>
          <dd className={cn('text-xs', remaining < 0 ? 'text-destructive' : 'text-primary')}>
            {t('daysLeft', { days: remaining })}
          </dd>
        </div>

        <div>
          <dt className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>{t('handover')}</dt>
          <dd className='mt-1 text-sm font-semibold'>{formatDayMonth(project.handoverDate, { year: true })}</dd>
          <dd className='text-muted-foreground text-xs'>{drift.early ? t('handoverEarly') : t('handoverLate')}</dd>
        </div>

        <div>
          <dt className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>{t('inspections')}</dt>
          <dd className='mt-1'>
            <span className='text-2xl font-bold'>{project.inspectionsUsed}</span>
            <span className='text-muted-foreground text-sm'>/{project.inspectionsTotal}</span>
            <span className='bg-muted mt-2 block h-2 overflow-hidden rounded-full'>
              <span
                className='bg-primary block h-full rounded-full'
                style={{ width: `${Math.min(100, (project.inspectionsUsed / project.inspectionsTotal) * 100)}%` }}
              />
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** Sợi chỉ 6 giai đoạn có mốc HÔM NAY. */
function StageThread({ project }: { project: SupervisionProject }) {
  const t = useTranslations('supervision.dashboard.thread')
  const tStages = useTranslations('supervision.stages')
  const elapsed = elapsedPercent(project)

  /**
   * Đường ray vẽ MỘT LẦN cho cả sợi chỉ chứ không nối từng đoạn giữa hai chấm:
   * chỗ chuyển từ nét liền sang nét đứt là mốc HÔM NAY, mà mốc đó rơi vào GIỮA
   * một đoạn chứ không trùng chấm nào. Nối từng đoạn thì không cắt được ở đó.
   *
   * Tâm chấm thứ i nằm ở ((i + 0,5) / số giai đoạn) bề ngang lưới.
   */
  const centerAt = (index: number) => ((index + 0.5) / project.stages.length) * 100
  const confirmed = project.stages.filter((item) => item.status === 'confirmed').length
  const railStart = centerAt(0)
  const railEnd = centerAt(project.stages.length - 1)
  /** Hết phần xanh = tâm chấm cuối cùng đã xác nhận. */
  const solidEnd = confirmed > 0 ? centerAt(confirmed - 1) : railStart
  /** Mốc HÔM NAY, kẹp trong phạm vi đường ray. */
  const todayAt = Math.min(railEnd, Math.max(railStart, elapsed))

  return (
    <div className='relative px-5 pt-9 pb-5'>
      {/* Mốc HÔM NAY: nhãn cam kèm một vạch dọc ngắn cắm xuống đúng vị trí
          phần trăm thời gian đã trôi, đúng Hình S20/S21. */}
      <span
        aria-hidden
        className='absolute top-2 flex -translate-x-1/2 flex-col items-center'
        style={{ left: `${todayAt}%` }}
      >
        <span className='text-warning-strong text-[10px] font-semibold tracking-wide uppercase'>{t('today')}</span>
        <span className='bg-warning-strong mt-0.5 h-4 w-px' />
      </span>

      {/* Lưới 6 cột dùng `grid-rows-subgrid`: bốn dòng (chấm · tên · ngày ·
          viên nhãn) của cả sáu giai đoạn nằm trên CÙNG các dòng lưới, nên tên
          dài ngắn khác nhau cũng không làm ngày và nhãn thụt lên thụt xuống.
          Đường nối vẽ bằng một đoạn tuyệt đối chạy từ tâm chấm này sang tâm
          chấm kế, thay vì là một phần tử anh em co giãn theo chiều cao ô. */}
      <div className='overflow-x-auto pb-1'>
        <ol className='relative grid min-w-[52rem] grid-cols-6 grid-rows-[auto_auto_auto_auto] gap-y-1.5'>
          {/* Nền nét đứt chạy suốt, rồi phủ nét liền lên phần đã đi qua: xanh
              tới giai đoạn đã xác nhận cuối cùng, cam từ đó tới mốc HÔM NAY. */}
          <span
            aria-hidden
            className='border-border absolute top-3.5 h-0 border-t-2 border-dashed'
            style={{ left: `${railStart}%`, right: `${100 - railEnd}%` }}
          />
          <span
            aria-hidden
            className='border-primary absolute top-3.5 h-0 border-t-2'
            style={{ left: `${railStart}%`, width: `${Math.max(0, solidEnd - railStart)}%` }}
          />
          <span
            aria-hidden
            className='border-warning absolute top-3.5 h-0 border-t-2'
            style={{ left: `${solidEnd}%`, width: `${Math.max(0, todayAt - solidEnd)}%` }}
          />
          {project.stages.map((stage) => {
            const done = stage.status === 'confirmed'
            const running = stage.status === 'inProgress'

            return (
              <li
                key={stage.key}
                className='relative row-span-4 grid grid-rows-subgrid justify-items-center gap-y-1.5 px-1.5 text-center'
              >
                <span
                  className={cn(
                    'relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold',
                    done && 'border-primary bg-primary text-primary-foreground',
                    running && 'border-warning text-warning-strong bg-card',
                    !done && !running && 'border-border text-muted-foreground bg-card'
                  )}
                >
                  {/* Giai đoạn đã xác nhận in DẤU TICK chứ không in số — số đã
                      nằm ngay đầu tên bên dưới, in hai lần là thừa. */}
                  {done ? <Check className='size-4' strokeWidth={3} /> : stage.index}
                </span>

                <span
                  className={cn(
                    'text-[11px] leading-tight text-balance',
                    done || running ? 'font-medium' : 'text-muted-foreground'
                  )}
                >
                  {stage.index}. {tStages(stage.key)}
                </span>

                <span className='text-muted-foreground text-[10px]'>
                  {formatDayMonth(stage.plannedStart)} – {formatDayMonth(stage.plannedEnd)}
                </span>

                {/* Bản mô tả S20: mỗi giai đoạn có chip nhắc lịch riêng —
                    "Xác nhận 16/07", "Còn 16 ngày", "Bắt đầu sau 17 ngày". */}
                <StageReminderChip stage={stage} />
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/** Số ngày theo LỊCH KẾ HOẠCH của một giai đoạn — "(45 ngày)" ở cột Kế hoạch. */
function plannedDays(stage: SupervisionStage): number {
  return Math.max(
    1,
    Math.round((new Date(stage.plannedEnd).getTime() - new Date(stage.plannedStart).getTime()) / 86_400_000)
  )
}

/**
 * Chip nhắc lịch của một giai đoạn (bản mô tả S20).
 *
 * Cùng một hàm sinh chữ cho cả sợi chỉ tiến độ lẫn cột "Nhắc lịch" của bảng lịch
 * trình — hai chỗ này nói về cùng một mốc nên không được phép lệch nhau.
 */
function StageReminderChip({ stage, plain = false }: { stage: SupervisionStage; plain?: boolean }) {
  const t = useTranslations('supervision.dashboard.thread')
  const tBanner = useTranslations('supervision.dashboard.banner')

  const reminder = stageReminder(stage)
  if (!reminder) return plain ? <span className='text-muted-foreground'>—</span> : null

  const label =
    reminder.kind === 'confirmed'
      ? t('confirmedOn', { date: formatDayMonth(reminder.date) })
      : reminder.kind === 'remaining'
        ? tBanner('remaining', { days: reminder.days })
        : reminder.kind === 'overdue'
          ? tBanner('overdue', { days: reminder.days })
          : t('startsIn', { days: reminder.days })

  /**
   * Hình S20/S21 vẽ mốc nhắc lịch thành VIÊN NHÃN có nền, không phải chữ trần:
   * xanh cho mốc đã xác nhận và mốc sẽ bắt đầu, xanh nước biển cho giai đoạn
   * đang chạy, đỏ khi quá hạn.
   */
  const tone =
    reminder.kind === 'confirmed'
      ? 'text-primary-strong bg-primary/10'
      : reminder.kind === 'overdue'
        ? 'text-destructive bg-destructive/10'
        : reminder.kind === 'remaining'
          ? 'text-info-foreground bg-info-soft'
          : 'text-primary-strong bg-primary/10'

  if (plain) return <span className={tone}>{label}</span>

  return <span className={cn('rounded-md px-2 py-0.5 text-[10px] leading-tight font-medium', tone)}>{label}</span>
}

/** Bảng "Lịch trình 6 giai đoạn" — luôn mở (xem ghi chú ở đầu file). */
function ScheduleTable({ project }: { project: SupervisionProject }) {
  const t = useTranslations('supervision.dashboard.schedule')
  const tStages = useTranslations('supervision.stages')
  const tStatus = useTranslations('supervision.dashboard.status')

  const short = (value?: string) => (value ? formatDayMonth(value) : '—')

  return (
    <div>
      {/* Ghi chú lịch chuẩn nằm bên PHẢI tiêu đề, cùng một hàng — đúng Hình
          S20/S21, không phải một dòng riêng phía trên bảng. */}
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-4'>
        <h2 className='flex items-center gap-2 font-semibold'>
          <CalendarClock className='text-primary size-4' />
          {t('title')}
        </h2>
        <p className='text-muted-foreground text-xs text-pretty'>{t('note', { days: STANDARD_SCHEDULE_DAYS })}</p>
      </div>

      <div className='px-4 pb-4'>
        <div className='overflow-x-auto rounded-xl border'>
          <table className='w-full min-w-[640px] border-collapse text-sm'>
            <thead>
              {/* `divide-x` kẻ vạch dọc giữa các cột; hàng tiêu đề nền xanh
                  dùng vạch sáng mờ cho khỏi chìm. */}
              <tr className='bg-primary text-primary-foreground divide-x divide-white/20 text-xs'>
                <th className='p-2.5 text-left font-medium'>{t('stage')}</th>
                <th className='p-2.5 text-left font-medium'>{t('plan')}</th>
                <th className='p-2.5 text-left font-medium'>{t('actual')}</th>
                <th className='p-2.5 text-left font-medium'>{t('status')}</th>
                <th className='p-2.5 text-left font-medium'>{t('reminder')}</th>
                <th className='p-2.5 text-left font-medium'>{t('files')}</th>
              </tr>
            </thead>
            <tbody>
              {project.stages.map((stage) => (
                <tr key={stage.key} className='divide-x border-b last:border-b-0 even:bg-muted/20'>
                  <td className='p-2.5 text-xs'>
                    <strong>{stage.index}.</strong> {tStages(stage.key)}
                  </td>
                  <td className='p-2.5 text-xs'>
                    {short(stage.plannedStart)} – {short(stage.plannedEnd)}{' '}
                    <span className='text-muted-foreground'>{t('days', { count: plannedDays(stage) })}</span>
                  </td>
                  <td className='p-2.5 text-xs'>
                    {stage.actualStart ? `${short(stage.actualStart)} – ${short(stage.actualEnd)}` : t('notStarted')}
                  </td>
                  <td className='p-2.5 text-xs'>{tStatus(stage.status)}</td>
                  <td className='p-2.5 text-xs'>
                    <StageReminderChip stage={stage} plain />
                  </td>
                  <td className='p-2.5 text-xs'>
                    {stage.files.length > 0 ? (
                      <>
                        {t('fileCount', { count: stage.files.length })} · {stage.version}
                      </>
                    ) : (
                      t('notStarted')
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** Nhãn trạng thái nhỏ trên thẻ giai đoạn ở cột trái. */
function StageStatusBadge({ stage }: { stage: SupervisionStage }) {
  const t = useTranslations('supervision.dashboard.status')

  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        stage.status === 'confirmed' && 'bg-primary/10 text-primary-strong',
        stage.status === 'inProgress' && 'bg-warning/20 text-warning-strong',
        stage.status === 'upcoming' && 'bg-muted text-muted-foreground'
      )}
    >
      {t(stage.status)}
    </span>
  )
}
