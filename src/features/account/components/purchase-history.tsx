'use client'

import { CheckCircle2, Download, FileText, Info, Loader2, Mail, QrCode, ReceiptText } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useAuth } from '@/shared/auth'
import { useChatContextStore } from '@/shared/chat-context'
import { revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { CmsTransaction, CmsTransactionStatus } from '@/shared/cms'
import { useCmsCollection } from '@/shared/cms'
import { checkoutPaymentRoute, ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatCurrency, formatDayMonth } from '@/shared/utils'
import { useAccountPlan } from '../hooks/use-account-plan'
import { usePurchaseHistory } from '../hooks/use-purchase-history'

type FilterStatus = 'all' | 'paid' | 'pending' | 'refunded'

const STATUS_TONE: Record<CmsTransactionStatus, string> = {
  paid: 'bg-success/10 text-success',
  pending: 'bg-warning/20 text-warning-strong',
  failed: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground'
}

function UsageRow({
  label,
  value,
  total,
  delay,
  reduceMotion
}: {
  label: string
  value: number
  total: number
  delay: number
  reduceMotion: boolean
}) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className='grid grid-cols-[minmax(0,1fr)_minmax(96px,112px)_56px] items-center gap-3'>
      <span className='text-muted-foreground truncate text-xs'>{label}</span>
      <span className='bg-muted h-1.5 overflow-hidden rounded-full'>
        <motion.span
          className='bg-primary block h-full rounded-full'
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.55, delay, ease: revealEase }}
        />
      </span>
      <span className='whitespace-nowrap text-right text-xs font-semibold'>
        {value} / {total}
      </span>
    </div>
  )
}

function StatusPill({
  status,
  label,
  pulsePending = false,
  reduceMotion = false
}: {
  status: CmsTransactionStatus
  label: string
  pulsePending?: boolean
  reduceMotion?: boolean
}) {
  const dotClass =
    status === 'paid'
      ? 'bg-success'
      : status === 'pending'
        ? 'bg-warning-strong'
        : status === 'failed'
          ? 'bg-destructive'
          : 'bg-muted-foreground'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium',
        STATUS_TONE[status]
      )}
    >
      {status === 'pending' && pulsePending ? (
        <motion.span
          className={cn('size-1.5 rounded-full', dotClass)}
          animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
          transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <span className={cn('size-1.5 rounded-full', dotClass)} />
      )}
      {label}
    </span>
  )
}

function ReceiptRow({
  label,
  children,
  emphasized = false
}: {
  label: string
  children: React.ReactNode
  emphasized?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 px-4 py-3 text-sm',
        emphasized && 'bg-accent/35'
      )}
    >
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className={cn('min-w-0 text-right font-medium', emphasized && 'text-primary-strong text-base font-bold')}>
        {children}
      </dd>
    </div>
  )
}

export function PurchaseHistory() {
  const t = useTranslations('account.purchaseHistory')
  const tSupervision = useTranslations('supervision.tierAlias')
  const locale = useLocale() as Locale
  const reduceMotion = Boolean(useReducedMotion())
  const { user } = useAuth()
  const setAssistantOpen = useChatContextStore((s) => s.setPanelOpen)
  const setAssistantSuppressed = useChatContextStore((s) => s.setDockSuppressed)
  const { data: plan, isPending: planPending } = useAccountPlan()
  const { data: history, isPending } = usePurchaseHistory()
  const supervision = useCmsCollection('supervisionProjects')[0]
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [receipt, setReceipt] = useState<CmsTransaction | null>(null)
  const [resendingReceiptId, setResendingReceiptId] = useState<string | null>(null)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null)

  const transactions = useMemo(
    () => [...(history?.transactions ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [history?.transactions]
  )
  const counts = useMemo(
    () => ({
      all: transactions.length,
      paid: transactions.filter((item) => item.status === 'paid').length,
      pending: transactions.filter((item) => item.status === 'pending').length,
      refunded: transactions.filter((item) => item.status === 'refunded').length
    }),
    [transactions]
  )
  const visible = filter === 'all' ? transactions : transactions.filter((item) => item.status === filter)
  const currentStage = supervision?.stages.find((stage) => stage.status !== 'confirmed')?.index ?? 6
  const designReceipt = transactions.find((item) => item.id === history?.designOrderId)

  useEffect(
    () => () => {
      setAssistantSuppressed(false)
    },
    [setAssistantSuppressed]
  )

  const handleOpenReceipt = (transaction: CmsTransaction) => {
    setAssistantOpen(false)
    setAssistantSuppressed(true)
    setReceipt(transaction)
  }

  const handleResendReceipt = async () => {
    if (!receipt || !user?.email) return
    setResendingReceiptId(receipt.id)
    await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 150 : 650))
    toast.success(t('receiptDialog.emailQueued', { email: user.email }))
    setResendingReceiptId(null)
  }

  const handleDownloadReceipt = async () => {
    if (!receipt) return
    setDownloadingReceiptId(receipt.id)

    try {
      const { generateReceiptPdf } = await import('../services/pdf/generate-receipt-pdf')
      const amount = formatCurrency(receipt.amount, locale)
      const vatIssued = receipt.note?.toLocaleLowerCase(locale).includes('vat')

      await generateReceiptPdf(
        {
          code: receipt.id,
          receiptHeading: t('receiptDialog.receiptHeading', { code: receipt.id }),
          issuedAt: formatDayMonth(receipt.createdAt, { year: true, time: true }).replace(' ', ' · '),
          buyerName: user?.name ?? receipt.customerName,
          ...(user?.phone ? { buyerPhone: user.phone } : {}),
          buyerEmail: user?.email ?? receipt.customerEmail,
          planName: t(`tier.${receipt.tier}`),
          planDetail: t(`receiptDialog.planDetail.${receipt.tier}`),
          subtotal: amount,
          discount: t('receiptDialog.noDiscount'),
          total: amount,
          method: t(`methodValue.${receipt.method}`),
          ...(receipt.method === 'bank-qr' ? { transferContent: receipt.id.replace(/-/g, '') } : {}),
          status: t(`status.${receipt.status}`),
          vat: vatIssued ? t('receiptDialog.vatIssued') : t('receiptDialog.vatNotRequested'),
          supportNote: t('receiptDialog.note', { code: receipt.id })
        },
        {
          documentTitle: t('receiptDialog.title'),
          time: t('receiptDialog.time'),
          buyer: t('receiptDialog.buyer'),
          plan: t('table.plan'),
          subtotal: t('receiptDialog.subtotal'),
          discount: t('receiptDialog.discount'),
          total: t('receiptDialog.total'),
          method: t('method'),
          transferContent: t('receiptDialog.transferContent'),
          status: t('table.status'),
          vatInvoice: t('receiptDialog.vatInvoice')
        },
        `savico-receipt-${receipt.id}.pdf`
      )

      toast.success(t('receiptDialog.downloadSuccess'))
    } catch {
      toast.error(t('receiptDialog.downloadError'))
    } finally {
      setDownloadingReceiptId(null)
    }
  }

  if (isPending || planPending) {
    return (
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <Skeleton className='h-44 rounded-xl' />
          <Skeleton className='h-44 rounded-xl' />
        </div>
        <Skeleton className='h-9 w-80 rounded-full' />
        <Skeleton className='h-72 rounded-xl' />
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.03, ease: revealEase }}
        className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
      >
        <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
        <Button
          asChild
          variant='outline'
          size='sm'
          className='shrink-0 hover:bg-accent/70 motion-reduce:transition-none'
        >
          <Link href={ROUTES.PLANS}>{t('viewPlans')}</Link>
        </Button>
      </motion.div>

      <div className='grid gap-3 md:grid-cols-2'>
        {plan ? (
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.08, ease: revealEase }}
            className='bg-card flex h-full flex-col rounded-xl border p-4'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                  <h3 className='font-semibold'>{plan.name}</h3>
                  <span className='text-muted-foreground text-[11px]'>{t('designPlanMeta')}</span>
                </div>
                {history?.subscription ? (
                  <p className='text-muted-foreground mt-0.5 text-[11px]'>
                    {formatDayMonth(history.subscription.startedAt, { year: true })}
                  </p>
                ) : null}
              </div>
              <span className='bg-success/10 text-success inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium'>
                <CheckCircle2 className='size-3.5' />
                {t('active')}
              </span>
            </div>

            <div className='mt-3.5 space-y-2.5'>
              <UsageRow
                label={t('designCredits')}
                value={plan.design.total - plan.design.remaining}
                total={plan.design.total}
                delay={0.16}
                reduceMotion={reduceMotion}
              />
              <UsageRow
                label={t('libraryCredits')}
                value={plan.library.total - plan.library.remaining}
                total={plan.library.total}
                delay={0.22}
                reduceMotion={reduceMotion}
              />
              <UsageRow
                label={t('consultationCredits')}
                value={plan.consultation.total - plan.consultation.remaining}
                total={plan.consultation.total}
                delay={0.28}
                reduceMotion={reduceMotion}
              />
            </div>

            <div className='mt-3.5 flex flex-1 flex-col justify-end'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='text-muted-foreground text-[11px]'>
                  {t('designOrderMeta', {
                    date: formatDayMonth(plan.expiresAt, { year: true }),
                    order: history?.designOrderId ?? '—'
                  })}
                </span>
                {designReceipt ? (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                    onClick={() => handleOpenReceipt(designReceipt)}
                  >
                    <FileText className='size-3.5' />
                    {t('viewReceipt')}
                  </Button>
                ) : null}
              </div>
              <Button asChild variant='outline' size='sm' className='mt-2 h-8 w-fit text-xs'>
                <Link href={ROUTES.PLANS}>{t('upgrade')}</Link>
              </Button>
            </div>
          </motion.section>
        ) : null}

        {supervision ? (
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.16, ease: revealEase }}
            className='bg-card flex h-full flex-col rounded-xl border p-4'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                  <h3 className='font-semibold'>{tSupervision(supervision.packageTier)}</h3>
                  <span className='text-muted-foreground text-[11px]'>
                    {t('supervisionPlanMeta', { project: supervision.projectName })}
                  </span>
                </div>
              </div>
              {history?.pendingSupervisionOrderId ? (
                <span className='bg-warning/20 text-warning-strong inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium'>
                  <motion.span
                    className='bg-warning-strong size-1.5 rounded-full'
                    animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
                    transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {t('pendingPayment')}
                </span>
              ) : (
                <span className='bg-success/10 text-success inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium'>
                  <CheckCircle2 className='size-3.5' />
                  {t('active')}
                </span>
              )}
            </div>

            <div className='mt-5 space-y-2.5'>
              <UsageRow
                label={t('inspectionCredits')}
                value={supervision.inspectionsUsed}
                total={supervision.inspectionsTotal}
                delay={0.24}
                reduceMotion={reduceMotion}
              />
              <UsageRow
                label={t('supervisionStage')}
                value={currentStage}
                total={6}
                delay={0.3}
                reduceMotion={reduceMotion}
              />
            </div>

            <div className='mt-4 flex flex-1 items-end justify-between gap-3'>
              <p className='text-muted-foreground max-w-[72%] text-[11px] leading-relaxed text-pretty'>
                {t('supervisionOrderMeta', {
                  date: formatDayMonth(history?.supervisionExpiresAt ?? supervision.expiresAt, { year: true }),
                  order: history?.supervisionOrderId ?? '—',
                  pendingOrder: history?.pendingSupervisionOrderId ?? '—'
                })}
              </p>
              {history?.pendingSupervisionOrderId ? (
                <Button
                  asChild
                  size='sm'
                  className='h-8 shrink-0 text-xs hover:brightness-[1.06] motion-reduce:transition-none'
                >
                  <Link href={checkoutPaymentRoute(history.pendingSupervisionOrderId)}>
                    <QrCode className='size-3.5' />
                    {t('continuePayment')}
                  </Link>
                </Button>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center gap-2 pt-1'>
        <span className='text-muted-foreground mr-1 text-xs'>{t('filterLabel')}</span>
        {(['all', 'paid', 'pending', 'refunded'] as const).map((status) => (
          <button
            key={status}
            type='button'
            onClick={() => setFilter(status)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === status
                ? 'border-primary-strong bg-primary-strong text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            {t(`filter.${status}`)} {counts[status]}
          </button>
        ))}
      </div>

      <AnimatePresence mode='wait'>
        {visible.length > 0 ? (
          <motion.div
            key={`transactions-${filter}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: revealEase }}
            className='bg-card overflow-hidden rounded-xl border'
          >
            <div className='hidden overflow-x-auto md:block'>
              <table className='w-full min-w-[720px] border-collapse text-left'>
                <thead className='bg-muted/50 text-muted-foreground text-[11px] uppercase'>
                  <tr>
                    <th className='px-4 py-3 font-medium'>{t('table.code')}</th>
                    <th className='px-4 py-3 font-medium'>{t('table.date')}</th>
                    <th className='px-4 py-3 font-medium'>{t('table.plan')}</th>
                    <th className='px-4 py-3 text-right font-medium'>{t('table.amount')}</th>
                    <th className='px-4 py-3 font-medium'>{t('table.status')}</th>
                    <th className='px-4 py-3 text-right font-medium'>{t('table.receipt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: 0.26, delay: 0.04 + index * 0.055, ease: revealEase }
                      }
                      className='border-t align-top transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none'
                    >
                      <td className='px-4 py-3 font-mono text-xs font-semibold'>#{transaction.id}</td>
                      <td className='px-4 py-3 text-xs'>
                        <div>{formatDayMonth(transaction.createdAt, { year: true })}</div>
                        <div className='text-muted-foreground mt-0.5'>
                          {new Date(transaction.createdAt).toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='text-xs font-semibold'>{t(`tier.${transaction.tier}`)}</div>
                        {transaction.note ? (
                          <div className='text-muted-foreground mt-0.5 max-w-[230px] text-[11px] text-pretty'>
                            {transaction.note}
                          </div>
                        ) : null}
                      </td>
                      <td className='px-4 py-3 text-right text-xs font-semibold'>
                        {formatCurrency(transaction.amount, locale)}
                      </td>
                      <td className='px-4 py-3'>
                        <StatusPill
                          status={transaction.status}
                          label={t(`status.${transaction.status}`)}
                          pulsePending
                          reduceMotion={reduceMotion}
                        />
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 text-xs hover:bg-accent/70 motion-reduce:transition-none'
                          onClick={() => handleOpenReceipt(transaction)}
                        >
                          <FileText className='size-3.5' />
                          {t('receipt')}
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='divide-y md:hidden'>
              {visible.map((transaction, index) => (
                <motion.article
                  key={transaction.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.04 + index * 0.055, ease: revealEase }
                  }
                  className='space-y-3 p-4 transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='font-mono text-xs font-semibold'>#{transaction.id}</p>
                      <p className='mt-1 text-sm font-semibold'>{t(`tier.${transaction.tier}`)}</p>
                    </div>
                    <StatusPill
                      status={transaction.status}
                      label={t(`status.${transaction.status}`)}
                      pulsePending
                      reduceMotion={reduceMotion}
                    />
                  </div>
                  <div className='flex items-end justify-between gap-3'>
                    <div className='text-muted-foreground text-xs'>
                      <p>{formatDayMonth(transaction.createdAt, { year: true, time: true })}</p>
                      {transaction.note ? <p className='mt-1 text-pretty'>{transaction.note}</p> : null}
                    </div>
                    <p className='shrink-0 text-sm font-semibold'>{formatCurrency(transaction.amount, locale)}</p>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full hover:bg-accent/70 motion-reduce:transition-none'
                    onClick={() => handleOpenReceipt(transaction)}
                  >
                    <FileText className='size-3.5' />
                    {t('receipt')}
                  </Button>
                </motion.article>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`transactions-empty-${filter}`}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: revealEase }}
            className='bg-card rounded-xl border px-6 py-10 text-center'
          >
            <ReceiptText className='text-primary mx-auto size-8' strokeWidth={1.5} />
            <p className='mt-3 font-semibold'>{t('empty.title')}</p>
            <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm text-pretty'>{t('empty.description')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        key={`payment-note-${filter}`}
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.26, delay: 0.12 + Math.min(visible.length, 6) * 0.055, ease: revealEase }
        }
        className='text-muted-foreground flex items-start gap-1.5 px-0.5 text-[11px] leading-relaxed'
      >
        <Info className='mt-0.5 size-3.5 shrink-0' />
        {t('paymentNote')}
      </motion.p>

      <Sheet
        open={Boolean(receipt)}
        onOpenChange={(open) => {
          if (!open) {
            setReceipt(null)
            setResendingReceiptId(null)
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              setAssistantSuppressed(false)
            }
          }
        }}
      >
        <SheetContent
          side='right'
          className='w-[min(100vw,38rem)] gap-0 p-0 sm:max-w-xl'
          onAnimationEnd={(event) => {
            if (event.currentTarget.dataset.state === 'closed') {
              setAssistantSuppressed(false)
            }
          }}
        >
          <SheetHeader className='border-b px-5 py-4 pr-12 text-left'>
            <SheetTitle className='text-base sm:text-lg'>
              {receipt ? t('receiptDialog.titleWithCode', { code: receipt.id }) : t('receiptDialog.title')}
            </SheetTitle>
            <SheetDescription className='sr-only'>{t('receiptDialog.description')}</SheetDescription>
          </SheetHeader>
          {receipt ? (
            <div className='flex min-h-0 flex-1 flex-col'>
              <div className='min-h-0 flex-1 overflow-y-auto px-5 py-4'>
                <div className='bg-card overflow-hidden rounded-xl border shadow-sm'>
                  <div className='bg-accent/25 flex items-center justify-between gap-3 border-b px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <span className='bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full'>
                        <ReceiptText className='size-4' />
                      </span>
                      <p className='text-[11px] font-bold tracking-[0.12em] uppercase'>
                        {t('receiptDialog.receiptHeading', { code: receipt.id })}
                      </p>
                    </div>
                  </div>

                  <dl className='divide-y'>
                    <ReceiptRow label={t('receiptDialog.time')}>
                      {formatDayMonth(receipt.createdAt, { year: true, time: true }).replace(' ', ' · ')}
                    </ReceiptRow>

                    <ReceiptRow label={t('receiptDialog.buyer')}>
                      <div className='space-y-0.5'>
                        <p className='font-semibold'>
                          {user?.name ?? receipt.customerName}
                          {user?.phone ? ` · ${user.phone}` : ''}
                        </p>
                        <p className='text-muted-foreground text-xs font-normal'>
                          {user?.email ?? receipt.customerEmail}
                        </p>
                      </div>
                    </ReceiptRow>

                    <ReceiptRow label={t('table.plan')}>
                      <div className='space-y-0.5'>
                        <p className='font-semibold'>{t(`tier.${receipt.tier}`)}</p>
                        <p className='text-muted-foreground text-xs font-normal'>
                          {t(`receiptDialog.planDetail.${receipt.tier}`)}
                        </p>
                      </div>
                    </ReceiptRow>

                    <ReceiptRow label={t('receiptDialog.subtotal')}>
                      {formatCurrency(receipt.amount, locale)}
                    </ReceiptRow>
                    <ReceiptRow label={t('receiptDialog.discount')}>{t('receiptDialog.noDiscount')}</ReceiptRow>
                    <ReceiptRow label={t('receiptDialog.total')} emphasized>
                      {formatCurrency(receipt.amount, locale)}
                    </ReceiptRow>

                    <ReceiptRow label={t('method')}>
                      <span className='font-semibold'>{t(`methodValue.${receipt.method}`)}</span>
                    </ReceiptRow>

                    {receipt.method === 'bank-qr' ? (
                      <ReceiptRow label={t('receiptDialog.transferContent')}>
                        <span className='font-mono font-semibold'>{receipt.id.replace(/-/g, '')}</span>
                      </ReceiptRow>
                    ) : null}

                    <ReceiptRow label={t('table.status')}>
                      <div className='flex justify-end'>
                        <StatusPill status={receipt.status} label={t(`status.${receipt.status}`)} />
                      </div>
                    </ReceiptRow>

                    <ReceiptRow label={t('receiptDialog.vatInvoice')}>
                      <span className='font-semibold'>
                        {receipt.note?.toLocaleLowerCase(locale).includes('vat')
                          ? t('receiptDialog.vatIssued')
                          : t('receiptDialog.vatNotRequested')}
                      </span>
                    </ReceiptRow>
                  </dl>
                </div>

                <p className='text-muted-foreground mt-3 text-[11px] leading-relaxed text-pretty'>
                  {t('receiptDialog.note', { code: receipt.id })}
                </p>
              </div>

              <div className='bg-background flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => void handleResendReceipt()}
                  disabled={resendingReceiptId === receipt.id}
                >
                  {resendingReceiptId === receipt.id ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Mail className='size-4' />
                  )}
                  {resendingReceiptId === receipt.id ? t('receiptDialog.sendingEmail') : t('receiptDialog.resendEmail')}
                </Button>
                <Button
                  size='sm'
                  onClick={() => void handleDownloadReceipt()}
                  disabled={downloadingReceiptId === receipt.id}
                >
                  {downloadingReceiptId === receipt.id ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Download className='size-4' />
                  )}
                  {downloadingReceiptId === receipt.id
                    ? t('receiptDialog.generatingPdf')
                    : t('receiptDialog.downloadPdf')}
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
