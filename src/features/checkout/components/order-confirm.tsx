'use client'

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import {
  CheckCircle2,
  FileText,
  Info,
  LoaderCircle,
  Palette,
  QrCode,
  RotateCcw,
  ShieldCheck,
  SquarePen
} from 'lucide-react'

import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useAuth } from '@/shared/auth'
import { EmptyState } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { ROUTES, supervisionPlansRoute } from '@/shared/constants/routes'
import { useCmsCollection } from '@/shared/cms'
import { usePageEntrance } from '@/shared/hooks'
import { canReturnToCheckoutSource, clearCheckoutReturn } from '@/shared/lib/checkout-return'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/utils'
import { DISCOUNT_CODES, REFUND_WINDOW_HOURS } from '../constants/checkout.constants'
import { useCreateOrder } from '../hooks/use-checkout'
import type { OrderKind } from '../types/checkout.types'
import { CheckoutSteps } from './checkout-steps'

interface OrderConfirmProps {
  productId: string
  kind: OrderKind
  projectId?: string
}

/**
 * Bước 2/4 — Xác nhận đơn hàng (S03).
 *
 * Bố cục hai cột: thông tin người mua + hóa đơn bên trái, "Đơn hàng của bạn"
 * bên phải và DÍNH THEO CUỘN — nút thanh toán là hành động chính của màn, để nó
 * trôi mất là bắt người dùng cuộn ngược lên tìm.
 *
 * R10: chỉ còn MỘT hình thức thanh toán nên không có ô chọn phương thức, chỉ có
 * một khối thông tin QR. Cũng vì thế không còn dòng nào nói về thẻ hay ví.
 */
/** Hình S03: icon của ba dòng quyền lợi trong thẻ đơn hàng, theo đúng thứ tự. */
const BENEFIT_ICONS = [Palette, SquarePen, FileText] as const

function AnimatedCheckoutTotal({ value, locale }: { value: number; locale: Locale }) {
  const reduceMotion = Boolean(useReducedMotion())
  const number = useMotionValue(value)
  const formatted = useTransform(number, (current) => formatCurrency(Math.round(current), locale))

  useEffect(() => {
    if (reduceMotion) {
      number.set(value)
      return
    }
    const controls = animate(number, value, { duration: 0.56, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [number, reduceMotion, value])

  return (
    <>
      <span className='sr-only'>{formatCurrency(value, locale)}</span>
      <motion.span aria-hidden>{formatted}</motion.span>
    </>
  )
}

export function OrderConfirm({ productId, kind, projectId }: OrderConfirmProps) {
  const t = useTranslations('checkout.confirm')
  const tPlans = useTranslations('plans.tiers')
  const tPlanTags = useTranslations('plans.tierTags')
  const tPlansRoot = useTranslations('plans')
  const tSupervision = useTranslations('supervision.tiers')
  const locale = useLocale() as Locale
  const { user } = useAuth()
  const router = useRouter()
  const reduceMotion = Boolean(useReducedMotion())

  const plans = useCmsCollection('plans')
  const supervisionPackages = useCmsCollection('supervisionPackages')

  const product = useMemo(() => {
    if (kind === 'design') {
      const plan = plans.find((item) => item.id === productId)
      return plan
        ? {
            name: tPlans(plan.tier),
            // Hình S03: cạnh tên gói có hai nhãn — nhãn nhóm gói (xanh) và
            // "Phổ biến" (cam) nếu đó là gói được đánh dấu phổ biến.
            tierTag: tPlanTags(plan.tier),
            popular: Boolean(plan.popular),
            price: plan.price,
            benefits: [
              `${plan.designCredits} phương án thiết kế`,
              `${plan.designCredits} lượt chỉnh sửa phương án`,
              `${plan.libraryCredits} lượt tra cứu thư viện mẫu`
            ]
          }
        : null
    }
    const supervision = supervisionPackages.find((item) => item.id === productId)
    return supervision
      ? {
          name: tSupervision(supervision.tier),
          tierTag: null,
          popular: false,
          price: supervision.price,
          benefits: supervision.benefits.slice(0, 3)
        }
      : null
  }, [kind, productId, plans, supervisionPackages, tPlans, tPlanTags, tSupervision])

  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`checkout.confirm.${kind}.${productId}`, {
    enabled: Boolean(product),
    offsetMs: 90,
    replayOnMount: true,
    settleAfterMs: 2200
  })
  const buyerNameRef = useRef<HTMLInputElement>(null)
  const invoiceCompanyRef = useRef<HTMLInputElement>(null)
  const discountInputRef = useRef<HTMLInputElement>(null)
  const termsRef = useRef<HTMLLabelElement>(null)
  const codeTimerRef = useRef<number | null>(null)
  const codeRequestRef = useRef(0)
  const backNavigationRef = useRef(false)

  const beforePaymentNavigate = useCallback(async () => {
    clearCheckoutReturn()
    const root = rootRef.current
    if (!root || reduceMotion) return
    const body = Array.from(root.querySelectorAll<HTMLElement>('[data-checkout-confirm-transition]'))
    if (body.length === 0) return

    await Promise.all(
      body.map((element, index) =>
        element
          .animate(
            [
              { opacity: 1, transform: 'translateX(0)' },
              { opacity: 0, transform: 'translateX(-12px)' }
            ],
            {
              duration: 160,
              delay: index * 18,
              easing: 'cubic-bezier(0.4, 0, 1, 1)',
              fill: 'forwards'
            }
          )
          .finished.catch(() => undefined)
      )
    )
  }, [reduceMotion, rootRef])
  const createOrder = useCreateOrder({ beforeNavigate: beforePaymentNavigate })

  const [buyer, setBuyer] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? ''
  })
  const [invoiceOn, setInvoiceOn] = useState(false)
  const [invoice, setInvoice] = useState({ company: '', taxCode: '', address: '', email: '' })
  const [codeInput, setCodeInput] = useState('')
  const [applied, setApplied] = useState<{ code: string; percent: number } | null>(null)
  const [codeError, setCodeError] = useState(false)
  const [codePending, setCodePending] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [termsError, setTermsError] = useState(false)

  useEffect(
    () => () => {
      if (codeTimerRef.current) window.clearTimeout(codeTimerRef.current)
    },
    []
  )

  const shake = useCallback(
    (element: HTMLElement | null) => {
      if (!element || reduceMotion) return
      element.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' }
        ],
        { duration: 320, easing: 'ease-out' }
      )
    },
    [reduceMotion]
  )

  const backToPlan = useCallback(() => {
    if (backNavigationRef.current) return
    backNavigationRef.current = true
    const fallback = kind === 'supervision' && projectId ? supervisionPlansRoute(projectId) : ROUTES.PLANS
    const finish = () => {
      if (canReturnToCheckoutSource(productId, projectId)) {
        clearCheckoutReturn()
        router.back()
      } else {
        router.push(fallback)
      }
    }
    const root = rootRef.current
    if (!root || reduceMotion) {
      finish()
      return
    }
    const exit = root.animate(
      [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0.82, transform: 'translateX(28px)' }
      ],
      { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    )
    void exit.finished.then(finish).catch(finish)
  }, [kind, productId, projectId, reduceMotion, rootRef, router])

  if (!product) {
    return (
      <div className='mx-auto w-full max-w-3xl px-4 py-16 lg:px-8'>
        <EmptyState
          title={t('missingProduct')}
          action={
            <Button asChild>
              <Link href={ROUTES.PLANS}>{t('backToPlans')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const discountAmount = applied ? Math.round((product.price * applied.percent) / 100) : 0
  const total = product.price - discountAmount
  const planBackHref = kind === 'supervision' && projectId ? supervisionPlansRoute(projectId) : ROUTES.PLANS

  const applyCode = () => {
    if (codePending || applied) return
    const normalized = codeInput.trim().toUpperCase()
    if (!normalized) {
      setCodeError(false)
      shake(discountInputRef.current)
      discountInputRef.current?.focus()
      return
    }

    const requestId = ++codeRequestRef.current
    setCodePending(true)
    setCodeError(false)
    if (codeTimerRef.current) window.clearTimeout(codeTimerRef.current)
    codeTimerRef.current = window.setTimeout(() => {
      if (requestId !== codeRequestRef.current) return
      const percent = DISCOUNT_CODES[normalized]
      setCodePending(false)
      if (!percent) {
        setApplied(null)
        setCodeError(true)
        shake(discountInputRef.current)
        discountInputRef.current?.focus()
        return
      }
      setApplied({ code: normalized, percent })
      setCodeError(false)
      toast.success(t('discountToast', { percent, plan: product?.name ?? '' }))
    }, 460)
  }

  const submit = () => {
    if (!agreed) {
      setTermsError(true)
      shake(termsRef.current)
      toast.error(t('termsRequiredToast'))
      return
    }
    createOrder.mutate({
      productId,
      kind,
      ...(projectId ? { projectId } : {}),
      buyer,
      invoice: { enabled: invoiceOn, ...invoice },
      discountCode: applied?.code ?? ''
    })
  }

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      data-checkout-confirm-root
      style={entranceStyle}
      className='mx-auto w-full max-w-6xl space-y-6 px-4 py-8 lg:px-8'
    >
      <CheckoutSteps
        current='confirm'
        onCompletedStep={(step) => {
          if (step === 'plan') backToPlan()
        }}
      />

      <header data-checkout-confirm-transition data-entrance-step='1' className='space-y-1 pt-2'>
        <h1 className='text-3xl font-bold tracking-tight sm:text-[2.25rem]'>{t('title')}</h1>
        <p className='text-muted-foreground text-base'>{t('subtitle')}</p>
      </header>

      <div data-checkout-confirm-transition className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='min-w-0 space-y-5'>
          <section data-entrance-step='2' className='bg-card rounded-2xl border p-5'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-lg font-semibold'>{t('buyerTitle')}</h2>
              {/* Hình S03: "Có thể chỉnh sửa" là chữ ĐEN (chỉ icon bút chì màu xanh). */}
              <button
                type='button'
                onClick={() => {
                  buyerNameRef.current?.focus()
                  buyerNameRef.current?.select()
                }}
                className='text-foreground flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
              >
                <SquarePen className='text-primary size-4' />
                {t('buyerEditable')}
              </button>
            </div>

            <div className='mt-4 grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='buyer-name'>{t('name')}</Label>
                <Input
                  ref={buyerNameRef}
                  data-checkout-buyer-input
                  id='buyer-name'
                  value={buyer.name}
                  onChange={(event) => setBuyer({ ...buyer, name: event.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='buyer-phone'>{t('phone')}</Label>
                <Input
                  data-checkout-buyer-input
                  id='buyer-phone'
                  inputMode='tel'
                  value={buyer.phone}
                  onChange={(event) => setBuyer({ ...buyer, phone: event.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='buyer-email'>{t('email')}</Label>
                <Input
                  data-checkout-buyer-input
                  id='buyer-email'
                  inputMode='email'
                  value={buyer.email}
                  onChange={(event) => setBuyer({ ...buyer, email: event.target.value })}
                />
              </div>
            </div>

            <p className='text-muted-foreground mt-3 text-xs'>{t('receiptNote')}</p>
          </section>

          {/* R10 — chỉ QR chuyển khoản, nên đây là một khối thông tin chứ không
              phải một danh sách để chọn. */}
          <section data-entrance-step='3' className='bg-card rounded-2xl border p-5'>
            <h2 className='text-lg font-semibold'>{t('paymentTitle')}</h2>

            <div className='border-primary bg-accent/40 mt-4 flex items-start gap-4 rounded-xl border p-4'>
              <span className='bg-card text-primary flex size-11 shrink-0 items-center justify-center rounded-lg'>
                <QrCode className='size-5' />
              </span>
              <div className='min-w-0 flex-1'>
                <p className='font-medium'>{t('qrTitle')}</p>
                <p className='text-muted-foreground mt-0.5 text-sm text-pretty'>{t('qrBody')}</p>
                <span className='bg-primary/10 text-primary-strong mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium'>
                  {t('qrFree')}
                </span>
              </div>
            </div>

            <p className='text-muted-foreground mt-3 flex items-start gap-2 text-xs'>
              <Info className='mt-0.5 size-3.5 shrink-0' />
              <span>{t('qrOnly')}</span>
            </p>
          </section>

          <section data-entrance-step='4' className='bg-card rounded-2xl border p-5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-base font-semibold'>{t('invoiceTitle')}</h2>
                <p className='text-muted-foreground text-sm'>{t('invoiceHint')}</p>
              </div>
              <Switch
                data-checkout-invoice-switch
                checked={invoiceOn}
                onCheckedChange={(checked) => {
                  setInvoiceOn(checked)
                  if (checked) {
                    window.requestAnimationFrame(() => {
                      window.requestAnimationFrame(() => {
                        invoiceCompanyRef.current?.focus()
                      })
                    })
                  }
                }}
                aria-label={t('invoiceTitle')}
              />
            </div>

            <div data-checkout-invoice-fields data-open={invoiceOn ? 'true' : 'false'} className='grid'>
              <div className='overflow-hidden'>
                <div className='mt-4 grid gap-4 border-t border-dashed pt-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='invoice-company'>{t('company')}</Label>
                    <Input
                      ref={invoiceCompanyRef}
                      id='invoice-company'
                      disabled={!invoiceOn}
                      value={invoice.company}
                      onChange={(event) => setInvoice({ ...invoice, company: event.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='invoice-tax'>{t('taxCode')}</Label>
                    <Input
                      id='invoice-tax'
                      disabled={!invoiceOn}
                      value={invoice.taxCode}
                      onChange={(event) => setInvoice({ ...invoice, taxCode: event.target.value })}
                    />
                  </div>
                  <div className='space-y-2 sm:col-span-2'>
                    <Label htmlFor='invoice-address'>{t('address')}</Label>
                    <Input
                      id='invoice-address'
                      disabled={!invoiceOn}
                      value={invoice.address}
                      onChange={(event) => setInvoice({ ...invoice, address: event.target.value })}
                    />
                  </div>
                  <div className='space-y-2 sm:col-span-2'>
                    <Label htmlFor='invoice-email'>{t('invoiceEmail')}</Label>
                    <Input
                      id='invoice-email'
                      inputMode='email'
                      disabled={!invoiceOn}
                      value={invoice.email}
                      onChange={(event) => setInvoice({ ...invoice, email: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <label
            ref={termsRef}
            data-checkout-terms
            data-error={termsError ? 'true' : 'false'}
            data-entrance-step='5'
            className='flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors'
          >
            <Checkbox
              data-checkout-terms-checkbox
              checked={agreed}
              onCheckedChange={(value) => {
                const next = value === true
                setAgreed(next)
                if (next) setTermsError(false)
              }}
            />
            {/* Hình S03: hai cụm "Điều khoản sử dụng" và "Chính sách thanh toán"
                là LIÊN KẾT màu xanh có gạch chân. */}
            <span className='text-pretty'>
              {t.rich('terms', {
                terms: (chunks) => (
                  <Link
                    href={ROUTES.TERMS}
                    target='_blank'
                    rel='noopener noreferrer'
                    onClick={(event) => event.stopPropagation()}
                    className='text-primary underline underline-offset-4'
                  >
                    {chunks}
                  </Link>
                ),
                payment: (chunks) => (
                  <Link
                    href={ROUTES.PRIVACY}
                    target='_blank'
                    rel='noopener noreferrer'
                    onClick={(event) => event.stopPropagation()}
                    className='text-primary underline underline-offset-4'
                  >
                    {chunks}
                  </Link>
                )
              })}
            </span>
          </label>
        </div>

        {/* Cột phải dính theo cuộn. */}
        <aside data-entrance-step='2' data-entrance-from='right' className='lg:sticky lg:top-24 lg:self-start'>
          <section className='bg-card rounded-2xl border p-5'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-base font-semibold'>{t('orderTitle')}</h2>
              {/* Hình S03: "Đổi gói" là liên kết CÓ GẠCH CHÂN. */}
              <Link
                href={planBackHref}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  event.preventDefault()
                  backToPlan()
                }}
                className='text-primary text-sm font-medium underline underline-offset-4'
              >
                {t('changePlan')}
              </Link>
            </div>

            <div className='bg-accent/40 mt-4 rounded-xl border p-4'>
              {/* Hình S03: nhãn "Phổ biến" (cam) đẩy sát MÉP PHẢI của thẻ. */}
              <div className='flex flex-wrap items-center gap-2'>
                <p className='text-primary-strong text-lg font-bold tracking-wide uppercase'>{product.name}</p>
                {product.tierTag ? (
                  <span className='bg-accent text-primary-strong rounded-sm px-2.5 py-0.5 text-[11px] font-semibold'>
                    {product.tierTag}
                  </span>
                ) : null}
                {product.popular ? (
                  <span className='bg-brand-orange text-brand-orange-foreground ml-auto rounded-sm px-2.5 py-0.5 text-[11px] font-semibold'>
                    {tPlansRoot('popularShort')}
                  </span>
                ) : null}
              </div>
              {projectId ? (
                <p className='text-muted-foreground mt-0.5 text-xs'>{t('forProject', { project: projectId })}</p>
              ) : null}

              {/* Hình S03: mỗi dòng quyền lợi có ICON RIÊNG (bảng màu · ô bút chì ·
                  tài liệu), không dùng chung dấu tích; con số đứng đầu in đậm. */}
              <ul className='mt-3 space-y-2'>
                {product.benefits.map((benefit, index) => {
                  const Icon = BENEFIT_ICONS[index] ?? CheckCircle2
                  const [, amount, rest] = benefit.match(/^(\d[\d.]*)\s+(.*)$/) ?? []
                  return (
                    <li key={benefit} className='flex items-start gap-2 text-sm'>
                      <Icon className='text-primary mt-0.5 size-4 shrink-0' />
                      <span className='text-pretty'>
                        {amount ? <strong className='font-semibold'>{amount}</strong> : null} {rest ?? benefit}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {/* Hình S03: dưới ba dòng quyền lợi có dòng nhắc lượt không hết hạn. */}
              <p className='text-muted-foreground mt-2 text-xs'>{t('creditsNeverExpire')}</p>
            </div>

            <div className='mt-4 space-y-2'>
              <Label htmlFor='discount'>{t('discountLabel')}</Label>
              <div className='flex gap-2'>
                <Input
                  ref={discountInputRef}
                  id='discount'
                  value={codeInput}
                  placeholder={t('discountPlaceholder')}
                  aria-invalid={codeError || undefined}
                  disabled={codePending}
                  readOnly={Boolean(applied)}
                  onChange={(event) => {
                    setCodeInput(event.target.value.toUpperCase())
                    if (codeError) setCodeError(false)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    applyCode()
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  disabled={codePending || Boolean(applied)}
                  onClick={applyCode}
                  className={cn(
                    applied && 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/10 disabled:opacity-100'
                  )}
                >
                  {codePending ? (
                    <LoaderCircle className='size-4 animate-spin' />
                  ) : applied ? (
                    <CheckCircle2 className='size-4' />
                  ) : null}
                  {codePending ? t('applying') : applied ? t('applied') : t('apply')}
                </Button>
              </div>
              {applied ? (
                <p className='text-primary flex items-center gap-1.5 text-xs'>
                  <CheckCircle2 className='size-3.5' />
                  {t('discountAppliedPlan', { percent: applied.percent, plan: product.name })}
                </p>
              ) : null}
              {codeError ? <p className='text-destructive text-xs'>{t('discountInvalid')}</p> : null}
            </div>

            <dl className='mt-4 space-y-2 border-t pt-4 text-sm'>
              <div className='flex items-center justify-between'>
                <dt className='text-muted-foreground'>{t('subtotal')}</dt>
                <dd>{formatCurrency(product.price, locale)}</dd>
              </div>
              {discountAmount > 0 ? (
                <div data-checkout-discount-row className='flex items-center justify-between'>
                  <dt className='text-muted-foreground'>{t('discountWithCode', { code: applied?.code ?? '' })}</dt>
                  <dd className='text-primary'>−{formatCurrency(discountAmount, locale)}</dd>
                </div>
              ) : null}
              <div className='flex items-center justify-between border-t pt-2'>
                <dt className='font-semibold'>{t('total')}</dt>
                <dd className='text-primary-strong text-xl font-bold'>
                  <AnimatedCheckoutTotal value={total} locale={locale} />
                </dd>
              </div>
              <p className='text-muted-foreground text-right text-xs'>{t('vat')}</p>
            </dl>

            <Button
              data-checkout-submit
              data-ready={agreed ? 'true' : 'false'}
              aria-disabled={createOrder.isPending || undefined}
              className='relative mt-4 w-full overflow-hidden'
              size='lg'
              onClick={submit}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? <LoaderCircle className='size-4 animate-spin' /> : null}
              {createOrder.isPending ? t('processing') : t('submit')}
            </Button>
            <p
              className={cn(
                'mt-2 text-xs',
                termsError ? 'text-destructive' : agreed ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {agreed ? t('readyHint') : t('termsRequired')}
            </p>

            <ul className='text-muted-foreground mt-4 space-y-2 text-xs'>
              <li className='flex items-start gap-2'>
                <ShieldCheck className='text-primary mt-0.5 size-3.5 shrink-0' />
                <span>{t('noCardNote')}</span>
              </li>
              <li className='flex items-start gap-2'>
                <RotateCcw className='text-primary mt-0.5 size-3.5 shrink-0' />
                <span>{t('refund', { hours: REFUND_WINDOW_HOURS })}</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
