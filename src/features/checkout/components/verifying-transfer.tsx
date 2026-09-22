'use client'

import { Check, Clock, Headset, Landmark, Receipt, RefreshCw, Wallet } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { siteConfig } from '@/shared/config'
import { checkoutDoneRoute, checkoutFailedRoute, checkoutPaymentRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/utils'
import { useOrder } from '../hooks/use-checkout'
import { CheckoutSteps } from './checkout-steps'

interface VerifyingTransferProps {
  orderId: string
}

function formatWait(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

/**
 * S06 — Đang xác nhận chuyển khoản.
 *
 * Màn này vẫn ở bước 3. Stepper giữ nguyên, chỉ phần trạng thái đối soát có
 * choreography. Polling dùng mốc ~10 giây theo spec; nút tải lại dùng cùng
 * query nên auto-check và manual-check không thể chạy chồng nhau.
 */
export function VerifyingTransfer({ orderId }: VerifyingTransferProps) {
  const t = useTranslations('checkout.verifying')
  const tPayment = useTranslations('checkout.payment')
  const tErrors = useTranslations('errors')
  const locale = useLocale() as Locale
  const router = useRouter()

  const { data: order, isPending, refetch, isFetching } = useOrder(orderId, { refetchIntervalMs: 10_000 })
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`checkout.verifying.${orderId}`, {
    enabled: !isPending && Boolean(order),
    offsetMs: 70,
    replayOnMount: true,
    settleAfterMs: 2600
  })

  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [confirmedWaitSeconds, setConfirmedWaitSeconds] = useState<number | null>(null)
  const [checkingVisual, setCheckingVisual] = useState(false)

  const cameFromPaymentRef = useRef(false)
  const backNavigationRef = useRef(false)
  const manualCheckLockRef = useRef(false)
  const paidHandledRef = useRef(false)
  const doneTimerRef = useRef<number | null>(null)
  const checkingVisualTimerRef = useRef<number | null>(null)
  const checkingVisualStartedRef = useRef(0)

  const verifyingStartKey = `savico.checkout.verifying-start:${orderId}`
  const confirmed = order?.status === 'paid'

  useLayoutEffect(() => {
    if (isPending || !order) return
    if (sessionStorage.getItem('savico.checkout.forward') !== 'verifying') return
    cameFromPaymentRef.current = true
    sessionStorage.removeItem('savico.checkout.forward')
    const root = rootRef.current
    if (root) root.dataset.verifyingForward = 'true'
  }, [isPending, order, rootRef])

  useEffect(() => {
    const fromOrder = order?.verifyingStartedAt ? new Date(order.verifyingStartedAt).getTime() : Number.NaN
    const stored = Number(sessionStorage.getItem(verifyingStartKey))
    const start =
      Number.isFinite(fromOrder) && fromOrder > 0
        ? fromOrder
        : Number.isFinite(stored) && stored > 0
          ? stored
          : Date.now()
    if (!(Number.isFinite(stored) && stored > 0) || stored !== start) {
      sessionStorage.setItem(verifyingStartKey, String(start))
    }

    const syncTimer = window.setTimeout(() => {
      setStartedAt(start)
      setNow(Date.now())
    }, 0)
    return () => window.clearTimeout(syncTimer)
  }, [order?.verifyingStartedAt, verifyingStartKey])

  useEffect(() => {
    if (confirmed) return
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [confirmed])

  useEffect(() => {
    if (confirmed) {
      if (checkingVisualTimerRef.current) window.clearTimeout(checkingVisualTimerRef.current)
      checkingVisualTimerRef.current = window.setTimeout(() => setCheckingVisual(false), 0)
      return () => {
        if (checkingVisualTimerRef.current) window.clearTimeout(checkingVisualTimerRef.current)
      }
    }

    if (isFetching) {
      if (checkingVisualTimerRef.current) window.clearTimeout(checkingVisualTimerRef.current)
      checkingVisualStartedRef.current = performance.now()
      checkingVisualTimerRef.current = window.setTimeout(() => setCheckingVisual(true), 0)
      return () => {
        if (checkingVisualTimerRef.current) window.clearTimeout(checkingVisualTimerRef.current)
      }
    }

    if (!checkingVisual) return
    const elapsed = performance.now() - checkingVisualStartedRef.current
    const remaining = Math.max(0, 420 - elapsed)
    checkingVisualTimerRef.current = window.setTimeout(() => setCheckingVisual(false), remaining)

    return () => {
      if (checkingVisualTimerRef.current) window.clearTimeout(checkingVisualTimerRef.current)
    }
  }, [checkingVisual, confirmed, isFetching])

  const elapsedSeconds =
    confirmedWaitSeconds ?? (startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1_000)))
  const waitedLabel = formatWait(elapsedSeconds)

  const animateContentExit = useCallback(
    async (direction: 'back' | 'forward') => {
      const content = rootRef.current?.querySelector<HTMLElement>('[data-verifying-transition]')
      if (!content || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const distance = direction === 'forward' ? -18 : 18
      await content
        .animate(
          [
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: `translateX(${distance}px)` }
          ],
          { duration: 210, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
        )
        .finished.catch(() => undefined)
    },
    [rootRef]
  )

  useEffect(() => {
    if (!order) return

    if (order.status === 'awaiting') {
      router.replace(checkoutPaymentRoute(order.id))
      return
    }

    if (order.status === 'failed') {
      router.replace(checkoutFailedRoute(order.id))
      return
    }

    if (order.status !== 'paid' || paidHandledRef.current) return
    paidHandledRef.current = true

    const orderStart = order.verifyingStartedAt ? new Date(order.verifyingStartedAt).getTime() : Number.NaN
    const storedStart = Number(sessionStorage.getItem(verifyingStartKey))
    const effectiveStart =
      startedAt ??
      (Number.isFinite(orderStart) && orderStart > 0
        ? orderStart
        : Number.isFinite(storedStart) && storedStart > 0
          ? storedStart
          : Date.now())
    const elapsed = Math.max(0, Math.floor((Date.now() - effectiveStart) / 1_000))
    setConfirmedWaitSeconds(elapsed)

    doneTimerRef.current = window.setTimeout(() => {
      void (async () => {
        await animateContentExit('forward')
        sessionStorage.removeItem(verifyingStartKey)
        sessionStorage.setItem('savico.checkout.forward', 'done')
        router.replace(checkoutDoneRoute(order.id))
      })()
    }, 900)

    return () => {
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current)
    }
  }, [animateContentExit, order, router, startedAt, verifyingStartKey])

  useEffect(
    () => () => {
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current)
      if (checkingVisualTimerRef.current) window.clearTimeout(checkingVisualTimerRef.current)
    },
    []
  )

  const backToPayment = useCallback(async () => {
    if (!order || confirmed || backNavigationRef.current) return
    backNavigationRef.current = true
    await animateContentExit('back')

    if (cameFromPaymentRef.current && window.history.length > 1) {
      router.back()
      return
    }

    router.push(checkoutPaymentRoute(order.id))
  }, [animateContentExit, confirmed, order, router])

  const refreshStatus = useCallback(async () => {
    if (confirmed || isFetching || checkingVisual || manualCheckLockRef.current) return
    manualCheckLockRef.current = true

    try {
      const result = await refetch()
      if (result.error) {
        toast.error(tErrors('generic'))
        return
      }
      if (result.data?.status !== 'paid') {
        toast.info(t('notReceivedToast'))
      }
    } finally {
      manualCheckLockRef.current = false
    }
  }, [checkingVisual, confirmed, isFetching, refetch, t, tErrors])

  const openSupport = () => {
    if (!order) return
    const subject = tPayment('supportSubject', { code: order.id })
    const body = tPayment('supportBody', { code: order.id })
    window.location.href = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (isPending || !order) {
    return (
      <div className='mx-auto w-full max-w-lg space-y-6 px-4 py-8'>
        <CheckoutSteps current='payment' animateEntrance={false} />

        <div className='space-y-3 text-center'>
          <Skeleton className='mx-auto size-20 rounded-full' />
          <Skeleton className='mx-auto h-8 w-72 max-w-full' />
          <Skeleton className='mx-auto h-4 w-80 max-w-full' />
          <Skeleton className='mx-auto h-4 w-64 max-w-full' />
        </div>

        <div className='space-y-2 rounded-2xl border p-5'>
          {[0, 1, 2].map((item) => (
            <div key={item} className='flex items-center gap-3 border-b py-2.5 last:border-b-0'>
              <Skeleton className='size-4 shrink-0 rounded-sm' />
              <Skeleton className='h-4 flex-1' />
              <Skeleton className='h-4 w-28' />
            </div>
          ))}
        </div>

        <Skeleton className='h-11 w-full rounded-xl' />
        <Skeleton className='h-13 w-full rounded-md' />
        <Skeleton className='mx-auto h-5 w-72 max-w-full' />
        <Skeleton className='mx-auto h-3 w-80 max-w-full' />
      </div>
    )
  }

  const rows = [
    { icon: Receipt, label: t('orderCode'), value: `#${order.id}` },
    { icon: Wallet, label: t('amount'), value: formatCurrency(order.total, locale) },
    { icon: Landmark, label: t('content'), value: order.transfer.content }
  ]

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      data-checkout-verifying-root
      data-confirmed={confirmed ? 'true' : 'false'}
      style={entranceStyle}
      className='mx-auto w-full max-w-lg space-y-6 px-4 py-8'
    >
      <CheckoutSteps
        current='payment'
        animateEntrance={false}
        onCurrentStep={
          confirmed
            ? undefined
            : (step) => {
                if (step === 'payment') void backToPayment()
              }
        }
      />

      <div data-verifying-transition className='space-y-6'>
        <div className='space-y-3 text-center'>
          <span
            data-verifying-status-icon
            data-confirmed={confirmed ? 'true' : 'false'}
            className={cn(
              'mx-auto flex size-20 items-center justify-center rounded-full',
              confirmed ? 'bg-primary/15 text-primary-strong' : 'bg-warning/15 text-warning-strong'
            )}
          >
            {confirmed ? (
              <Check data-verifying-confirmed-check className='size-10' strokeWidth={2.5} />
            ) : (
              <Clock className='size-10' strokeWidth={2.25} />
            )}
          </span>

          <div data-verifying-heading data-entrance-step='1'>
            <h1
              className={cn(
                'text-3xl font-bold tracking-tight',
                confirmed ? 'text-primary-strong' : 'text-warning-strong'
              )}
            >
              {confirmed ? t('confirmedTitle') : t('title')}
            </h1>
            <p className='text-muted-foreground mt-2 text-pretty'>
              {confirmed ? t('confirmedSubtitle') : t('subtitle')}
            </p>
          </div>
        </div>

        <dl data-entrance-step='2' className='border-warning/30 bg-warning/5 space-y-2 rounded-2xl border p-5'>
          {rows.map((row) => (
            <div key={row.label} className='flex items-center gap-3 border-b py-2.5 last:border-b-0'>
              <row.icon className='text-warning-strong size-4 shrink-0' />
              <dt className='text-muted-foreground min-w-0 flex-1 text-sm'>{row.label}</dt>
              <dd className='font-medium'>{row.value}</dd>
            </div>
          ))}
        </dl>

        <p
          data-entrance-step='3'
          className={cn(
            'rounded-xl px-4 py-3 text-center text-sm',
            confirmed ? 'bg-primary/10 text-primary-strong' : 'bg-accent/40 text-primary-strong'
          )}
        >
          {confirmed ? t('confirmedAfter', { time: waitedLabel }) : t('waited', { time: waitedLabel })}
        </p>

        <div data-entrance-step='4' className='space-y-2'>
          <Button
            variant='outline'
            className='h-13 w-full'
            onClick={() => void refreshStatus()}
            disabled={confirmed || checkingVisual}
          >
            {confirmed ? (
              <Check className='size-4' />
            ) : (
              <RefreshCw
                data-verifying-refresh-icon
                data-checking={checkingVisual ? 'true' : 'false'}
                className='size-4'
              />
            )}
            {confirmed ? t('confirmedButton') : checkingVisual ? t('checking') : t('refresh')}
          </Button>

          <Button data-verifying-support variant='ghost' className='w-full' onClick={openSupport}>
            <Headset className='size-4' />
            <span data-verifying-support-label>{t('notSeen')}</span>
          </Button>
        </div>

        <p data-entrance-step='5' className='text-muted-foreground text-center text-xs text-pretty'>
          {t('keepPage')}
        </p>
      </div>
    </div>
  )
}
