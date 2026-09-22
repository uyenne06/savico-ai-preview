'use client'

import { CalendarDays, CheckCircle2, Clock3, Headphones, NotebookPen, Plus, RotateCcw, Star } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { revealEase } from '@/shared/components/common'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES, consultantRoute, designCreateRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { useCancelConsultation, useMyConsultations } from '../hooks/use-consultation'
import { slotEndTime } from '../services/consultation.service'
import type { ConsultationHistoryBooking, ConsultationHistoryStatus } from '../types/consultation.types'

type HistoryFilter = 'all' | 'upcoming' | 'done' | 'closed'

const STATUS_TONE: Record<ConsultationHistoryStatus, string> = {
  pending: 'bg-warning/20 text-warning-strong',
  confirmed: 'bg-success/10 text-success',
  done: 'bg-primary/10 text-primary-strong',
  cancelled: 'bg-muted text-muted-foreground',
  missed: 'bg-destructive/10 text-destructive'
}

function initialsOf(name: string): string {
  return name
    .replace(/^KTS\.\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function bookingStart(booking: ConsultationHistoryBooking): Date {
  return new Date(`${booking.date}T${booking.time}:00`)
}

function sessionNoteItems(note?: string): string[] {
  if (!note) return []

  return note
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/^[•*-]\s*/, ''))
    .filter(Boolean)
}

function formatBookingDate(booking: ConsultationHistoryBooking, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
    .format(bookingStart(booking))
    .replace(',', '')
}

function StatusPill({ booking }: { booking: ConsultationHistoryBooking }) {
  const t = useTranslations('account.consultationHistory.status')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium',
        STATUS_TONE[booking.status]
      )}
    >
      {booking.status === 'confirmed' || booking.status === 'done' ? <CheckCircle2 className='size-3.5' /> : null}
      {t(booking.status)}
    </span>
  )
}

function ConsultantAvatar({
  booking,
  size = 'normal'
}: {
  booking: ConsultationHistoryBooking
  size?: 'normal' | 'large'
}) {
  return (
    <Avatar className={cn('shrink-0', size === 'large' ? 'size-12' : 'size-10')}>
      <AvatarFallback className='bg-accent text-primary-strong text-xs font-semibold'>
        {initialsOf(booking.consultantName)}
      </AvatarFallback>
    </Avatar>
  )
}

export function ConsultationHistory() {
  const t = useTranslations('account.consultationHistory')
  const locale = useLocale() as Locale
  const reduceMotion = Boolean(useReducedMotion())
  const { data, isPending } = useMyConsultations()
  const cancelBooking = useCancelConsultation()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [cancelTarget, setCancelTarget] = useState<ConsultationHistoryBooking | null>(null)
  const [supportTarget, setSupportTarget] = useState<ConsultationHistoryBooking | null>(null)
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null)
  const [ratingTargetId, setRatingTargetId] = useState<string | null>(null)
  const [ratingHover, setRatingHover] = useState(0)
  const [localRatings, setLocalRatings] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const bookings = useMemo(
    () => [...(data?.bookings ?? [])].sort((a, b) => bookingStart(b).getTime() - bookingStart(a).getTime()),
    [data?.bookings]
  )

  const upcoming = useMemo(
    () =>
      [...bookings]
        .filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
        .sort((a, b) => bookingStart(a).getTime() - bookingStart(b).getTime())[0],
    [bookings]
  )

  const historyRows = bookings.filter((booking) => booking.id !== upcoming?.id)
  const visibleRows = historyRows.filter((booking) => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return booking.status === 'confirmed' || booking.status === 'pending'
    if (filter === 'done') return booking.status === 'done'
    return booking.status === 'cancelled' || booking.status === 'missed'
  })

  if (isPending) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-20 rounded-xl' />
        <Skeleton className='h-36 rounded-xl' />
        <Skeleton className='h-9 w-80 rounded-full' />
        <Skeleton className='h-56 rounded-xl' />
      </div>
    )
  }

  if (!data) return null

  const upcomingStart = upcoming ? bookingStart(upcoming).getTime() : null
  const upcomingOngoing = upcomingStart !== null ? now >= upcomingStart : false
  const hoursUntilUpcoming =
    upcomingStart !== null ? Math.max(0, Math.ceil((upcomingStart - now) / (60 * 60 * 1000))) : null

  return (
    <div className='space-y-4'>
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.28, delay: 0.03, ease: revealEase }}
        className='border-primary/30 bg-primary/5 rounded-xl border p-4'
      >
        <p className='text-sm leading-relaxed text-pretty'>
          <Clock3 className='text-primary mr-1.5 inline size-4 -translate-y-px' />
          {t('quota', {
            count: data.remainingCredits,
            plan: t(`planTier.${data.planTier}`)
          })}
        </p>
        <Button asChild size='sm' className='mt-3 h-8 text-xs hover:brightness-[1.06] motion-reduce:transition-none'>
          <Link href={ROUTES.CONSULT}>
            <CalendarDays className='size-3.5' />
            {t('bookNew')}
          </Link>
        </Button>
      </motion.section>

      <AnimatePresence>
        {upcoming ? (
          <motion.section
            key={upcoming.id}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.09, ease: revealEase }}
            className='bg-card border-border border-l-primary grid gap-4 rounded-xl border border-l-4 p-4 lg:grid-cols-[minmax(0,1fr)_150px]'
          >
            <div className='flex min-w-0 gap-3'>
              <ConsultantAvatar booking={upcoming} size='large' />
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h3 className='font-semibold'>{upcoming.consultantName}</h3>
                  <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px]'>
                    {upcoming.specialtyLabel}
                  </span>
                  <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px]'>
                    {t('yearsExperience', { count: upcoming.yearsExperience })}
                  </span>
                  <StatusPill booking={upcoming} />
                </div>

                <p className='text-primary-strong mt-1 text-sm font-semibold'>
                  {formatBookingDate(upcoming, locale)} · {upcoming.time}–{slotEndTime(upcoming.time)}
                </p>

                {upcoming.note ? (
                  <div className='bg-muted/60 mt-3 rounded-lg px-3 py-2.5'>
                    <p className='text-muted-foreground text-[11px] font-medium'>{t('yourNote')}</p>
                    <p className='mt-1 text-xs leading-relaxed text-pretty'>{upcoming.note}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className='flex flex-row items-center justify-between gap-3 border-t pt-3 lg:flex-col lg:items-stretch lg:justify-start lg:border-t-0 lg:pt-0'>
              <div className='text-right'>
                <p className='text-muted-foreground text-[11px]'>{t('upcomingLabel')}</p>
                <p className='text-primary-strong text-lg font-bold'>
                  {upcomingOngoing ? t('ongoing') : t('hoursLeft', { count: hoursUntilUpcoming ?? 0 })}
                </p>
              </div>
              <div className='flex gap-2 lg:flex-col'>
                <Button
                  asChild
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                >
                  <Link href={consultantRoute(upcoming.consultantId)}>
                    <CalendarDays className='size-3.5' />
                    {t('reschedule')}
                  </Link>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                  onClick={() => setCancelTarget(upcoming)}
                >
                  {t('cancel.action')}
                </Button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.15, ease: revealEase }}
        className='flex flex-wrap items-center gap-2 pt-1'
      >
        <span className='text-muted-foreground mr-1 text-xs'>{t('filterLabel')}</span>
        {(['all', 'upcoming', 'done', 'closed'] as const).map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => {
              setFilter(value)
              setExpandedNoteId(null)
              setRatingTargetId(null)
              setRatingHover(0)
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === value
                ? 'border-primary-strong bg-primary-strong text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {t(`filter.${value}`)}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode='wait'>
        {visibleRows.length ? (
          <motion.div
            key={`history-${filter}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: revealEase }}
            className='bg-card overflow-hidden rounded-xl border xl:grid xl:grid-cols-[minmax(0,1.25fr)_minmax(210px,0.9fr)_112px_250px] xl:gap-x-4'
          >
            {visibleRows.map((booking, index) => {
              const noteItems = sessionNoteItems(booking.sessionNote)
              const noteExpanded = expandedNoteId === booking.id
              const effectiveRating = localRatings[booking.id] ?? booking.rating

              return (
                <div key={booking.id} className='contents'>
                  <motion.article
                    initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion ? { duration: 0 } : { duration: 0.27, delay: 0.04 + index * 0.065, ease: revealEase }
                    }
                    className={cn(
                      'grid gap-3 p-4 transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:col-span-4 xl:grid-cols-subgrid',
                      index > 0 && 'border-t'
                    )}
                  >
                    <div className='flex min-w-0 items-center gap-3 sm:col-span-2 xl:col-span-1'>
                      <ConsultantAvatar booking={booking} />
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>{booking.consultantName}</p>
                        <p className='text-muted-foreground mt-0.5 text-[11px]'>
                          {booking.specialtyLabel} · {t('yearsExperience', { count: booking.yearsExperience })} ·{' '}
                          {booking.id}
                        </p>
                        {effectiveRating ? (
                          <div className='mt-1 flex gap-0.5'>
                            {Array.from({ length: 5 }, (_, starIndex) => (
                              <Star
                                key={starIndex}
                                className={cn(
                                  'size-3',
                                  starIndex < effectiveRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className='min-w-0 text-xs sm:pl-[52px] xl:pl-0'>
                      <p className='font-semibold'>
                        {formatBookingDate(booking, locale)} · {booking.time}–{slotEndTime(booking.time)}
                      </p>
                      <p className='text-muted-foreground mt-1'>
                        {booking.status === 'done' && booking.withinPlan ? t('meta.withinPlan') : null}
                        {booking.status === 'cancelled'
                          ? t('meta.cancelled', {
                              date: booking.cancelledAt
                                ? new Intl.DateTimeFormat(locale, {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  }).format(new Date(`${booking.cancelledAt}T00:00:00`))
                                : '—'
                            })
                          : null}
                        {booking.status === 'missed' ? t('meta.missed', { count: booking.contactAttempts ?? 1 }) : null}
                      </p>
                    </div>

                    <div className='flex items-center sm:justify-end xl:justify-start'>
                      <StatusPill booking={booking} />
                    </div>

                    <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
                      {booking.status === 'done' && booking.sessionNote ? (
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                          aria-expanded={noteExpanded}
                          onClick={() => setExpandedNoteId((current) => (current === booking.id ? null : booking.id))}
                        >
                          <NotebookPen className='size-3.5' />
                          {noteExpanded ? t('hideSessionNote') : t('sessionNote')}
                        </Button>
                      ) : null}
                      {booking.status === 'done' && !effectiveRating ? (
                        <Popover
                          open={ratingTargetId === booking.id}
                          onOpenChange={(open) => {
                            setRatingTargetId(open ? booking.id : null)
                            if (!open) setRatingHover(0)
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                            >
                              <Star className='size-3.5' />
                              {t('rating.action')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align='end' className='w-auto p-3'>
                            <p className='text-muted-foreground mb-2 text-xs'>{t('rating.prompt')}</p>
                            <div className='flex items-center gap-1' onMouseLeave={() => setRatingHover(0)}>
                              {Array.from({ length: 5 }, (_, starIndex) => {
                                const value = starIndex + 1
                                const highlighted = value <= ratingHover
                                return (
                                  <button
                                    key={value}
                                    type='button'
                                    aria-label={t('rating.starLabel', { count: value })}
                                    className='rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                                    onMouseEnter={() => setRatingHover(value)}
                                    onFocus={() => setRatingHover(value)}
                                    onClick={() => {
                                      setLocalRatings((current) => ({ ...current, [booking.id]: value }))
                                      setRatingTargetId(null)
                                      setRatingHover(0)
                                      toast.success(t('rating.success', { count: value }))
                                    }}
                                  >
                                    <Star
                                      className={cn(
                                        'size-5 transition-colors',
                                        highlighted ? 'fill-warning text-warning' : 'text-muted-foreground/35'
                                      )}
                                    />
                                  </button>
                                )
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : null}
                      {booking.status !== 'pending' && booking.status !== 'confirmed' ? (
                        <Button
                          asChild
                          variant='outline'
                          size='sm'
                          className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                        >
                          <Link href={consultantRoute(booking.consultantId)}>
                            <RotateCcw className='size-3.5' />
                            {t('bookAgain')}
                          </Link>
                        </Button>
                      ) : null}
                      {booking.status === 'missed' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                          onClick={() => setSupportTarget(booking)}
                        >
                          <Headphones className='size-3.5' />
                          {t('support')}
                        </Button>
                      ) : null}
                    </div>
                  </motion.article>

                  <AnimatePresence initial={false}>
                    {noteExpanded && noteItems.length > 0 ? (
                      <motion.div
                        key={`${booking.id}-note`}
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: revealEase }}
                        className='overflow-hidden xl:col-span-4'
                      >
                        <div className='px-4 pb-4 sm:pl-[72px] xl:pl-4'>
                          <motion.section
                            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={
                              reduceMotion ? { duration: 0 } : { duration: 0.22, delay: 0.06, ease: revealEase }
                            }
                            className='border-primary/20 bg-primary/5 rounded-xl border p-4'
                          >
                            <p className='text-primary-strong text-xs font-bold tracking-wide uppercase'>
                              {t('noteInline.title', { consultant: booking.consultantName })}
                            </p>
                            <ul className='mt-3 space-y-1.5 pl-4 text-xs leading-relaxed'>
                              {noteItems.map((item, noteIndex) => (
                                <li key={`${booking.id}-note-${noteIndex}`} className='list-disc'>
                                  {item}
                                </li>
                              ))}
                            </ul>
                            <Button
                              asChild
                              size='sm'
                              className='mt-3 h-9 w-full rounded-full text-xs shadow-[0_2px_6px_--theme(--color-primary/0.22)] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:before:opacity-60 hover:shadow-[0_5px_14px_-5px_--theme(--color-primary/0.38)] active:translate-y-0 active:shadow-[0_2px_6px_--theme(--color-primary/0.22)] motion-reduce:transform-none motion-reduce:transition-none'
                            >
                              <Link href={designCreateRoute()}>
                                <Plus className='size-3.5' />
                                {t('noteInline.createProject')}
                              </Link>
                            </Button>
                          </motion.section>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key={`empty-${filter}`}
            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: revealEase }}
            className='bg-card rounded-xl border px-6 py-10 text-center'
          >
            <CalendarDays className='text-primary mx-auto size-8' strokeWidth={1.5} />
            <p className='mt-3 font-semibold'>{t('empty.title')}</p>
            <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm'>{t('empty.description')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('cancel.title')}</DialogTitle>
            <DialogDescription>{t('cancel.description')}</DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => setCancelTarget(null)}>
              {t('cancel.keep')}
            </Button>
            <Button
              variant='destructive'
              disabled={cancelBooking.isPending}
              onClick={() => {
                if (!cancelTarget) return
                cancelBooking.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })
              }}
            >
              {cancelBooking.isPending ? t('cancel.processing') : t('cancel.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(supportTarget)} onOpenChange={(open) => !open && setSupportTarget(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('supportDialog.title')}</DialogTitle>
            <DialogDescription>
              {supportTarget
                ? t('supportDialog.description', {
                    consultant: supportTarget.consultantName,
                    code: supportTarget.id
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className='flex justify-end'>
            <Button size='sm' onClick={() => setSupportTarget(null)}>
              {t('supportDialog.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
