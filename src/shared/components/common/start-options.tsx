'use client'

import { ArrowRight, CalendarClock, CircleCheck, Gift, HardHat, Loader2, Search, Star } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useCmsCollection, type PlanGift } from '@/shared/cms'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/utils'
import { revealEase } from './reveal'
import { TurnkeyRequestDialog } from './turnkey-request-dialog'

interface StartOptionsProps {
  /** Đích của lựa chọn 1 — trang nhà thầu đề xuất của dự án vừa tạo (S12). */
  findHref: string
  /**
   * Bấm "Tìm nhà thầu" — chỉ nơi gọi từ luồng hồ sơ dự án (S11) mới cần, để
   * đánh dấu cho S12 biết vừa từ đây sang (thẻ đầu viền loé, tick "Vì sao đề
   * xuất" chạy chậm hơn). `checkout` (S08) không truyền prop này.
   */
  onFindNavigate?: () => void
  /** Gói thiết kế đang hoạt động đã bao gồm quyền tư vấn 1:1. */
  hasPlan?: boolean
  /** Báo cho lớp bọc biết một liên kết sắp điều hướng để đóng hộp chọn và giữ progress ở ngoài. */
  onNavigateStart?: () => void
  /** Lớp bọc hộp thoại tự quản lý luồng mở form trọn gói để hộp chọn đóng trước. */
  onTurnkeySelect?: () => void
  /** Hộp thoại render progress ở lớp ngoài vì nội dung sẽ unmount ngay khi đóng. */
  showRouteProgress?: boolean
  /** Choreography riêng của S08: trái → giữa → phải, badge/đặc quyền đứng yên. */
  completionMode?: boolean
  /** Cho phép lớp gọi bỏ entrance khi quay lại bằng Back/Forward trong cùng document. */
  animateEntrance?: boolean
}

/**
 * Ba lựa chọn "Bạn muốn bắt đầu như thế nào?" — khối chung của S08 và S11 (R7).
 *
 * Nằm ở `shared/` vì HAI feature dùng nó: `checkout` hiển thị sau khi thanh toán
 * xong (S08) và `contractors` mở nó sau khi chốt hồ sơ ở Bước 2 (S11) — mà hai
 * feature thì không được import lẫn nhau.
 *
 * Bản mô tả gọi đây là "popup" nhưng ở S08 nó là một phần của trang Hoàn tất.
 * Nên component tách làm hai: {@link StartOptions} là ba thẻ (dùng inline ở S08)
 * và {@link StartOptionsDialog} bọc chúng trong hộp thoại (dùng ở S11). Cùng một
 * nội dung, hai bối cảnh, không phải hai bản dựng.
 */
export function StartOptions({
  findHref,
  onFindNavigate,
  hasPlan = false,
  onNavigateStart,
  onTurnkeySelect,
  showRouteProgress = true,
  completionMode = false,
  animateEntrance = true
}: StartOptionsProps) {
  // Quà tặng lấy từ kho nội dung (gói nào có quà thì dùng gói đó) — admin sửa
  // một chỗ là cả S01, S02 lẫn thẻ này đổi theo.
  const gift = useCmsCollection('plans').find((plan) => plan.gift)?.gift
  const consultPackages = useCmsCollection('consultPackages')
  const t = useTranslations('contractors.start')
  const locale = useLocale() as Locale
  const [turnkeyOpen, setTurnkeyOpen] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)

  const consultationPrice = consultPackages
    .filter((item) => item.enabled && item.price > 0)
    .sort((a, b) => a.price - b.price)[0]?.price

  const startNavigation = () => {
    setRouteLoading(true)
    onNavigateStart?.()
  }

  /**
   * Rê một thẻ → hai thẻ còn lại mờ đi và lùi nhẹ (mục 3/4 của M04) — trạng
   * thái nâng lên cấp cha vì ba thẻ là anh em, hiệu ứng của thẻ này ảnh hưởng
   * tới hai thẻ kia.
   */
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <>
      {showRouteProgress ? <RouteProgress active={routeLoading} /> : null}
      {/*
    // Hình S08 đo theo pixel: khe giữa hai thẻ là 13.25px trên 529.5px bề ngang
    // cụm ba thẻ = 2.5%. Để phần trăm để tỉ lệ giữ nguyên ở mọi khổ màn.
      */}
      <ul className='grid items-stretch gap-x-[2.5%] gap-y-6 pt-4 md:grid-cols-3'>
        <OptionCard
          index={1}
          icon={Search}
          title={t('find.title')}
          subtitle={t('find.subtitle')}
          points={[t('find.p1'), t('find.p2'), t('find.p3'), t('find.p4'), t('find.p5'), t('find.p6')]}
          action={
            <OptionButton
              className='brand-green-button'
              href={findHref}
              label={t('find.action')}
              onClick={onFindNavigate}
              onNavigateStart={startNavigation}
            />
          }
          revealDelay={completionMode ? 1.95 : 0.15}
          completionMode={completionMode}
          animateEntrance={animateEntrance}
          hovered={hoveredIndex === 1}
          dimmed={!completionMode && hoveredIndex !== null && hoveredIndex !== 1}
          onHoverChange={(active) => setHoveredIndex(active ? 1 : null)}
        />

        <OptionCard
          index={2}
          icon={HardHat}
          highlighted
          title={t('turnkey.title')}
          subtitle={t('turnkey.subtitle')}
          points={[t('turnkey.p1'), t('turnkey.p2'), t('turnkey.p3'), t('turnkey.p4'), t('turnkey.p5')]}
          gift={gift}
          action={
            <>
              {/* S08: "Đăng ký triển khai → form đăng ký, Ops liên hệ" — nút mở
                form thật, không còn chỉ bắn toast. */}
              <OptionButton
                className='brand-orange-button'
                label={t('turnkey.action')}
                onClick={() => (onTurnkeySelect ? onTurnkeySelect() : setTurnkeyOpen(true))}
                deferAction
              />
              <TurnkeyRequestDialog open={turnkeyOpen} onOpenChange={setTurnkeyOpen} />
            </>
          }
          // S11 giữ thứ tự cũ; riêng S08 theo yêu cầu mới: trái → giữa → phải.
          revealDelay={completionMode ? 2.12 : 0}
          completionMode={completionMode}
          animateEntrance={animateEntrance}
          hovered={hoveredIndex === 2}
          dimmed={!completionMode && hoveredIndex !== null && hoveredIndex !== 2}
          onHoverChange={(active) => setHoveredIndex(active ? 2 : null)}
        />

        <OptionCard
          index={3}
          icon={CalendarClock}
          title={t('expert.title')}
          subtitle={t('expert.subtitle')}
          points={[t('expert.p1'), t('expert.p2'), t('expert.p3')]}
          included={hasPlan}
          value={
            hasPlan
              ? t('expert.included')
              : consultationPrice
                ? t('expert.priceFrom', { price: formatCurrency(consultationPrice, locale) })
                : t('expert.viewPricing')
          }
          revealDelay={completionMode ? 2.29 : 0.15}
          completionMode={completionMode}
          animateEntrance={animateEntrance}
          hovered={hoveredIndex === 3}
          dimmed={!completionMode && hoveredIndex !== null && hoveredIndex !== 3}
          onHoverChange={(active) => setHoveredIndex(active ? 3 : null)}
          action={
            // Hình S08: nút của Lựa chọn 3 là nút VIỀN XANH, chữ xanh (không phải
            // viền xám mặc định).
            <OptionButton
              variant='outline'
              className='border-primary text-primary-strong hover:bg-accent border-[1.5px]'
              href={ROUTES.CONSULT}
              label={t('expert.action')}
              onNavigateStart={startNavigation}
            />
          }
        />
      </ul>
    </>
  )
}

/**
 * Nút đáy thẻ — Hình S08: chữ CANH GIỮA thẻ còn mũi tên DÍNH LỀ PHẢI, nên mũi
 * tên phải nằm tuyệt đối chứ không đi kèm chữ trong cùng một flexbox.
 */
function OptionButton({
  label,
  href,
  onClick,
  onNavigateStart,
  deferAction = false,
  className,
  variant
}: {
  label: string
  href?: string
  onClick?: () => void
  onNavigateStart?: () => void
  deferAction?: boolean
  className?: string
  variant?: 'outline'
}) {
  // Bấm → vòng xoay trong lúc trang đích tải (mục 6). Chỉ nút dẫn ĐI TIẾP
  // (có `href`) mới cần: nút mở hộp thoại tại chỗ (Đăng ký triển khai) không
  // có độ trễ điều hướng nào để che.
  const [navigating, setNavigating] = useState(false)
  const actionTimerRef = useRef<number | null>(null)
  const actionLockRef = useRef(false)

  useEffect(
    () => () => {
      if (actionTimerRef.current !== null) window.clearTimeout(actionTimerRef.current)
    },
    []
  )

  const content = (
    <>
      {label}
      {navigating ? (
        <Loader2 className='absolute right-4 size-4 animate-spin' />
      ) : (
        <ArrowRight className='absolute right-4 size-4 transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none' />
      )}
    </>
  )
  // `px-10` giữ chỗ cho mũi tên ở cả HAI bên: chữ canh giữa nên chỉ chừa lề
  // phải thì nhãn dài (bản EN "Register for full delivery") sẽ đè lên mũi tên.
  const classes = cn(
    'group relative h-12 w-full justify-center px-10 text-sm font-bold tracking-wide uppercase transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none',
    className
  )

  if (href) {
    return (
      <Button
        asChild
        variant={variant}
        className={classes}
        aria-busy={navigating}
        onClick={(event) => {
          if (actionLockRef.current) {
            event.preventDefault()
            return
          }
          actionLockRef.current = true
          setNavigating(true)
          onClick?.()
          onNavigateStart?.()
        }}
      >
        <Link href={href}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      className={classes}
      disabled={navigating}
      aria-busy={navigating}
      onClick={() => {
        if (actionLockRef.current) return
        actionLockRef.current = true
        setNavigating(true)
        if (!deferAction) {
          onClick?.()
          setNavigating(false)
          actionLockRef.current = false
          return
        }
        actionTimerRef.current = window.setTimeout(() => {
          onClick?.()
          setNavigating(false)
          actionLockRef.current = false
        }, 180)
      }}
    >
      {content}
    </Button>
  )
}

/** Vạch phản hồi tức thì trong khoảng chờ router thay màn hình. */
function RouteProgress({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          aria-hidden
          className='bg-primary/15 pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.span
            className='bg-primary block h-full origin-left'
            initial={{ scaleX: reduceMotion ? 0.75 : 0.08 }}
            animate={{ scaleX: reduceMotion ? 0.75 : 0.82 }}
            transition={{ duration: reduceMotion ? 0 : 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

interface StartOptionsDialogProps extends StartOptionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Bản hộp thoại — dùng sau khi khách chốt hồ sơ ở Bước 2 (S11, R7). */
export function StartOptionsDialog({ open, onOpenChange, findHref, onFindNavigate, hasPlan }: StartOptionsDialogProps) {
  const t = useTranslations('contractors.start')
  const [routeLoading, setRouteLoading] = useState(false)
  const [turnkeyOpen, setTurnkeyOpen] = useState(false)

  // Không thao tác một lúc → dòng phụ đổi sang nhắc "vẫn đổi được sau" (mục 2).
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đặt lại khi hộp thoại đóng để lần mở sau bắt đầu từ dòng phụ mặc định, không phải đồng bộ dữ liệu
      setIdle(false)
      return
    }
    const timer = window.setTimeout(() => setIdle(true), 6000)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mỗi lần mở là một lượt điều hướng mới
      setRouteLoading(false)
    }
  }, [open])

  return (
    <>
      <RouteProgress active={routeLoading} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* `sm:` là bắt buộc: DialogContent của shadcn đã có `sm:max-w-lg`, một
          class `max-w-4xl` trần sẽ thua nó từ breakpoint sm trở lên và hộp thoại
          bị bóp lại thành ba cột hẹp.

          `max-h-[92dvh]` + bản gọn của {@link StartOptions}: cốt để hộp thoại
          nằm trọn trong màn hình, không đẻ ra thanh cuộn. `dvh` chứ không `vh`
          vì trên di động thanh địa chỉ thu vào/nhả ra làm `vh` sai. */}
        <DialogContent className='max-h-[92dvh] sm:max-w-4xl'>
          <DialogHeader>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <DialogTitle>{t('title')}</DialogTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <AnimatePresence mode='wait'>
                <motion.div
                  key={idle ? 'idle' : 'default'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogDescription>{idle ? t('idleSubtitle') : t('subtitle')}</DialogDescription>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </DialogHeader>
          <ScaleToFit>
            <StartOptions
              findHref={findHref}
              onFindNavigate={onFindNavigate}
              hasPlan={hasPlan}
              onNavigateStart={() => {
                setRouteLoading(true)
                onOpenChange(false)
              }}
              onTurnkeySelect={() => {
                onOpenChange(false)
                setTurnkeyOpen(true)
              }}
              showRouteProgress={false}
            />
          </ScaleToFit>
        </DialogContent>
      </Dialog>
      <TurnkeyRequestDialog open={turnkeyOpen} onOpenChange={setTurnkeyOpen} />
    </>
  )
}

/**
 * Thu nhỏ nguyên khối con cho vừa màn hình.
 *
 * Ba lựa chọn ở S08 vốn là một phần của TRANG nên cao bao nhiêu cũng được; nhét
 * vào hộp thoại ở S11 thì cao quá màn và đẻ ra thanh cuộn — đúng thứ popup này
 * sinh ra để tránh. Cách xử lý là THU NHỎ ĐỀU bằng `transform: scale`, giữ
 * nguyên mọi tỉ lệ và cỡ chữ tương đối, thay vì đi sửa từng class (sửa từng
 * class là đổi thiết kế, không phải thu nhỏ).
 *
 * `transform` không làm co chỗ nó chiếm trong luồng bố cục, nên lớp bọc ngoài
 * phải tự đặt lại chiều cao = chiều cao thật × hệ số; thiếu bước này thì hộp
 * thoại vẫn chừa khoảng trống bằng kích thước gốc.
 */
function ScaleToFit({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [{ scale, height }, setBox] = useState({ scale: 1, height: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const node = inner.current
      const dialog = node?.closest('[role="dialog"]')
      if (!node || !(dialog instanceof HTMLElement)) return

      const natural = node.offsetHeight
      if (!natural) return

      // Mobile giữ kích thước đọc được và dùng cuộn dọc của DialogContent.
      if (window.innerWidth < 768) {
        setBox({ scale: 1, height: natural })
        return
      }

      // Chỗ còn lại = trần chiều cao hộp thoại − phần đã dùng phía trên khối này
      // − lề dưới của hộp thoại.
      const ceiling = window.innerHeight * 0.92
      const used = node.getBoundingClientRect().top - dialog.getBoundingClientRect().top
      const padBottom = Number.parseFloat(getComputedStyle(dialog).paddingBottom) || 0
      // Trừ hao 4px: `max-h-[92dvh]` ra số lẻ (vd 619.712px) nên chỉ cần dôi
      // NỬA pixel là `overflow-y: auto` của hộp thoại đã bật thanh cuộn.
      const next = Math.min(1, (ceiling - used - padBottom - 4) / natural)

      setBox({ scale: next, height: Math.floor(natural * next) })
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div style={{ height: height || undefined }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {children}
      </div>
    </div>
  )
}

function OptionCard({
  index,
  icon: Icon,
  title,
  subtitle,
  points,
  action,
  gift,
  included = false,
  value,
  highlighted = false,
  revealDelay = 0,
  completionMode = false,
  animateEntrance = true,
  hovered = false,
  dimmed = false,
  onHoverChange
}: {
  index: number
  icon: typeof Search
  title: string
  subtitle: string
  points: string[]
  action: React.ReactNode
  /** Quà tặng in trong thẻ "Triển khai trọn gói" (Hình S08). */
  gift?: PlanGift
  included?: boolean
  value?: string
  highlighted?: boolean
  /** Thứ tự hiện: thẻ giữa trước, rồi trái, rồi phải (mục 3/4). */
  revealDelay?: number
  completionMode?: boolean
  animateEntrance?: boolean
  /** Đang được rê tới (mục 3/4) — nâng nhẹ + viền màu + bóng rộng. */
  hovered?: boolean
  /** MỘT thẻ khác đang được rê — thẻ này mờ đi + lùi nhẹ (mục 3/4). */
  dimmed?: boolean
  onHoverChange?: (hovered: boolean) => void
}) {
  const t = useTranslations('contractors.start')
  const tGift = useTranslations('plans.gift')
  const reduceMotion = useReducedMotion()

  return (
    // Thẻ hiện lần lượt lúc mở (mục 3/4) — CHỈ MỘT LẦN lúc mount, tách khỏi
    // hiệu ứng rê bên dưới để không bị chồng thời lượng lên nhau.
    <motion.li
      initial={reduceMotion || !animateEntrance ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion || !animateEntrance ? 0 : 0.5,
        delay: reduceMotion || !animateEntrance ? 0 : revealDelay,
        ease: revealEase
      }}
      // Mobile: thẻ phổ biến nhất lên đầu (mục 4); máy tính giữ đúng thứ tự cột.
      className={cn('relative flex', highlighted && !completionMode && 'order-first md:order-none')}
    >
      {/* Nâng nhẹ khi rê tới, mờ + lùi khi MỘT thẻ khác đang được rê (mục 3/4). */}
      <motion.div
        animate={{
          y: reduceMotion ? 0 : hovered ? -6 : 0,
          scale: reduceMotion ? 1 : dimmed ? 0.97 : 1,
          opacity: dimmed ? 0.6 : 1
        }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        className='relative flex w-full'
      >
        {/* Hình S08: thẻ giữa KHÔNG có viên nhãn "Lựa chọn 2" — thay vào đó là một
          viên nhãn cam vắt ngang mép trên. Đo trên ảnh: viên nhãn rộng 109px
          trên thẻ rộng 172px = 63%, tức nó ÔM LẤY CHỮ và canh giữa, không kéo
          dài gần hết bề ngang thẻ (ghi chú "266/279" của bản trước đo sai, nên
          hai bên thừa một mảng cam trống). Cao 14px trên ảnh = 28px khổ thật,
          nhô lên khỏi mép thẻ 4px = 8px. */}
        {highlighted ? (
          <motion.span
            initial={reduceMotion || !animateEntrance ? false : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion || !animateEntrance
                ? { duration: 0 }
                : {
                    type: 'spring',
                    bounce: 0.55,
                    duration: 0.5,
                    delay: completionMode ? 2.9 : revealDelay + 0.35
                  }
            }
            className='bg-brand-orange text-brand-orange-foreground absolute -top-2 left-1/2 z-10 inline-flex -translate-x-1/2 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase'
          >
            <Star className='size-3 fill-current' />
            {t('popular')}
          </motion.span>
        ) : null}

        {/* Viền màu + bóng rộng khi rê (mục 3/4) — overlay riêng, không đụng viền
          gốc của thẻ (`border-border`/`border-brand-orange` giữ nguyên). */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-px rounded-2xl border-2 opacity-0 shadow-xl transition-opacity duration-200',
            highlighted ? 'border-brand-orange' : 'border-primary',
            hovered && 'opacity-100'
          )}
        />

        <section
          className={cn(
            'bg-card flex w-full flex-col rounded-2xl border p-4',
            highlighted ? 'border-brand-orange pt-7 shadow-md' : 'border-border pt-5'
          )}
        >
          {/* Hình S08: nhãn "LỰA CHỌN n" là viên nhãn CÓ VIỀN, canh giữa; tiêu đề
            và câu dẫn cũng canh giữa. Thẻ 1 tiêu đề màu chữ thường, thẻ 2 màu
            cam, thẻ 3 màu xanh thương hiệu. */}
          {highlighted ? null : (
            <span className='text-muted-foreground mx-auto rounded-md border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase'>
              {t('option', { index })}
            </span>
          )}

          <div className={cn('text-center', highlighted ? '' : 'mt-3')}>
            <h3
              className={cn(
                'text-lg leading-tight font-bold text-pretty',
                highlighted ? 'text-brand-orange' : index === 3 ? 'text-primary-strong' : 'text-foreground'
              )}
            >
              {title}
            </h3>
            <p className='text-muted-foreground mt-1.5 text-xs leading-relaxed text-pretty'>{subtitle}</p>
          </div>

          {/* CHỖ CHỜ ASSET: hình minh hoạ của lựa chọn — ảnh 3D nền trắng, rộng
            bằng phần trong của thẻ.

            Ba con số đo trên Hình S08 quyết định bộ class dưới đây:
            - thẻ 1: khung 139×103px trên bề ngang trong thẻ 139px → 4:3 (bản
              trước để 3:2, đó là chỗ "tỉ lệ asset khác ảnh");
            - ảnh CO GIÃN theo chỗ trống: thẻ 1 có 6 ý nên khung cao 103px, thẻ
              3 chỉ 4 ý nên khung cao 136px — đúng bằng phần dôi ra. Nên khung
              phải `grow`, và danh sách ý KHÔNG được `flex-1`, nếu không chỗ
              trống dồn xuống thành khoảng hở trước nút như bản trước;
            - nhưng chỉ giãn tới 30–41% chiều cao thẻ (103/341 và 136/333), nên
              chặn `max-h-[40%]` — bỏ chặn thì thẻ 3 phình thành khung dọc. */}
          <div className='bg-muted/30 mt-3 flex aspect-[4/3] max-h-[40%] w-full grow items-center justify-center rounded-xl border border-dashed'>
            <motion.span
              animate={
                completionMode
                  ? { y: reduceMotion ? 0 : hovered ? -4 : 0 }
                  : reduceMotion
                    ? undefined
                    : { y: [0, -3, 0] }
              }
              transition={
                completionMode
                  ? { duration: reduceMotion ? 0 : 0.22, ease: revealEase }
                  : { duration: 4.8, delay: index * 0.25, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <Icon className='text-muted-foreground/50 size-8' />
            </motion.span>
          </div>

          {/* Hình S08: các ý cách nhau ~17px trên thẻ rộng 157px = ~37px ở khổ
            thật; `space-y-3` (12px) làm danh sách bó lại so với ảnh.
            Tick lần lượt (mục 3/4) — bắt đầu sau khi thẻ + minh hoạ đã hiện. */}
          <ul className='mt-4 space-y-4'>
            {points.map((point, pointIndex) => (
              <motion.li
                key={point}
                initial={reduceMotion || completionMode || !animateEntrance ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduceMotion || completionMode || !animateEntrance ? 0 : 0.35,
                  delay: reduceMotion || completionMode || !animateEntrance ? 0 : revealDelay + 0.4 + pointIndex * 0.08
                }}
                className='flex items-start gap-2.5 text-sm'
              >
                {/* Hình S08: dấu tick nằm TRONG VÒNG TRÒN — thẻ thường là vòng
                  tròn viền xanh, thẻ nổi bật là vòng tròn cam ĐẶC, tick trắng. */}
                <CircleCheck
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    highlighted ? 'fill-brand-orange text-white' : 'text-primary'
                  )}
                />
                <span className='text-pretty'>{point}</span>
              </motion.li>
            ))}
          </ul>

          {value ? (
            <motion.p
              initial={reduceMotion || completionMode || !animateEntrance ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion || completionMode || !animateEntrance ? 0 : 0.35,
                delay:
                  reduceMotion || completionMode || !animateEntrance ? 0 : revealDelay + 0.45 + points.length * 0.08
              }}
              className={cn(
                'mt-4 flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-xs font-semibold',
                included ? 'bg-accent text-primary-strong' : 'bg-muted/45 text-foreground'
              )}
            >
              {included ? (
                <motion.span
                  initial={reduceMotion || completionMode || !animateEntrance ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={
                    reduceMotion || completionMode || !animateEntrance
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 18, delay: revealDelay + 0.55 }
                  }
                >
                  <CircleCheck className='text-primary size-4' />
                </motion.span>
              ) : null}
              <span>{value}</span>
            </motion.p>
          ) : null}

          {/* Hình S08: thẻ "Triển khai trọn gói" có khối ĐẶC QUYỀN DÀNH RIÊNG —
            hộp quà bên TRÁI, chữ canh trái bên phải, rồi dòng điều kiện in
            nghiêng chạy hết bề ngang khối. */}
          {gift ? (
            <motion.section
              data-completion-exclusive={completionMode ? 'true' : undefined}
              initial={completionMode || !animateEntrance ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: completionMode || !animateEntrance ? 0 : 0.4,
                delay: completionMode || !animateEntrance ? 0 : revealDelay + 0.4 + points.length * 0.08
              }}
              className='bg-brand-orange-soft/70 relative mt-4 overflow-hidden rounded-xl p-3'
            >
              {completionMode ? null : (
                <motion.span
                  aria-hidden
                  initial={{ x: '-120%' }}
                  animate={{ x: '320%' }}
                  transition={{ duration: 1.3, ease: 'easeInOut', delay: 1.4, repeat: 2, repeatDelay: 3 }}
                  className='pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent'
                />
              )}
              <div className='flex items-start gap-3'>
                {/* CHỖ CHỜ ASSET: hộp quà 3D của khách. */}
                <Gift className='text-brand-orange mt-0.5 size-10 shrink-0' strokeWidth={1.75} />
                <div className='min-w-0 flex-1'>
                  <p className='text-brand-orange text-[11px] font-bold tracking-wide uppercase'>{t('exclusive')}</p>
                  <p className='mt-0.5 text-xs leading-relaxed text-pretty'>
                    {gift.title} {tGift('valuePrefix')}{' '}
                    <span className='text-brand-orange font-extrabold uppercase'>
                      {/* `shared/` không được import từ `features/`, nên quy đổi triệu
                        tính tại chỗ thay vì gọi service của feature `plans`. */}
                      {gift.value % 1_000_000 === 0
                        ? `${gift.value / 1_000_000} ${tGift('valueMillionsUnit')}`
                        : new Intl.NumberFormat('vi-VN').format(gift.value) + 'đ'}
                    </span>
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground mt-2 text-[10px] leading-relaxed text-pretty italic'>
                {gift.conditions}
              </p>
            </motion.section>
          ) : null}

          {/* `mt-auto` chứ không phải `mt-5`: danh sách ý không còn `flex-1` nên
            phải có thứ khác ghim nút xuống đáy, nếu không ba nút lệch nhau theo
            số ý của từng thẻ. Hình S08: ba nút thẳng hàng. */}
          <div className='mt-auto pt-5'>{action}</div>
        </section>
      </motion.div>
    </motion.li>
  )
}
