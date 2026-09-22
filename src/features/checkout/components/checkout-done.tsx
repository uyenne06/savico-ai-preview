'use client'

import { Check, CheckCircle2, FolderOpen, Receipt, ShieldCheck } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { StartOptions } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { contractorMatchesRoute, ROUTES, supervisionRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { formatCurrency } from '@/shared/utils'
import { routeForStatus, useOrder } from '../hooks/use-checkout'
import { CheckoutSteps } from './checkout-steps'

interface CheckoutDoneProps {
  orderId: string
}

function AnimatedCount({ value, animate, delayMs }: { value: number; animate: boolean; delayMs: number }) {
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(() => (animate && !reduceMotion ? 0 : value))

  useEffect(() => {
    if (!animate || reduceMotion) {
      const syncTimer = window.setTimeout(() => setDisplay(value), 0)
      return () => window.clearTimeout(syncTimer)
    }

    let frame = 0
    const duration = 950
    const timer = window.setTimeout(() => {
      const started = performance.now()
      const tick = (time: number) => {
        const progress = Math.min(1, (time - started) / duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(Math.round(value * eased))
        if (progress < 1) frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
    }
  }, [animate, delayMs, reduceMotion, value])

  return <>{display}</>
}

/**
 * Bước 4/4 — Hoàn tất (S08).
 *
 * Bản mô tả gọi phần ba lựa chọn là "popup", còn hình vẽ nó nằm ngay trong
 * trang. Ở đây dựng INLINE: sau khi thanh toán xong, ba lựa chọn chính là việc
 * tiếp theo của khách — bọc chúng trong một hộp thoại chỉ tạo thêm một lớp phải
 * đóng đi. Đúng khối đó được dùng lại ở dạng hộp thoại sau Bước 2 của luồng B
 * (S11), nơi nền sau lưng vẫn còn việc dở (R7).
 *
 * Đơn mua GÓI GIÁM SÁT không có ba lựa chọn ấy: mua xong thì việc tiếp theo là
 * mở bảng điều khiển của chính dự án đã gắn với đơn (R8).
 */
export function CheckoutDone({ orderId }: CheckoutDoneProps) {
  const t = useTranslations('checkout.done')
  const tPlans = useTranslations('plans.tiers')
  const tPlanTags = useTranslations('plans.tierTags')
  const tSupervisionTags = useTranslations('supervision.tierTags')
  const tSupervision = useTranslations('supervision.tierAlias')
  const tStart = useTranslations('contractors.start')
  const locale = useLocale() as Locale
  const router = useRouter()

  const { data: order, isPending } = useOrder(orderId)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`checkout.done.${orderId}`, {
    enabled: !isPending && order?.status === 'paid',
    replayOnMount: false,
    settleAfterMs: 4300
  })

  useEffect(() => {
    if (!order) return
    if (order.status !== 'paid') {
      router.replace(routeForStatus(order))
      return
    }
    sessionStorage.removeItem('savico.checkout.forward')
  }, [order, router])

  if (isPending || !order || order.status !== 'paid') {
    return (
      <div className='mx-auto w-[93.5%] max-w-[1480px] space-y-8 py-8'>
        <CheckoutSteps current='done' animateEntrance={false} />

        <div className='grid items-start gap-x-[3.81%] gap-y-6 lg:grid-cols-[25.4%_minmax(0,1fr)]'>
          <div className='space-y-6'>
            <div className='text-center'>
              <Skeleton className='mx-auto size-20 rounded-full' />
              <Skeleton className='mx-auto mt-[34px] h-8 w-[88%] max-w-64' />
              <Skeleton className='mx-auto mt-2 h-8 w-[76%] max-w-56' />
              <Skeleton className='mx-auto mt-3.5 h-3.5 w-[92%] max-w-72' />
              <Skeleton className='mx-auto mt-2 h-3.5 w-[68%] max-w-52' />
            </div>

            <section className='rounded-2xl border p-6'>
              <div className='flex items-center justify-between gap-3'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-5 w-24 rounded-full' />
              </div>
              <Skeleton className='mt-3 h-7 w-24' />
              <Skeleton className='mt-2 h-4 w-20' />

              <div className='mt-4 space-y-0 border-t'>
                {[0, 1, 2].map((item) => (
                  <div key={item} className='flex items-center gap-3 border-b py-5 last:border-b-0'>
                    <Skeleton className='h-7 w-10 shrink-0' />
                    <Skeleton className='h-4 flex-1' />
                  </div>
                ))}
              </div>

              <div className='mt-4 flex items-center justify-between gap-3'>
                <Skeleton className='h-3 w-28' />
                <Skeleton className='h-3 w-20' />
              </div>
            </section>

            <div className='flex gap-2'>
              <Skeleton className='h-13 flex-1 rounded-md' />
              <Skeleton className='h-13 flex-1 rounded-md' />
            </div>
            <Skeleton className='mx-auto h-3 w-[82%]' />
          </div>

          <div className='min-w-0'>
            <Skeleton className='mx-auto h-6 w-72 max-w-[80%]' />
            <Skeleton className='mx-auto mt-2 h-3.5 w-[62%] max-w-xl' />

            <div className='grid items-stretch gap-x-[2.5%] gap-y-6 pt-4 md:grid-cols-3'>
              {[0, 1, 2].map((item) => (
                <section key={item} className='flex min-h-[34rem] flex-col rounded-2xl border p-4 pt-5'>
                  <Skeleton className='mx-auto h-5 w-24 rounded-md' />
                  <Skeleton className='mx-auto mt-3 h-5 w-[72%]' />
                  <Skeleton className='mx-auto mt-2 h-3 w-[88%]' />

                  <Skeleton className='mt-3 aspect-[4/3] max-h-[40%] w-full grow rounded-xl' />

                  <div className='mt-4 space-y-4'>
                    {[0, 1, 2, 3].map((line) => (
                      <div key={line} className='flex items-start gap-2.5'>
                        <Skeleton className='mt-0.5 size-4 shrink-0 rounded-full' />
                        <Skeleton className='h-4 flex-1' />
                      </div>
                    ))}
                  </div>

                  {item === 1 ? <Skeleton className='mt-4 h-24 w-full rounded-xl' /> : null}
                  {item === 2 ? <Skeleton className='mt-4 h-9 w-full rounded-lg' /> : null}
                  <Skeleton className='mt-auto h-12 w-full rounded-md pt-5' />
                </section>
              ))}
            </div>
          </div>
        </div>

        <Skeleton className='mx-auto h-11 w-full max-w-5xl rounded-xl' />
      </div>
    )
  }

  const isSupervision = order.product.kind === 'supervision'
  const planName = isSupervision
    ? tSupervision(order.product.name as 'check' | 'control')
    : tPlans(order.product.name as 'basic' | 'advanced' | 'pro')
  // Nhãn nhóm gói in dưới tên gói trong thẻ "Gói của tôi" (Hình S08).
  const planTag = isSupervision
    ? tSupervisionTags(order.product.name as 'check' | 'control')
    : tPlanTags(order.product.name as 'basic' | 'advanced' | 'pro')

  // Bề ngang đo trên Hình S08 (ảnh gốc 800×533): phần nội dung chạy từ x=20 đến
  // x=767, tức 748/800 = 93.5% bề ngang trang. Vì vậy dùng `w-[93.5%]` chứ không
  // phải một `max-w` cố định — `max-w-6xl`/`88rem` khiến trang co vào giữa, và đó
  // chính là chỗ trông "khác ảnh" trên màn rộng.
  return (
    <div
      ref={rootRef}
      data-checkout-done-root
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-[93.5%] max-w-[1480px] space-y-8 py-8'
    >
      <CheckoutSteps current='done' animateEntrance={false} />

      {/* Hình S08, đo theo pixel: thẻ gói bên trái x=20…209 (190px), thẻ lựa
          chọn đầu tiên bắt đầu ở x=237.5, thẻ cuối kết thúc ở x=767. Quy ra tỉ
          lệ của 748px phần nội dung: cột trái 25.4%, khe 3.81%, cột phải
          70.79%. Để bằng phần trăm nên mọi khổ màn đều giữ đúng tỉ lệ ấy. */}
      <div className='grid items-start gap-x-[3.81%] gap-y-6 lg:grid-cols-[25.4%_minmax(0,1fr)]'>
        {/* Cột trái: xác nhận + thẻ gói vừa kích hoạt. */}
        {/* Hình S08 quy về khổ thật (nhân 1.979 từ ảnh 800px): các khối của cột
            trái cách nhau 22–28px, nên `space-y-6` chứ không phải `space-y-4`. */}
        <div className='space-y-6'>
          {/* Hình S08: cụm này CANH GIỮA và tiêu đề màu xanh thương hiệu.
              Số đo: vòng tròn tick Ø39px trên cột rộng 190px = 20.5% → 77px ở
              khổ thật (`size-20`); tiêu đề cao 15px/dòng → ~30px (`text-3xl`);
              cách từ vòng tròn xuống tiêu đề 17px → 34px, tiêu đề xuống câu dẫn
              7px → 14px. Vì hai khoảng khác nhau nên đặt margin từng cái thay
              cho `space-y` dùng chung. */}
          <div className='text-center'>
            <span
              data-checkout-done-success-icon
              className='bg-primary text-primary-foreground mx-auto flex size-20 items-center justify-center rounded-full'
            >
              <Check data-checkout-done-success-check className='size-11' strokeWidth={3} />
            </span>
            {/* Hình S08: tiêu đề xuống dòng thành hai câu. */}
            <div data-done-heading data-entrance-step='1'>
              <h1 className='text-primary-strong mt-[34px] text-3xl font-bold tracking-tight whitespace-pre-line text-pretty'>
                {isSupervision
                  ? t('supervisionActivated', { plan: planName })
                  : t('designActivated', { plan: planName })}
              </h1>
              {/* Hình S08: dòng dẫn cũng ngắt thành hai dòng. */}
              <p className='text-muted-foreground mt-3.5 text-sm whitespace-pre-line text-pretty'>
                {isSupervision ? t('assignNote') : t('subtitle')}
              </p>
            </div>
          </div>

          {/* Hình S08: thẻ gói 190×188px trên cột rộng 190 → gần VUÔNG (0.99), bản
              trước chỉ 0.81 vì hàng quyền lợi quá bó. Lề trong 13px → 26px
              (`p-6`), mỗi hàng quyền lợi cách nhau 30px → 59px (`py-5`). */}
          <section
            data-done-plan-card
            data-entrance-step='2'
            className='bg-primary text-primary-foreground rounded-2xl p-6'
          >
            <div className='flex items-center justify-between gap-2'>
              <p className='text-[11px] font-semibold tracking-wide uppercase opacity-80'>{t('planTitle')}</p>
              <span className='bg-primary-foreground/15 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium'>
                <ShieldCheck className='size-3' />
                {t('activated')}
              </span>
            </div>

            <p className='mt-2 text-2xl font-bold tracking-wide uppercase'>{planName}</p>
            {/* Hình S08: dưới tên gói có nhãn nhóm gói ("Chọn đúng"). */}
            {planTag ? <p className='text-sm opacity-80'>{planTag}</p> : null}

            <ul className='mt-4 border-t border-white/15 text-sm'>
              {order.product.benefits.map((benefit) => {
                // "10 phương án thiết kế mới" → số tách ra để in cỡ lớn như ảnh;
                // quyền lợi không mở đầu bằng số thì giữ nguyên một dòng chữ.
                const [, count, rest] = /^(\d+)\s+(.*)$/.exec(benefit) ?? []
                return (
                  <li key={benefit} className='flex items-center gap-3 border-b border-white/10 py-5 last:border-b-0'>
                    {count ? (
                      <>
                        <span className='w-10 shrink-0 text-2xl leading-none font-bold tabular-nums'>
                          <AnimatedCount value={Number(count)} animate={entranceState === 'play'} delayMs={2420} />
                        </span>
                        <span className='text-pretty'>{rest}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className='size-4 shrink-0 opacity-80' />
                        <span className='text-pretty'>{benefit}</span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* Hình S08: "Lượt không hết hạn" và mã đơn nằm CÙNG MỘT HÀNG. */}
            <div className='mt-4 flex items-center justify-between gap-3 text-xs'>
              <span className='opacity-80'>{isSupervision ? '' : t('noExpiry')}</span>
              <span className='font-mono opacity-70'>#{order.id}</span>
            </div>
          </section>

          {/* Hình S08: hai nút cao 27px trên ảnh = 53px ở khổ thật. */}
          <div data-done-secondary-actions data-entrance-step='3' className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              className='h-13 flex-1 transition-[background-color,transform] hover:bg-muted active:scale-[0.98] motion-reduce:transform-none'
              onClick={() => setReceiptOpen(true)}
            >
              <Receipt className='size-4' />
              {t('receipt')}
            </Button>
            {isSupervision && order.projectId ? (
              <Button
                asChild
                className='h-13 flex-1 transition-[background-color,transform] hover:bg-muted hover:text-foreground active:scale-[0.98] motion-reduce:transform-none'
              >
                <Link href={supervisionRoute(order.projectId)}>{t('dashboard')}</Link>
              </Button>
            ) : (
              <Button
                asChild
                variant='outline'
                className='h-13 flex-1 transition-[background-color,transform] hover:bg-muted active:scale-[0.98] motion-reduce:transform-none'
              >
                <Link href={ROUTES.ACCOUNT_PROJECTS}>
                  <FolderOpen className='size-4' />
                  {t('myProjects')}
                </Link>
              </Button>
            )}
          </div>

          {/* Hình S08: ngay dưới hai nút là dòng "Biên nhận đã gửi tới email và
              Zalo của bạn."; còn dòng bảo mật dữ liệu là DẢI riêng cuối trang. */}
          <p data-entrance-step='4' className='text-muted-foreground text-center text-xs text-pretty'>
            {t('receiptSent')}
          </p>
        </div>

        {/* Cột phải: ba lựa chọn "Bạn muốn bắt đầu như thế nào?" (R7). */}
        {isSupervision ? null : (
          <div className='min-w-0'>
            <div data-done-start-heading data-entrance-step='1'>
              <h2 className='text-center text-xl font-semibold tracking-tight'>{tStart('title')}</h2>
              {/* Hình S08: dưới tiêu đề có một dòng dẫn giải thích. */}
              <p className='text-muted-foreground mx-auto mt-1 max-w-2xl text-center text-sm text-pretty'>
                {tStart('subtitle')}
              </p>
            </div>
            <StartOptions
              findHref={order.projectId ? contractorMatchesRoute(order.projectId) : ROUTES.CONTRACTORS}
              hasPlan
              completionMode
              animateEntrance={entranceState === 'play'}
              onTurnkeySelect={() => toast.success(t('turnkeyContactConfirmation'))}
            />
          </div>
        )}
      </div>

      {/* Hình S08: dải nền nhạt chạy hết bề ngang ở cuối trang. */}
      <p
        data-done-security
        data-entrance-step='5'
        className='bg-accent/40 text-muted-foreground mx-auto flex max-w-5xl items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-xs text-pretty'
      >
        <ShieldCheck className='text-primary size-4 shrink-0' />
        {t('dataNote')}
      </p>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('receiptTitle')}</DialogTitle>
            <DialogDescription>{t('receiptDescription', { email: order.buyer.email })}</DialogDescription>
          </DialogHeader>
          <dl className='divide-border divide-y rounded-xl border'>
            <div className='flex items-center justify-between gap-4 px-4 py-3'>
              <dt className='text-muted-foreground text-sm'>{t('receiptOrderCode')}</dt>
              <dd className='font-mono text-sm font-semibold'>#{order.id}</dd>
            </div>
            <div className='flex items-center justify-between gap-4 px-4 py-3'>
              <dt className='text-muted-foreground text-sm'>{t('receiptPlan')}</dt>
              <dd className='text-sm font-semibold'>{planName}</dd>
            </div>
            <div className='flex items-center justify-between gap-4 px-4 py-3'>
              <dt className='text-muted-foreground text-sm'>{t('receiptAmount')}</dt>
              <dd className='text-sm font-semibold'>{formatCurrency(order.total, locale)}</dd>
            </div>
            <div className='flex items-center justify-between gap-4 px-4 py-3'>
              <dt className='text-muted-foreground text-sm'>{t('receiptStatus')}</dt>
              <dd className='text-primary-strong text-sm font-semibold'>{t('receiptPaid')}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  )
}
