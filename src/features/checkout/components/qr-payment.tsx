'use client'

import { Check, Copy, Download, Headset, Info, LoaderCircle } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { QRCodeCanvas } from 'qrcode.react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { siteConfig } from '@/shared/config'
import { checkoutConfirmRoute, checkoutDoneRoute, checkoutFailedRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatPriceTag } from '@/shared/utils'
import { QR_TTL_MINUTES } from '../constants/checkout.constants'
import { useMarkTransferred, useOrder, useRegenerateQr } from '../hooks/use-checkout'
import { CheckoutSteps } from './checkout-steps'

interface QrPaymentProps {
  orderId: string
}

/**
 * Đếm ngược `mm:ss` tới thời điểm hết hạn mã QR, kèm `ratio` là phần thời gian
 * còn lại (0–100) để vẽ thanh tiến độ dọc đáy banner như Hình S04.
 */
function useCountdown(expiresAt?: string): { label: string; expired: boolean; ratio: number } {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  if (!expiresAt) return { label: '--:--', expired: false, ratio: 0 }

  const remaining = Math.max(0, new Date(expiresAt).getTime() - now)
  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)

  return {
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    expired: remaining === 0,
    ratio: Math.min(100, Math.max(0, (remaining / (QR_TTL_MINUTES * 60_000)) * 100))
  }
}

/**
 * Bước 3/4 — Thanh toán QR (S04).
 *
 * Hai cột: mã QR bên trái, thông tin chuyển khoản thủ công bên phải — mỗi dòng
 * có nút sao chép riêng vì nội dung chuyển khoản gõ sai là đơn phải đối soát tay.
 *
 * Nút "Tôi đã chuyển khoản" có mặt ở đây: bản mô tả yêu cầu nó (đường vào S06)
 * nhưng ảnh demo lại không vẽ, mà thiếu nó thì khách chuyển khoản xong không có
 * cách nào báo cho hệ thống. Ngược lại, KHÔNG có link "Đổi hình thức thanh toán"
 * — chỉ còn một hình thức (R10).
 */
export function QrPayment({ orderId }: QrPaymentProps) {
  const t = useTranslations('checkout.payment')
  const locale = useLocale() as Locale
  const router = useRouter()

  const { data: order, isPending } = useOrder(orderId)
  const { label, expired, ratio } = useCountdown(order?.expiresAt)
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`checkout.payment.${orderId}`, {
    enabled: !isPending && Boolean(order),
    offsetMs: 90,
    replayOnMount: true,
    settleAfterMs: 4000
  })
  const qrRef = useRef<HTMLDivElement>(null)
  const cameFromConfirmRef = useRef(false)
  const transferSubmitLockRef = useRef(false)
  const copyTimersRef = useRef<Record<string, number>>({})
  const [copiedKeys, setCopiedKeys] = useState<ReadonlySet<string>>(() => new Set())

  const animateExit = useCallback(
    async (direction: 'back' | 'forward') => {
      const root = rootRef.current
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const distance = direction === 'forward' ? -28 : 28
      await root
        .animate(
          [
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0.82, transform: `translateX(${distance}px)` }
          ],
          { duration: 230, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
        )
        .finished.catch(() => undefined)
    },
    [rootRef]
  )

  const markTransferred = useMarkTransferred(orderId, {
    beforeNavigate: () => animateExit('forward')
  })
  const regenerate = useRegenerateQr(orderId, {
    navigate: false,
    onSuccess: () => toast.success(t('regeneratedToast', { minutes: QR_TTL_MINUTES }))
  })

  useLayoutEffect(() => {
    if (isPending || !order) return
    if (sessionStorage.getItem('savico.checkout.forward') !== 'payment') return
    cameFromConfirmRef.current = true
    sessionStorage.removeItem('savico.checkout.forward')
    const root = rootRef.current
    if (!root) return

    // Keep the stepper visually anchored between S03 → S04. Only the body of
    // S03 exits; S04 uses a tighter overlapping choreography instead of moving
    // the whole page root, which previously created a visible blank beat.
    root.dataset.checkoutForward = 'true'
  }, [isPending, order, rootRef])

  useEffect(
    () => () => {
      Object.values(copyTimersRef.current).forEach((timer) => window.clearTimeout(timer))
    },
    []
  )

  useEffect(() => {
    if (!order) return
    if (order.status === 'paid') {
      router.replace(checkoutDoneRoute(order.id))
      return
    }
    if (order.status === 'failed') router.replace(checkoutFailedRoute(order.id))
  }, [order, router])

  const copy = useCallback(
    async (key: string, value: string, toastValue = value) => {
      try {
        await navigator.clipboard.writeText(value)
        setCopiedKeys((current) => new Set(current).add(key))
        toast.success(t('copiedValue', { value: toastValue }))

        const existing = copyTimersRef.current[key]
        if (existing) window.clearTimeout(existing)
        copyTimersRef.current[key] = window.setTimeout(() => {
          setCopiedKeys((current) => {
            const next = new Set(current)
            next.delete(key)
            return next
          })
          delete copyTimersRef.current[key]
        }, 1_500)
      } catch {
        toast.error(t('copyFailed'))
      }
    },
    [t]
  )

  /** Tải ảnh QR: lấy thẳng canvas đang render, không cần dựng lại mã. */
  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${orderId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success(t('downloadedQr'))
  }

  const backToConfirm = async () => {
    if (!order) return
    await animateExit('back')
    if (cameFromConfirmRef.current && window.history.length > 1) {
      router.back()
      return
    }
    router.push(checkoutConfirmRoute(order.product.id, order.projectId))
  }

  const openSupport = () => {
    if (!order) return
    const subject = t('supportSubject', { code: order.id })
    const body = t('supportBody', { code: order.id })
    window.location.href = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (isPending || !order) {
    return (
      <div className='mx-auto w-full max-w-5xl space-y-6 px-4 py-8 lg:px-8'>
        <CheckoutSteps current='payment' clickableCompletedSteps={[]} />

        <section className='relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border p-4 pb-7'>
          <Skeleton className='size-10 shrink-0 rounded-full' />
          <div className='min-w-0 flex-1 space-y-2'>
            <Skeleton className='h-4 w-36 max-w-full' />
            <Skeleton className='h-3 w-80 max-w-full' />
          </div>
          <div className='ml-auto space-y-2 text-right'>
            <Skeleton className='ml-auto h-3 w-20' />
            <Skeleton className='ml-auto h-9 w-24' />
          </div>
          <Skeleton className='absolute inset-x-4 bottom-3 h-1.5 rounded-full' />
        </section>

        <div className='grid gap-5 lg:grid-cols-2'>
          <section className='bg-card rounded-2xl border p-5 text-center'>
            <Skeleton className='mx-auto h-5 w-44 max-w-full' />

            <div className='mt-4 flex justify-center'>
              <Skeleton className='aspect-square w-full max-w-[232px] rounded-lg' />
            </div>

            <Skeleton className='mx-auto mt-4 h-7 w-32' />
            <Skeleton className='mx-auto mt-2 h-3 w-24' />

            <div className='mt-4 flex flex-wrap justify-center gap-2'>
              <Skeleton className='h-8 w-28 rounded-md' />
              <Skeleton className='h-8 w-36 rounded-md' />
            </div>

            <div className='mt-5 space-y-3 border-t pt-4'>
              {[0, 1, 2].map((item) => (
                <div key={item} className='flex items-center gap-2.5'>
                  <Skeleton className='size-5 shrink-0 rounded-full' />
                  <Skeleton className='h-4 flex-1' />
                </div>
              ))}
            </div>
          </section>

          <div className='space-y-5'>
            <section className='bg-card rounded-2xl border p-5'>
              <Skeleton className='mx-auto h-5 w-48 max-w-full' />
              <Skeleton className='mx-auto mt-2 h-3 w-72 max-w-full' />

              <div className='mt-4 overflow-hidden rounded-xl border'>
                {[0, 1, 2, 3, 4].map((item) => (
                  <div key={item} className='flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0'>
                    <div className='min-w-0 flex-1 space-y-2'>
                      <Skeleton className='h-2.5 w-20' />
                      <Skeleton className='h-4 w-40 max-w-full' />
                    </div>
                    <Skeleton className='size-8 shrink-0 rounded-md' />
                  </div>
                ))}
              </div>

              <Skeleton className='mt-4 h-14 w-full rounded-lg' />
            </section>

            <div className='flex flex-wrap gap-2'>
              <Skeleton className='h-10 min-w-44 flex-1 rounded-md' />
              <Skeleton className='h-10 w-32 rounded-md' />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const amountLabel = formatPriceTag(order.total, locale)
  const verifying = order.status === 'verifying'
  const rows = [
    {
      key: 'bank',
      label: t('bank'),
      value: order.transfer.bankName,
      copyValue: order.transfer.bankName,
      highlight: false
    },
    {
      key: 'account',
      label: t('accountNumber'),
      value: order.transfer.accountNumber,
      copyValue: order.transfer.accountNumber.replace(/\s/g, ''),
      highlight: false
    },
    {
      key: 'holder',
      label: t('accountName'),
      value: order.transfer.accountName,
      copyValue: order.transfer.accountName,
      highlight: false
    },
    { key: 'amount', label: t('amount'), value: amountLabel, copyValue: String(order.total), highlight: false },
    {
      key: 'content',
      label: t('content'),
      value: order.transfer.content,
      copyValue: order.transfer.content,
      highlight: true
    }
  ] as const

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      data-checkout-payment-root
      style={entranceStyle}
      className='mx-auto w-full max-w-5xl space-y-6 px-4 py-8 lg:px-8'
    >
      <CheckoutSteps
        current='payment'
        clickableCompletedSteps={['confirm']}
        onCompletedStep={(step) => {
          if (step === 'confirm') void backToConfirm()
        }}
      />

      <section
        data-payment-status
        data-expired={expired ? 'true' : 'false'}
        data-entrance-step='1'
        className={cn(
          'relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border p-4 pb-7',
          expired ? 'border-destructive/40 bg-destructive/10' : 'border-primary/40 bg-accent/40'
        )}
      >
        <span aria-hidden className='bg-primary/15 absolute inset-x-4 bottom-3 h-1.5 overflow-hidden rounded-full'>
          <span
            data-payment-time-progress
            className='bg-primary block h-full origin-left rounded-full'
            style={{ width: `${ratio}%` }}
          />
        </span>

        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            expired ? 'bg-destructive/15' : 'bg-primary/15'
          )}
        >
          <span
            data-payment-waiting-dot
            data-active={expired ? 'false' : 'true'}
            className={cn('size-3 rounded-full', expired ? 'bg-destructive' : 'bg-primary')}
          />
        </span>

        <div className='min-w-0 flex-1'>
          <p className={cn('font-semibold', expired && 'text-destructive')}>{expired ? t('expired') : t('waiting')}</p>
          <p className='text-muted-foreground text-sm text-pretty'>{expired ? t('expiredBody') : t('waitingBody')}</p>
        </div>

        <div className='text-right'>
          <p className='text-muted-foreground text-xs'>{t('expiresIn')}</p>
          <p
            className={cn(
              'text-4xl leading-none font-bold tracking-tight tabular-nums',
              expired ? 'text-destructive' : 'text-primary-strong'
            )}
          >
            {label}
          </p>
        </div>
      </section>

      <div className='grid gap-5 lg:grid-cols-2'>
        <section
          data-payment-qr-card
          data-expired={expired ? 'true' : 'false'}
          data-entrance-step='2'
          className='bg-card rounded-2xl border p-5 text-center'
        >
          <h2 className='font-semibold'>{t('qrTitle')}</h2>

          <div ref={qrRef} className='mt-4 flex justify-center'>
            <div
              key={order.expiresAt}
              data-payment-qr-target
              data-expired={expired ? 'true' : 'false'}
              className='relative bg-white p-4'
            >
              <span
                aria-hidden
                data-payment-qr-corner
                className='border-primary absolute top-0 left-0 size-7 rounded-tl-lg border-t-[3px] border-l-[3px]'
              />
              <span
                aria-hidden
                data-payment-qr-corner
                className='border-primary absolute top-0 right-0 size-7 rounded-tr-lg border-t-[3px] border-r-[3px]'
              />
              <span
                aria-hidden
                data-payment-qr-corner
                className='border-primary absolute bottom-0 left-0 size-7 rounded-bl-lg border-b-[3px] border-l-[3px]'
              />
              <span
                aria-hidden
                data-payment-qr-corner
                className='border-primary absolute right-0 bottom-0 size-7 rounded-br-lg border-r-[3px] border-b-[3px]'
              />
              <QRCodeCanvas value={order.transfer.qrPayload} size={200} level='M' />
            </div>
          </div>

          <p className='mt-4 text-2xl font-bold tracking-tight'>{amountLabel}</p>
          <p className='text-muted-foreground font-mono text-xs'>#{order.id}</p>

          <div className='mt-4 flex flex-wrap justify-center gap-2'>
            <Button data-payment-minor-action variant='outline' size='sm' onClick={downloadQr}>
              <Download className='size-4' />
              {t('downloadQr')}
            </Button>
            <Button
              data-payment-minor-action
              data-copied={copiedKeys.has('order') ? 'true' : 'false'}
              variant='outline'
              size='sm'
              onClick={() => void copy('order', order.id, order.id)}
            >
              {copiedKeys.has('order') ? <Check className='size-4' /> : <Copy className='size-4' />}
              {copiedKeys.has('order') ? t('copied') : t('copyOrder')}
            </Button>
          </div>

          <ol data-payment-guide className='mt-5 space-y-2 border-t pt-4 text-left'>
            {[t('guide1'), t('guide2'), t('guide3')].map((step, index) => (
              <li key={step} data-payment-guide-step className='flex items-start gap-2.5 text-sm'>
                <span className='bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold'>
                  {index + 1}
                </span>
                <span className='text-pretty'>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className='space-y-5'>
          <section
            data-payment-manual-card
            data-entrance-step='3'
            data-entrance-from='right'
            className='bg-card rounded-2xl border p-5'
          >
            <h2 className='text-center font-semibold'>{t('manualTitle')}</h2>
            <p className='text-muted-foreground mt-1 text-center text-sm text-pretty'>{t('manualBody')}</p>

            <dl className='divide-border mt-4 divide-y overflow-hidden rounded-xl border'>
              {rows.map((row) => {
                const copied = copiedKeys.has(row.key)
                return (
                  <div
                    key={row.key}
                    data-payment-transfer-row
                    data-payment-content-row={row.highlight ? 'true' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5',
                      row.highlight && 'bg-warning/10 border-warning/40'
                    )}
                  >
                    <div className='min-w-0 flex-1'>
                      <dt className={cn('text-muted-foreground text-[11px]', row.highlight && 'text-warning-strong')}>
                        {row.label}
                      </dt>
                      <dd className={cn('truncate font-medium', row.highlight && 'text-warning-strong font-semibold')}>
                        {row.value}
                      </dd>
                    </div>
                    <button
                      type='button'
                      data-payment-copy-button
                      data-copied={copied ? 'true' : 'false'}
                      aria-label={`${t('copy')} ${row.label}`}
                      onClick={() => void copy(row.key, row.copyValue, row.value)}
                      className='text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border'
                    >
                      {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
                    </button>
                  </div>
                )
              })}
            </dl>

            <p
              data-payment-warning
              className='text-muted-foreground bg-warning/10 mt-4 flex items-start gap-2 rounded-lg p-3 text-xs'
            >
              <Info className='text-warning-strong mt-0.5 size-3.5 shrink-0' />
              <span className='text-pretty'>{t('keepContent')}</span>
            </p>
          </section>

          <div data-payment-actions data-entrance-step='4' className='flex flex-wrap gap-2'>
            {verifying ? (
              <Button className='flex-1' disabled>
                <LoaderCircle className='size-4 animate-spin' />
                {t('verifying')}
              </Button>
            ) : expired ? (
              <Button className='flex-1' onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
                {regenerate.isPending ? <LoaderCircle className='size-4 animate-spin' /> : null}
                {regenerate.isPending ? t('regenerating') : t('regenerate')}
              </Button>
            ) : (
              <Button
                className='flex-1'
                onClick={() => {
                  if (transferSubmitLockRef.current || markTransferred.isPending) return
                  transferSubmitLockRef.current = true
                  markTransferred.mutate(undefined, {
                    onError: () => {
                      transferSubmitLockRef.current = false
                    }
                  })
                }}
                disabled={markTransferred.isPending}
              >
                {markTransferred.isPending ? (
                  <LoaderCircle className='size-4 animate-spin' />
                ) : (
                  <Check className='size-4' />
                )}
                {markTransferred.isPending ? t('recording') : t('transferred')}
              </Button>
            )}
            <Button variant='outline' onClick={openSupport}>
              <Headset className='size-4' />
              {t('support')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
