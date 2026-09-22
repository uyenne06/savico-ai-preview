'use client'

import { ArrowRight, House, Info, Plus, Search } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { contractorInvitationsRoute, contractorMatchesRoute, ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDayMonth } from '@/shared/utils'
import { useBriefSummaries } from '../hooks/use-brief-summaries'
import { useCreateBrief } from '../hooks/use-brief'
import { useInvitations } from '../hooks/use-invitations'
import type { Invitation, ProjectBriefSummary } from '../types/contractor.types'

const STATUS_TONE: Record<Invitation['status'], string> = {
  sent: 'text-warning-strong',
  received: 'text-primary',
  accepted: 'text-primary',
  done: 'text-primary-strong'
}

const STATUS_DOT_TONE: Record<Invitation['status'], string> = {
  sent: 'bg-warning-strong',
  received: 'bg-primary',
  accepted: 'bg-primary',
  done: 'bg-primary-strong'
}

function DossierRow({
  summary,
  index,
  reduceMotion
}: {
  summary: ProjectBriefSummary
  index: number
  reduceMotion: boolean
}) {
  const t = useTranslations('account.dossiers')
  const { brief, invitedCount } = summary
  const { data: invitations, isPending } = useInvitations(brief.id)

  const orderedInvitations = [...(invitations ?? [])].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const latestVersion = orderedInvitations[0]?.dossierVersion ?? 'v1'
  const detailHref = contractorInvitationsRoute(brief.id)
  const completed =
    orderedInvitations.length > 0 && orderedInvitations.every((invitation) => invitation.status === 'done')

  const address = [brief.address.wardName, brief.address.provinceName].filter(Boolean).join(', ')
  const meta = [brief.buildingType, t(`scale.${brief.scale}`), t('area', { area: brief.landArea }), address]
    .filter(Boolean)
    .join(' · ')

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.08 + index * 0.08, ease: revealEase }}
      className='bg-card grid gap-4 rounded-xl border p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-sm motion-reduce:transition-none sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start'
    >
      <div className='bg-accent text-primary-strong flex size-9 items-center justify-center rounded-lg'>
        <House className='size-4.5' strokeWidth={1.8} />
      </div>

      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <h3 className='text-[15px] font-semibold'>{brief.name}</h3>
          <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-medium'>
            {brief.selfCreated ? t('source.selfCreated') : t('source.design')}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium',
              completed
                ? 'bg-primary/10 text-primary-strong'
                : invitedCount > 0
                  ? 'bg-warning/15 text-warning-strong'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {completed ? (
              <span className='bg-primary-strong size-1.5 rounded-full' />
            ) : invitedCount > 0 ? (
              <motion.span
                className='bg-warning-strong size-1.5 rounded-full'
                animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
                transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : null}
            {completed ? t('completed') : invitedCount > 0 ? t('invited', { count: invitedCount }) : t('notInvited')}
          </span>
        </div>

        <p className='text-muted-foreground mt-1 truncate text-xs sm:text-[13px]'>{meta}</p>

        <div className='mt-2.5 min-h-5 space-y-1'>
          {isPending ? (
            <>
              <Skeleton className='h-4 w-56' />
              {invitedCount > 1 ? <Skeleton className='h-4 w-64' /> : null}
            </>
          ) : orderedInvitations.length > 0 ? (
            orderedInvitations.slice(0, 3).map((invitation) => (
              <div
                key={invitation.id}
                className='grid gap-1 text-xs sm:grid-cols-[minmax(0,170px)_minmax(0,1fr)] sm:gap-3'
              >
                <span className='flex min-w-0 items-center gap-1.5 font-medium'>
                  <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT_TONE[invitation.status])} />
                  <span className='truncate'>{invitation.contractorName}</span>
                </span>
                <span className={cn('truncate', STATUS_TONE[invitation.status])}>
                  {t(`status.${invitation.status}`)} ·{' '}
                  {formatDayMonth(invitation.updatedAt, { time: true }).replace(' ', ' · ')}
                </span>
              </div>
            ))
          ) : (
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <span className='bg-border size-1.5 rounded-full' />
              {t('ready')}
            </p>
          )}
        </div>
      </div>

      <div className='flex min-w-[126px] flex-row items-center justify-between gap-3 sm:flex-col sm:items-end'>
        <Button
          asChild
          variant='outline'
          size='sm'
          className='group/detail h-8 px-3 text-xs hover:bg-accent/70 motion-reduce:transition-none'
        >
          <Link href={detailHref}>
            {t('viewDetail')}
            <ArrowRight className='size-3.5 transition-transform duration-200 group-hover/detail:translate-x-0.5 motion-reduce:transform-none' />
          </Link>
        </Button>

        {invitedCount === 0 ? (
          <Button asChild size='sm' className='h-8 px-3 text-xs hover:brightness-[1.06] motion-reduce:transition-none'>
            <Link href={contractorMatchesRoute(brief.id)}>
              <Search className='size-3.5' />
              {t('findContractor')}
            </Link>
          </Button>
        ) : null}

        <span className='text-muted-foreground text-[10px]'>
          {latestVersion} · {brief.id}
        </span>
      </div>
    </motion.article>
  )
}

/**
 * Danh sách "Hồ sơ dự án" trong Tài khoản.
 *
 * Dùng thẳng brief + invitation của feature Tìm nhà thầu thay vì tạo một bộ dữ
 * liệu Account riêng. Nhờ vậy trạng thái ở đây luôn khớp màn S18 và cả thay đổi
 * do vận hành cập nhật.
 */
export function AccountDossierList() {
  const t = useTranslations('account.dossiers')
  const { data: summaries, isPending } = useBriefSummaries()
  const createBrief = useCreateBrief()
  const reduceMotion = Boolean(useReducedMotion())
  const noteDelay = reduceMotion ? 0 : 0.28 + Math.min(summaries?.length ?? 0, 5) * 0.08

  return (
    <div className='space-y-3'>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.03, ease: revealEase }}
        className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
      >
        <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
        <Button
          size='sm'
          onClick={() => createBrief.mutate()}
          disabled={createBrief.isPending}
          className='shrink-0 hover:brightness-[1.06] motion-reduce:transition-none'
        >
          <Plus className='size-4' />
          {t('create')}
        </Button>
      </motion.div>

      {isPending ? (
        <div className='space-y-2.5'>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className='h-[106px] w-full rounded-xl' />
          ))}
        </div>
      ) : summaries?.length ? (
        <div className='space-y-2.5'>
          {summaries.map((summary, index) => (
            <DossierRow key={summary.brief.id} summary={summary} index={index} reduceMotion={reduceMotion} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.08, ease: revealEase }}
          className='bg-card rounded-xl border px-6 py-10 text-center'
        >
          <House className='text-primary mx-auto size-8' strokeWidth={1.5} />
          <p className='mt-3 font-semibold'>{t('empty.title')}</p>
          <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm text-pretty'>{t('empty.description')}</p>
          <div className='mt-5 flex flex-col justify-center gap-2.5 sm:flex-row'>
            <Button
              size='sm'
              onClick={() => createBrief.mutate()}
              disabled={createBrief.isPending}
              className='hover:brightness-[1.06] motion-reduce:transition-none'
            >
              <Plus className='size-4' />
              {t('empty.create')}
            </Button>
            <Button asChild variant='outline' size='sm' className='hover:bg-accent/70 motion-reduce:transition-none'>
              <Link href={ROUTES.PLANS}>{t('empty.viewDesignPlans')}</Link>
            </Button>
          </div>
        </motion.div>
      )}

      {!isPending ? (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.28, delay: noteDelay, ease: revealEase }}
          className='text-muted-foreground flex items-start gap-1.5 px-0.5 text-[11px] leading-relaxed'
        >
          <Info className='mt-0.5 size-3.5 shrink-0' />
          {t('note')}
        </motion.p>
      ) : null}
    </div>
  )
}
