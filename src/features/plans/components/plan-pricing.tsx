'use client'

import {
  ArrowRight,
  Leaf,
  Gift,
  Star,
  LoaderCircle,
  CheckCircle2,
  Building2,
  CalendarClock,
  Check,
  Clock,
  FileText,
  HardHat,
  Info,
  Minus,
  MousePointerClick,
  QrCode,
  ShieldCheck,
  Wallet,
  type LucideIcon
} from 'lucide-react'
import { animate, AnimatePresence, motion, useInView, useMotionValue } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatPriceTag } from '@/shared/utils'
import { giftValueInMillions } from '../services/plan-gift.service'
import { PlanGiftDialog } from './plan-gift-dialog'
import type { PlanTier, SubscriptionPlan } from '@/shared/cms'
import { Photo, PricingMotionProvider, pricingEase, usePricingMotion } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { checkoutConfirmRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { rememberCheckoutReturn } from '@/shared/lib/checkout-return'
import { PLAN_COMPARISON, PLAN_VALUE_ROWS, type PlanCell, type PlanValueKey } from '../constants/plan-comparison'
import { usePlans } from '../hooks/use-plans'

const TIERS: readonly PlanTier[] = ['basic', 'advanced', 'pro'] as const

/**
 * Cả ba giá bắt đầu cùng một nhịp nhưng kết thúc lệch nhau BASIC → PLUS → PRO.
 * Duration dùng ở cả counter và mốc hiện dòng "Thanh toán 1 lần" để hai phần
 * không thể lệch choreography.
 */
const PRICE_COUNT_DURATION_MS: Record<PlanTier, number> = {
  basic: 1080,
  advanced: 1320,
  pro: 1560
}
const PRICE_SETTLE_PULSE_MS = 240

/** Gói được tô cam xuyên suốt trang (Hình S01) — cột PLUS của bảng so sánh. */
const POPULAR_TIER: PlanTier = 'advanced'

/** Icon đứng trước mỗi hàng của bảng "Giá trị khách hàng nhận được" (Hình S01). */
const VALUE_ROW_ICON: Record<(typeof PLAN_VALUE_ROWS)[number], LucideIcon> = {
  easy: MousePointerClick,
  time: Clock,
  budget: Wallet,
  ready: HardHat
}

/**
 * S01 — Bảng giá gói thiết kế (trang công khai).
 *
 * Ba thẻ gói → dải CTA → bảng "So sánh chi tiết 3 gói" → bảng "Giá trị khách
 * hàng nhận được" → ba ghi chú cuối trang, đúng thứ tự bản mô tả.
 *
 * Hai điểm bám quy tắc thay vì bám ảnh demo:
 * - R10: ghi chú cuối trang chỉ nói QR chuyển khoản, không còn "hoặc cổng thanh
 *   toán".
 * - Bấm chọn gói đi thẳng vào checkout (S03) chứ không phải một toast "sắp có" —
 *   luồng mua gói đã có thật từ bản v1.1.
 */
export function PlanPricing() {
  return (
    <PricingMotionProvider>
      <PlanPricingContent />
    </PricingMotionProvider>
  )
}

function PlanPricingContent() {
  const t = useTranslations('plans')
  const { data: plans, isPending } = usePlans()
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('plans.design', { offsetMs: 120 })

  const { reduceMotion } = usePricingMotion()

  // Ảnh S01: cụm thẻ + bảng so sánh chiếm ~88% bề ngang màn hình, và CỠ CHỮ
  // trong thẻ phải lớn theo bề rộng thẻ (tên gói ~8,3% bề rộng thẻ, giá ~10%)
  // — giữ chữ nhỏ như hệ thống mặc định là trang trông loãng, khác hẳn ảnh.
  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-full max-w-[80rem] space-y-8 px-4 py-10 lg:px-8'
    >
      {/* Hình S01: tiêu đề IN HOA cỡ lớn, chữ cuối (tên thương hiệu) tô cam,
          hai bên có hai chiếc lá. Tách chữ cuối ngay tại đây để admin đổi tiêu
          đề trong CMS thì phần tô màu vẫn tự bám chữ cuối. */}
      <PlanHeading />

      {isPending ? (
        <div className='grid gap-5 md:grid-cols-3'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-[32rem] rounded-2xl' />
          ))}
        </div>
      ) : (
        <PlanCards plans={plans ?? []} />
      )}

      {/* Dải CTA giữa trang — trong ảnh nó nằm SÁT ngay dưới cụm thẻ (khoảng
          cách chỉ bằng ~1/3 khoảng cách giữa các khối khác). */}
      <motion.section
        onViewportEnter={(entry) => {
          if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
        }}
        className='plan-cta-band relative bg-accent/40 -mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-5'
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.6, delay: reduceMotion ? 0 : 0.55, ease: pricingEase }}
      >
        <div className='flex items-center gap-4'>
          {/* Hình S01: dải CTA mở đầu bằng một icon hồ sơ trong ô bo góc. */}
          <span className='bg-card text-primary flex size-11 shrink-0 items-center justify-center rounded-xl border'>
            <FileText aria-hidden className='plan-document size-5' />
          </span>
          <div>
            <p className='font-semibold text-pretty'>{t('ctaBand.title')}</p>
            <p className='text-muted-foreground text-sm text-pretty'>{t('ctaBand.subtitle')}</p>
          </div>
        </div>
        <Button asChild size='lg' className='brand-green-button plan-cta-action'>
          <Link href={checkoutConfirmRoute('advanced')} onClick={() => rememberCheckoutReturn('advanced')}>
            {t('ctaBand.action')}
            <ArrowRight className='plan-cta-arrow size-4' />
          </Link>
        </Button>
      </motion.section>

      {plans ? <ComparisonTable plans={plans} /> : null}
      {plans ? <ValueTable /> : null}

      {/* Hình S01: bốn ghi chú nằm trong khối nền nhạt, còn dòng phạm vi hồ sơ
          đứng riêng bên dưới khối và căn giữa.

          Mỗi ghi chú có ICON RIÊNG trong một vòng tròn nền xanh nhạt, đường kính
          gấp đôi cỡ chữ (đo trên ảnh ~28px so với chữ ~13px) — không phải cùng
          một dấu ⓘ nhỏ cho cả bốn dòng. */}
      <motion.div
        className='plan-notes space-y-3'
        onViewportEnter={(entry) => {
          if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
        }}
        viewport={{ once: true, amount: 0.18 }}
      >
        <ul className='bg-accent/30 text-muted-foreground grid gap-x-8 gap-y-4 rounded-2xl border p-5 text-xs sm:grid-cols-2 lg:grid-cols-3'>
          {(
            [
              { key: 'payment', icon: QrCode },
              { key: 'credits', icon: CalendarClock },
              { key: 'estimate', icon: ShieldCheck },
              { key: 'gift', icon: Building2 }
            ] as const
          ).map((note, index) => (
            <li
              key={note.key}
              className='plan-note-chip flex items-start gap-3'
              style={{ '--note-delay': `${1.6 + index * 0.24}s` } as CSSProperties}
            >
              <span className='plan-note-icon-wrap bg-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full'>
                <note.icon aria-hidden className='plan-note-icon size-4' />
              </span>
              <span className='pt-1 text-pretty'>{t(`notes.${note.key}`)}</span>
            </li>
          ))}
        </ul>
        <p className='plan-notes-disclaimer text-muted-foreground flex items-start justify-center gap-2 text-center text-xs text-pretty'>
          <Info className='mt-0.5 size-3.5 shrink-0' />
          <span>{t('notes.scope')}</span>
        </p>
      </motion.div>
    </div>
  )
}

/**
 * Bảng "So sánh chi tiết 3 gói".
 *
 * Cột "Hạng mục" `sticky left-0` và bảng nằm trong khung cuộn ngang: ba cột gói
 * không co nhỏ hơn được nữa thì người đọc vẫn biết mình đang ở dòng nào — bản mô
 * tả không nói gì về màn hình hẹp, mà đây là bảng dài nhất của trang.
 */
function ComparisonTable({ plans }: { plans: SubscriptionPlan[] }) {
  const t = useTranslations('plans')
  const locale = useLocale() as Locale
  const tRows = useTranslations('plans.comparison.rows')
  const tValues = useTranslations('plans.comparison.values')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<PlanTier | null>(null)
  const [headerStuck, setHeaderStuck] = useState(false)
  const [headerBounds, setHeaderBounds] = useState({ left: 0, width: 0 })
  const tableRef = useRef<HTMLDivElement>(null)
  const { reduceMotion } = usePricingMotion()

  const byTier = (tier: PlanTier) => plans.find((plan) => plan.tier === tier)

  useEffect(() => {
    const update = () => {
      const rect = tableRef.current?.getBoundingClientRect()
      setHeaderStuck(Boolean(rect && rect.top <= 66 && rect.bottom > 118))
      if (rect)
        setHeaderBounds((current) =>
          current.left === rect.left && current.width === rect.width ? current : { left: rect.left, width: rect.width }
        )
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section className='plan-comparison'>
      {/* Hình S01: riêng tiêu đề bảng so sánh viết thường (chỉ "GIÁ TRỊ KHÁCH
          HÀNG NHẬN ĐƯỢC" phía dưới mới IN HOA). */}
      <motion.h2
        className='plan-comparison-title text-primary-strong text-center text-xl font-bold tracking-wide'
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 0.5, ease: pricingEase }}
      >
        {t('comparison.title')}
      </motion.h2>

      <AnimatePresence>
        {headerStuck ? (
          <motion.div
            className='plan-comparison-floating-head bg-card fixed top-16 z-40 hidden grid-cols-[28%_24%_24%_24%] overflow-hidden rounded-b-xl border shadow-md md:grid'
            style={{ left: headerBounds.left, width: headerBounds.width }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.26, ease: pricingEase }}
          >
            <span className='px-3 py-2 text-center text-xs font-semibold tracking-wide uppercase'>
              {t('comparison.criterion')}
            </span>
            {TIERS.map((tier) => (
              <span
                key={tier}
                className={cn(
                  'border-l px-3 py-2 text-center text-xs font-bold uppercase',
                  tier === POPULAR_TIER && 'bg-brand-orange-soft text-brand-orange'
                )}
              >
                {t(`tiers.${tier}`)}
                <small className='text-muted-foreground mt-0.5 block text-[10px] font-medium normal-case'>
                  {byTier(tier) ? formatPriceTag(byTier(tier)!.price, locale) : ''}
                </small>
              </span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        ref={tableRef}
        data-stuck={headerStuck || undefined}
        className='plan-comparison-shell bg-card relative mt-5 rounded-2xl border shadow-[inset_-18px_0_20px_-24px_var(--foreground)]'
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.04 }}
        transition={{ duration: 0.5, delay: 0.22, ease: pricingEase }}
      >
        <table
          data-hovering={hoveredRow || hoveredColumn ? 'true' : undefined}
          className='plan-comparison-table w-full min-w-[720px] table-fixed border-collapse text-sm'
          onMouseLeave={() => {
            setHoveredRow(null)
            setHoveredColumn(null)
          }}
        >
          <colgroup>
            <col className='w-[28%]' />
            <col className='w-[24%]' />
            <col className='w-[24%]' />
            <col className='w-[24%]' />
          </colgroup>
          <thead className='plan-comparison-head bg-card z-20'>
            {/* Đo trên ảnh S01: bảng CÓ kẻ dọc giữa các cột (xám rất nhạt) nhưng
                KHÔNG kẻ ngang giữa các dòng và KHÔNG sọc xen kẽ. */}
            <tr className='divide-border divide-x'>
              {/* Hình S01: ô đầu bảng ghi "HẠNG MỤC" IN HOA và CĂN GIỮA ô (đo trên
                  ảnh: tâm chữ trùng tâm cột đầu), khác với các dòng bên dưới căn trái. */}
              <th className='bg-card sticky left-0 z-10 border-b px-3 py-2.5 text-center text-xs font-semibold tracking-wide uppercase'>
                {t('comparison.criterion')}
              </th>
              {TIERS.map((tier) => (
                <th
                  key={tier}
                  onMouseEnter={() => setHoveredColumn(tier)}
                  className={cn(
                    'plan-comparison-cell border-b px-3 py-2.5 text-center',
                    tier === POPULAR_TIER && 'plan-plus-column bg-brand-orange-soft',
                    hoveredColumn === tier && 'is-column-hovered'
                  )}
                >
                  <span
                    className={cn(
                      'block font-bold tracking-wide uppercase',
                      tier === POPULAR_TIER ? 'text-brand-orange' : 'text-primary-strong'
                    )}
                  >
                    {t(`tiers.${tier}`)}
                  </span>
                  <span className='plan-sticky-price text-muted-foreground mt-0.5 text-[10px] font-medium'>
                    {byTier(tier) ? formatPriceTag(byTier(tier)!.price, locale) : ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className='divide-border divide-y'>
            {/* Nhóm "Quyền lợi chính" đọc thẳng số từ bản ghi gói. */}
            <GroupRow label={t('comparison.groups.core')} />
            <CoreRow
              index={0}
              label={t('comparison.core.designOptions')}
              values={TIERS.map((tier) => t('comparison.core.optionUnit', { count: byTier(tier)?.designCredits ?? 0 }))}
            />
            <CoreRow
              index={1}
              label={t('comparison.core.editCredits')}
              values={TIERS.map((tier) => t('comparison.core.editUnit', { count: byTier(tier)?.designCredits ?? 0 }))}
            />
            <CoreRow
              index={2}
              label={t('comparison.core.libraryCredits')}
              values={TIERS.map((tier) =>
                t('comparison.core.libraryUnit', { count: byTier(tier)?.libraryCredits ?? 0 })
              )}
            />

            {PLAN_COMPARISON.map((group) => (
              <Fragment key={group.key}>
                <GroupRow label={t(`comparison.groups.${group.key}`)} highlight={group.highlight} />
                {group.rows.map((row, rowIndex) => (
                  <motion.tr
                    key={row.key}
                    data-hovered={hoveredRow === row.key || undefined}
                    className='plan-comparison-row divide-border divide-x'
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.18 }}
                    transition={{
                      duration: reduceMotion ? 0.01 : 0.52,
                      delay: reduceMotion ? 0 : (group.highlight ? 0.58 : 0.28) + rowIndex * 0.075,
                      ease: pricingEase
                    }}
                    onMouseEnter={() => setHoveredRow(row.key)}
                  >
                    <th
                      className={cn(
                        'bg-card sticky left-0 z-10 px-3 py-2 text-left text-xs font-medium transition-colors',
                        hoveredRow === row.key && 'bg-accent/80 font-semibold'
                      )}
                    >
                      {tRows(row.key)}
                    </th>
                    {TIERS.map((tier) => (
                      <td
                        key={tier}
                        onMouseEnter={() => setHoveredColumn(tier)}
                        className={cn(
                          'px-3 py-2 text-center text-xs transition-colors',
                          'plan-comparison-cell',
                          tier === POPULAR_TIER && 'plan-plus-column bg-brand-orange-soft/60',
                          hoveredColumn === tier && 'is-column-hovered',
                          hoveredRow === row.key && hoveredColumn === tier && 'is-intersection font-semibold',
                          row.key === 'gift' && tier === 'pro' && 'plan-pro-gift-cell'
                        )}
                      >
                        <Cell value={row.values[tier]} label={tValues} index={TIERS.indexOf(tier)} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </Fragment>
            ))}

            <tr className='plan-choose-row'>
              <th className='bg-card sticky left-0 z-10 border-t border-r p-3 text-left text-xs font-medium'>
                {t('comparison.choosePlanRow')}
              </th>
              {TIERS.map((tier) => {
                const plan = byTier(tier)
                return (
                  <motion.td
                    key={tier}
                    className={cn(
                      'plan-choose-cell border-t p-3 text-center',
                      tier === POPULAR_TIER && 'plan-plus-column bg-brand-orange-soft/60'
                    )}
                    initial={{ opacity: 0, y: 9 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.65 }}
                    transition={{
                      duration: 0.52,
                      delay: (entranceOrder[TIERS.indexOf(tier)] ?? 0) * 0.16,
                      ease: pricingEase
                    }}
                  >
                    {plan ? (
                      <Button
                        asChild
                        size='sm'
                        variant={plan.popular ? 'default' : 'outline'}
                        className={cn(
                          'plan-table-buy text-xs font-bold tracking-wide uppercase',
                          plan.popular && 'plan-table-buy-popular'
                        )}
                      >
                        <Link href={checkoutConfirmRoute(plan.id)} onClick={() => rememberCheckoutReturn(plan.id)}>
                          {t(`cta.${tier}`)}
                        </Link>
                      </Button>
                    ) : null}
                  </motion.td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}

/** Bảng "Giá trị khách hàng nhận được" (S01). */
function ValueTable() {
  const t = useTranslations('plans.value')
  const { reduceMotion } = usePricingMotion()

  return (
    <section>
      <motion.h2
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.55, ease: pricingEase }}
        className='text-primary-strong text-center text-xl font-bold tracking-wide uppercase'
      >
        {t('title')}
      </motion.h2>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.52, delay: reduceMotion ? 0 : 0.2, ease: pricingEase }}
        className='bg-card mt-5 overflow-x-auto rounded-2xl border'
      >
        <table className='w-full min-w-[640px] table-fixed border-collapse text-sm'>
          <colgroup>
            <col className='w-[28%]' />
            <col className='w-[24%]' />
            <col className='w-[24%]' />
            <col className='w-[24%]' />
          </colgroup>
          {/* Hình S01: bảng này CÓ đường kẻ ô rõ — kẻ dọc giữa bốn cột và kẻ
              ngang giữa bốn hàng — khác bảng so sánh phía trên (chỉ có dải nhóm,
              không kẻ ô). Cột đầu nền xanh nhạt, chữ trong ô căn giữa hai dòng. */}
          <tbody className='divide-border divide-y'>
            {PLAN_VALUE_ROWS.map((row, index) => (
              <motion.tr
                key={row}
                className='plan-value-row divide-border hover:bg-accent/45 group divide-x transition-colors duration-300'
                initial={reduceMotion ? false : { opacity: 0, y: 11 }}
                whileInView={{ opacity: 1, y: 0 }}
                onViewportEnter={(entry) => {
                  if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
                }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  duration: reduceMotion ? 0.01 : 0.56,
                  delay: reduceMotion ? 0 : 0.32 + index * 0.14,
                  ease: pricingEase
                }}
                style={{ '--value-row-delay': `${0.32 + index * 0.14}s` } as CSSProperties}
              >
                <th className='bg-accent/40 sticky left-0 z-10 p-3.5 text-left text-sm font-medium'>
                  <span className='text-primary-strong flex items-center gap-2.5'>
                    {(() => {
                      const Icon = VALUE_ROW_ICON[row]
                      return <Icon className='plan-value-icon text-primary size-4.5 shrink-0' />
                    })()}
                    <span className='plan-value-label'>{t(`rows.${row}`)}</span>
                  </span>
                </th>
                {TIERS.map((tier, cellIndex) => (
                  <td
                    key={tier}
                    className='plan-value-cell p-3.5 text-center text-xs text-pretty'
                    style={{ '--value-cell-index': cellIndex } as CSSProperties}
                  >
                    {t(`cells.${row}.${tier}`)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}

function GroupRow({ label, highlight = false }: { label: string; highlight?: boolean }) {
  const { reduceMotion } = usePricingMotion()
  return (
    <motion.tr
      initial={reduceMotion ? false : { opacity: 0, scaleX: 0.15 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{
        duration: reduceMotion ? 0.01 : highlight ? 0.68 : 0.58,
        delay: reduceMotion ? 0 : 0.18,
        ease: pricingEase
      }}
      style={{ transformOrigin: 'left center' }}
      className={cn('plan-comparison-group', highlight && 'plan-pro-group')}
    >
      <th
        colSpan={TIERS.length + 1}
        className={cn(
          // Hình S01: dải nhóm là một vạch MỎNG, chữ nhỏ; xanh đậm chứ không
          // phải xanh chính của nút.
          'px-3 py-1.5 text-left text-[11px] font-semibold tracking-wide uppercase',
          highlight ? 'bg-brand-orange text-brand-orange-foreground' : 'bg-primary-strong text-primary-foreground'
        )}
      >
        {label}
      </th>
    </motion.tr>
  )
}

function CoreRow({ label, values, index }: { label: string; values: string[]; index: number }) {
  const { reduceMotion } = usePricingMotion()
  return (
    <motion.tr
      className='plan-comparison-row divide-border divide-x'
      initial={reduceMotion ? false : { opacity: 0, y: 7 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.52, delay: 0.28 + index * 0.075, ease: pricingEase }}
    >
      <th className='bg-card sticky left-0 z-10 px-3 py-2 text-left text-xs font-medium'>{label}</th>
      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className={cn(
            'plan-comparison-cell px-3 py-2 text-center text-xs',
            TIERS[index] === POPULAR_TIER && 'plan-plus-column bg-brand-orange-soft/60'
          )}
        >
          {value}
        </td>
      ))}
    </motion.tr>
  )
}

/** Ô của bảng so sánh: tích, gạch ngang, hoặc chữ từ khóa dịch. */
function Cell({ value, label, index }: { value: PlanCell; label: (key: PlanValueKey) => string; index: number }) {
  if (value === true)
    return (
      <span className='plan-table-tick inline-flex' style={{ '--tick-delay': `${index * 0.07}s` } as CSSProperties}>
        <Check className='text-primary mx-auto size-4' strokeWidth={2.5} />
      </span>
    )
  if (value === false) return <Minus className='text-muted-foreground mx-auto size-4' />
  return <span className='text-pretty'>{label(value)}</span>
}

const entranceOrder = [0, 2, 1]

function PlanHeading() {
  const t = useTranslations('plans')
  const ref = useRef<HTMLElement>(null)
  const visible = useInView(ref)
  const { reduceMotion, isScrolling } = usePricingMotion()
  const title = t('title')
  const split = title.lastIndexOf(' ')
  return (
    <header
      ref={ref}
      data-entrance-step='0'
      data-entrance-from='soft-scale'
      className='plan-heading space-y-2 text-center'
      data-paused={!visible || isScrolling || reduceMotion}
    >
      <h1 className='text-primary-strong flex items-center justify-center gap-3 text-3xl font-bold tracking-tight uppercase sm:text-4xl'>
        <span className='plan-leaf-enter'>
          <Leaf aria-hidden className='plan-leaf size-7 -scale-x-100 sm:size-8' />
        </span>
        <span className='plan-title'>
          {title.slice(0, split)} <span className='plan-title-accent text-brand-orange'>{title.slice(split + 1)}</span>
        </span>
        <span className='plan-leaf-enter'>
          <Leaf aria-hidden className='plan-leaf size-7 sm:size-8' />
        </span>
      </h1>
      <p className='plan-subtitle text-muted-foreground text-pretty'>{t('subtitle')}</p>
    </header>
  )
}

function PlanCards({ plans }: { plans: SubscriptionPlan[] }) {
  const t = useTranslations('plans')
  const track = useRef<HTMLUListElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [readyImages, setReadyImages] = useState(false)
  const [pricesStarted, setPricesStarted] = useState(false)
  const [pricesDone, setPricesDone] = useState(false)
  const [pricesInstant, setPricesInstant] = useState(false)
  const [gift, setGift] = useState<SubscriptionPlan | null>(null)
  const [giftOpen, setGiftOpen] = useState(false)
  const giftOrigin = useRef<HTMLButtonElement | null>(null)
  const progress = useMotionValue(1)
  const dotOffset = useDotOffset(progress)
  const { reduceMotion } = usePricingMotion()

  useEffect(() => {
    const root = track.current
    if (!root) return
    let cancelled = false
    const imageEvents = new AbortController()
    const frames: number[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    const media = matchMedia('(max-width: 767px)')
    const center = () => {
      if (!media.matches) return
      const card = root.children[1] as HTMLElement
      if (card) root.scrollLeft = card.offsetLeft - (root.clientWidth - card.clientWidth) / 2
    }
    frames.push(requestAnimationFrame(center))
    let touched = false
    const touch = () => {
      touched = true
    }
    root.addEventListener('pointerdown', touch, { passive: true })
    timers.push(
      setTimeout(() => {
        if (!media.matches || reduceMotion || touched) return
        root.style.scrollSnapType = 'none'
        root.scrollTo({ left: root.scrollLeft + 26, behavior: 'smooth' })
        timers.push(
          setTimeout(() => {
            if (!touched) {
              const card = root.children[1] as HTMLElement
              root.scrollTo({ left: card.offsetLeft - (root.clientWidth - card.clientWidth) / 2, behavior: 'smooth' })
            }
            timers.push(
              setTimeout(() => {
                root.style.scrollSnapType = ''
              }, 400)
            )
          }, 450)
        )
      }, 1300)
    )
    media.addEventListener('change', center)
    const scroll = () => {
      if (!media.matches) return
      const children = [...root.children] as HTMLElement[]
      const middle = root.scrollLeft + root.clientWidth / 2
      children.forEach((child) => {
        const distance = Math.min(1, Math.abs(child.offsetLeft + child.clientWidth / 2 - middle) / child.clientWidth)
        child.style.setProperty('--distance', String(distance))
      })
      const first = children[0],
        second = children[1]
      if (first && second)
        progress.set(
          Math.max(
            0,
            Math.min(2, (middle - first.offsetLeft - first.clientWidth / 2) / (second.offsetLeft - first.offsetLeft))
          )
        )
    }
    root.addEventListener('scroll', scroll, { passive: true })
    frames.push(requestAnimationFrame(scroll))
    const images = [...root.querySelectorAll<HTMLImageElement>('[data-plan-image] img')]
    const loaded = images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true, signal: imageEvents.signal })
            img.addEventListener('error', () => resolve(), { once: true, signal: imageEvents.signal })
          })
    )
    const prices = [...root.querySelectorAll<HTMLElement>('[data-price]')]
    let started = false
    const startPrices = () => {
      if (started || cancelled) return
      started = true
      setPricesStarted(true)
      timers.push(
        setTimeout(
          () => {
            if (!cancelled) setPricesDone(true)
          },
          reduceMotion ? 0 : PRICE_COUNT_DURATION_MS.pro + PRICE_SETTLE_PULSE_MS
        )
      )
    }
    void Promise.all(loaded).then(() => {
      if (cancelled) return
      setReadyImages(true)
    })
    if (
      prices.some((el) => {
        const rect = el.getBoundingClientRect()
        return rect.top < innerHeight && rect.bottom > 0
      })
    )
      startPrices()
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) startPrices()
      },
      { threshold: 0.6 }
    )
    prices.forEach((el) => observer.observe(el))
    let lastY = scrollY,
      lastTime = performance.now()
    const skipFast = () => {
      const now = performance.now()
      const distance = Math.abs(scrollY - lastY)
      const fast = distance > innerHeight * 0.75 || distance / Math.max(1, now - lastTime) > 2.5
      lastY = scrollY
      lastTime = now
      if (fast && root.getBoundingClientRect().top < 0) {
        started = true
        root.dataset.fast = 'true'
        setPricesInstant(true)
        setPricesStarted(true)
        setPricesDone(true)
      }
    }
    window.addEventListener('scroll', skipFast, { passive: true })
    return () => {
      cancelled = true
      imageEvents.abort()
      window.removeEventListener('scroll', skipFast)
      frames.forEach(cancelAnimationFrame)
      timers.forEach(clearTimeout)
      root.removeEventListener('scroll', scroll)
      root.removeEventListener('pointerdown', touch)
      media.removeEventListener('change', center)
      observer.disconnect()
    }
  }, [plans, progress, reduceMotion])

  return (
    <>
      <ul
        ref={track}
        data-entrance-step='4'
        data-entrance-from='soft-scale'
        className='plan-track'
        aria-label={t('title')}
        onMouseLeave={() => setHovered(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null)
        }}
      >
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            imagesReady={readyImages}
            pricesStarted={pricesStarted}
            pricesDone={pricesDone}
            pricesInstant={pricesInstant}
            dimmed={(selected ?? hovered) !== null && (selected ?? hovered) !== plan.id}
            onHover={() => setHovered(plan.id)}
            selected={selected}
            onSelect={setSelected}
            onGift={(button) => {
              giftOrigin.current = button
              setGift(plan)
              setGiftOpen(true)
            }}
          />
        ))}
      </ul>
      <div className='plan-dots mx-auto flex w-fit gap-3 md:hidden' aria-label={t('title')}>
        {plans.map((plan, index) => (
          <button
            key={plan.id}
            type='button'
            aria-label={t(`tiers.${plan.tier}`)}
            className='relative size-5 rounded-full bg-primary/15'
            onClick={() => {
              const root = track.current,
                card = root?.children[index] as HTMLElement | undefined
              if (root && card)
                root.scrollTo({
                  left: card.offsetLeft - (root.clientWidth - card.clientWidth) / 2,
                  behavior: reduceMotion ? 'instant' : 'smooth'
                })
            }}
          />
        ))}
        <motion.span
          aria-hidden
          className='pointer-events-none absolute size-5 rounded-full bg-primary'
          style={{ x: dotOffset }}
        />
      </div>
      <PlanGiftDialog plan={gift} open={giftOpen} origin={giftOrigin} onClose={() => setGiftOpen(false)} />
    </>
  )
}

function useDotOffset(progress: ReturnType<typeof useMotionValue<number>>) {
  const x = useMotionValue(32)
  useEffect(() => progress.on('change', (value) => x.set(value * 32)), [progress, x])
  return x
}

function PlanCard({
  plan,
  index,
  imagesReady,
  pricesStarted,
  pricesDone,
  pricesInstant,
  dimmed,
  onHover,
  selected,
  onSelect,
  onGift
}: {
  plan: SubscriptionPlan
  index: number
  imagesReady: boolean
  pricesStarted: boolean
  pricesDone: boolean
  pricesInstant: boolean
  dimmed: boolean
  onHover: () => void
  selected: string | null
  onSelect: (id: string) => void
  onGift: (button: HTMLButtonElement) => void
}) {
  const t = useTranslations('plans')
  const locale = useLocale() as Locale
  const giftMillions = plan.gift ? giftValueInMillions(plan.gift.value) : null
  const { reduceMotion, isScrolling } = usePricingMotion()
  const ref = useRef<HTMLLIElement>(null)
  const visible = useInView(ref)
  const imageScale = useMotionValue(1)
  const zoom = useRef<ReturnType<typeof animate> | null>(null)
  const delay = (entranceOrder[index] ?? index) * 0.19
  useEffect(() => () => zoom.current?.stop(), [])
  return (
    <li
      ref={ref}
      className='plan-slide @container relative flex'
      data-popular={plan.popular || undefined}
      data-dimmed={dimmed}
      data-images-ready={imagesReady}
      data-prices-done={pricesDone}
      data-paused={!visible || isScrolling || reduceMotion}
      style={{ '--entry-delay': `${delay}s`, '--distance': index === 1 ? 0 : 1 } as CSSProperties}
      onMouseEnter={() => {
        onHover()
        if (!reduceMotion) zoom.current = animate(imageScale, 1.075, { duration: 5, ease: 'linear' })
      }}
      onMouseLeave={() => zoom.current?.stop()}
      onFocusCapture={onHover}
    >
      <div className='plan-card-enter flex w-full'>
        {/* Đo trên ảnh S01: ruy-băng cao 8,1% bề rộng thẻ, nhô lên khỏi mép thẻ
          2,0% và cách chữ tên gói 4,5%. */}
        {plan.popular ? (
          <span className='plan-popular plan-shine bg-brand-orange text-brand-orange-foreground absolute -top-[2cqw] left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-[1.5cqw] rounded-full px-[4cqw] py-[2.25cqw] text-[3.6cqw] leading-none font-semibold tracking-wide whitespace-nowrap uppercase'>
            <Star className='size-[3.4cqw]' />
            {t('popular')}
          </span>
        ) : null}

        <section
          className={cn(
            // `@container`: mọi cỡ chữ trong thẻ tính theo BỀ RỘNG THẺ (đơn vị cqw)
            // đúng tỉ lệ đo được trên ảnh S01 — tên gói 8,3% bề rộng thẻ, giá 10%,
            // chữ thường 4,6%. Cỡ chữ cố định thì ở khổ hẹp chữ tràn dòng, ở khổ
            // rộng chữ lọt thỏm; cả hai đều làm thẻ trông khác ảnh.
            'plan-card @container bg-card flex w-full flex-col overflow-hidden rounded-2xl border',
            // Đo trên ảnh S01: cả ba thẻ CAO BẰNG NHAU (mép trên cùng y=238, nút
            // cuối thẻ cùng y=744) — chỉ ruy-băng "Phổ biến nhất" nhô lên khỏi mép.
            plan.popular ? 'border-brand-orange shadow-md' : 'border-border'
          )}
        >
          <header
            className={cn(
              // `relative` + viên nhãn đặt tuyệt đối: đo trên ảnh S01, dải nền kết
              // thúc ở y=291 còn viên nhãn kéo tới y=298 — tức nó CƯỠI LÊN mép dưới
              // của dải: đo trên ảnh, viên nhãn cao 6,5% bề rộng thẻ và NẰM GIỮA mép
              // dải (một nửa trong nền, một nửa ngoài).
              //
              // Khoảng đệm trên đo theo ảnh: thẻ thường 6,3% bề rộng thẻ; thẻ PLUS
              // 9,8% vì còn phải chừa chỗ cho ruy-băng nằm đè lên mép trên.
              'plan-card-title relative px-5 text-center',
              // Thẻ PLUS CÓ dải nền như hai thẻ kia, chỉ là màu kem rất nhạt thay
              // vì xanh (đo trên ảnh: nền header 255,243,231 so với thân thẻ trắng).
              plan.popular
                ? 'bg-brand-orange-soft/50 pt-[9.8cqw] pb-[5.5cqw]'
                : 'from-primary-strong to-primary text-primary-foreground bg-linear-to-r pt-[6.3cqw] pb-[8cqw]'
            )}
          >
            <h2
              className={cn(
                'flex items-center justify-center gap-[1.5cqw] text-[8.3cqw] leading-none font-bold tracking-wide uppercase',
                plan.popular ? 'text-brand-orange' : 'text-primary-foreground'
              )}
            >
              {t(`tiers.${plan.tier}`)}
              {/* Hình S01: mỗi tên gói có một chiếc lá nhỏ đứng ngay sau. */}
              <Leaf
                aria-hidden
                className={cn('size-[5cqw]', plan.popular ? 'text-brand-orange' : 'text-primary-foreground')}
              />
            </h2>
            <span
              className={cn(
                'plan-tag absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full px-[3.5cqw] py-[1.6cqw] text-[3.6cqw] leading-none font-semibold tracking-wide whitespace-nowrap uppercase',
                // Hình S01: viên nhãn là nền ĐẶC (xanh đậm hơn dải nền / cam), không phải nền mờ.
                plan.popular
                  ? 'plan-shine bg-brand-orange text-brand-orange-foreground'
                  : 'bg-primary-strong text-primary-foreground'
              )}
            >
              {t(`tierTags.${plan.tier}`)}
            </span>
          </header>

          <div className='flex flex-1 flex-col p-5'>
            {plan.imageUrl ? (
              <div data-plan-image className='overflow-hidden rounded-xl'>
                <motion.div
                  initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.985 }}
                  animate={imagesReady ? { opacity: 1, filter: 'blur(0px)', scale: 1 } : undefined}
                  transition={{
                    duration: reduceMotion ? 0 : 0.82,
                    delay: reduceMotion ? 0 : 0.28 + index * 0.22,
                    ease: pricingEase
                  }}
                >
                  <motion.div style={{ scale: imageScale }}>
                    <Photo
                      src={plan.imageUrl}
                      alt=''
                      priority
                      className='aspect-[16/10] w-full rounded-xl'
                      sizes='360px'
                    />
                  </motion.div>
                </motion.div>
              </div>
            ) : null}

            <p className='plan-fit text-muted-foreground mt-4 text-center text-[4.6cqw] leading-snug text-pretty'>
              {plan.fitLine}
            </p>

            <p className='mt-3 text-center'>
              <PlanPrice
                value={plan.price}
                tier={plan.tier}
                started={pricesStarted}
                instant={pricesInstant}
                popular={!!plan.popular}
              />
              <span
                className={cn(
                  'text-muted-foreground block text-[3.9cqw] transition-opacity duration-300',
                  pricesDone ? 'opacity-100' : 'opacity-0'
                )}
              >
                {t('oneTime')}
              </span>
            </p>

            {/* Hình S01: danh sách tính năng nằm trong MỘT khung viền, tiêu đề
              in hoa canh giữa ngay bên trong khung; dấu tích đổi màu theo gói. */}
            <motion.div
              onViewportEnter={(entry) => {
                if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
              }}
              viewport={{ once: true, amount: 0.12 }}
              className='plan-features mt-5 flex flex-1 flex-col rounded-xl border p-4'
            >
              <p
                className={cn(
                  'plan-feature-title text-center text-[4.4cqw] font-bold tracking-wide uppercase',
                  plan.popular ? 'text-brand-orange' : 'text-primary-strong'
                )}
              >
                {t(`featuresTitleByTier.${plan.tier}`)}
              </p>
              <ul className='mt-3 flex-1 space-y-2'>
                {(plan.features ?? [plan.perk]).map((feature, i) => (
                  <li
                    key={feature}
                    style={{ '--line-delay': `${0.2 + delay + i * 0.09}s` } as CSSProperties}
                    className='plan-feature-line flex items-start gap-[2cqw] text-[4.5cqw] leading-snug'
                  >
                    <CheckCircle2
                      className={cn(
                        'mt-[0.6cqw] size-[4.6cqw] shrink-0',
                        plan.popular ? 'text-brand-orange' : 'text-primary'
                      )}
                    />
                    <span className='text-pretty'>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Hình S01 — khối quà tặng của thẻ PRO: ảnh hộp quà bên trái; bên phải
              là nhãn "QUÀ TẶNG ĐẶC BIỆT", tên quà, rồi GIÁ TRỊ cỡ lớn màu cam;
              dòng điều kiện chạy hết bề ngang bên dưới. Cả khối là nút mở popup
              S02 (bản mô tả: "bấm khối quà tặng ở thẻ PRO"), nên KHÔNG có thêm
              liên kết "Xem chi tiết quà tặng" như trước. */}
            {plan.gift ? (
              <motion.button
                type='button'
                onClick={(e) => onGift(e.currentTarget)}
                onViewportEnter={(entry) => {
                  if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
                }}
                viewport={{ once: true }}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.55, delay: reduceMotion ? 0 : 0.65, ease: pricingEase }}
                className='plan-gift border-brand-orange/30 bg-brand-orange-soft/60 hover:bg-brand-orange-soft mt-4 w-full rounded-xl border p-2.5 text-left transition-colors'
              >
                <span className='flex items-center gap-2'>
                  {/* CHỖ CHỜ ASSET: ảnh hộp quà của khách. Còn trống thì dùng icon
                    cùng khung để bố cục không nhảy khi ảnh về. */}
                  {/* Ảnh hộp quà trong bản mô tả to bằng ~36% bề rộng thẻ, không
                    phải một icon nhỏ. Giữ nguyên khung này khi khách gửi ảnh thật. */}
                  <span className='plan-gift-bounce bg-card flex size-[34cqw] shrink-0 items-center justify-center overflow-hidden rounded-lg'>
                    {plan.gift.imageUrl ? (
                      <Photo src={plan.gift.imageUrl} alt='' className='plan-gift-icon size-[34cqw]' sizes='120px' />
                    ) : (
                      <Gift aria-hidden className='plan-gift-icon text-brand-orange size-[22cqw]' />
                    )}
                  </span>

                  <span className='min-w-0 flex-1 text-center'>
                    <span className='text-primary-strong block text-[3.6cqw] font-bold tracking-wide uppercase'>
                      {t('gift.badge')}
                    </span>
                    <span className='text-muted-foreground mt-0.5 block text-[3.3cqw] leading-snug text-pretty'>
                      {plan.gift.title} {t('gift.valuePrefix')}
                    </span>
                    <span className='plan-gift-value plan-shine text-brand-orange block text-[5.4cqw] font-extrabold tracking-tight whitespace-nowrap uppercase'>
                      {giftMillions
                        ? `${giftMillions} ${t('gift.valueMillionsUnit')}`
                        : formatPriceTag(plan.gift.value, locale)}
                    </span>
                  </span>
                </span>

                <span className='text-muted-foreground mt-2 block text-center text-[3.1cqw] leading-snug text-pretty'>
                  {plan.gift.conditionsShort}
                </span>
              </motion.button>
            ) : null}

            {/* Hình S01: cả ba nút đều là nút đặc, chữ in hoa; riêng gói PLUS
              tô cam thay vì xanh. */}
            <PlanBuyButton
              plan={plan}
              disabled={selected !== null && selected !== plan.id}
              onSelect={() => onSelect(plan.id)}
            />
          </div>
        </section>
      </div>
    </li>
  )
}

function PlanPrice({
  value,
  tier,
  started,
  instant,
  popular
}: {
  value: number
  tier: PlanTier
  started: boolean
  instant: boolean
  popular: boolean
}) {
  const locale = useLocale() as Locale
  const { reduceMotion } = usePricingMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const startValue = value <= 0 ? 0 : 10 ** Math.max(0, String(Math.trunc(value)).length - 1)
  const [number, setNumber] = useState(startValue)
  const done = useRef(false)

  useEffect(() => {
    if (!started || done.current) return

    if (instant || reduceMotion) {
      done.current = true
      const sync = window.setTimeout(() => setNumber(value), 0)
      return () => window.clearTimeout(sync)
    }

    const duration = PRICE_COUNT_DURATION_MS[tier]
    const startAt = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      setNumber(Math.round(startValue + (value - startValue) * eased))

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick)
        return
      }

      done.current = true
      setNumber(value)
      ref.current?.animate([{ scale: '1' }, { scale: '1.035' }, { scale: '1' }], {
        duration: PRICE_SETTLE_PULSE_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      })
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [instant, reduceMotion, started, startValue, tier, value])

  const final = formatPriceTag(value, locale)
  const digits = String(instant || reduceMotion ? value : number).padStart(String(Math.trunc(value)).length, '0')
  let digitIndex = 0

  return (
    <span
      ref={ref}
      data-price
      className={cn(
        'inline-block text-[10cqw] font-bold tracking-tight tabular-nums',
        popular ? 'text-brand-orange' : 'text-primary-strong'
      )}
      style={{ visibility: started || reduceMotion || instant ? 'visible' : 'hidden' }}
    >
      <span className='sr-only'>{final}</span>
      <span aria-hidden>
        {[...final].map((char, charIndex) =>
          /\d/.test(char) ? (
            <span key={charIndex} className='inline-block w-[0.62em]'>
              {digits[digitIndex++]}
            </span>
          ) : (
            <span key={charIndex}>{char}</span>
          )
        )}
      </span>
    </span>
  )
}

function PlanBuyButton({
  plan,
  disabled,
  onSelect
}: {
  plan: SubscriptionPlan
  disabled: boolean
  onSelect: () => void
}) {
  const t = useTranslations('plans')
  const common = useTranslations('common')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null)
  const { reduceMotion } = usePricingMotion()
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const release = (e: PointerEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: e.timeStamp })
  }
  const buy = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (pending || disabled) return
    rememberCheckoutReturn(plan.id)
    setPending(true)
    onSelect()
    const main = e.currentTarget.closest('main')
    if (!reduceMotion) {
      await new Promise((resolve) => setTimeout(resolve, 350))
      if (!alive.current) return
      await main
        ?.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 320,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
        .finished.catch(() => undefined)
    }
    if (alive.current) router.push(checkoutConfirmRoute(plan.id))
  }
  return (
    <Button asChild size='lg' className='mt-5 h-[11cqw] w-full text-[5cqw] font-bold tracking-wide uppercase'>
      <Link
        href={checkoutConfirmRoute(plan.id)}
        aria-disabled={disabled || pending}
        aria-busy={pending}
        onClick={(e) => void buy(e)}
        onPointerUp={release}
        className={cn(
          'plan-buy group relative justify-between overflow-hidden',
          plan.popular ? 'plan-shine brand-orange-button' : 'brand-green-button'
        )}
      >
        <span className={cn('transition-all', pending && 'mx-auto text-sm')}>
          {pending ? common('loading') : t(`cta.${plan.tier}`)}
        </span>
        {pending ? (
          <LoaderCircle className='size-5 animate-spin' />
        ) : (
          <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
        )}
        {ripple && !reduceMotion ? (
          <span key={ripple.id} className='plan-ripple' style={{ left: ripple.x, top: ripple.y }} />
        ) : null}
      </Link>
    </Button>
  )
}
