'use client'

import {
  ArrowRight,
  ChartColumn,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileText,
  Handshake,
  House,
  ImageIcon,
  Info,
  MapPin,
  Leaf,
  Minus,
  Monitor,
  QrCode,
  Ruler,
  ShieldCheck,
  Star,
  UserSearch
} from 'lucide-react'
import { animate, AnimatePresence, motion, useInView } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useCmsCollection, type SupervisionPackage, type SupervisionTier } from '@/shared/cms'
import { Photo, PricingMotionProvider, pricingEase, usePricingMotion } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { checkoutConfirmRoute } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { rememberCheckoutReturn } from '@/shared/lib/checkout-return'
import { formatCurrency } from '@/shared/utils'
import {
  ADDONS,
  SUPERVISION_COMPARISON,
  SUPERVISION_TIERS,
  SUPERVISION_VALUE_ROWS,
  type JourneyStepKey,
  type SupervisionCell,
  type SupervisionValueKey,
  type SupervisionValueRowKey
} from '../constants/supervision.constants'

interface SupervisionPricingProps {
  /** Dự án gắn với đơn khi khách vào đây từ nút "Chọn cách quản lý thi công" (R8). */
  projectId?: string
}

/**
 * S19 — Trang Gói giám sát thi công (trang công khai, cũng là tab thứ hai của
 * trang Bảng giá).
 *
 * Thứ tự khối theo bản mô tả: 3 thẻ → dòng chi phí ước tính → bảng so sánh →
 * add-on & phụ phí → nguyên tắc phạm vi → hành trình khách hàng 8 bước → giá trị
 * khách hàng nhận được → 3 ghi chú.
 *
 * Bám quy tắc thay vì bám ảnh demo: ghi chú thanh toán chỉ còn QR chuyển khoản
 * (R10), và không có dòng nào nói tới việc xem báo giá của nhà thầu trên nền
 * tảng (R2) — bản demo có dòng đó trong thẻ "Tự quản lý".
 */
export function SupervisionPricing({ projectId }: SupervisionPricingProps) {
  return (
    <PricingMotionProvider>
      <SupervisionPricingContent projectId={projectId} />
    </PricingMotionProvider>
  )
}

function SupervisionPricingContent({ projectId }: SupervisionPricingProps) {
  const t = useTranslations('supervision.pricing')
  const packages = useCmsCollection('supervisionPackages')
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('plans.supervision', { offsetMs: 120 })

  // Chữ cuối tiêu đề tô cam (Hình S19) — tách ở khoảng trắng cuối như S01.
  const title = t('title')
  const splitAt = title.lastIndexOf(' ')
  const titleLead = splitAt > 0 ? title.slice(0, splitAt) : title
  const titleAccent = splitAt > 0 ? title.slice(splitAt + 1) : ''
  const [hoveredTier, setHoveredTier] = useState<SupervisionTier | null>(null)
  const cardsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const track = cardsRef.current
    if (!track || matchMedia('(min-width: 768px)').matches) return
    const control = track.querySelector<HTMLElement>('[data-tier="control"]')
    if (!control) return
    const destination = control.offsetLeft - (track.clientWidth - control.clientWidth) / 2
    track.scrollTo({ left: Math.max(0, destination), behavior: 'instant' })
  }, [packages.length])

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] space-y-12 px-4 py-10 lg:px-8'
    >
      <header data-entrance-step='0' data-entrance-from='right' className='supervision-heading space-y-2 text-center'>
        <h1 className='text-primary-strong flex items-center justify-center gap-3 text-3xl font-bold tracking-tight uppercase sm:text-4xl'>
          <motion.span
            aria-hidden
            className='supervision-heading-leaf supervision-heading-leaf-left text-primary inline-flex'
            initial={{ opacity: 0, scale: 0.45, rotate: -24 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.52, delay: 0.58, ease: pricingEase }}
          >
            <Leaf className='size-7 -scale-x-100 sm:size-8' />
          </motion.span>
          <motion.span
            className='text-pretty'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: pricingEase }}
          >
            {titleLead}
            {titleAccent ? (
              <motion.span
                className='text-brand-orange inline-block'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.36 }}
              >
                {' '}
                {titleAccent}
              </motion.span>
            ) : null}
          </motion.span>
          <motion.span
            aria-hidden
            className='supervision-heading-leaf supervision-heading-leaf-right text-primary inline-flex'
            initial={{ opacity: 0, scale: 0.45, rotate: 24 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.52, delay: 0.68, ease: pricingEase }}
          >
            <Leaf className='size-7 sm:size-8' />
          </motion.span>
        </h1>
        <motion.p
          className='text-muted-foreground text-pretty'
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.78, ease: pricingEase }}
        >
          {t('subtitle')}
        </motion.p>
      </header>

      {/* pt đủ chỗ cho ruy-băng "Khuyến nghị" NẰM TRÊN viên nhãn nhóm gói: viên
          nhãn cưỡi lên mép trên thẻ (-mt-8) nên hai thứ này từng chồng chữ lên
          nhau ở thẻ được khuyến nghị. */}
      <ul
        ref={cardsRef}
        data-entrance-step='4'
        data-entrance-from='right'
        data-hovering={hoveredTier ? 'true' : undefined}
        className='supervision-card-track grid items-stretch gap-6 pt-11 md:grid-cols-3'
      >
        {packages.map((item, index) => (
          <PackageCard
            key={item.tier}
            item={item}
            index={index}
            projectId={projectId}
            active={hoveredTier === item.tier}
            onHover={() => setHoveredTier(item.tier)}
            onLeave={() => setHoveredTier(null)}
          />
        ))}
      </ul>

      <p className='supervision-cost-note text-muted-foreground mx-auto flex max-w-3xl items-start justify-center gap-2 text-center text-sm'>
        <motion.span
          className='supervision-cost-info relative mt-0.5 inline-flex shrink-0'
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.38 }}
          tabIndex={0}
        >
          <Info className='size-4' />
          <span role='tooltip' className='supervision-cost-tooltip'>
            {t('costNote')}
          </span>
        </motion.span>
        <motion.span
          className='text-pretty'
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.7, delay: 0.22, ease: 'easeOut' }}
        >
          {t('costNote')}
        </motion.span>
      </p>

      <ComparisonTable packages={packages} projectId={projectId} />

      {/* Hai khối cao BẰNG NHAU (lưới giãn mặc định). Khối nguyên tắc ít chữ
          hơn nên phần dôi ra được chia đều cho ba gạch đầu dòng thay vì dồn
          thành một mảng trống ở đáy — xem `ScopeRules`. */}
      {/* Tỉ lệ 59% / 39% đo từ ảnh S19: bảng phụ phí có ba cột nên cần bề
          ngang, khối nguyên tắc chỉ là ba dòng chữ. Chia đôi 50/50 làm bảng bên
          trái bị bó, chữ trong ô xuống dòng lắt nhắt. */}
      <div className='grid gap-x-[2%] gap-y-5 lg:grid-cols-[59%_minmax(0,1fr)]'>
        <AddonTable />
        <ScopeRules />
      </div>

      <Journey />
      <ValueTable />

      {/* Ba ghi chú là BA Ô RIÊNG chứ không phải ba cột trong một mảng nền —
          mỗi ô một icon tròn viền, đúng dải cuối Hình S19. */}
      <ul className='grid items-stretch gap-4 sm:grid-cols-3'>
        {[
          { icon: QrCode, text: t('notes.payment') },
          { icon: Ruler, text: t('notes.scope') },
          { icon: MapPin, text: t('notes.area') }
        ].map((note, index) => (
          <motion.li
            key={note.text}
            className='supervision-note-chip bg-muted/40 text-muted-foreground flex items-start gap-3 rounded-2xl border p-4 text-sm'
            style={{ '--note-delay': `${index * 0.14 + 0.16}s` } as CSSProperties}
            initial={{ opacity: 0, y: 9 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: 0.48, delay: index * 0.14, ease: pricingEase }}
          >
            <span className='supervision-note-icon border-primary/40 text-primary flex size-8 shrink-0 items-center justify-center rounded-full border'>
              <note.icon aria-hidden className='supervision-note-glyph size-4' />
            </span>
            <span className='text-pretty'>{note.text}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Nút gói CONTROL tô cam (Hình S19) — dùng ở thẻ gói và ở hàng chọn gói cuối
 * bảng so sánh, nên tách hằng số để hai chỗ không lệch nhau.
 */
const ORANGE_BUTTON =
  // `bg-none` là bắt buộc: biến thể mặc định của Button phủ nền bằng CLASS
  // `brand-gradient` (background-image), mà `bg-brand-orange` chỉ đổi
  // background-color nên gradient xanh vẫn nằm đè lên. Quầng bóng cũng phải
  // đổi sang cam, nếu không nút cam lại toả sáng xanh.
  'bg-brand-orange bg-none text-brand-orange-foreground hover:bg-brand-orange/90 shadow-[0_1px_--theme(--color-white/0.12)_inset,0_2px_6px_--theme(--color-brand-orange/0.35),0_8px_22px_-6px_--theme(--color-brand-orange/0.5)] focus-visible:ring-brand-orange/30'

/** Cột SVC CONTROL được tô nền nhạt suốt bảng để mắt bám theo một cột. */
const CONTROL_COLUMN = 'bg-brand-orange-soft/35'

/** Một thẻ lựa chọn quản lý thi công. */
function PackageCard({
  item,
  index,
  projectId,
  active,
  onHover,
  onLeave
}: {
  item: SupervisionPackage
  index: number
  projectId?: string
  active: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const t = useTranslations('supervision.pricing')
  const tTiers = useTranslations('supervision.tiers')
  const tTags = useTranslations('supervision.tierTags')
  const isFree = item.price === 0

  return (
    <motion.li
      data-tier={item.tier}
      data-active={active || undefined}
      data-muted={isFree || undefined}
      className='supervision-package relative flex'
      initial={{ opacity: 0, y: item.recommended ? 28 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.62, delay: 1.02 + index * 0.17, ease: pricingEase }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocusCapture={onHover}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onLeave()
      }}
    >
      {item.recommended ? (
        <motion.span
          className='supervision-control-label supervision-control-label-top bg-brand-orange text-brand-orange-foreground absolute -top-10 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-4 py-1 text-xs font-semibold tracking-wide uppercase whitespace-nowrap'
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.86, ease: pricingEase }}
        >
          <Star className='size-3' />
          {t('recommended')}
        </motion.span>
      ) : null}

      <section
        className={cn(
          'bg-card flex w-full flex-col rounded-2xl border p-5',
          item.recommended ? 'border-brand-orange shadow-md' : 'border-border'
        )}
      >
        <motion.p
          className={cn(
            'supervision-control-label bg-card relative mx-auto -mt-8 w-fit rounded-full border px-3.5 py-1 text-center text-[11px] font-semibold tracking-wide uppercase',
            item.recommended ? 'border-brand-orange text-brand-orange' : 'text-muted-foreground'
          )}
          initial={item.recommended ? { opacity: 0, y: -12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: item.recommended ? 2.08 : 1.02 + index * 0.17, ease: pricingEase }}
        >
          {tTags(item.tier)}
        </motion.p>
        <h2
          className={cn(
            'mt-3 text-center text-2xl font-bold tracking-wide uppercase',
            item.recommended ? 'text-brand-orange' : 'text-primary-strong'
          )}
        >
          {tTiers(item.tier)}
        </h2>

        {/* CHỖ CHỜ ASSET: Hình S19 dùng tranh minh hoạ riêng cho từng gói
            (người tự theo dõi công trình · kỹ sư SVC cầm bảng kiểm · kỹ sư
            đồng hành trọn công trình). Chưa có tranh thật thì để KHUNG NÉT
            ĐỨT — nhét ảnh kho vào đây trông như đã xong nên không ai biết là
            còn thiếu. Đội vận hành tải ảnh lên là hiện, không phải sửa code. */}
        {item.imageUrl ? (
          <motion.div
            className='mt-4'
            initial={{ opacity: 0, filter: 'blur(5px)', scale: 0.985 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.72, delay: 1.3 + index * 0.17, ease: pricingEase }}
          >
            <Photo src={item.imageUrl} alt='' className='aspect-16/10 w-full rounded-xl' sizes='360px' />
          </motion.div>
        ) : (
          <div
            className='supervision-image-placeholder bg-muted/30 text-muted-foreground/50 mt-4 flex aspect-16/10 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed'
            style={{ '--placeholder-delay': `${index * 1.25}s` } as CSSProperties}
          >
            <ImageIcon aria-hidden className='size-7' />
          </div>
        )}

        <p className='text-muted-foreground mt-4 text-center text-sm text-pretty'>{item.fitLine}</p>

        <p className='mt-3 text-center'>
          <span
            className={cn(
              'text-3xl font-bold tracking-tight',
              item.recommended ? 'text-brand-orange' : 'text-primary-strong'
            )}
          >
            {isFree ? (
              <motion.span
                className='inline-block'
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 1.5, ease: pricingEase }}
              >
                {t('free')}
              </motion.span>
            ) : (
              <SupervisionPrice value={item.price} index={index} />
            )}
          </span>
          {isFree ? null : (
            <motion.span
              className='text-muted-foreground block text-xs'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.42, delay: item.recommended ? 3.05 : 2.8 }}
            >
              {t('perProject')} · {t('duration', { months: item.durationMonths })}
            </motion.span>
          )}
        </p>

        <InspectionBand item={item} />

        {/* Ba gói ba kiểu dấu tick, đúng Hình S19: gói miễn phí là vòng tròn
            RỖNG (quyền lợi có sẵn, không phải thứ mua thêm), hai gói trả phí là
            vòng tròn TÔ ĐẶC theo màu gói. */}
        <motion.ul
          className='supervision-benefits mt-4 flex-1 space-y-2'
          onViewportEnter={(entry) => {
            if (entry) (entry.target as HTMLElement).dataset.seen = 'true'
          }}
          viewport={{ once: true, amount: 0.35 }}
          data-control={item.recommended || undefined}
          data-empty={!item.inspections || undefined}
        >
          {item.benefits.map((benefit, benefitIndex) => (
            <li
              key={benefit}
              data-upgrade={isFree && benefitIndex === item.benefits.length - 1 ? 'true' : undefined}
              className='supervision-benefit flex items-start gap-2 text-sm'
              style={{ '--benefit-index': benefitIndex } as CSSProperties}
            >
              <CircleCheck
                aria-hidden
                className={cn(
                  'mt-0.5 size-4.5 shrink-0',
                  isFree && 'text-primary/70',
                  !isFree &&
                    (item.recommended
                      ? 'fill-brand-orange text-brand-orange-foreground'
                      : 'fill-primary text-primary-foreground')
                )}
              />
              <span className='text-pretty'>{benefit}</span>
            </li>
          ))}
        </motion.ul>

        {/* Gói miễn phí KHÔNG có nút: Hình S19 để thẻ này kết thúc ở danh sách
            quyền lợi. Tự quản lý là trạng thái mặc định của mọi dự án, không có
            gì để "chọn" — nút ở đây chỉ tạo một thao tác thừa.
            Hai nút trả phí đều TÔ ĐẶC — CHECK xanh, CONTROL cam. */}
        {isFree ? null : (
          <Button asChild size='lg' className={cn('mt-5 w-full', item.recommended && ORANGE_BUTTON)}>
            <Link
              href={checkoutConfirmRoute(item.id, projectId)}
              onClick={() => rememberCheckoutReturn(item.id, projectId)}
              className={cn('supervision-buy group', item.recommended && 'supervision-buy-control')}
            >
              {t('choose', { tier: tTiers(item.tier) })}
              <ArrowRight className='size-4 transition-transform duration-300 group-hover:translate-x-1.5' />
            </Link>
          </Button>
        )}
      </section>
    </motion.li>
  )
}

function InspectionBand({ item }: { item: SupervisionPackage }) {
  const t = useTranslations('supervision.pricing')
  const [count, setCount] = useState(0)
  const done = useRef(false)

  return (
    <motion.p
      className={cn(
        'supervision-inspection-band mt-3 rounded-lg px-3 py-2 text-center text-xs font-medium',
        !item.inspections && 'bg-muted text-muted-foreground',
        item.inspections &&
          (item.recommended ? 'bg-brand-orange-soft text-brand-orange' : 'bg-accent text-primary-strong')
      )}
      data-control={item.recommended || undefined}
      data-empty={!item.inspections || undefined}
      onViewportEnter={(entry) => {
        if (!entry || done.current) return
        const target = entry.target as HTMLElement
        target.dataset.seen = 'true'
        if (!item.inspections) return
        done.current = true
        const controls = animate(0, item.inspections, {
          duration: item.recommended ? 0.5 : 0.36,
          delay: item.recommended ? 1.3 : 0.9,
          ease: 'easeOut',
          onUpdate: (value) => setCount(Math.round(value))
        })
        return () => controls.stop()
      }}
      viewport={{ once: true, amount: 0.65 }}
    >
      <span className='supervision-inspection-text'>
        {item.inspections ? t('inspections', { count }) : t('noInspection')}
      </span>
    </motion.p>
  )
}

function SupervisionPrice({ value, index }: { value: number; index: number }) {
  const locale = useLocale() as Locale
  const final = formatCurrency(value, locale)

  return (
    <motion.span
      className='supervision-price inline-block tabular-nums'
      initial={{ opacity: 0, y: 6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: index === 2 ? 2.05 : 1.84, ease: [0.22, 1, 0.36, 1] }}
    >
      {final}
    </motion.span>
  )
}

/** Bảng "So sánh chi tiết 3 lựa chọn". */
function ComparisonTable({ packages, projectId }: { packages: SupervisionPackage[]; projectId?: string }) {
  const t = useTranslations('supervision.pricing.comparison')
  const tTiers = useTranslations('supervision.tiers')
  const tRows = useTranslations('supervision.pricing.comparison.rows')
  const tValues = useTranslations('supervision.pricing.comparison.values')
  const tPricing = useTranslations('supervision.pricing')
  const locale = useLocale() as Locale
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<SupervisionTier | null>(null)
  const [headerStuck, setHeaderStuck] = useState(false)
  const [headerBounds, setHeaderBounds] = useState({ left: 0, width: 0 })
  const tableRef = useRef<HTMLDivElement>(null)

  const byTier = (tier: SupervisionTier) => packages.find((item) => item.tier === tier)

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
    <section className='supervision-comparison'>
      <motion.h2
        className='text-primary-strong text-center text-xl font-semibold tracking-tight'
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 0.52, ease: pricingEase }}
      >
        {t('title')}
      </motion.h2>

      <AnimatePresence>
        {headerStuck ? (
          <motion.div
            className='supervision-floating-head bg-card fixed top-16 z-40 hidden grid-cols-[28%_24%_24%_24%] overflow-hidden rounded-b-xl border shadow-md md:grid'
            style={{ left: headerBounds.left, width: headerBounds.width }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.26, ease: pricingEase }}
          >
            <span className='px-3 py-2 text-center text-xs font-semibold tracking-wide uppercase'>
              {t('criterion')}
            </span>
            {SUPERVISION_TIERS.map((tier) => (
              <span
                key={tier}
                className={cn(
                  'border-l px-3 py-2 text-center text-xs font-bold uppercase',
                  tier === 'control' && 'supervision-control-column bg-brand-orange-soft text-brand-orange'
                )}
              >
                {tTiers(tier)}
                <small className='text-muted-foreground mt-0.5 block text-[10px] font-medium normal-case'>
                  {formatCurrency(byTier(tier)?.price ?? 0, locale)}
                </small>
              </span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        ref={tableRef}
        data-stuck={headerStuck || undefined}
        className='supervision-comparison-shell bg-card relative mt-5 rounded-2xl border shadow-[inset_-18px_0_20px_-24px_var(--foreground)]'
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.04 }}
        transition={{ duration: 0.52, delay: 0.2, ease: pricingEase }}
      >
        <table
          data-hovering={hoveredRow || hoveredColumn ? 'true' : undefined}
          className='supervision-comparison-table w-full min-w-[720px] table-fixed border-collapse text-sm'
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
          <thead className='supervision-comparison-head bg-card z-20'>
            <tr className='divide-border divide-x'>
              <th className='bg-card text-primary-strong sticky left-0 z-10 border-b px-3 py-2.5 text-center text-xs font-semibold tracking-wide uppercase'>
                {t('criterion')}
              </th>
              {SUPERVISION_TIERS.map((tier) => (
                <th
                  key={tier}
                  onMouseEnter={() => setHoveredColumn(tier)}
                  className={cn(
                    'supervision-comparison-cell border-b px-3 py-2.5 text-center',
                    tier === 'control' && 'supervision-control-column bg-brand-orange-soft',
                    hoveredColumn === tier && 'is-column-hovered'
                  )}
                >
                  <span
                    className={cn(
                      'block font-bold tracking-wide uppercase',
                      tier === 'control' ? 'text-brand-orange' : 'text-primary-strong'
                    )}
                  >
                    {tTiers(tier)}
                  </span>
                  <span className='supervision-sticky-price text-muted-foreground mt-0.5 text-[10px] font-medium'>
                    {formatCurrency(byTier(tier)?.price ?? 0, locale)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className='divide-border divide-y'>
            <GroupRow label={t('groups.core')} />
            <CoreRow
              index={0}
              label={tRows('inspectionCount')}
              values={SUPERVISION_TIERS.map((tier) => {
                const item = byTier(tier)
                return item?.inspections ? String(item.inspections) : '—'
              })}
              hoveredColumn={hoveredColumn}
              onHoverColumn={setHoveredColumn}
            />
            <CoreRow
              index={1}
              label={tRows('duration')}
              values={SUPERVISION_TIERS.map((tier) => {
                const item = byTier(tier)
                return tier === 'self'
                  ? t('values.unlimited')
                  : t('values.months', { count: item?.durationMonths ?? 0 })
              })}
              hoveredColumn={hoveredColumn}
              onHoverColumn={setHoveredColumn}
            />
            <CoreRow
              index={2}
              priceRow
              label={tRows('price')}
              values={SUPERVISION_TIERS.map((tier) => byTier(tier)?.price ?? 0)}
              hoveredColumn={hoveredColumn}
              onHoverColumn={setHoveredColumn}
            />

            {SUPERVISION_COMPARISON.map((group) => (
              <Fragment key={group.key}>
                <GroupRow label={t(`groups.${group.key}`)} />
                {group.rows.map((row, rowIndex) => (
                  <motion.tr
                    key={row.key}
                    data-hovered={hoveredRow === row.key || undefined}
                    className='supervision-comparison-row divide-border divide-x'
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.18 }}
                    transition={{ duration: 0.52, delay: 0.28 + rowIndex * 0.075, ease: pricingEase }}
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
                    {SUPERVISION_TIERS.map((tier, tierIndex) => (
                      <td
                        key={tier}
                        onMouseEnter={() => setHoveredColumn(tier)}
                        className={cn(
                          'supervision-comparison-cell px-3 py-2 text-center text-xs',
                          tier === 'control' && 'supervision-control-column bg-brand-orange-soft/60',
                          hoveredColumn === tier && 'is-column-hovered',
                          hoveredRow === row.key && hoveredColumn === tier && 'is-intersection font-semibold'
                        )}
                      >
                        <Cell value={row.values[tier]} label={tValues} index={tierIndex} />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </Fragment>
            ))}
          </tbody>

          <tfoot>
            <tr className='supervision-choose-row divide-border divide-x border-t'>
              <th className='bg-card sticky left-0 z-10 p-3 text-left text-xs font-medium'>{t('choosePlanRow')}</th>
              {SUPERVISION_TIERS.map((tier, index) => {
                const item = byTier(tier)
                return (
                  <motion.td
                    key={tier}
                    className={cn(
                      'supervision-choose-cell p-3 text-center',
                      tier === 'control' && 'supervision-control-column bg-brand-orange-soft/60'
                    )}
                    initial={{ opacity: 0, y: 9 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.65 }}
                    transition={{ duration: 0.52, delay: index * 0.16, ease: pricingEase }}
                  >
                    {item && item.price > 0 ? (
                      <Button
                        asChild
                        size='sm'
                        className={cn('supervision-table-buy', item.recommended && ORANGE_BUTTON)}
                      >
                        <Link
                          href={checkoutConfirmRoute(item.id, projectId)}
                          onClick={() => rememberCheckoutReturn(item.id, projectId)}
                        >
                          {tPricing('choose', { tier: tTiers(tier) })}
                        </Link>
                      </Button>
                    ) : (
                      <span className='text-muted-foreground text-xs'>—</span>
                    )}
                  </motion.td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </motion.div>
    </section>
  )
}

/** Bảng "Add-on & phụ phí". */
function AddonTable() {
  const t = useTranslations('supervision.pricing.addons')
  const packages = useCmsCollection('supervisionPackages')
  const months = packages.find((item) => item.tier === 'check')?.durationMonths ?? 6

  return (
    // Hình S19: hai khối này là PANEL NỀN MÀU, không viền — kem cho bảng phụ
    // phí, xanh nhạt cho phần nguyên tắc. Để `bg-card` + viền như các thẻ khác
    // thì cả dải này chìm nghỉm giữa bảng so sánh và sơ đồ hành trình.
    <motion.section
      className='supervision-addon bg-brand-orange-soft/60 rounded-2xl border p-5'
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.56, ease: pricingEase }}
    >
      <motion.h2
        className='text-primary-strong text-center text-base font-semibold'
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.12 }}
      >
        {t('title')}
      </motion.h2>

      {/* Viền ngoài nằm ở lớp bọc chứ không đặt trên <table>: bo góc trên
          chính bảng sẽ bị các ô vuông góc của hàng đầu/cuối đè lên. */}
      <div className='mt-3 overflow-hidden rounded-lg border'>
        <table className='w-full border-collapse text-sm'>
          <thead>
            {/* `divide-x` trên hàng kẻ vạch DỌC giữa các ô — bảng phụ phí ở
                Hình S19 có lưới đủ cả ngang lẫn dọc, khác bảng so sánh phía trên
                chỉ kẻ ngang. */}
            <tr className='text-muted-foreground divide-x text-[11px] tracking-wide uppercase'>
              <th className='border-b p-2 text-left font-medium'>{t('item')}</th>
              <th className='border-b p-2 text-center font-medium'>{t('price')}</th>
              <th className='border-b p-2 text-center font-medium'>{t('note')}</th>
            </tr>
          </thead>
          <tbody>
            {ADDONS.map((key, index) => (
              <motion.tr
                key={key}
                className='supervision-addon-row divide-x border-b last:border-b-0'
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: 0.26 + index * 0.09, ease: pricingEase }}
              >
                <td className='p-2 text-xs font-medium'>{key === 'extend' ? t('extend', { months }) : t(key)}</td>
                <td className='p-2 text-center text-xs font-medium'>{t(`${key}Price`)}</td>
                <td className='text-muted-foreground p-2 text-center text-xs'>{t(`${key}Note`)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  )
}

/** Khối "Nguyên tắc phạm vi dịch vụ". */
function ScopeRules() {
  const t = useTranslations('supervision.pricing.scope')
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const reveal = () => {
      const top = ref.current?.getBoundingClientRect().top
      // `whileInView` có thể bỏ lỡ một khối khi người dùng lướt qua thật
      // nhanh. Khi đó phải chốt ngay trạng thái cuối, không để icon vô hình.
      if (top !== undefined && top < window.innerHeight) setSeen(true)
    }
    reveal()
    window.addEventListener('scroll', reveal, { passive: true })
    return () => window.removeEventListener('scroll', reveal)
  }, [])

  return (
    <motion.section
      ref={ref}
      data-seen={seen || undefined}
      className='supervision-scope bg-info-soft flex h-full flex-col rounded-2xl border p-5'
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.56, delay: 0.28, ease: pricingEase }}
    >
      <h2 className='text-primary-strong flex items-center gap-2.5 text-base font-semibold'>
        <ShieldCheck className='supervision-scope-icon size-5 shrink-0' strokeWidth={1.75} />
        {t('title')}
      </h2>
      {/* `flex-1` + `justify-between`: chỗ dôi ra so với bảng phụ phí bên cạnh
          được rải đều giữa ba dòng, nên khối trông đầy chứ không phải ba dòng
          dính đỉnh rồi bỏ trống nửa dưới. */}
      <ul className='mt-3 flex flex-1 flex-col justify-between gap-3'>
        {[t('r1'), t('r2'), t('r3')].map((rule, index) => (
          <motion.li
            key={rule}
            className='flex items-start gap-3 text-sm'
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.42, delay: 0.45 + index * 0.1, ease: pricingEase }}
          >
            <span aria-hidden className='bg-foreground/70 mt-2 size-1.5 shrink-0 rounded-[2px]' />
            <span className='text-pretty'>{rule}</span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  )
}

/**
 * Sơ đồ "Hành trình khách hàng" (Hình S19).
 *
 * Đây là một DÒNG CHẢY NGANG có nhánh, không phải lưới 9 thẻ: bước 1→3 chạy
 * thẳng, tới bước 3 thì rẽ đôi (4A tự quản lý / 4B SVC giám sát) rồi nhập lại
 * vào bước 5. Vẽ thành lưới đều nhau thì mất đúng cái thông tin quan trọng
 * nhất của sơ đồ — chỗ khách phải chọn.
 *
 * Dấu `+` nối các bước liền mạch, mũi tên `→` đánh dấu chỗ rẽ và chỗ nhập lại.
 * Cả dải cuộn ngang trên màn hẹp thay vì xuống dòng — bẻ dòng một sơ đồ luồng
 * là làm hỏng mạch đọc.
 */
const JOURNEY_ICONS: Record<JourneyStepKey, typeof Monitor> = {
  s1: Monitor,
  s2: UserSearch,
  s3: ClipboardList,
  s4a: Handshake,
  s4b: ShieldCheck,
  s5: Construction,
  s6: ChartColumn,
  s7: ClipboardCheck,
  s8: House
}
const MotionArrowRight = motion.create(ArrowRight)

function Journey() {
  const t = useTranslations('supervision.pricing.journey')
  const [hoveredBranch, setHoveredBranch] = useState<JourneyStepKey | null>(null)
  const ref = useRef<HTMLElement>(null)
  const visible = useInView(ref, { amount: 0.15 })
  const { isScrolling } = usePricingMotion()
  const dotActive = visible && !isScrolling

  const before: JourneyStepKey[] = ['s1', 's2', 's3']
  const after: JourneyStepKey[] = ['s5', 's6', 's7', 's8']

  return (
    <section
      ref={ref}
      data-visible={visible || undefined}
      className='supervision-journey bg-card relative rounded-2xl border p-5'
    >
      <motion.h2
        className='text-primary-strong text-lg font-semibold tracking-wide uppercase'
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: 0.48, ease: pricingEase }}
      >
        {t('title')}
      </motion.h2>

      <div className='supervision-journey-track mt-6 flex items-stretch gap-1.5 overflow-x-auto overflow-y-hidden pt-4 pb-2'>
        {before.map((step, index) => (
          <Fragment key={step}>
            {index > 0 ? <FlowJoin delay={0.06 + index * 0.2} active={dotActive} /> : null}
            <JourneyCard step={step} number={index + 1} delay={0.16 + index * 0.2} />
          </Fragment>
        ))}

        <BranchSplit />

        <div className='flex w-52 shrink-0 flex-col justify-between gap-2'>
          <BranchCard
            step='s4a'
            badge='4A'
            delay={0.82}
            active={hoveredBranch === 's4a'}
            muted={Boolean(hoveredBranch && hoveredBranch !== 's4a')}
            onHover={() => setHoveredBranch('s4a')}
            onLeave={() => setHoveredBranch(null)}
          />
          <BranchCard
            step='s4b'
            badge='4B'
            highlighted
            delay={1.05}
            active={hoveredBranch === 's4b'}
            muted={Boolean(hoveredBranch && hoveredBranch !== 's4b')}
            onHover={() => setHoveredBranch('s4b')}
            onLeave={() => setHoveredBranch(null)}
          />
        </div>

        <BranchMerge />

        {after.map((step, index) => (
          <Fragment key={step}>
            {index > 0 ? <FlowJoin delay={1.26 + index * 0.2} active={dotActive} /> : null}
            <JourneyCard step={step} number={index + 5} delay={1.36 + index * 0.2} />
          </Fragment>
        ))}
      </div>
    </section>
  )
}

/** Mũi tên nối hai bước đi thẳng. */
function FlowJoin({ delay, active }: { delay: number; active: boolean }) {
  return (
    <MotionArrowRight
      aria-hidden
      className='supervision-journey-join text-muted-foreground size-4 shrink-0 self-center'
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.22, delay, ease: pricingEase }}
    >
      <motion.circle
        aria-hidden
        className='supervision-journey-flow-dot'
        cx='2'
        cy='12'
        r='2.1'
        initial={false}
        animate={active ? { opacity: [0, 1, 1, 0], cx: [2, 2, 20, 20] } : { opacity: 0 }}
        transition={{ duration: 0.7, delay: 2.1 + delay, ease: 'linear', repeat: Infinity, repeatDelay: 8.2 }}
      />
    </MotionArrowRight>
  )
}

/**
 * Nét rẽ nhánh sau bước 3: một đoạn ngang tách thành hai ngạnh chạy lên 4A và
 * xuống 4B. Vẽ bằng các đoạn định vị theo PHẦN TRĂM chiều cao hàng chứ không
 * bằng SVG tỉ lệ cố định — chiều cao dải phụ thuộc nội dung thẻ, ngạnh phải tự
 * bám theo tâm hai thẻ nhánh (≈25% và ≈75%).
 */
function BranchSplit() {
  return (
    <motion.div
      aria-hidden
      className='supervision-journey-split relative w-8 shrink-0 self-stretch'
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.24, delay: 0.72, ease: pricingEase }}
    >
      <span className='bg-border absolute top-1/2 left-0 h-px w-1/2' />
      <span className='bg-border absolute top-1/4 bottom-1/4 left-1/2 w-px' />
      <span className='bg-border absolute top-1/4 right-2 left-1/2 h-px' />
      <span className='bg-border absolute right-2 bottom-1/4 left-1/2 h-px' />
      <ChevronRight className='text-muted-foreground absolute top-1/4 right-0 size-3.5 -translate-y-1/2' />
      <ChevronRight className='text-muted-foreground absolute right-0 bottom-1/4 size-3.5 translate-y-1/2' />
    </motion.div>
  )
}

/** Nét nhập lại: hai ngạnh từ 4A và 4B gộp về một mũi tên vào bước 5. */
function BranchMerge() {
  return (
    <motion.div
      aria-hidden
      className='supervision-journey-merge relative w-8 shrink-0 self-stretch'
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.24, delay: 1.26, ease: pricingEase }}
    >
      <span className='bg-border absolute top-1/4 left-0 h-px w-1/2' />
      <span className='bg-border absolute bottom-1/4 left-0 h-px w-1/2' />
      <span className='bg-border absolute top-1/4 bottom-1/4 left-1/2 w-px' />
      <span className='bg-border absolute top-1/2 right-2 left-1/2 h-px' />
      <ChevronRight className='text-muted-foreground absolute top-1/2 right-0 size-3.5 -translate-y-1/2' />
    </motion.div>
  )
}

/** Một bước trên dòng chính: số ở mép trên, tên, icon, rồi mô tả. */
function JourneyCard({ step, number, delay }: { step: JourneyStepKey; number: number; delay: number }) {
  const t = useTranslations('supervision.pricing.journey')
  const Icon = JOURNEY_ICONS[step]

  return (
    <motion.div
      style={{ '--journey-delay': `${delay}s` } as CSSProperties}
      className='supervision-journey-card bg-card relative flex w-32 shrink-0 flex-col items-center rounded-xl border px-2.5 pt-5 pb-4 text-center'
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.44, delay, ease: pricingEase }}
    >
      <motion.span
        className='bg-primary text-primary-foreground absolute -top-3.5 flex size-7 items-center justify-center rounded-full text-xs font-semibold'
        initial={{ scale: 0.55 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 360, damping: 20, delay: delay + 0.1 }}
      >
        {number}
      </motion.span>
      {/* Ô tên cao cố định bằng HAI dòng: tên một dòng và tên hai dòng đều
          chiếm chỗ như nhau, nhờ vậy icon và mô tả của tám bước nằm thẳng hàng
          thay vì chỗ lồi chỗ lõm. */}
      <p className='flex min-h-9 items-center text-sm leading-tight font-medium text-pretty'>{t(step)}</p>
      <Icon aria-hidden className='supervision-journey-icon text-primary my-3 size-8 shrink-0' strokeWidth={1.5} />
      <p className='text-muted-foreground text-[11px] leading-snug text-pretty'>{t(`${step}Body`)}</p>
    </motion.div>
  )
}

/** Một nhánh của bước 4 — rộng hơn, số và tên nằm cùng một dòng. */
function BranchCard({
  step,
  badge,
  highlighted,
  delay,
  active,
  muted,
  onHover,
  onLeave
}: {
  step: JourneyStepKey
  badge: string
  highlighted?: boolean
  delay: number
  active: boolean
  muted: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const t = useTranslations('supervision.pricing.journey')
  const Icon = JOURNEY_ICONS[step]

  return (
    <motion.div
      data-highlighted={highlighted || undefined}
      data-active={active || undefined}
      data-muted={muted || undefined}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'w-full shrink-0 rounded-xl border p-3',
        highlighted ? 'border-brand-orange bg-brand-orange-soft/50' : 'bg-card'
      )}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: pricingEase }}
    >
      <p className='flex items-center gap-2'>
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            highlighted ? 'bg-brand-orange text-brand-orange-foreground' : 'bg-primary text-primary-foreground'
          )}
        >
          {badge}
        </span>
        <span className={cn('text-sm font-medium', highlighted && 'text-brand-orange')}>{t(step)}</span>
      </p>
      <div className='mt-2.5 flex items-start gap-2.5'>
        <Icon
          aria-hidden
          className={cn('size-8 shrink-0', highlighted ? 'text-brand-orange' : 'text-primary')}
          strokeWidth={1.5}
        />
        <p className='text-muted-foreground text-[11px] leading-snug text-pretty'>{t(`${step}Body`)}</p>
      </div>
    </motion.div>
  )
}

/** Bảng "Giá trị khách hàng nhận được". */
/** Icon đứng trước tên từng hàng giá trị (Hình S19). */
const VALUE_ICONS: Record<SupervisionValueRowKey, typeof ShieldCheck> = {
  calm: ShieldCheck,
  transparent: FileText,
  quality: ClipboardCheck,
  handover: House
}

function ValueTable() {
  const t = useTranslations('supervision.pricing.value')
  const tTiers = useTranslations('supervision.tiers')

  return (
    <section className='supervision-value'>
      <motion.h2
        className='text-primary-strong text-center text-xl font-semibold tracking-wide uppercase'
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.65 }}
        transition={{ duration: 0.5, ease: pricingEase }}
      >
        {t('title')}
      </motion.h2>

      <div className='bg-card mt-5 overflow-x-auto rounded-2xl border'>
        <table className='w-full min-w-[640px] border-collapse text-sm'>
          <thead>
            {/* `divide-x` kẻ vạch dọc giữa các cột, giống bảng phụ phí. */}
            <tr className='bg-muted/40 divide-x text-xs'>
              <th className='border-b p-3 text-left font-medium' />
              {SUPERVISION_TIERS.map((tier) => (
                <th
                  key={tier}
                  className={cn(
                    'border-b p-3 text-center font-semibold tracking-wide uppercase',
                    tier === 'control' ? 'text-brand-orange bg-brand-orange-soft/35' : 'text-primary-strong'
                  )}
                >
                  {tTiers(tier)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUPERVISION_VALUE_ROWS.map((row, index) => (
              <motion.tr
                key={row}
                className='supervision-value-row divide-x border-b even:bg-muted/20'
                initial={{ opacity: 0, y: 7 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.44, delay: index * 0.1, ease: pricingEase }}
              >
                <th className='bg-card text-primary-strong sticky left-0 z-10 w-52 p-3.5 text-left text-sm font-medium'>
                  <motion.span
                    className='flex items-center gap-2.5'
                    initial={{ opacity: 0, x: -4 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.18 }}
                  >
                    {(() => {
                      const Icon = VALUE_ICONS[row]
                      return <Icon aria-hidden className='supervision-value-icon text-primary size-4 shrink-0' />
                    })()}
                    {t(`rows.${row}`)}
                  </motion.span>
                </th>
                {SUPERVISION_TIERS.map((tier, tierIndex) => (
                  <td
                    key={tier}
                    className={cn('p-3.5 text-center text-xs text-pretty', tier === 'control' && CONTROL_COLUMN)}
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 5 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.32, delay: index * 0.1 + 0.3 + tierIndex * 0.09 }}
                    >
                      {t(`cells.${row}.${tier}`)}
                    </motion.span>
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function GroupRow({ label }: { label: string }) {
  return (
    <motion.tr
      initial={{ opacity: 0, scaleX: 0.15 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.58, delay: 0.18, ease: pricingEase }}
      style={{ transformOrigin: 'left center' }}
      className='supervision-comparison-group'
    >
      <th
        colSpan={SUPERVISION_TIERS.length + 1}
        className='bg-primary text-primary-foreground p-2.5 text-left text-xs font-semibold tracking-wide uppercase'
      >
        {label}
      </th>
    </motion.tr>
  )
}

function CoreRow({
  label,
  values,
  index,
  priceRow = false,
  hoveredColumn,
  onHoverColumn
}: {
  label: string
  values: Array<string | number>
  index: number
  priceRow?: boolean
  hoveredColumn: SupervisionTier | null
  onHoverColumn: (tier: SupervisionTier) => void
}) {
  const [pricesStarted, setPricesStarted] = useState(false)
  return (
    <motion.tr
      className='supervision-comparison-row divide-border divide-x'
      initial={{ opacity: 0, y: 7 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => {
        if (priceRow) setPricesStarted(true)
      }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.52, delay: 0.28 + index * 0.075, ease: pricingEase }}
    >
      <th className='bg-card sticky left-0 z-10 p-3 text-left text-xs font-medium'>{label}</th>
      {/* `values` xếp theo SUPERVISION_TIERS nên ô cuối luôn là cột CONTROL. */}
      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          onMouseEnter={() => {
            const tier = SUPERVISION_TIERS[index]
            if (tier) onHoverColumn(tier)
          }}
          className={cn(
            'supervision-comparison-cell p-3 text-center text-xs font-medium',
            SUPERVISION_TIERS[index] === 'control' && 'supervision-control-column bg-brand-orange-soft/60',
            hoveredColumn === SUPERVISION_TIERS[index] && 'is-column-hovered'
          )}
        >
          {priceRow ? <SupervisionTablePrice value={Number(value)} index={index} started={pricesStarted} /> : value}
        </td>
      ))}
    </motion.tr>
  )
}

function SupervisionTablePrice({ value, index, started }: { value: number; index: number; started: boolean }) {
  const locale = useLocale() as Locale
  const final = formatCurrency(value, locale)
  return (
    <motion.span
      className='supervision-table-price inline-block tabular-nums'
      initial={false}
      animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
      transition={{ duration: 0.34, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {final}
    </motion.span>
  )
}

function Cell({
  value,
  label,
  index
}: {
  value: SupervisionCell
  label: (key: SupervisionValueKey) => string
  index: number
}) {
  if (value === true)
    return (
      <Check
        className='supervision-table-tick text-primary mx-auto size-4'
        strokeWidth={2.5}
        style={{ '--tick-delay': `${index * 0.08}s` } as CSSProperties}
      />
    )
  if (value === false) return <Minus className='text-muted-foreground mx-auto size-4' />
  return <span className='text-pretty'>{label(value)}</span>
}
