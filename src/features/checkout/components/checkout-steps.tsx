'use client'

import { AlertTriangle, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'
import { CHECKOUT_STEPS, type CheckoutStep } from '../constants/checkout.constants'

interface CheckoutStepsProps {
  current: CheckoutStep
  /** Đơn đang lỗi — nấc hiện tại chuyển sang cảnh báo thay vì tích xanh. */
  error?: boolean
  /** Các nấc đã hoàn thành mới được phép quay lại; nấc hiện tại/tương lai không bấm được. */
  onCompletedStep?: (step: CheckoutStep) => void
  /** Giới hạn các nấc completed thật sự được bấm; mặc định là tất cả nấc đã xong. */
  clickableCompletedSteps?: readonly CheckoutStep[]
  /** Cho phép bấm chính nấc hiện tại — dùng ở màn đang đối soát để quay lại QR. */
  onCurrentStep?: (step: CheckoutStep) => void
  /** Tắt entrance của stepper khi trạng thái phải giữ nguyên giữa hai màn cùng bước. */
  animateEntrance?: boolean
}

/**
 * Stepper 4 bước của luồng mua gói: Chọn gói → Xác nhận đơn hàng → Thanh toán →
 * Hoàn tất (S03, S04, S06, S07, S08).
 *
 * Bố cục theo Hình S03/S04: vòng tròn nằm TRÊN, nhãn nằm DƯỚI và canh giữa theo
 * vòng tròn, đường nối chạy ngang qua tâm hai vòng liền nhau; không bọc trong
 * thẻ viền. Bản dựng trước đây xếp nhãn nằm cạnh vòng tròn trong một khung
 * `rounded-2xl border` nên nhìn khác hẳn ảnh.
 *
 * Ba trạng thái nấc, không phải hai: đã xong (tích), đang làm (số, tô đậm), chưa
 * tới (mờ) — cộng một trạng thái lỗi. Bản demo tô xanh cả bốn nấc ngay ở màn
 * "đang chờ xác nhận" và cả ở màn thất bại, tức là báo cho khách rằng họ đã mua
 * xong trong khi tiền chưa về. Nhãn trạng thái vẫn còn nhưng để `sr-only`: ảnh
 * không vẽ nó, mà trình đọc màn hình thì cần.
 */
export function CheckoutSteps({
  current,
  error = false,
  onCompletedStep,
  clickableCompletedSteps,
  onCurrentStep,
  animateEntrance = true
}: CheckoutStepsProps) {
  const t = useTranslations('checkout.steps')
  const tState = useTranslations('checkout.stepState')
  const currentIndex = CHECKOUT_STEPS.indexOf(current)

  return (
    <ol
      data-checkout-stepper
      data-checkout-current={current}
      data-entrance-step={animateEntrance ? '0' : undefined}
      className='mx-auto flex w-full max-w-3xl items-start'
    >
      {CHECKOUT_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        // Hình S08: nấc CUỐI khi đang đứng ở đó cũng hiện dấu tích (luồng đã xong),
        // không hiện số 4.
        const showCheck = done || (active && index === CHECKOUT_STEPS.length - 1 && !error)
        const state = error && active ? 'error' : done ? 'done' : active ? 'current' : 'pending'
        const clickable =
          done && Boolean(onCompletedStep) && (!clickableCompletedSteps || clickableCompletedSteps.includes(step))
        const currentClickable = active && Boolean(onCurrentStep)

        return (
          <li key={step} className='relative flex min-w-0 flex-1 flex-col items-center gap-2'>
            {/* Đường nối KHÔNG chạm vào vòng tròn: dừng cách mép mỗi vòng tròn
                một khoảng (tâm nấc ± bán kính 1.125rem + 1rem hở). */}
            {index > 0 ? (
              <span
                aria-hidden
                data-checkout-connector
                data-fill={done ? 'full' : active ? 'animate' : 'empty'}
                className='bg-border absolute top-[calc(1.125rem-1px)] left-[calc(-50%+2.125rem)] right-[calc(50%+2.125rem)] h-0.5 overflow-hidden rounded-full'
              >
                <span className='bg-primary block size-full origin-left' />
              </span>
            ) : null}

            {clickable && onCompletedStep ? (
              <button
                type='button'
                data-checkout-step-node
                data-step={step}
                data-state={state}
                aria-label={`${t(step)} — ${tState('done')}`}
                onClick={() => onCompletedStep(step)}
                className={cn(
                  'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                  'bg-primary text-primary-foreground hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                )}
              >
                <Check className='size-4' strokeWidth={3} />
              </button>
            ) : currentClickable && onCurrentStep ? (
              <button
                type='button'
                data-checkout-step-node
                data-step={step}
                data-state={state}
                aria-current='step'
                aria-label={t(step)}
                onClick={() => onCurrentStep(step)}
                className={cn(
                  'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                  'bg-primary text-primary-foreground hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                )}
              >
                {index + 1}
              </button>
            ) : (
              <span
                data-checkout-step-node
                data-step={step}
                data-state={state}
                className={cn(
                  'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  state === 'done' && 'bg-primary text-primary-foreground',
                  state === 'current' && 'bg-primary text-primary-foreground',
                  state === 'error' && 'bg-destructive text-destructive-foreground',
                  state === 'pending' && 'bg-muted text-muted-foreground border'
                )}
              >
                {showCheck ? (
                  <Check className='size-4' strokeWidth={3} />
                ) : state === 'error' ? (
                  <AlertTriangle className='size-4' />
                ) : (
                  index + 1
                )}
              </span>
            )}

            <span className='min-w-0 text-center'>
              <span
                className={cn(
                  'block truncate text-sm',
                  state === 'pending' ? 'text-muted-foreground' : 'text-foreground font-semibold',
                  state === 'current' && 'text-primary-strong'
                )}
              >
                {t(step)}
              </span>
              <span className='sr-only'>{tState(state)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
