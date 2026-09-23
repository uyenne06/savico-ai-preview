'use client'

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileLock2,
  Handshake,
  House,
  Info,
  Link2,
  Lock,
  Map as MapIcon,
  MapPin,
  SquarePen,
  Shield,
  ShieldCheck,
  User,
  Star,
  Users,
  X
} from 'lucide-react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants
} from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useAuth, useAuthDialogStore } from '@/shared/auth'
import { useCmsDocument } from '@/shared/cms'
import { Photo, revealContainerVariants, revealEase, revealItemVariants } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { CONTRACTOR_PREVIEW_ID, contractorFirmRoute, contractorMatchesRoute } from '@/shared/constants/routes'
import { useDwellNudge } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatNumber } from '@/shared/utils'
import {
  CONSTRUCTION_SCOPES,
  CONTRACTOR_SORTS,
  MATCHES_PINNED_CONTRACTOR_KEY,
  PROJECT_SCALES,
  SEARCH_RADII,
  START_WINDOWS
} from '../constants/contractors.constants'
import { CONTRACTORS_SEED } from '../api/contractors.seed'
import { useBriefs, useCreateBrief, useCreateBriefFromDesign } from '../hooks/use-brief'
import { filterContractors } from '../services/contractor-list.service'
import type { Contractor, ContractorSort, SearchRadiusKm } from '../types/contractor.types'
import { ContractorLogo } from './contractor-logo'
import { PartnerRegistrationDialog } from './partner-registration-dialog'

/**
 * Bề ngang phần nội dung của S09.
 *
 * Đo trên Hình S09 (ảnh gốc 450px): nội dung chạy từ x=13 đến x=437, tức
 * 424/450 = 94% bề ngang trang — gần y hệt Hình S08 (93.5%). `max-w-6xl` của
 * bản trước chỉ cho 1088px nội dung, hẹp hơn ảnh gần 25% nên mọi khối bên trong
 * đều bị bóp lại.
 *
 * Trần chốt ở **76rem (1216px)** chứ không phải 1480px: hero đã được thu về khổ
 * này theo yêu cầu của khách, nên các khối bên dưới phải cùng khổ thì cả trang
 * mới thẳng lề và cùng một cỡ. Mọi số đo bên trong đều là PHẦN TRĂM của bề ngang
 * này, nên đổi trần không làm sai tỉ lệ nào — chỉ thu nhỏ đều toàn bộ.
 */
const PAGE_CONTAINER = 'mx-auto w-[94%] max-w-[76rem]'

/** Ba thẻ của khối "An toàn & minh bạch" (Hình S09), theo đúng thứ tự trong ảnh. */
const SAFETY_CARDS = [{ key: 'privacy' }, { key: 'record' }, { key: 'review' }] as const

/**
 * Hình minh hoạ của một thẻ "An toàn & minh bạch".
 *
 * Ảnh vẽ ba hình mà lucide không có sẵn glyph tương đương, nên ghép lại:
 * - `privacy`: cái KHIÊN lồng Ổ KHOÁ → chồng `Lock` vào giữa `Shield`;
 * - `record`: tài liệu có ổ khoá → `FileLock2` khớp sẵn;
 * - `review`: NĂM NGÔI SAO cam nằm trên một NHÓM NGƯỜI → xếp hàng sao rồi tới
 *   `Users`. Dùng mỗi `Star` như bản trước thì mất hẳn phần "khách hàng thật",
 *   mà đó mới là ý của thẻ.
 *
 * Cỡ icon đo được là 24.4% bề ngang thẻ. Chữ trong ảnh demo lớn hơn khổ thật
 * khoảng 1.4 lần (xem ghi chú ở hero), nên bê nguyên 24.4% thì icon át hết chữ;
 * dùng 17.5% bề ngang thẻ = 24.4% × 0.72, đúng hệ số đã áp cho hero.
 *
 * Viết thành `w-[20.6%]` chứ không phải `w-[17.5%]`: phần trăm ở đây tính theo
 * HỘP NỘI DUNG của thẻ (đã trừ lề 7.4% mỗi bên), nên 17.5% bề ngang thẻ tương
 * đương 20.6% hộp nội dung.
 */
function SafetyIcon({ kind }: { kind: (typeof SAFETY_CARDS)[number]['key'] }) {
  const reduceMotion = useReducedMotion()
  return (
    // Ô vuông có kích thước XÁC ĐỊNH là bắt buộc: icon lucide mang sẵn thuộc
    // tính `height="24"`, nên nếu chỉ đặt `w-[…%]` thì bề ngang co giãn còn
    // chiều cao đứng nguyên 24px và hình bị dẹt. Cho ô bọc `aspect-square` rồi
    // để icon bên trong đo bằng `size-*` (đặt cả hai chiều) thì mới đúng.
    <motion.span
      aria-hidden
      // Mục 5: icon vẽ nét sau khi thẻ đứng yên — `strokeDasharray`/`-offset`
      // là thuộc tính SVG được KẾ THỪA, đặt trên span cha thì path con nhận
      // luôn mà không cần biết hình dạng cụ thể (giống kỹ thuật ở "4 cam kết").
      initial={reduceMotion ? false : { strokeDashoffset: 90 }}
      whileInView={{ strokeDashoffset: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, delay: 0.4, ease: revealEase }}
      style={{ strokeDasharray: 90 }}
      className='relative flex aspect-square w-[20.6%] min-w-12 shrink-0 items-center justify-center'
    >
      {kind === 'record' ? <FileLock2 className='text-primary size-full' strokeWidth={1.25} /> : null}

      {kind === 'review' ? (
        <span className='flex size-full flex-col items-center justify-center gap-1'>
          {/* Cỡ sao để CỐ ĐỊNH chứ không theo %: hàng sao không có chiều cao xác
              định nên `size-[14%]` không phân giải được chiều cao và sao biến
              mất. Mục 6: mỗi sao phóng vào với nảy nhẹ, lần lượt, sau khi thẻ hiện. */}
          <span className='flex gap-0.5'>
            {[0, 1, 2, 3, 4].map((star) => (
              <motion.span
                key={star}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.3 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.5 + star * 0.08 }}
              >
                <Star className='text-warning size-3 fill-current' />
              </motion.span>
            ))}
          </span>
          <Users className='text-primary size-[72%]' strokeWidth={1.25} />
        </span>
      ) : null}

      {kind === 'privacy' ? (
        <>
          <Shield className='text-primary size-full' strokeWidth={1.25} />
          {/* Mục 5 (★ thẻ 1): quai khoá hạ xuống một nhịp khi rê thẻ — gợi cảm
              giác "đóng" lại. `group` nằm ở thẻ <li> bao ngoài. */}
          <Lock
            className='text-primary absolute size-[32%] transition-transform duration-300 group-hover:translate-y-[15%]'
            strokeWidth={1.75}
          />
        </>
      ) : null}
    </motion.span>
  )
}

/** Ba cột minh hoạ của bảng "So sánh minh bạch" (Hình S09). */
const COMPARE_COLUMNS = ['a', 'b', 'c'] as const

/** Năm dòng tiêu chí của bảng "So sánh minh bạch", theo đúng thứ tự trong ảnh. */
const COMPARE_ROWS = ['duration', 'scope', 'material', 'warranty', 'remark'] as const

/** Dòng nào của bảng so sánh có thể xếp "tốt hơn", và chiều so sánh của dòng đó. */
const COMPARE_BETTER_DIRECTION: Partial<Record<(typeof COMPARE_ROWS)[number], 'min' | 'max'>> = {
  duration: 'min',
  warranty: 'max'
}

/** Lấy số đứng đầu trong một chuỗi kiểu "120 ngày" / "24 tháng" để so sánh được. */
function parseLeadingNumber(text: string): number | null {
  const match = /\d+/.exec(text)
  return match ? Number(match[0]) : null
}

/** Biến thể chuyển động cho từng HÀNG của bảng so sánh — tự dàn nhịp cho 3 Ô bên trong. */
const compareRowVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: revealEase, staggerChildren: 0.09 } }
} satisfies Variants

/** Biến thể cho từng Ô giá trị (A/B/C) bên trong một hàng — nối tiếp trái sang phải. */
const compareCellVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: revealEase } }
} satisfies Variants

/** Huy hiệu "Tốt hơn" — phóng vào bằng spring nhẹ, dùng chung cho các hàng so được. */
const betterBadgeVariants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 340, damping: 18 } }
} satisfies Variants

/**
 * Sáu dòng thông số trong thẻ nhà thầu nổi trên bản đồ ở hero (Hình S09).
 *
 * Ảnh vẽ chúng thành hai cột NHÃN — GIÁ TRỊ, mỗi dòng một icon; khác hẳn dãy
 * chip của {@link ContractorStats} dùng ở S12/S13, nên dựng riêng thay vì nhồi
 * thêm một biến thể `variant` vào component kia.
 */
function AnimatedFactValue({ value, format }: { value: number; format: (value: number) => string }) {
  const reduceMotion = useReducedMotion()
  const progress = useMotionValue(reduceMotion ? value : 0)
  const text = useTransform(progress, format)

  useEffect(() => {
    if (reduceMotion) {
      progress.set(value)
      return
    }
    progress.set(0)
    const controls = animate(progress, value, { duration: 0.72, ease: 'easeOut' })
    return () => controls.stop()
  }, [progress, reduceMotion, value])

  return <motion.span>{text}</motion.span>
}

function HeroContractorFacts({ contractor }: { contractor: Contractor }) {
  const t = useTranslations('contractors.landing.hero.card')
  const tCommon = useTranslations('contractors.common')
  const locale = useLocale() as Locale

  const rows = [
    {
      key: 'distance',
      icon: MapPin,
      label: t('distance'),
      numericValue: contractor.distanceKm,
      format: (value: number) =>
        t('distanceValue', { km: formatNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })
    },
    {
      key: 'rating',
      icon: Star,
      label: t('rating'),
      numericValue: contractor.rating,
      format: (value: number) =>
        `${formatNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5`
    },
    {
      key: 'completed',
      icon: Building2,
      label: t('completed'),
      numericValue: contractor.completedProjects,
      format: (value: number) => t('completedValue', { count: Math.round(value) })
    },
    {
      key: 'similar',
      icon: CheckCircle2,
      label: t('similar'),
      numericValue: contractor.similarProjects,
      format: (value: number) => t('similarValue', { count: Math.round(value) })
    },
    {
      key: 'survey',
      icon: Clock,
      label: t('survey'),
      numericValue: contractor.surveyWithinHours,
      format: (value: number) => t('surveyValue', { hours: Math.round(value) })
    },
    {
      key: 'status',
      icon: BadgeCheck,
      label: t('status'),
      value: contractor.acceptingProjects ? tCommon('accepting') : tCommon('notAccepting'),
      highlight: true
    }
  ] as const

  // Cỡ chữ và icon trong thẻ tính bằng `cqi` (1% bề ngang thẻ) chứ không phải
  // `text-sm`/`size-4` cố định: thẻ được đo theo % của khối bản đồ, nên khi khối
  // co lại (thu nhỏ hero, hay màn hẹp hơn) mà chữ đứng yên thì thẻ vỡ tỉ lệ
  // ngay. `@container` trên thẻ là thứ làm cho `cqi` có nghĩa.
  //
  // Đo trên Hình S09, thẻ rộng 135px: icon ở x=276, nhãn bắt đầu x=288, và cột
  // giá trị bắt đầu ở x=354 trong MỌI dòng — tức giá trị canh TRÁI theo một mốc
  // cố định (86/135 = 63.7% bề ngang thẻ), không phải canh phải như bản trước
  // (dòng "Đang nhận dự án" dài hơn hẳn nên canh phải là thấy ngay).
  return (
    <motion.ul
      variants={revealContainerVariants}
      initial='hidden'
      animate='show'
      className='mt-[9.1%] space-y-[5.2%] text-[4cqi]'
    >
      {rows.map((row) => (
        <motion.li
          key={row.key}
          variants={revealItemVariants}
          className='grid grid-cols-[6cqi_minmax(0,1fr)] items-center gap-x-[1.5cqi]'
        >
          {/* Hình S09: icon đầu dòng của MỌI dòng đều màu xanh thương hiệu —
              kể cả dòng "Đánh giá". Ngôi sao vàng là của GIÁ TRỊ "★ 4,8/5",
              đứng trước con số bên cột phải. */}
          <row.icon className='text-primary size-[4.6cqi] shrink-0' />
          <span className='grid grid-cols-[63.7%_minmax(0,1fr)] items-center'>
            <span className='text-muted-foreground truncate'>{row.label}</span>
            <span
              className={cn(
                'flex items-center gap-[1.2cqi] font-semibold',
                'highlight' in row && row.highlight ? 'text-primary-strong' : 'text-foreground'
              )}
            >
              {row.key === 'rating' ? <Star className='text-warning size-[4cqi] shrink-0 fill-current' /> : null}
              {'numericValue' in row ? <AnimatedFactValue value={row.numericValue} format={row.format} /> : row.value}
            </span>
          </span>
        </motion.li>
      ))}
    </motion.ul>
  )
}

/** Một dòng trong khối "Tìm đúng người theo đúng tiêu chí". */
interface CriterionItem {
  key: 'area' | 'type' | 'scale' | 'experience' | 'rating' | 'schedule'
  icon: typeof MapPin
}

/**
 * Sáu tiêu chí của khối "Tìm đúng người theo đúng tiêu chí" (mục 5).
 *
 * Icon đọc từ ảnh phóng 5.8× của Hình S09: ghim bản đồ · ngôi nhà · bảng kê ·
 * toà nhà · ngôi sao · lịch+đồng hồ. Bản trước dùng mũ bảo hộ cho "Loại công
 * trình" và thước cho "Quy mô công trình" — không có cái nào trong ảnh.
 */
const CRITERIA_ITEMS: readonly CriterionItem[] = [
  { key: 'area', icon: MapPin },
  { key: 'type', icon: House },
  { key: 'scale', icon: ClipboardList },
  { key: 'experience', icon: Building2 },
  { key: 'rating', icon: Star },
  { key: 'schedule', icon: CalendarClock }
] as const

/**
 * Landing "Tìm nhà thầu" (S09) — trang công khai, khách chưa đăng nhập cũng xem
 * được.
 *
 * Nội dung theo bản mô tả: hero → 4 cam kết → tiêu chí ghép → danh sách xếp hạng
 * 4 tab → so sánh minh bạch → an toàn & minh bạch → ranh giới dịch vụ → FAQ →
 * CTA → dải đối tác.
 *
 * Hai chỗ bám sát QUY TẮC chứ không bám ảnh demo:
 * - R1: câu trả lời FAQ nói rõ tối đa 3 nhà thầu, không phải "gửi càng nhiều
 *   càng dễ so sánh".
 * - R2/R3: khối "So sánh minh bạch" chỉ đối chiếu NĂNG LỰC, và có một dòng dẫn
 *   nói thẳng báo giá đến từ nhà thầu sau khảo sát, không nằm trên web.
 */

/**
 * Dự án thiết kế tối thiểu cần cho nhánh ★ "đã có gói" của khối "Ranh giới
 * dịch vụ" — kiểu cấu trúc CỤC BỘ (không import type từ `features/design`,
 * boundary cấm import chéo feature); `app/` truyền vào một `Project` thật,
 * khớp cấu trúc này là đủ.
 */
interface DesignHandoffProject {
  id: string
  name: string
  // Trùng đúng 5 khoá của `design.input.buildingType.options` — union CỤC BỘ,
  // không phải import `BuildingType` từ `features/design`.
  buildingType?: 'townhouse' | 'villa' | 'roofed' | 'garden' | 'apartment' | null
  floorArea?: number | null
}

interface ContractorLandingProps {
  /** "Đã có gói thiết kế + hồ sơ sẵn sàng" — ghép ở `app/` (xem `useDesignHandoff`). */
  designHandoff?: { ready: boolean; project: DesignHandoffProject | null }
}

export function ContractorLanding({ designHandoff }: ContractorLandingProps = {}) {
  const t = useTranslations('contractors.landing')
  const tRankTabs = useTranslations('contractors.landing.ranking.tabs')
  const tCommon = useTranslations('contractors.common')
  const tScope = useTranslations('contractors.scope')
  const tScale = useTranslations('contractors.scale')
  const tStartWindow = useTranslations('contractors.startWindow')
  const tGlobal = useTranslations('common')

  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()

  const { isAuthenticated } = useAuth()
  const openAuthDialog = useAuthDialogStore((s) => s.open)
  const createBrief = useCreateBrief()
  const router = useRouter()

  const [sort, setSort] = useState<ContractorSort>('match')

  /**
   * CHỖ CHỜ ASSET: Hình S09 vẽ một BẢN ĐỒ minh hoạ (nền xanh nhạt, vòng sóng
   * ra-đa, 5 ghim vị trí). Ảnh seed trong kho là ảnh chụp phố nên sai hẳn tinh
   * thần, vì vậy chỉ hiện ảnh khi admin đã thay bằng ảnh thật ở màn "Hình ảnh
   * site"; chưa thay thì để khung nét đứt như mọi chỗ chờ asset khác.
   */
  const mapImage = useCmsDocument('uiAssets')['map.contractors']?.trim()
  const [featuredContractorId, setFeaturedContractorId] = useState(CONTRACTORS_SEED[0]?.id ?? '')
  const featured = useMemo(
    () => CONTRACTORS_SEED.find((contractor) => contractor.id === featuredContractorId) ?? CONTRACTORS_SEED[0],
    [featuredContractorId]
  )
  const featuredHoverTimer = useRef<number | null>(null)
  const rankingSectionRef = useRef<HTMLElement>(null)
  const [rankingPulse, setRankingPulse] = useState(0)
  const [leavingForBrief, setLeavingForBrief] = useState(false)

  useEffect(
    () => () => {
      if (featuredHoverTimer.current) window.clearTimeout(featuredHoverTimer.current)
    },
    []
  )

  // Thẻ "phù hợp nhất" ở hero chỉ MỞ KHOÁ số liệu khi tài khoản đã có ít nhất
  // một hồ sơ dự án — chưa có thì SAVICO không có gì để ghép, số liệu thật sẽ
  // gây hiểu lầm (mục 3).
  const { data: briefs } = useBriefs(isAuthenticated)
  const hasBrief = isAuthenticated && Boolean(briefs?.length)

  /**
   * Bộ lọc tiêu chí (mục 5) — đã xác nhận với khách: chỉ "Khu vực & bán kính"
   * lọc THẬT `ranked`, 5 tiêu chí còn lại chỉ mở rộng/thu gọn + hiện dòng tóm
   * tắt vì `Contractor` không có trường loại công trình/kinh nghiệm/mốc đánh
   * giá/lịch nhận việc để lọc theo.
   */
  const [openCriterion, setOpenCriterion] = useState<CriterionItem['key'] | null>(null)
  const [radiusKm, setRadiusKm] = useState<SearchRadiusKm>(50)
  const [criterionSelections, setCriterionSelections] = useState<Partial<Record<CriterionItem['key'], string>>>({})

  const criterionOptions: Record<CriterionItem['key'], string[]> = {
    area: SEARCH_RADII.map((km) => tCommon('distanceShort', { km })),
    type: CONSTRUCTION_SCOPES.map((key) => tScope(key)),
    scale: PROJECT_SCALES.map((key) => tScale(key)),
    experience: (['any', 'junior', 'mid', 'senior'] as const).map((key) => t(`criteria.experienceOptions.${key}`)),
    rating: (['any', 'good', 'great'] as const).map((key) => t(`criteria.ratingOptions.${key}`)),
    schedule: START_WINDOWS.map((key) => tStartWindow(key))
  }

  const ranked = filterContractors(CONTRACTORS_SEED, { radiusKm, sort }).slice(0, 3)

  /**
   * Đứng ở danh sách xếp hạng lâu không bấm gì → thanh "Tạo hồ sơ dự án - miễn
   * phí" trượt lên dính đáy màn (mục 7).
   */
  const { nudgeSectionId, dismiss: dismissNudge } = useDwellNudge({
    sectionIds: ['contractor-ranked-list'],
    sessionKey: 'savico.contractor-list-nudge'
  })
  const showStickyNudge = nudgeSectionId === 'contractor-ranked-list'

  /** "Tạo hồ sơ" cần tài khoản: chưa đăng nhập thì mở popup đăng nhập trước. */
  const createAndOpenBrief = () => {
    setLeavingForBrief(true)
    window.setTimeout(() => {
      createBrief.mutate(undefined, { onError: () => setLeavingForBrief(false) })
    }, 160)
  }

  const startBrief = () => {
    if (!isAuthenticated) {
      // Đăng nhập xong thì chạy tiếp đúng việc người dùng đang định làm, không
      // bắt họ bấm lại "Tạo hồ sơ" lần nữa.
      openAuthDialog('login', createAndOpenBrief)
      return
    }
    createAndOpenBrief()
  }

  /** "Xem nhà thầu" ở M01 chỉ cuộn tới danh sách công khai và loé đầu khối một lần. */
  const scrollToContractors = () => {
    dismissNudge()
    rankingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => setRankingPulse((value) => value + 1), 420)
  }

  const openContractorDetail = (contractorId: string) => {
    dismissNudge()
    router.push(contractorFirmRoute(CONTRACTOR_PREVIEW_ID, contractorId))
  }

  const chooseContractor = (contractorId: string) => {
    dismissNudge()
    const brief = briefs?.[0]
    if (!hasBrief || !brief) {
      startBrief()
      return
    }
    window.sessionStorage.setItem(MATCHES_PINNED_CONTRACTOR_KEY, contractorId)
    router.push(contractorMatchesRoute(brief.id))
  }

  const previewFeaturedContractor = (contractorId: string) => {
    if (featuredHoverTimer.current) window.clearTimeout(featuredHoverTimer.current)
    featuredHoverTimer.current = window.setTimeout(() => setFeaturedContractorId(contractorId), 560)
  }

  const restoreBestContractor = () => {
    if (featuredHoverTimer.current) window.clearTimeout(featuredHoverTimer.current)
    featuredHoverTimer.current = window.setTimeout(() => setFeaturedContractorId(CONTRACTORS_SEED[0]?.id ?? ''), 120)
  }

  /** Khối "Ranh giới dịch vụ" — nhánh ★ khi khách đã có gói thiết kế + hồ sơ sẵn sàng. */
  const designProject = designHandoff?.project ?? null
  const designReady = designHandoff?.ready ?? false
  const tDesignBuildingType = useTranslations('design.input.buildingType.options')
  const createBriefFromDesign = useCreateBriefFromDesign()
  const startBriefFromDesign = () => {
    if (!designProject) return
    createBriefFromDesign.mutate({
      designProjectId: designProject.id,
      name: designProject.name,
      buildingType: designProject.buildingType ? tDesignBuildingType(designProject.buildingType) : '',
      landArea: designProject.floorArea ?? 0
    })
  }

  /** Bảng "So sánh minh bạch" — rê hàng/cột (mục 1), huy hiệu "Tốt hơn" chỉ bật
   *  sau khi bảng hiện xong (mục 2), dải "Xem chi tiết" mở theo cột (mục 3). */
  const [compareHoverRow, setCompareHoverRow] = useState<(typeof COMPARE_ROWS)[number] | null>(null)
  const [compareHoverCol, setCompareHoverCol] = useState<(typeof COMPARE_COLUMNS)[number] | null>(null)
  const [compareBadgesReady, setCompareBadgesReady] = useState(reduceMotion ?? false)
  const [scopeOpenCol, setScopeOpenCol] = useState<(typeof COMPARE_COLUMNS)[number] | null>(null)
  const revealCompareBadges = () => {
    if (compareBadgesReady) return
    window.setTimeout(() => setCompareBadgesReady(true), reduceMotion ? 0 : 820)
  }

  const tCompareRows = useTranslations('contractors.landing.compare.rows')
  const compareBetterCol = useMemo(() => {
    const result: Partial<Record<(typeof COMPARE_ROWS)[number], (typeof COMPARE_COLUMNS)[number]>> = {}
    for (const row of COMPARE_ROWS) {
      const direction = COMPARE_BETTER_DIRECTION[row]
      if (!direction) continue
      const values = COMPARE_COLUMNS.map((col) => parseLeadingNumber(tCompareRows(`${row}.${col}`)))
      if (values.some((value) => value === null)) continue
      const nums = values as number[]
      const best = direction === 'min' ? Math.min(...nums) : Math.max(...nums)
      const winners = COMPARE_COLUMNS.filter((_, index) => nums[index] === best)
      if (winners.length === 1) result[row] = winners[0]
    }
    return result
  }, [tCompareRows])

  /** FAQ (mục 10): sao chép liên kết #faq-N + loé dòng khi mở trang bằng liên kết đó. */
  const [faqCopiedIndex, setFaqCopiedIndex] = useState<number | null>(null)
  const [faqFlashIndex, setFaqFlashIndex] = useState<number | null>(null)
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  const flashFaqRow = (index: number) => {
    setFaqFlashIndex(index)
    window.setTimeout(() => setFaqFlashIndex((current) => (current === index ? null : current)), 900)
  }
  const copyFaqLink = async (index: number) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#faq-${index}`
      await navigator.clipboard.writeText(url)
    } catch {
      return
    }
    setFaqCopiedIndex(index)
    window.setTimeout(() => setFaqCopiedIndex((current) => (current === index ? null : current)), 1800)
    flashFaqRow(index)
  }
  useEffect(() => {
    const match = /^#faq-(\d)$/.exec(window.location.hash)
    if (!match) return
    const index = Number(match[1])
    const row = document.getElementById(`faq-${index}`)
    if (!row) return
    window.setTimeout(() => {
      row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      flashFaqRow(index)
    }, 300)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi trang tải với #faq-N trên URL.
  }, [])

  // Nhịp dọc đo trên Hình S09: các khoảng hở giữa hai khối liền nhau chỉ 12–14px
  // trên ảnh 450px = 41–48px ở khổ thật, còn `space-y-16` (64px) của bản trước
  // đẩy trang dài ra và làm mỗi khối trôi ra xa nhau hơn ảnh.
  return (
    <div className='space-y-11 pb-14'>
      {/* Hero — Hình S09 (ảnh gốc 450×800, phần nội dung x=13…437 = 424px):
          NỀN TRẮNG, không có dải nền xanh nào. Hai cột gần bằng nhau: cột chữ
          13…220 (48.8%), khe 15 (3.5%), khối minh hoạ 235…437 (47.6%). */}
      <section className={cn(PAGE_CONTAINER, 'pt-6')}>
        {/* Tỉ lệ hai cột (48.8% · khe 3.5% · 47.7%) đúng số đo trên ảnh; khổ
            chung của trang do `PAGE_CONTAINER` quyết định. */}
        <div className='grid items-center gap-x-[3.5%] gap-y-8 lg:grid-cols-[48.8%_minmax(0,1fr)]'>
          {/* Cỡ chữ hero.
              Đo trên Hình S09 rồi quy theo % bề ngang phần nội dung (424px) →
              khổ thật ~1447px cho ra: tiêu đề 64px, câu dẫn 26px, nút cao 80px.
              Nhưng ảnh demo được AI vẽ ở khổ trang hẹp hơn (bám các mốc khác
              trong ảnh thì hệ số quy đổi rơi vào khoảng 2.0 chứ không phải 3.4),
              nên bê nguyên số đó lên khổ 1440 thì chữ TO quá — khách xem bản
              dựng đã yêu cầu hạ xuống. Giữ đúng NHỊP của ảnh (tỉ lệ giữa tiêu
              đề · câu dẫn · nút và các khoảng hở) rồi nhân đều 0.72 — khách
              xem bản dựng đã yêu cầu thu nhỏ hai lần, đây là nấc thứ hai:
              - tiêu đề 46px, bước dòng 1.14;
              - câu dẫn 18px, bước dòng 1.65;
              - tiêu đề → câu dẫn 26px; câu dẫn → nút 38px;
              - nút cao 56px, rộng tối thiểu 200px, cách nhau 32px.
              Bản đầu tiên (`text-[2.75rem]`/`text-lg`/`h-14`) thì ngược lại —
              khối chữ chỉ cao 16% bề ngang nội dung trong khi ảnh là 30%. */}
          <motion.div
            variants={revealContainerVariants}
            initial='hidden'
            animate={leavingForBrief ? { opacity: 0, y: -24 } : 'show'}
            transition={{ duration: 0.28, ease: revealEase }}
          >
            <motion.h1
              className='text-primary-strong text-4xl leading-[1.14] font-bold tracking-tight text-balance sm:text-[2.875rem]'
              aria-label={t('hero.title')}
            >
              <motion.span variants={revealItemVariants} className='block'>
                {t('hero.titleLine1')}
              </motion.span>
              <motion.span variants={revealItemVariants} className='block'>
                {t('hero.titleLine2')}
              </motion.span>
            </motion.h1>
            {/* Hình S09: câu dẫn ngắt đúng BA dòng và rộng bằng ~88% cột chữ, hẹp
                hơn tiêu đề một chút. Cỡ chữ ở đây đã hạ theo yêu cầu nên phải
                chặn bề ngang mới ra đúng ba dòng như ảnh. */}
            <motion.p
              variants={revealItemVariants}
              className='text-muted-foreground mt-[26px] max-w-[30rem] text-base leading-[1.65] text-pretty sm:text-lg'
            >
              {t('hero.subtitle')}
            </motion.p>
            {/* Hình S09: hai nút cùng cỡ, nút phụ nền trắng viền xanh, và nút
                chính KHÔNG có mũi tên. */}
            <motion.div variants={revealItemVariants} className='mt-[38px] flex flex-wrap gap-8'>
              <Button
                size='lg'
                className='h-14 min-w-[12.5rem] px-8 text-base hover:-translate-y-0.5 active:translate-y-0'
                onClick={startBrief}
                disabled={createBrief.isPending}
              >
                {t('hero.createBrief')}
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='border-primary text-primary-strong h-14 min-w-[12.5rem] px-8 text-base hover:-translate-y-0.5 active:translate-y-0'
                onClick={scrollToContractors}
                disabled={createBrief.isPending}
              >
                {t('hero.viewContractors')}
              </Button>
            </motion.div>
          </motion.div>

          {/* Hình S09: khối minh hoạ là BẢN ĐỒ vẽ (nền xanh nhạt, vòng sóng
              ra-đa, 5 ghim vị trí) chứ không phải ảnh chụp; thẻ nhà thầu nổi
              CHÍNH GIỮA khối, rộng 137/212 = 65% và cao 122/180 = 68% khối.
              CHỖ CHỜ ASSET: chưa có hình bản đồ nên vẫn dùng ảnh trong kho
              (`map.contractors`) — admin thay được ở màn "Hình ảnh site". */}
          <div className='relative'>
            {mapImage ? (
              <Photo
                src={mapImage}
                alt=''
                priority
                sizes='(max-width: 1024px) 100vw, 700px'
                className='aspect-[212/180] w-full rounded-3xl border'
              />
            ) : (
              <div className='bg-muted/30 flex aspect-[212/180] w-full items-center justify-center rounded-3xl border border-dashed'>
                <MapIcon className='text-muted-foreground/50 size-10' />
              </div>
            )}

            {/* Thẻ CANH GIỮA khối minh hoạ, rộng 63.4% (số đo trên Hình
                S09: thẻ 135px trên khối 213px).

                Đo thô ban đầu cho ra lệch trái 15.5% / mép trên 21.5%, nhưng
                bản đồ trong ảnh mờ dần ở rìa nên không chốt được mép thật của
                khối — sai số đủ để nuốt hết phần "lệch" đó. Canh giữa mới là
                thứ nhìn đúng, và cũng là thứ giữ được khi khối đổi tỉ lệ. */}
            {featured ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15, ease: revealEase }}
                className='@container absolute top-1/2 left-1/2 w-[63.4%] min-w-[16rem] -translate-x-1/2 -translate-y-1/2'
              >
                {/* Khung nét đứt hiện SAU thẻ, viền ngoài thẻ một khoảng nhỏ (mục 3). */}
                <motion.span
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.55 }}
                  className='border-primary/40 pointer-events-none absolute -inset-2 rounded-[1.25rem] border-2 border-dashed'
                />

                <AnimatePresence mode='wait' initial={false}>
                  <motion.div
                    key={featured.id}
                    initial={{ opacity: 0, x: 14, y: -10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: -14, y: 10 }}
                    transition={{ duration: 0.24, ease: revealEase }}
                    className='bg-card relative rounded-2xl border p-[5.9%] shadow-lg'
                  >
                    {/* Hình S09: khối đầu thẻ cao 27/135 = 20% bề ngang thẻ, do ô
                      logo quyết định — nên ô logo đo theo % chứ không phải
                      `size-14` cố định, để thẻ giữ đúng tỉ lệ cao/rộng 0.93 ở
                      mọi khổ màn. */}
                    <div className='flex items-center gap-[3.5%]'>
                      <div className='aspect-square w-[22.8%] shrink-0'>
                        <ContractorLogo contractor={featured} className='size-full rounded-2xl text-base' />
                      </div>
                      <div className='min-w-0 flex-1'>
                        {/* Hình S09: sau tên nhà thầu KHÔNG có icon xác minh nào —
                          dấu tick chỉ xuất hiện ở thẻ danh sách S12 và header hồ
                          sơ S13. */}
                        <p className='truncate text-[4.6cqi] font-semibold'>{featured.name}</p>
                        {hasBrief ? (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.55, duration: 0.5, delay: 0.3 }}
                            className='bg-brand-orange text-brand-orange-foreground relative mt-[2cqi] inline-flex items-center gap-[1.5cqi] rounded-full px-[3cqi] py-[1.2cqi] text-[3.1cqi] font-semibold'
                          >
                            <motion.span
                              aria-hidden
                              initial={{ opacity: 0.8, scale: 1 }}
                              animate={{ opacity: 0, scale: 1.6 }}
                              transition={{ duration: 0.6, delay: 0.7, ease: revealEase }}
                              className='bg-brand-orange absolute inset-0 -z-10 rounded-full'
                            />
                            <Star className='size-[3.4cqi] fill-current' />
                            {t('hero.bestMatch')}
                          </motion.span>
                        ) : (
                          <span className='text-muted-foreground mt-[2cqi] block text-[3.4cqi] text-pretty'>
                            {t('hero.card.locked')}
                          </span>
                        )}
                      </div>
                    </div>
                    {hasBrief ? (
                      <HeroContractorFacts key={featured.id} contractor={featured} />
                    ) : (
                      <div className='pointer-events-none mt-[9.1%] opacity-40 select-none'>
                        <HeroContractorFacts contractor={featured} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 4 cam kết — Hình S09, dải x=13…437, y=204…249.

          Ba thứ bản trước làm khác ảnh:
          - ICON: ảnh vẽ ① chồng đồng xu (miễn phí), ② khiên + tick (đã xác
            minh), ③ khiên + tài liệu có tick (so sánh minh bạch), ④ khiên + ổ
            khoá (thông tin được bảo vệ). Bản trước là hộp quà / cái cân / tệp
            khoá — sai nghĩa lẫn hình. Lucide không có "khiên lồng ổ khoá" nên
            ④ dùng ổ khoá trần, giữ đúng ý còn hình thì gần nhất có được.
          - KHÔNG có ô nền sau icon: ảnh vẽ icon nét trần màu xanh, bản trước
            bọc trong ô vuông `bg-accent` 40px.
          - Mỗi mục CANH GIỮA ô của nó: đo bốn cụm chữ ở x=27…103, 133…210,
            241…308, 331…428 — chia 424px thành 4 cột đều 106px thì cả bốn cụm
            đều nằm giữa cột của mình, không phải canh trái. */}
      <motion.section
        className={PAGE_CONTAINER}
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: revealEase }}
      >
        <motion.ul
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.4 }}
          className='bg-card grid gap-4 rounded-2xl border p-6 sm:grid-cols-2 lg:grid-cols-4'
        >
          {(
            [
              { key: 'free', icon: Coins },
              { key: 'verified', icon: ShieldCheck },
              { key: 'transparent', icon: ClipboardCheck },
              { key: 'privacy', icon: Lock }
            ] as const
          ).map((item) => (
            <motion.li
              key={item.key}
              variants={revealItemVariants}
              className='group flex items-center justify-center gap-3'
            >
              <motion.span
                aria-hidden
                initial={reduceMotion ? false : { strokeDashoffset: 64 }}
                whileInView={{ strokeDashoffset: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.75, delay: 0.12, ease: revealEase }}
                style={{ strokeDasharray: 64 }}
                className='text-primary shrink-0 transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:text-primary-strong'
              >
                <item.icon className='size-7' strokeWidth={1.5} />
              </motion.span>
              <span className='text-sm font-medium text-pretty'>{t(`promises.${item.key}`)}</span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.section>

      {/* Tiêu chí + danh sách xếp hạng.

          Hình S09, đo trên phần nội dung 424px: cột tiêu chí 13…148 (31.8%),
          khe 12px (2.8%), khung danh sách 160…436 (65.3%). Bản trước để cột
          trái 300px cứng (20% trên khổ 1480) nên tiêu đề khối bị gãy hai dòng
          còn khung phải thì rộng quá. */}
      <motion.section
        ref={rankingSectionRef}
        className={cn(PAGE_CONTAINER, 'scroll-mt-24')}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.45, ease: revealEase }}
      >
        <div className='grid gap-6 lg:grid-cols-[31.8%_minmax(0,1fr)] lg:gap-x-[2.8%]'>
          <div>
            <h2 className='text-primary-strong text-lg font-bold tracking-wide uppercase'>{t('criteria.title')}</h2>
            <ul className='mt-4 space-y-2'>
              {CRITERIA_ITEMS.map((item) => {
                const open = openCriterion === item.key
                const options = criterionOptions[item.key]
                const selected = criterionSelections[item.key]
                return (
                  // Hình S09: mỗi ô cao 20/135 = 14.8% bề ngang cột tiêu chí,
                  // tức thoáng hơn hẳn `py-3` của bản trước.
                  <li key={item.key} className='bg-card overflow-hidden rounded-xl border'>
                    <button
                      type='button'
                      onClick={() => setOpenCriterion(open ? null : item.key)}
                      aria-expanded={open}
                      className='flex w-full items-start gap-3 px-4 py-4 text-left'
                    >
                      <item.icon className='text-primary mt-0.5 size-5 shrink-0' strokeWidth={1.5} />
                      {/* Hình S09: nhãn tiêu chí màu XANH thương hiệu, chỉ dòng
                          gợi ý bên dưới mới là chữ mờ. */}
                      <span className='text-primary-strong min-w-0 flex-1 text-sm font-medium'>
                        <span className='flex items-center gap-2'>
                          {t(`criteria.${item.key}`)}
                          {/* Mỗi bộ lọc có bộ đếm riêng. Key không phụ thuộc option để đổi
                              lựa chọn trong cùng bộ lọc không phát lại hiệu ứng phóng. */}
                          <AnimatePresence initial={false}>
                            {selected ? (
                              <motion.span
                                key={`criterion-count-${item.key}`}
                                aria-hidden
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.6, duration: 0.4 }}
                                className='bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold'
                              >
                                1
                              </motion.span>
                            ) : null}
                          </AnimatePresence>
                        </span>
                        {item.key === 'type' ? (
                          <span className='text-muted-foreground block text-xs'>{t('criteria.typeHint')}</span>
                        ) : null}
                        {/* Dòng tóm tắt lựa chọn — hiện dần dưới tên mục (mục 5). */}
                        <AnimatePresence>
                          {selected ? (
                            <motion.span
                              key={selected}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className='text-muted-foreground block overflow-hidden text-xs font-normal'
                            >
                              {selected}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </span>
                      <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className='mt-0.5 shrink-0'
                      >
                        <ChevronRight aria-hidden className='text-muted-foreground size-4' />
                      </motion.span>
                    </button>

                    {/* Mở rộng tại chỗ — mục khác đang mở tự thu lại (chỉ một
                        `openCriterion` cho cả danh sách) (mục 5). */}
                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: revealEase }}
                          className='overflow-hidden'
                        >
                          <div className='flex flex-wrap gap-2 px-4 pb-4'>
                            {options.map((option) => (
                              <button
                                key={option}
                                type='button'
                                aria-pressed={option === selected}
                                onClick={() => {
                                  const shouldDeselect = option === selected
                                  setCriterionSelections((current) => {
                                    if (!shouldDeselect) return { ...current, [item.key]: option }

                                    const next = { ...current }
                                    delete next[item.key]
                                    return next
                                  })
                                  if (item.key === 'area') {
                                    if (shouldDeselect) {
                                      setRadiusKm(50)
                                    } else {
                                      const km = SEARCH_RADII.find((value) => `${value} km` === option)
                                      if (km) setRadiusKm(km)
                                    }
                                  }
                                  setOpenCriterion(null)
                                }}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                  option === selected
                                    ? 'border-primary bg-accent text-primary-strong'
                                    : 'hover:border-primary/40'
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className='bg-card relative min-w-0 overflow-hidden rounded-2xl border p-5'>
            <AnimatePresence>
              {rankingPulse > 0 ? (
                <motion.span
                  key={rankingPulse}
                  aria-hidden
                  initial={{ opacity: 0, scaleX: 0.35 }}
                  animate={{ opacity: [0, 0.8, 0], scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: revealEase }}
                  className='bg-accent pointer-events-none absolute inset-x-0 top-0 h-14 origin-center'
                />
              ) : null}
            </AnimatePresence>
            {/* Hình S09: KHÔNG có tiêu đề "Nhà thầu tiêu biểu" — hàng tab nằm
                ngay mép trên khung. Và bốn tab TRẢI ĐỀU hết bề ngang khung
                (đo: bốn cụm chữ ở 175…212, 238…262, 287…333, 359…409 — khoảng
                hở giữa chúng đều ~26px dù chữ dài ngắn khác nhau), không phải
                dồn về bên trái. */}
            <div className='flex flex-wrap justify-between gap-x-6 gap-y-2 border-b'>
              {CONTRACTOR_SORTS.map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setSort(key)}
                  aria-pressed={key === sort}
                  className={cn(
                    'relative -mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium transition-colors',
                    key === sort ? 'text-primary-strong' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tRankTabs(key)}
                  {/* Gạch chân trượt sang tab mới (mục 6) — cùng vị trí và màu
                      của `border-primary` ở trên, chỉ chuyển sang overlay dùng
                      chung `layoutId` để trượt được giữa các tab. */}
                  {key === sort ? (
                    <motion.span
                      layoutId='sort-tab-underline'
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      className='border-primary pointer-events-none absolute inset-x-0 bottom-0 border-b-2'
                    />
                  ) : null}
                </button>
              ))}
            </div>

            {/* Hình S09: mỗi dòng chia BỐN cột cố định — ô logo (10.1% bề
                ngang khung) · tên + chỉ số (32.5%) · lịch khảo sát (13.7%) ·
                hai nút (18.8%) — và phần dôi ra chia đều vào ba khe. Bản trước
                gộp tên + mọi chỉ số vào một cột rồi để hai nút NẰM NGANG; ảnh
                thì tách riêng cột lịch khảo sát và XẾP CHỒNG hai nút.
                Chỉ số trong ảnh chỉ có đánh giá và số dự án tương tự — khoảng
                cách nằm ở S12 chứ không ở landing. */}
            <ul id='contractor-ranked-list' className='mt-4 divide-y'>
              {ranked.map((contractor, index) => (
                <motion.li
                  key={contractor.id}
                  layout
                  variants={revealItemVariants}
                  initial='hidden'
                  whileInView='show'
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ layout: { duration: 0.35, ease: revealEase } }}
                  onMouseEnter={() => previewFeaturedContractor(contractor.id)}
                  onMouseLeave={restoreBestContractor}
                  onFocus={() => previewFeaturedContractor(contractor.id)}
                  onBlur={restoreBestContractor}
                  className='group grid grid-cols-[10.1%_32.5%_13.7%_18.8%] items-center justify-between gap-x-4 gap-y-3 rounded-lg py-4 transition-colors max-sm:grid-cols-1 hover:bg-accent/30'
                >
                  <ContractorLogo contractor={contractor} className='size-full aspect-square' />

                  <div className='min-w-0'>
                    <p className='flex flex-wrap items-center gap-2 font-medium'>
                      {contractor.name}
                      {/* Ảnh: viên nhãn cam chỉ gắn ở dòng ĐẦU — nhà thầu đang
                          đứng nhất theo tab đang chọn. Ẩn/hiện bằng hiện dần khi
                          đổi tab sắp xếp (mục 6): chỉ có nghĩa ở tab "Phù hợp
                          nhất", các tab khác đứng đầu vì lý do khác (gần nhất,
                          đánh giá cao nhất…). */}
                      <AnimatePresence>
                        {sort === 'match' && index === 0 ? (
                          <motion.span
                            key='best-match'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className='bg-brand-orange-soft text-brand-orange rounded-full px-2 py-0.5 text-[11px] font-semibold'
                          >
                            {t('ranking.bestMatch')}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </p>
                    <span className='text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                      <span className='flex items-center gap-1.5'>
                        <Star className='text-warning size-3.5 shrink-0 fill-current' />
                        <span className='text-foreground font-semibold'>
                          {formatNumber(contractor.rating, locale, { minimumFractionDigits: 1 })}
                        </span>
                        {tCommon('reviewCount', { count: contractor.reviewCount })}
                      </span>
                      <span className='flex items-center gap-1.5'>
                        <BadgeCheck className='text-primary size-3.5 shrink-0' />
                        {tCommon('similarProjects', { count: contractor.similarProjects })}
                      </span>
                    </span>
                  </div>

                  <p className='text-muted-foreground text-xs text-pretty'>
                    {t('ranking.surveyWithin', { hours: contractor.surveyWithinHours })}
                  </p>

                  {/* Ảnh S09: "Xem chi tiết" nền xanh ĐẶC nằm trên, "Chọn & gửi
                      hồ sơ" viền nằm dưới. Cả hai đều dẫn vào luồng tạo hồ sơ vì
                      khách chưa có dự án nào để mở hồ sơ nhà thầu theo ngữ cảnh. */}
                  <div className='flex flex-col gap-2'>
                    <Button
                      size='sm'
                      onClick={() => openContractorDetail(contractor.id)}
                      className='group-hover:brightness-110'
                    >
                      {t('ranking.detail')}
                    </Button>
                    <Button size='sm' variant='outline' onClick={() => chooseContractor(contractor.id)}>
                      {t('ranking.choose')}
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>

            {/* Hình S09: dòng chú thích màu XANH (không phải chữ mờ) và
                canh TRÁI — đo trên ảnh: icon ⓘ cách mép trái khung 28px còn
                chữ kết thúc cách mép phải 60px, tức không canh giữa.

                Trên nó còn MỘT ĐƯỜNG KẺ nữa: `divide-y` của danh sách chỉ kẻ
                giữa các dòng nên dòng cuối không có gạch dưới, phải tự thêm
                `border-t` ở đây thì mới khép được khung như ảnh. */}
            <p className='text-primary flex items-start gap-2 border-t pt-4 text-xs'>
              <Info className='mt-0.5 size-3.5 shrink-0' />
              <span className='text-pretty'>{t('ranking.note')}</span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Dừng lại đủ lâu ở danh sách xếp hạng mà chưa bấm gì → thanh nhắc
          trượt lên dính đáy màn (mục 7). Dùng `useDwellNudge` sẵn có (đang
          nhắc trợ lý AI ở trang chủ) với `sectionIds`/`sessionKey` riêng cho
          khối này, không đụng tới nơi gọi khác. */}
      <AnimatePresence>
        {showStickyNudge ? (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ duration: 0.35, ease: revealEase }}
            className='bg-card fixed inset-x-0 bottom-0 z-40 border-t shadow-lg'
          >
            <div className={cn(PAGE_CONTAINER, 'flex items-center justify-between gap-4 py-3')}>
              <p className='text-sm font-medium text-pretty'>{t('ranking.stickyNudge')}</p>
              <div className='flex shrink-0 items-center gap-2'>
                <Button size='sm' onClick={startBrief} disabled={createBrief.isPending}>
                  {t('hero.createBrief')}
                </Button>
                <button
                  type='button'
                  onClick={dismissNudge}
                  aria-label={tGlobal('close')}
                  className='text-muted-foreground hover:text-foreground p-1'
                >
                  <X className='size-4' />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* So sánh minh bạch — Hình S09.

          Bảng này là MINH HOẠ, không phải bảng so sánh thật: ảnh ghi cột là
          "Nhà thầu A / B / C" và các dòng "Thời gian thi công · Phạm vi bao
          gồm/không bao gồm · Cấp vật liệu đề xuất · Bảo hành · Ghi chú" — đều
          là trường KHÔNG có trong `Contractor`. Bản trước đổ ba nhà thầu thật
          trong seed vào cột và chỉ dựng được 4 dòng có sẵn dữ liệu, nên bảng
          vừa khác ảnh vừa hứa một phép so sánh mà landing chưa làm được (so
          sánh thật nằm ở S15). Nay lấy toàn bộ chữ từ `messages` để admin sửa
          được và khớp ảnh.

          Vẫn đúng R2: không ô nào có số tiền — dòng "Phạm vi bao gồm/không bao
          gồm" chỉ dẫn sang trang chi tiết, không hiện giá.

          Bỏ dòng dẫn "Bảng so sánh trên nền tảng chỉ đối chiếu NĂNG LỰC…" vì
          ảnh không có; nội dung R2/R3 vẫn còn ở FAQ và ở khối "Ranh giới dịch
          vụ" bên dưới. */}
      <motion.section
        className={PAGE_CONTAINER}
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: revealEase }}
      >
        {/* Ảnh: mọi tiêu đề section đều IN HOA, màu xanh, canh giữa. */}
        <h2 className='text-primary-strong text-center text-lg font-bold tracking-wide uppercase'>
          {t('compare.title')}
        </h2>

        {/* Mục 4: mobile chỉ vuốt ngang được, gợi ý người dùng biết còn 2 cột nữa. */}
        <p className='text-muted-foreground mt-3 text-center text-xs md:hidden'>{t('compare.swipeHint')}</p>

        <motion.div
          className='bg-card mt-5 overflow-x-auto rounded-2xl border'
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.3 }}
          onViewportEnter={revealCompareBadges}
        >
          <table className='w-full min-w-[640px] border-collapse text-sm'>
            <thead>
              <tr>
                {/* Mục 4: cột "Tiêu chí" đứng yên khi vuốt ngang trên mobile. */}
                <th className='bg-card border-b p-4 text-left font-medium max-md:sticky max-md:left-0'>
                  {t('compare.criterion')}
                </th>
                {COMPARE_COLUMNS.map((col) => (
                  // Ảnh: tên ba cột nhà thầu màu xanh thương hiệu, chỉ ô
                  // "Tiêu chí" là chữ thường.
                  <th
                    key={col}
                    onMouseEnter={() => setCompareHoverCol(col)}
                    onMouseLeave={() => setCompareHoverCol((current) => (current === col ? null : current))}
                    className={cn(
                      'text-primary-strong border-b border-l p-4 text-center font-medium transition-colors',
                      compareHoverCol === col && 'bg-primary/10'
                    )}
                  >
                    {t(`compare.columns.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <motion.tr
                  key={row}
                  variants={compareRowVariants}
                  onMouseEnter={() => setCompareHoverRow(row)}
                  onMouseLeave={() => setCompareHoverRow((current) => (current === row ? null : current))}
                  className={cn(
                    'transition-colors',
                    compareHoverRow === row && compareHoverCol === null && 'bg-muted/50'
                  )}
                >
                  <th
                    className={cn(
                      'bg-card text-muted-foreground border-b p-4 text-left font-normal transition-colors max-md:sticky max-md:left-0',
                      compareHoverRow === row && compareHoverCol === null && 'bg-muted/50'
                    )}
                  >
                    {t(`compare.rows.${row}.label`)}
                  </th>
                  {COMPARE_COLUMNS.map((col) => {
                    const isBetter = compareBetterCol[row] === col
                    const isScopeRow = row === 'scope'
                    const isScopeOpen = isScopeRow && scopeOpenCol === col
                    return (
                      <motion.td
                        key={col}
                        variants={compareCellVariants}
                        onMouseEnter={() => setCompareHoverCol(col)}
                        onMouseLeave={() => setCompareHoverCol((current) => (current === col ? null : current))}
                        className={cn(
                          'relative border-b border-l p-4 text-center transition-colors',
                          compareHoverCol === col ? 'bg-primary/10' : compareHoverRow === row && 'bg-muted/50',
                          isBetter && 'bg-primary/10'
                        )}
                      >
                        {isScopeRow ? (
                          // Mục 3: "Xem chi tiết" gạch chân vẽ từ trái khi rê, mũi tên
                          // xoay khi dải chi tiết đang mở cho đúng nhà thầu này.
                          <button
                            type='button'
                            onClick={() => setScopeOpenCol((current) => (current === col ? null : col))}
                            className='group/link text-foreground inline-flex items-center gap-1 font-medium'
                            aria-expanded={isScopeOpen}
                          >
                            <span className='relative'>
                              {t(`compare.rows.${row}.${col}`)}
                              <span className='bg-foreground absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-300 group-hover/link:scale-x-100' />
                            </span>
                            <ChevronDown
                              className={cn('size-3.5 transition-transform duration-300', isScopeOpen && 'rotate-180')}
                            />
                          </button>
                        ) : (
                          t(`compare.rows.${row}.${col}`)
                        )}

                        {/* Mục 2: huy hiệu "Tốt hơn" chỉ phóng vào sau khi bảng hiện xong. */}
                        {isBetter ? (
                          <motion.span
                            variants={betterBadgeVariants}
                            initial='hidden'
                            animate={compareBadgesReady ? 'show' : 'hidden'}
                            transition={{ delay: COMPARE_ROWS.indexOf(row) * 0.12 }}
                            className='bg-primary text-primary-foreground mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold'
                          >
                            {t('compare.betterBadge')}
                          </motion.span>
                        ) : null}
                      </motion.td>
                    )
                  })}
                </motion.tr>
              ))}

              {/* Mục 3: dải "Xem chi tiết" mở ngay dưới hàng "Phạm vi bao gồm/không bao gồm". */}
              <AnimatePresence initial={false}>
                {scopeOpenCol ? (
                  <motion.tr
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={COMPARE_COLUMNS.length + 1} className='border-b p-0'>
                      <motion.div
                        initial={reduceMotion ? false : { height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.3, ease: revealEase }}
                        className='overflow-hidden'
                      >
                        <motion.div
                          variants={revealContainerVariants}
                          initial={reduceMotion ? false : 'hidden'}
                          animate='show'
                          className='bg-muted/30 grid gap-3 p-4 sm:grid-cols-3'
                        >
                          {COMPARE_COLUMNS.map((col) => (
                            <motion.div
                              key={col}
                              variants={revealItemVariants}
                              className={cn(
                                'bg-card rounded-xl border p-3 text-left text-xs',
                                col === scopeOpenCol && 'border-primary border-2'
                              )}
                            >
                              <p className='text-primary-strong mb-1.5 font-semibold'>{t(`compare.columns.${col}`)}</p>
                              <p className='text-muted-foreground'>{t('compare.scopeDetail.includedLabel')}</p>
                              <ul className='mb-2 space-y-0.5'>
                                {(t.raw(`compare.scopeDetail.${col}.included`) as string[]).map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                              <p className='text-muted-foreground'>{t('compare.scopeDetail.excludedLabel')}</p>
                              <ul className='text-muted-foreground space-y-0.5'>
                                {(t.raw(`compare.scopeDetail.${col}.excluded`) as string[]).map((item) => (
                                  <li key={item} className='line-through'>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    </td>
                  </motion.tr>
                ) : null}
              </AnimatePresence>
            </tbody>
          </table>

          {/* Ảnh: dòng nguồn dữ liệu nằm TRONG khung bảng, canh giữa, có dấu
              tick tròn màu xanh đứng trước. Mục 4: hiện dần sau bảng. */}
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className='text-muted-foreground flex items-center justify-center gap-2 p-4 text-xs text-pretty'
          >
            <CheckCircle2 className='text-primary size-4 shrink-0' />
            {t('compare.note')}
          </motion.p>
        </motion.div>
      </motion.section>

      {/* An toàn & minh bạch — Hình S09.

          Ba khác biệt so với bản trước: tiêu đề section IN HOA màu xanh; icon
          nằm BÊN TRÁI chữ (bản trước đặt trên đầu) và là hình nét TRẦN cỡ lớn,
          không có ô vuông nền xanh nhạt; tiêu đề mỗi thẻ màu xanh, ngắt hai
          dòng. */}
      <section className={PAGE_CONTAINER}>
        <h2 className='text-primary-strong text-center text-lg font-bold tracking-wide uppercase'>
          {t('safety.title')}
        </h2>
        {/* Số đo trên Hình S09 (phần nội dung 424px): ba thẻ 14…148, 158…288,
            298…436 → mỗi thẻ 135px (31.8%), khe 10px (**2.36%**, bản trước để
            `gap-4` = 1.1% nên ba thẻ dính nhau hơn ảnh).
            Trong thẻ: lề 10px (7.4%) · icon 33px (24.4%) · khe icon→chữ 12px
            (8.9%) · cột chữ 72px (53.3%). Icon canh GIỮA chiều cao thẻ. */}
        <motion.ul
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.3 }}
          className='mt-5 grid gap-[2.36%] gap-y-4 md:grid-cols-3'
        >
          {SAFETY_CARDS.map((item) => (
            <motion.li
              key={item.key}
              variants={revealItemVariants}
              // Mục 5: rê thẻ → nhấc lên + bóng rộng + viền xanh nhạt (viền/bóng
              // này CHƯA từng có ở trạng thái nghỉ, chỉ thêm cho hover).
              className='group bg-card flex items-center gap-[8.9%] rounded-2xl border p-[7.4%] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-5 md:p-[7.4%]'
            >
              <SafetyIcon kind={item.key} />
              <div className='min-w-0 flex-1'>
                {/* Hình S09: tiêu đề thẻ ngắt HAI dòng — cột chữ chỉ rộng
                    53.3% bề ngang thẻ nên chữ phải đủ lớn mới gãy dòng như ảnh. */}
                <h3 className='text-primary-strong text-xl leading-snug font-bold text-balance'>
                  {t(`safety.${item.key}Title`)}
                </h3>
                <p className='text-muted-foreground mt-2 text-[15px] leading-relaxed text-pretty'>
                  {t(`safety.${item.key}Body`)}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* Ranh giới dịch vụ — Hình S09, dải y=620…660 (cao 41px = 9.7% bề ngang
          nội dung).

          Đo ba phần theo trục ngang: khối xanh x=16…180 (38.9%), khoảng giữa
          180…268 (20.8%), khối cam 268…435 (39.6%). Trong mỗi khối: lề trái
          ~14%, icon ~18% bề ngang khối và cao 75% chiều cao khối, khe icon→chữ
          9%. Bản trước chia `1fr_auto_1fr` và KHÔNG có icon nào.

          Mép phải khối xanh nhô ra 5px ở giữa chiều cao (mũi tên) — dựng bằng
          một tam giác `after:` cùng màu thay vì `clip-path` để giữ được bo góc
          của khối. */}
      <section className={PAGE_CONTAINER}>
        <h2 className='text-primary-strong text-center text-lg font-bold tracking-wide uppercase'>
          {t('boundary.title')}
        </h2>
        <div className='mt-5 grid items-stretch gap-0 md:grid-cols-[38.9%_20.8%_39.6%]'>
          {/* Lề trong đo trên ảnh (khối rộng 166px): trái 28px = 17%, phải
              19px = 11.4%, trên/dưới 5px = 3%. Lề trái rộng gấp rưỡi lề phải —
              đó là thứ bóp cột chữ còn 43% bề ngang khối và làm dòng mô tả gãy
              HAI dòng như ảnh; bản trước để `p-[4%]` đều bốn phía nên cột chữ
              rộng 67% và mô tả nằm gọn một dòng. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: revealEase }}
            className='group bg-accent/45 after:bg-accent/45 relative flex items-center gap-[12.6%] rounded-2xl py-[3%] pr-[11.4%] pl-[17%] after:absolute after:top-0 after:-right-8 after:h-full after:w-8 after:[clip-path:polygon(0_0,100%_50%,0_100%)] max-md:after:hidden'
          >
            {/* Ô bọc vuông vì icon lucide mang sẵn `height="24"` — chỉ đặt
                `w-…%` thì hình bị dẹt (xem ghi chú ở `SafetyIcon`).
                Ảnh vẽ một KHUNG VUÔNG BO GÓC lồng bản vẽ, có cây bút chì vắt
                chéo góc dưới phải → `SquarePen`, không phải hai cây bút bắt
                chéo như `PencilRuler` của bản trước. */}
            <span
              aria-hidden
              className='flex aspect-square w-[25.1%] min-w-12 shrink-0 items-center justify-center transition-transform duration-300 group-hover:-translate-y-1'
            >
              <SquarePen className='text-primary size-full' strokeWidth={1.25} />
            </span>
            <div className='min-w-0 flex-1'>
              <h3 className='text-primary-strong font-bold tracking-wide uppercase'>{t('boundary.designTitle')}</h3>
              <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('boundary.designBody')}</p>
              {/* Mục 7 (★): đã có gói + hồ sơ sẵn sàng — nhãn phóng vào sau khi khối đứng yên. */}
              {designReady ? (
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.5 }}
                  className='text-primary-strong mt-2 text-xs font-semibold'
                >
                  {t('boundary.designReadyBadge')}
                </motion.p>
              ) : null}
            </div>
          </motion.div>

          {/* Hình S09: giữa hai khối là ba chấm · dòng chữ NGẮT HAI DÒNG · mũi tên.
              Mục 8: sau khi hai khối đứng yên, ba chấm rồi chữ hiện dần, mũi tên
              bật vào sau cùng với nảy nhẹ. */}
          <motion.div
            variants={revealContainerVariants}
            initial={reduceMotion ? false : 'hidden'}
            whileInView='show'
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delayChildren: 0.5 }}
            className='relative flex items-center justify-center gap-3 px-4 py-4'
          >
            {/* Mục 8 (★): đã có gói — một chấm cam chạy dọc đường nối về phía
                "Tìm nhà thầu" đúng 3 lượt rồi dừng hẳn (không lặp vô hạn). */}
            {designReady && !reduceMotion ? (
              <motion.span
                aria-hidden
                initial={{ left: '6%', opacity: 0 }}
                animate={{ left: ['6%', '94%'], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: 2, repeatDelay: 0.3, delay: 1.1 }}
                className='bg-brand-orange absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full'
              />
            ) : null}
            <motion.span variants={revealItemVariants} aria-hidden className='text-primary/50 text-lg leading-none'>
              ···
            </motion.span>
            {/* Hình S09: dòng chữ và mũi tên ở giữa là màu XANH THƯƠNG HIỆU,
                không phải chữ đen — đo trên ảnh ra (66,95,80), tức cùng tông với
                tiêu đề khối chứ không phải `--foreground` (13,14,17). */}
            <motion.p
              variants={revealItemVariants}
              className='text-primary-strong text-center text-sm font-semibold whitespace-pre-line'
            >
              {t('boundary.arrow')}
            </motion.p>
            <motion.span
              variants={{
                hidden: { opacity: 0, scale: 0.3 },
                show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 16 } }
              }}
            >
              <ArrowRight aria-hidden className='text-primary-strong size-5 shrink-0' />
            </motion.span>
          </motion.div>

          {/* Khối xanh bên trái nhô ra một mũi nhọn, nên mép trái khối này
              phải LÕM VÀO đúng bằng chừng đó thì hai hình mới ăn khớp (Hình
              S09 đo được khoét sâu ~6/166 bề ngang khối).

              Khoét bằng một tam giác `before:` tô màu nền trang thay vì
              `clip-path` lên cả khối: `clip-path` sẽ cắt mất bo góc, còn cách
              này giữ nguyên `rounded-2xl` — `overflow-hidden` lo phần tam giác
              thò ra ngoài góc bo. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: revealEase }}
            className='group bg-brand-orange-soft/70 before:bg-background relative flex items-center gap-[12.6%] overflow-hidden rounded-2xl py-[3%] pr-[11.4%] pl-[17%] before:absolute before:top-0 before:left-0 before:h-full before:w-8 before:[clip-path:polygon(0_0,100%_50%,0_100%)] max-md:before:hidden'
          >
            {/* Ảnh vẽ nửa người thợ (đầu + hai vai). Không ghép thêm mũ bảo hộ:
                chồng `HardHat` lên `User` cho ra một hình rối, và người mới là
                phần mang nghĩa "tìm NGƯỜI thực hiện". */}
            <span
              aria-hidden
              className='flex aspect-square w-[25.1%] min-w-12 shrink-0 items-center justify-center transition-transform duration-300 group-hover:-translate-y-1'
            >
              <User className='text-brand-orange size-full' strokeWidth={1.25} />
            </span>
            <div className='min-w-0 flex-1'>
              <h3 className='text-brand-orange font-bold tracking-wide uppercase'>{t('boundary.findTitle')}</h3>
              <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('boundary.findBody')}</p>
              {/* Mục 9 (★): đã có gói — bỏ qua Bước 1, mở thẳng Kiểm tra hồ sơ (M03). */}
              {designReady ? (
                <motion.button
                  type='button'
                  onClick={startBriefFromDesign}
                  disabled={createBriefFromDesign.isPending}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, delay: 0.55 }}
                  className='text-brand-orange mt-2 inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline disabled:opacity-60'
                >
                  {t('boundary.createFromPlan')}
                  <ArrowRight className='size-3.5' />
                </motion.button>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ — Hình S09.

          Ảnh dựng khối này khác hẳn bản trước: KHÔNG bó vào `max-w-3xl` mà chạy
          hết bề ngang nội dung, nằm trong MỘT khung bo góc có viền, và mỗi dòng
          chia hai cột — câu hỏi (đậm) chiếm 33.5% bề ngang, câu trả lời (chữ
          mờ) nằm ngay bên phải trên CÙNG MỘT DÒNG.

          Không còn accordion: câu trả lời đã hiện sẵn thì không có gì để bấm mở
          ra nữa. Dấu ⊕ trong ảnh cũng bỏ luôn — một dấu cộng không làm gì khi
          bấm thì người dùng tưởng hỏng. Đổi lại câu trả lời được xuống dòng đầy
          đủ thay vì cắt cụt một dòng như ảnh.

          Nội dung câu 3 CỐ Ý khác ảnh: ảnh trả lời "gửi đến nhiều nhà thầu để
          so sánh", trái R1 (tối đa 3 nhà thầu/dự án). Phần chữ của bản mô tả
          thắng ảnh ở chỗ này. */}
      <section className={PAGE_CONTAINER}>
        <h2 className='text-primary-strong text-center text-lg font-bold tracking-wide uppercase'>{t('faq.title')}</h2>
        <motion.dl
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.2 }}
          className='bg-card mt-5 rounded-2xl border px-[3%]'
        >
          {([1, 2, 3, 4, 5] as const).map((index) => (
            <motion.div
              key={index}
              id={`faq-${index}`}
              variants={revealItemVariants}
              className={cn(
                'group/faq relative grid scroll-mt-24 items-baseline gap-x-4 gap-y-1 border-b py-4 px-3 -mx-3 transition-colors duration-500 last:border-b-0 md:grid-cols-[33.5%_minmax(0,1fr)]',
                faqFlashIndex === index ? 'bg-primary/15' : 'hover:bg-accent/30'
              )}
            >
              {/* Mục 10: vạch xanh bên trái vẽ từ trên xuống khi rê dòng. */}
              <span className='bg-primary absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-300 group-hover/faq:scale-y-100' />
              <dt className='group-hover/faq:text-primary-strong font-semibold transition-colors'>
                {t(`faq.q${index}`)}
              </dt>
              <dd className='text-muted-foreground text-sm text-pretty'>
                {t.rich(`faq.a${index}`, {
                  // Mục 10: từ khoá "3 nhà thầu" nền xanh nhạt, đứng yên (không animate).
                  mark: (chunks) => <mark className='bg-accent/60 text-foreground rounded px-1'>{chunks}</mark>
                })}
              </dd>
              <button
                type='button'
                onClick={() => void copyFaqLink(index)}
                aria-label={t('faq.copyLink')}
                className='text-muted-foreground hover:text-primary-strong absolute top-3 right-3 opacity-0 transition-opacity group-hover/faq:opacity-100'
              >
                {faqCopiedIndex === index ? (
                  <span className='text-primary-strong text-xs font-medium'>{t('faq.linkCopied')}</span>
                ) : (
                  <Link2 className='size-4' />
                )}
              </button>
            </motion.div>
          ))}
        </motion.dl>
      </section>

      {/* CTA + dải đối tác — Hình S09, hai dải cuối trang.

          Dải xanh: y=755…779 (cao 25/424 = 5.9% bề ngang nội dung), chạy hết bề
          ngang, màu nền đo được (0,91,48) — cùng tông xanh đậm với nút "Tạo hồ
          sơ" ở hero, KHÔNG phải `--primary` xanh tươi mà bản trước dùng. Nút bên
          phải nền TRẮNG, chữ xanh đậm.

          Dải đối tác: nền be/cam nhạt (247,241,229) chứ không phải nền trắng
          viền nét đứt; icon bắt tay và link "Trở thành đối tác" đều màu cam. */}
      <section className={cn(PAGE_CONTAINER, 'space-y-3')}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: revealEase }}
          className='bg-primary-strong text-primary-foreground relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl px-7 py-6'
        >
          {/* Mục 11: quầng sáng xanh non hiện chậm ở góc phải — thuần trang trí,
              không đụng tới bố cục hay màu nền hiện có. */}
          <motion.span
            aria-hidden
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.4, delay: 0.2, ease: revealEase }}
            className='bg-primary/40 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full blur-3xl'
          />
          <p className='relative font-semibold text-pretty'>{t('cta.title')}</p>
          <Button
            className='bg-background text-primary-strong hover:bg-background/90 relative border-0 bg-none shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md'
            onClick={startBrief}
            disabled={createBrief.isPending}
          >
            <span className='relative overflow-hidden'>
              {/* Mục 11: một vệt sáng lướt qua nút đúng một lần khi dải vào tầm nhìn. */}
              <motion.span
                aria-hidden
                initial={reduceMotion ? false : { x: '-150%' }}
                whileInView={{ x: '150%' }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.9, delay: 0.5, ease: 'easeInOut' }}
                className='absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/40'
              />
              <span className='relative'>{t('cta.action')}</span>
            </span>
          </Button>
        </motion.div>

        {/* Mục 12: hiện dần sau dải CTA. */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2, ease: revealEase }}
          className='group bg-brand-orange-soft/70 text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-2xl px-7 py-4 text-sm transition-colors duration-300 hover:bg-brand-orange-soft'
        >
          <span className='inline-flex items-center gap-2'>
            <Handshake className='text-brand-orange size-4' />
            {t('partner.text')}
          </span>
          <button
            type='button'
            onClick={() => setPartnerDialogOpen(true)}
            className='text-brand-orange inline-flex items-center gap-1.5 font-semibold'
          >
            {t('partner.action')}
            <ArrowRight className='size-3.5 transition-transform duration-300 group-hover:translate-x-1' />
          </button>
        </motion.div>
      </section>

      <PartnerRegistrationDialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen} />

      {/* Hình S09 kết thúc ngay sau dải đối tác — mực in cuối cùng ở y=797 trên
          ảnh cao 800px. Dòng nhắc "SAVICO không hiển thị báo giá…" là của bản
          dựng, không có trong ảnh, nên bỏ; R2 vẫn được nói thẳng ở câu hỏi 4
          của FAQ và ở dòng dẫn của bảng so sánh. */}
    </div>
  )
}
