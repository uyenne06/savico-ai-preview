'use client'

import {
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Handshake,
  ImageIcon,
  Loader2,
  Lock,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Users,
  X
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Photo, revealContainerVariants, revealEase, revealItemVariants, RevealPhoto } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/shared/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import {
  CONTRACTOR_PREVIEW_ID,
  contractorBriefRoute,
  contractorCompareRoute,
  contractorFirmRoute,
  contractorInvitationsRoute,
  contractorInviteRoute,
  contractorMatchesRoute
} from '@/shared/constants/routes'
import { useCountUp, usePastElement } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatDate, formatNumber } from '@/shared/utils'
import { CONTRACTOR_TABS, MAX_INVITATIONS, type ContractorTab } from '../constants/contractors.constants'
import { useBrief } from '../hooks/use-brief'
import { useContractor } from '../hooks/use-contractors'
import { useInvitations } from '../hooks/use-invitations'
import { isInvited, remainingInvites } from '../services/contractor-list.service'
import { useContractorsStore } from '../store/contractors.store'
import type { Contractor, ContractorPhoto, ContractorProject } from '../types/contractor.types'
import { MATCHES_LAST_VIEWED_KEY } from './contractor-matches'
import { ContractorLogo } from './contractor-logo'
import { useProjectPickerStore } from '../store/project-picker.store'
import { ProjectContextBar } from './project-context-bar'
import { ProjectPickerDialog } from './project-picker-dialog'

interface ContractorProfileProps {
  projectId: string
  contractorId: string
  /** Tab đang mở, lấy từ `?tab=` để chia sẻ được đường dẫn tới đúng tab. */
  tab: ContractorTab
}

/** Bề ngang trang, đo từ ảnh S13: khối nội dung chiếm 90% bề ngang màn. */
const PAGE_CONTAINER = 'mx-auto w-[90%] max-w-[80rem]'

/** Mốc để bật thanh hồ sơ thu gọn sau khi phần nhận diện rời khỏi viewport. */
const HEADER_ANCHOR_ID = 'firm-header-anchor'

/** Vòng tròn luôn khép kín; chỉ nét tick bên trong chạy hiệu ứng vẽ. */
function DrawnCircleCheck({
  className,
  delay = 0,
  active = true
}: {
  className?: string
  delay?: number
  active?: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'border-primary text-primary flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
        className
      )}
    >
      <Check
        className={cn('size-2.5 motion-reduce:animate-none', active && 'animate-[firm-check-draw_.45s_ease-out_both]')}
        style={{
          animationDelay: `${delay}s`,
          strokeDasharray: 48,
          strokeDashoffset: active ? undefined : 48
        }}
        strokeWidth={3}
      />
    </span>
  )
}

function CountedMetric({ value, format }: { value: number; format: (value: number) => string }) {
  const { ref, display } = useCountUp(value, { duration: 0.8, amount: 0.3 })
  return <span ref={ref}>{format(display)}</span>
}

/**
 * Nội dung tab trượt vào theo hướng tab vừa chọn (mục 4) — Radix dựng lại mỗi
 * `TabsContent` khi nó vừa active nên `initial`/`animate` chạy đúng một lần
 * mỗi lần đổi tab, không cần `AnimatePresence`.
 */
function TabPanel({ direction, children }: { direction: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -12 }}
      transition={{ duration: 0.3, ease: revealEase }}
      className='space-y-5'
    >
      {children}
    </motion.div>
  )
}

/**
 * Nút "Mời báo giá" — MỘT nơi quyết định trạng thái, dùng lại cho cột phải,
 * dải tóm tắt dính khi cuộn và thanh dưới cùng trên mobile (mục 3/11), để ba
 * chỗ không bao giờ lệch nhau.
 */
function InviteButton({
  projectId,
  contractorId,
  contractor,
  preview,
  invited,
  inviteLocked,
  navigating,
  onNavigate,
  onOpenPicker,
  size
}: {
  projectId: string
  contractorId: string
  contractor: Contractor
  preview: boolean
  invited: boolean
  inviteLocked: boolean
  navigating: boolean
  onNavigate: () => void
  onOpenPicker: () => void
  size?: 'sm'
}) {
  const t = useTranslations('contractors.firm')
  const tCommon = useTranslations('contractors.common')

  if (!contractor.acceptingProjects) {
    return (
      <Button size={size} className='w-full opacity-50' disabled>
        <Send className='size-4' />
        {tCommon('invite')}
      </Button>
    )
  }

  if (preview) {
    return (
      <Button size={size} className='w-full' onClick={onOpenPicker}>
        <Send className='size-4' />
        {tCommon('invite')}
      </Button>
    )
  }

  if (invited) {
    return (
      <Button asChild size={size} variant='outline' className='border-primary text-primary-strong w-full'>
        <Link href={contractorInvitationsRoute(projectId)}>
          <Send className='size-4' />
          {tCommon('invited')} · {t('viewInvites')}
        </Link>
      </Button>
    )
  }

  if (inviteLocked) {
    return (
      <Button size={size} className='w-full' disabled title={tCommon('inviteFull', { max: MAX_INVITATIONS })}>
        <Send className='size-4' />
        {tCommon('inviteFull', { max: MAX_INVITATIONS })}
      </Button>
    )
  }

  return (
    <Button asChild size={size} className='w-full' onClick={onNavigate}>
      <Link href={contractorInviteRoute(projectId, contractorId)}>
        {navigating ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
        {tCommon('invite')}
      </Link>
    </Button>
  )
}

/**
 * Hồ sơ một nhà thầu — S13 (tab Tổng quan) và S14 (tab Hợp tác SAVICO) là HAI
 * TAB CỦA CÙNG MỘT MÀN, không phải hai trang.
 *
 * Ba điểm bố cục lấy thẳng từ ảnh S13, đừng "dọn dẹp" lại:
 * - Khối nhận diện, dải chỉ số và HÀNG TAB nằm chung MỘT thẻ. Tab tách ra ngoài
 *   thẻ (bản trước) làm phần đầu trang vỡ thành hai mảnh rời.
 * - Tab Tổng quan là bản TÓM TẮT cả hồ sơ (giới thiệu, hợp tác, dự án tiêu
 *   biểu, năng lực); ba tab còn lại là bản chi tiết của từng phần. Ảnh mẫu vẽ
 *   đúng như vậy — khách xem lướt một lượt rồi mới bấm vào tab cần soi kỹ.
 * - Cột phải chỉ có ba dòng TÌNH TRẠNG NHẬN VIỆC (khảo sát / đang nhận / phạm
 *   vi). Năm thành lập, quy mô đội ngũ và văn phòng chuyển sang cột trái, nằm
 *   ngay dưới đoạn giới thiệu.
 */
export function ContractorProfile({ projectId, contractorId, tab }: ContractorProfileProps) {
  const t = useTranslations('contractors.firm')
  const tCommon = useTranslations('contractors.common')
  const locale = useLocale() as Locale
  const router = useRouter()

  const openPicker = useProjectPickerStore((s) => s.openPicker)
  /** Xem thử — chưa gắn hồ sơ dự án nào (xem `CONTRACTOR_PREVIEW_ID`). */
  const preview = projectId === CONTRACTOR_PREVIEW_ID

  /** Bấm một thẻ "thế mạnh" ở khối giới thiệu -> tab dự án và giữ bộ lọc vừa chọn. */
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const goToProjectsTab = (strength: string) => {
    setProjectFilter(strength)
    router.replace(contractorFirmRoute(projectId, contractorId, 'projects'))
  }

  const { data: brief } = useBrief(projectId)
  const { data: contractor, isPending } = useContractor(contractorId)
  const { data: invitations } = useInvitations(projectId)

  const compareIds = useContractorsStore((s) => s.compareIds)
  const toggleCompare = useContractorsStore((s) => s.toggleCompare)

  const sent = invitations ?? []
  const invited = isInvited(sent, contractorId)
  const inviteLocked = remainingInvites(sent) === 0
  const inCompare = compareIds.includes(contractorId)
  const compareLocked = !inCompare && compareIds.length >= MAX_INVITATIONS
  const reduceMotion = useReducedMotion()
  const compareButtonRef = useRef<HTMLButtonElement>(null)
  const [compareFlight, setCompareFlight] = useState<{
    fromX: number
    fromY: number
    toX: number
    toY: number
  } | null>(null)

  // Cuộn qua khối nhận diện → dải tóm tắt dính dưới thanh điều hướng (mục 3).
  const barCollapsed = usePastElement(HEADER_ANCHOR_ID, Boolean(contractor))

  const handleToggleCompare = () => {
    if (compareLocked) return
    if (!inCompare && !reduceMotion) {
      const source = compareButtonRef.current?.getBoundingClientRect()
      const target = document.getElementById('firm-compare-target')?.getBoundingClientRect()
      if (source && target) {
        setCompareFlight({
          fromX: source.left + source.width / 2,
          fromY: source.top + source.height / 2,
          toX: target.left + target.width / 2,
          toY: target.top + target.height / 2
        })
      }
    }
    toggleCompare(contractorId)
  }

  /** Đang xem ảnh nào trong hộp phóng — `null` là đang đóng (mục 6). */
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)

  /** Nút "Mời báo giá" thở một nhịp sau khi hiện (mục 11). */
  const [inviteBreathe, setInviteBreathe] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setInviteBreathe(true), 500)
    return () => window.clearTimeout(timer)
  }, [])
  /** Bấm "Mời báo giá" → vòng xoay trong lúc trang M08 tải (mục 11). */
  const [navigatingInvite, setNavigatingInvite] = useState(false)

  /**
   * Nội dung trượt vào theo HƯỚNG của tab vừa chọn so với tab trước đó (mục
   * 4) — dương là sang phải (tab đứng sau), âm là sang trái. Mẫu "điều chỉnh
   * state khi prop đổi" chính thức của React: so với tab đã thấy lần render
   * trước, đặt lại ngay trong thân hàm thay vì trong `useEffect`.
   */
  const [renderedTab, setRenderedTab] = useState(tab)
  const [tabDirection, setTabDirection] = useState(1)
  if (tab !== renderedTab) {
    setTabDirection(CONTRACTOR_TABS.indexOf(tab) - CONTRACTOR_TABS.indexOf(renderedTab) || 1)
    setRenderedTab(tab)
  }

  if (isPending || !contractor) {
    return (
      <div className={cn(PAGE_CONTAINER, 'space-y-6 py-8')}>
        <Skeleton className='h-20 rounded-2xl' />
        <Skeleton className='h-96 rounded-2xl' />
      </div>
    )
  }

  const areas = contractor.serviceAreas.slice(0, 3).join(', ')

  /** Dải chỉ số trong thẻ nhận diện — giá trị ở trên, chú thích nhỏ ở dưới. */
  const headerFacts = [
    {
      key: 'similar',
      icon: CalendarCheck,
      value: (
        <CountedMetric
          value={contractor.similarProjects}
          format={(value) => tCommon('similarShort', { count: value })}
        />
      ),
      hint: tCommon('similarSuffix')
    },
    {
      key: 'distance',
      icon: MapPin,
      value: (
        <CountedMetric
          value={Math.round(contractor.distanceKm * 10)}
          format={(value) =>
            tCommon('distanceShort', {
              km: formatNumber(value / 10, locale, { minimumFractionDigits: 1 })
            })
          }
        />
      ),
      hint: tCommon('distanceSuffix')
    },
    {
      key: 'areas',
      icon: MapIcon,
      value: (
        <CountedMetric
          value={contractor.serviceAreas.length}
          format={(value) => t('serviceAreaCount', { count: value })}
        />
      ),
      hint: areas
    },
    {
      key: 'survey',
      icon: Clock,
      value: (
        <CountedMetric
          value={contractor.surveyWithinHours}
          format={(value) => tCommon('surveyHours', { hours: value })}
        />
      ),
      hint: tCommon('surveyLabel')
    }
  ]

  /** Ba dòng "Thông tin hoạt động" ở cột phải — nhãn nhỏ ở trên, giá trị ở dưới. */
  const activityRows = [
    {
      key: 'survey',
      icon: Clock,
      label: tCommon('surveyLabel'),
      value: tCommon('surveyHours', { hours: contractor.surveyWithinHours })
    },
    {
      key: 'accepting',
      icon: Briefcase,
      label: contractor.acceptingProjects ? tCommon('acceptingLabel') : tCommon('notAccepting'),
      value: tCommon('acceptingSuffix')
    },
    { key: 'areas', icon: MapIcon, label: tCommon('serviceAreas'), value: areas }
  ]

  return (
    <div className={cn(PAGE_CONTAINER, 'space-y-4 py-8')}>
      {/* Xem thử thì chưa có hồ sơ để hiện — để nguyên thanh này là một khung
          chờ xám đứng mãi ở đầu trang. */}
      {preview ? null : (
        <ProjectContextBar
          brief={brief}
          compact
          aside={
            <div className='flex items-center gap-2'>
              <motion.div
                id='firm-compare-target'
                key={compareIds.length}
                initial={reduceMotion ? false : { scale: 0.82, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Button asChild size='sm' variant='outline' className='border-primary/40 text-primary-strong'>
                  <Link href={contractorCompareRoute(projectId)}>
                    <Scale className='size-3.5' />
                    {t('compareChip', { count: compareIds.length, max: MAX_INVITATIONS })}
                  </Link>
                </Button>
              </motion.div>
              <Button asChild size='sm' variant='ghost' className='hidden sm:inline-flex'>
                <Link href={contractorBriefRoute(projectId)}>{tCommon('editBrief')}</Link>
              </Button>
            </div>
          }
        />
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Link
          href={contractorMatchesRoute(projectId)}
          onClick={() => window.sessionStorage.setItem(MATCHES_LAST_VIEWED_KEY, contractorId)}
          className='text-primary-strong inline-flex items-center gap-2 text-sm font-medium'
        >
          ← {tCommon('backToList')}
        </Link>
      </motion.div>

      <div className='grid gap-x-[1.4%] gap-y-5 lg:grid-cols-[79%_minmax(0,1fr)]'>
        <div className='min-w-0'>
          <Tabs
            value={tab}
            onValueChange={(next) => router.replace(contractorFirmRoute(projectId, contractorId, next))}
            className='gap-5'
          >
            {/* Nhận diện + chỉ số + tab: một thẻ duy nhất, đúng ảnh S13. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: revealEase }}
              className='bg-card rounded-2xl border'
            >
              <div className='flex flex-wrap items-center gap-y-4 px-5 py-4'>
                <ContractorLogo contractor={contractor} className='size-24 shrink-0 rounded-xl' />

                <div className='min-w-0 grow basis-52 px-4 lg:grow-0 lg:basis-[25%]'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h1 className='min-w-0 text-xl font-semibold tracking-tight text-balance'>{contractor.name}</h1>
                    {contractor.verified ? (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.6, duration: 0.4, delay: 0.3 }}
                      >
                        <BadgeCheck className='text-primary size-5 shrink-0 animate-[firm-check-draw_.5s_ease-out_both] motion-reduce:animate-none' />
                      </motion.span>
                    ) : null}
                    {invited ? (
                      <span className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 text-[11px] font-medium'>
                        {tCommon('invited')}
                      </span>
                    ) : null}
                  </div>
                  <p className='text-muted-foreground mt-1 text-sm'>{contractor.kind}</p>
                </div>

                <motion.div
                  variants={revealContainerVariants}
                  initial='hidden'
                  animate='show'
                  transition={{ delayChildren: 0.4 }}
                  className='divide-border border-border flex min-w-0 grow basis-full divide-x border-l lg:basis-0'
                >
                  {headerFacts.map((fact) => (
                    <motion.div variants={revealItemVariants} key={fact.key} className='min-w-0 flex-1 px-2.5'>
                      <p className='flex min-w-0 items-center gap-1.5 text-sm font-semibold'>
                        <fact.icon aria-hidden className='text-primary size-4 shrink-0' />
                        <span className='truncate'>{fact.value}</span>
                      </p>
                      <p className='text-muted-foreground mt-1 truncate pl-5.5 text-xs'>{fact.hint}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Tab gạch chân, không phải viên thuốc nền xám của primitive.
                  Gạch chân trượt giữa các tab + vẽ từ trái khi vào trang (mục 4). */}
              <TabsList className='h-auto w-full justify-start gap-8 overflow-x-auto rounded-none border-t bg-transparent px-5 py-0'>
                {CONTRACTOR_TABS.map((key) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className='data-[state=active]:text-primary-strong text-muted-foreground relative h-auto flex-none rounded-none border-x-0 border-t-0 border-b-2 border-transparent px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                  >
                    {t(`tabs.${key}`)}
                    {tab === key ? (
                      <motion.span
                        layoutId='firm-tab-underline'
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        style={{ transformOrigin: 'left' }}
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                        className='border-primary pointer-events-none absolute inset-x-0 bottom-0 border-b-2'
                      />
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              {tab === 'projects' ? (
                <FeaturedProjects
                  contractor={contractor}
                  filter={projectFilter}
                  onClearFilter={() => setProjectFilter(null)}
                  inviteAction={
                    <InviteButton
                      projectId={projectId}
                      contractorId={contractorId}
                      contractor={contractor}
                      preview={preview}
                      invited={invited}
                      inviteLocked={inviteLocked}
                      navigating={navigatingInvite}
                      onNavigate={() => setNavigatingInvite(true)}
                      onOpenPicker={openPicker}
                      size='sm'
                    />
                  }
                  detailed
                />
              ) : null}
              {tab === 'legal' ? (
                <div className='px-4 pt-4 pb-5 sm:px-5 sm:pt-5 sm:pb-6'>
                  <LegalChecks
                    contractor={contractor}
                    detailed
                    scanUnlocked={invited}
                    inviteAction={
                      <InviteButton
                        projectId={projectId}
                        contractorId={contractorId}
                        contractor={contractor}
                        preview={preview}
                        invited={invited}
                        inviteLocked={inviteLocked}
                        navigating={navigatingInvite}
                        onNavigate={() => setNavigatingInvite(true)}
                        onOpenPicker={openPicker}
                        size='sm'
                      />
                    }
                  />
                </div>
              ) : null}
            </motion.div>

            {/* Mốc mỏng cho `usePastElement` — CÙNG mẫu với bảng so sánh
                (`TABLE_TOP_ANCHOR_ID`), không gắn `id` lên cả khối tiêu đề cao
                bên trên. Gắn lên khối cao thì thanh dính bật ngay khi cuộn qua
                dù tên "An Gia Build" vẫn còn hiện — khối đó cao hơn khung nhìn
                nên `IntersectionObserver` báo "hết giao" ở nhiều mốc cuộn khác
                nhau tùy chiều cao màn hình, không riêng lúc đã cuộn qua hẳn. */}
            <div id={HEADER_ANCHOR_ID} className='h-px' aria-hidden />

            <motion.div layout className='overflow-hidden' transition={{ duration: 0.3, ease: revealEase }}>
              <AnimatePresence mode='wait'>
                <TabPanel key={tab} direction={tabDirection}>
                  {tab === 'overview' ? (
                    <>
                      <IntroCard
                        contractor={contractor}
                        onTagClick={goToProjectsTab}
                        onOpenPhoto={setActivePhotoIndex}
                      />
                      <PartnershipSummary contractor={contractor} />
                      <FeaturedProjects contractor={contractor} />
                      <LegalChecks contractor={contractor} />
                    </>
                  ) : null}
                  {tab === 'partnership' ? <PartnershipTab contractor={contractor} /> : null}
                </TabPanel>
              </AnimatePresence>
            </motion.div>
          </Tabs>
        </div>

        {/* Cột phải dính theo cuộn: nút "Mời báo giá" là hành động chính của màn,
            hồ sơ lại dài — để nó trôi mất là bắt người dùng cuộn ngược lên. */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className='hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start'
        >
          <motion.section
            variants={revealContainerVariants}
            initial='hidden'
            animate='show'
            className='bg-card rounded-2xl border p-4'
          >
            <h2 className='text-base font-semibold'>{t('activity')}</h2>
            <ul className='mt-3 space-y-2'>
              {activityRows.map((row) => (
                <motion.li
                  variants={revealItemVariants}
                  key={row.key}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                    row.key === 'accepting' && !contractor.acceptingProjects && 'bg-muted/60 text-muted-foreground'
                  )}
                >
                  <row.icon
                    aria-hidden
                    className={cn(
                      'text-primary size-4 shrink-0',
                      row.key === 'accepting' && !contractor.acceptingProjects && 'text-muted-foreground'
                    )}
                  />
                  <div className='min-w-0'>
                    <p className='text-muted-foreground text-[11px] leading-tight'>{row.label}</p>
                    <p className='mt-0.5 truncate text-sm font-semibold'>{row.value}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <div className='space-y-2.5'>
            {/* Hiện sau cùng + một nhịp thở (mục 11); tạm ngưng nhận dự án →
                nút mờ + dẫn hướng sang nhà thầu khác (mục 10). */}
            <motion.div
              className='h-11 [&>*]:h-11'
              animate={{ scale: inviteBreathe && contractor.acceptingProjects ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              <InviteButton
                projectId={projectId}
                contractorId={contractorId}
                contractor={contractor}
                preview={preview}
                invited={invited}
                inviteLocked={inviteLocked}
                navigating={navigatingInvite}
                onNavigate={() => setNavigatingInvite(true)}
                onOpenPicker={openPicker}
              />
            </motion.div>
            {!contractor.acceptingProjects ? (
              <>
                <p className='text-muted-foreground text-xs text-pretty'>{t('notAcceptingNotice')}</p>
                <Button asChild variant='outline' className='h-11 w-full'>
                  <Link href={contractorMatchesRoute(projectId)}>{t('viewSimilar')}</Link>
                </Button>
              </>
            ) : null}

            <Button
              ref={compareButtonRef}
              variant='outline'
              disabled={compareLocked}
              title={compareLocked ? t('compareFull', { max: MAX_INVITATIONS }) : undefined}
              className={cn(
                'border-primary/50 text-primary-strong h-11 w-full',
                inCompare && 'border-primary bg-primary/10 hover:bg-primary/15'
              )}
              onClick={handleToggleCompare}
            >
              {inCompare ? (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.6, duration: 0.35 }}
                >
                  <DrawnCircleCheck />
                </motion.span>
              ) : (
                <Plus className='size-4' />
              )}
              {inCompare ? t('inCompare') : t('addToCompare')}
            </Button>
          </div>

          <p className='text-muted-foreground bg-muted/50 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed'>
            <Lock className='mt-0.5 size-3.5 shrink-0' />
            <span>{t('contactLocked')}</span>
          </p>
        </motion.aside>
      </div>

      <div
        aria-hidden={!barCollapsed}
        className={cn(
          PAGE_CONTAINER,
          'pointer-events-none fixed top-14 left-1/2 z-30 hidden -translate-x-1/2 md:block'
        )}
      >
        <AnimatePresence>
          {barCollapsed ? (
            <motion.div
              initial={reduceMotion ? false : { y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: -18, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
              className='bg-card/95 pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-2 shadow-[0_10px_30px_-20px_rgba(24,80,42,0.5)] backdrop-blur-sm'
            >
              <ContractorLogo contractor={contractor} className='size-8 shrink-0 rounded-md text-xs' />
              <span className='truncate text-sm font-semibold'>{contractor.name}</span>
              {invited ? (
                <span className='bg-primary/10 text-primary-strong rounded-md px-2 py-0.5 text-[11px] font-medium'>
                  {tCommon('invited')}
                </span>
              ) : null}
              <div className='ml-auto h-9 w-44 shrink-0 [&>*]:h-9'>
                <InviteButton
                  projectId={projectId}
                  contractorId={contractorId}
                  contractor={contractor}
                  preview={preview}
                  invited={invited}
                  inviteLocked={inviteLocked}
                  navigating={navigatingInvite}
                  onNavigate={() => setNavigatingInvite(true)}
                  onOpenPicker={openPicker}
                  size='sm'
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {barCollapsed ? <div className='h-20 lg:hidden' aria-hidden /> : null}
      <AnimatePresence>
        {barCollapsed ? (
          <motion.div
            initial={reduceMotion ? false : { y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 72, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: revealEase }}
            className='bg-card/95 fixed inset-x-0 bottom-0 z-30 border-t p-3 backdrop-blur-sm lg:hidden'
          >
            <div className='mx-auto h-11 w-full max-w-lg [&>*]:h-11'>
              <InviteButton
                projectId={projectId}
                contractorId={contractorId}
                contractor={contractor}
                preview={preview}
                invited={invited}
                inviteLocked={inviteLocked}
                navigating={navigatingInvite}
                onNavigate={() => setNavigatingInvite(true)}
                onOpenPicker={openPicker}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {compareFlight && typeof document !== 'undefined'
        ? createPortal(
            <motion.div
              initial={{ x: compareFlight.fromX, y: compareFlight.fromY, opacity: 0, scale: 0.74 }}
              animate={{
                x: [compareFlight.fromX, compareFlight.fromX, compareFlight.toX, compareFlight.toX],
                y: [compareFlight.fromY, compareFlight.fromY - 72, compareFlight.toY - 24, compareFlight.toY],
                opacity: [0, 1, 1, 0],
                scale: [0.74, 0.9, 0.7, 0.5]
              }}
              transition={{ duration: 0.85, ease: revealEase, times: [0, 0.16, 0.82, 1] }}
              onAnimationComplete={() => setCompareFlight(null)}
              className='bg-card pointer-events-none fixed top-0 left-0 z-60 flex max-w-44 items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg'
            >
              <ContractorLogo contractor={contractor} className='size-7 rounded-md text-[9px]' />
              <span className='truncate text-xs font-semibold'>{contractor.name}</span>
            </motion.div>,
            document.body
          )
        : null}

      <PhotoLightbox
        photos={contractor.photos}
        index={activePhotoIndex}
        onClose={() => setActivePhotoIndex(null)}
        onNavigate={setActivePhotoIndex}
      />

      <ProjectPickerDialog />
    </div>
  )
}

/**
 * Khối giới thiệu: chữ bên trái, bộ ảnh ghép bên phải.
 *
 * Ảnh ghép là 1 ảnh lớn + 2 ảnh xếp chồng, mỗi ảnh có chú thích đè lên đáy —
 * đúng ảnh S13. Tỉ lệ 58,6% / 41,4% cũng đo từ ảnh đó.
 */
function IntroCard({
  contractor,
  onTagClick,
  onOpenPhoto
}: {
  contractor: Contractor
  /** Bấm một thẻ "thế mạnh" → chuyển sang tab "Dự án đã thực hiện" (mục 5). */
  onTagClick: (strength: string) => void
  onOpenPhoto: (index: number) => void
}) {
  const t = useTranslations('contractors.firm')

  const facts = [
    { key: 'founded', icon: CalendarDays, text: t('founded', { year: contractor.foundedYear }) },
    { key: 'team', icon: Users, text: t('team', { count: contractor.teamSize }) },
    { key: 'office', icon: MapPin, text: t('office', { address: contractor.officeAddress }) }
  ]

  const [lead, ...rest] = contractor.photos

  return (
    <section className='bg-card grid gap-x-[1.5%] gap-y-5 rounded-2xl border p-4 lg:grid-cols-[37%_minmax(0,1fr)]'>
      <motion.div
        variants={revealContainerVariants}
        initial='hidden'
        whileInView='show'
        viewport={{ once: true, amount: 0.25 }}
        className='min-w-0'
      >
        <motion.h2 variants={revealItemVariants} className='text-base font-semibold'>
          {t('introTitle')}
        </motion.h2>
        <motion.p
          variants={revealItemVariants}
          className='text-muted-foreground mt-2 text-sm leading-relaxed text-pretty'
        >
          {contractor.intro}
        </motion.p>

        <motion.ul variants={revealContainerVariants} className='mt-4 space-y-2.5 text-sm'>
          {facts.map((fact) => (
            <motion.li variants={revealItemVariants} key={fact.key} className='flex items-start gap-2.5'>
              <fact.icon aria-hidden className='text-primary mt-0.5 size-4 shrink-0' />
              <span className='text-pretty'>{fact.text}</span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Rê -> nền xanh nhạt; bấm -> chuyển tab dự án. Dữ liệu `tags` trên từng
            dự án đưa các thẻ phù hợp lên đầu mà vẫn giữ nguyên toàn bộ hồ sơ. */}
        <motion.ul variants={revealContainerVariants} className='mt-4 flex flex-wrap gap-2'>
          {contractor.strengths.map((strength) => (
            <motion.li variants={revealItemVariants} layout key={strength}>
              <button
                type='button'
                onClick={() => onTagClick(strength)}
                className='border-primary/40 text-primary-strong hover:bg-accent rounded-md border px-2.5 py-1 text-xs transition-colors active:scale-[0.98]'
              >
                {strength}
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      {/* Ô lớn KHÔNG khóa tỉ lệ: trong ảnh mẫu bộ ảnh cao đúng bằng khối chữ bên
          trái, hai đáy thẳng hàng. Đặt `aspect-*` cho ô lớn thì nó dừng sớm hơn
          cột ảnh nhỏ bên cạnh, bộ ghép thành hình răng cưa. */}
      {lead ? (
        <motion.div
          variants={revealContainerVariants}
          initial='hidden'
          animate='show'
          className='grid min-h-52 min-w-0 gap-[1.8%] sm:grid-cols-[58.6%_minmax(0,1fr)]'
        >
          <CollagePhoto photo={lead} onOpen={() => onOpenPhoto(0)} />
          <div className='flex flex-col gap-2'>
            {rest.slice(0, 2).map((photo, index) => (
              <CollagePhoto
                key={photo.caption}
                photo={photo}
                className='min-h-24 flex-1'
                onOpen={() => onOpenPhoto(index + 1)}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
    </section>
  )
}

/**
 * Một ô ảnh trong bộ ghép.
 *
 * CHỖ CHỜ ASSET: chưa có ảnh thật của nhà thầu thì để KHUNG NÉT ĐỨT kèm chú
 * thích, giống ô logo. Nhét đại ảnh kho vào đây thì "Trụ sở công ty" hóa ra
 * biệt thự có hồ bơi, "Đội ngũ nhân sự" hóa ra một người thợ điện — trông như
 * đã có ảnh nên không ai biết là còn thiếu.
 */
function CollagePhoto({
  photo,
  className,
  onOpen
}: {
  photo: ContractorPhoto
  className?: string
  onOpen?: () => void
}) {
  if (!photo.url) {
    return (
      <motion.div
        variants={revealItemVariants}
        className={cn(
          'bg-muted/30 text-muted-foreground/70 flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-2 text-center',
          className
        )}
      >
        <ImageIcon aria-hidden className='size-5 shrink-0' />
        <p className='text-xs'>{photo.caption}</p>
      </motion.div>
    )
  }

  return (
    <motion.button
      type='button'
      variants={revealItemVariants}
      layoutId={`firm-photo-${photo.caption}`}
      onClick={onOpen}
      className={cn('group relative min-w-0 overflow-hidden rounded-xl border text-left', className)}
    >
      {/* `alt` để trống: chú thích ngay bên dưới đã mô tả ảnh, đặt cả hai thì
          trình đọc màn hình đọc trùng hai lần. `RevealPhoto` đã tự lo hiện
          mờ→nét lúc tải và phóng nhẹ khi rê (mục 6). */}
      <RevealPhoto src={photo.url} alt='' className='size-full' sizes='(max-width: 768px) 100vw, 360px' />
      {/* Lớp tối + biểu tượng xem khi rê (mục 6). */}
      <span className='absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-black/30 group-hover:opacity-100'>
        <Eye className='size-6 text-white' />
      </span>
      <p className='pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-3 pt-6 pb-2 text-xs font-medium text-white'>
        {photo.caption}
      </p>
    </motion.button>
  )
}

/**
 * Hộp phóng ảnh doanh nghiệp (mục 6) — phóng ra từ đúng ảnh vừa bấm, mũi tên
 * chuyển ảnh, Esc/bấm nền để đóng.
 *
 * Shared layout giữ đúng điểm xuất phát của ảnh; kéo ngang, phím mũi tên và Esc
 * cùng dùng chung một chỉ số nên không tạo ba luồng điều hướng lệch nhau.
 */
function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate
}: {
  photos: ContractorPhoto[]
  index: number | null
  onClose: () => void
  onNavigate: (nextIndex: number) => void
}) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (index === null) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onNavigate((index - 1 + photos.length) % photos.length)
      if (event.key === 'ArrowRight') onNavigate((index + 1) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, photos.length, onClose, onNavigate])

  const photo = index !== null ? photos[index] : undefined

  return (
    <AnimatePresence>
      {photo?.url ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6'
        >
          <motion.div
            key={index}
            layoutId={`firm-photo-${photo.caption}`}
            initial={reduceMotion ? false : { opacity: 0.65, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0.65, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            drag={photos.length > 1 && !reduceMotion ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) onNavigate(((index ?? 0) + 1) % photos.length)
              if (info.offset.x > 60) onNavigate(((index ?? 0) - 1 + photos.length) % photos.length)
            }}
            className='relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl'
          >
            <Photo src={photo.url} alt='' className='size-full' sizes='90vw' />
            <p className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-4 pt-8 pb-3 text-sm font-medium text-white'>
              {photo.caption}
            </p>
          </motion.div>

          <button
            type='button'
            onClick={onClose}
            aria-label='Close'
            className='absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
          >
            <X className='size-4' />
          </button>

          {photos.length > 1 ? (
            <>
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  onNavigate(((index ?? 0) - 1 + photos.length) % photos.length)
                }}
                aria-label='Previous photo'
                className='absolute left-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
              >
                <ChevronLeft className='size-5' />
              </button>
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  onNavigate(((index ?? 0) + 1) % photos.length)
                }}
                aria-label='Next photo'
                className='absolute right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
              >
                <ChevronRight className='size-5' />
              </button>
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Dải "Đối tác hợp tác cùng SAVICO" — bản tóm tắt dùng ở tab Tổng quan (S13) và
 * mở đầu tab Hợp tác SAVICO (S14). Một khối, hai chỗ dùng, khỏi lệch nội dung.
 */
function PartnershipSummary({ contractor }: { contractor: Contractor }) {
  const t = useTranslations('contractors.firm.partnership')
  const { partnership } = contractor

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, ease: revealEase }}
      className='bg-card flex flex-wrap items-center gap-4 rounded-2xl border p-4'
    >
      <span className='bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-full'>
        <Handshake className='size-6' />
      </span>
      <div className='min-w-0 flex-1'>
        <h2 className='text-base font-semibold'>{t('title')}</h2>
        <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('body', { name: contractor.name })}</p>
        <div className='mt-2.5 flex flex-wrap gap-2 text-xs'>
          <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1.5 rounded-md px-2.5 py-1'>
            <ShieldCheck className='size-3.5' />
            {t('verified')}
          </span>
          <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1.5 rounded-md px-2.5 py-1'>
            <CalendarDays className='size-3.5' />
            {t('since', { since: partnership.since })}
          </span>
        </div>
      </div>
    </motion.section>
  )
}

/** Khối "Dự án tiêu biểu": ảnh bên trái, tên + năm + liên kết bên phải. */
function FeaturedProjects({
  contractor,
  filter,
  onClearFilter,
  inviteAction,
  detailed = false
}: {
  contractor: Contractor
  filter?: string | null
  onClearFilter?: () => void
  inviteAction?: React.ReactNode
  detailed?: boolean
}) {
  const t = useTranslations('contractors.firm')
  const reduceMotion = useReducedMotion()
  const [selectedProject, setSelectedProject] = useState<ContractorProject | null>(null)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [category, setCategory] = useState<'all' | NonNullable<ContractorProject['category']>>('all')
  const [projectSort, setProjectSort] = useState<'latest' | 'oldest'>('latest')
  const [showAllProjects, setShowAllProjects] = useState(false)
  /* Giữ nguyên toàn bộ nội dung. Khi có tag, dự án khớp được đưa lên đầu để người dùng
     vẫn nhìn thấy hồ sơ đầy đủ và thấy rõ chuyển động sắp xếp của các thẻ. */
  const projects = [...contractor.featuredProjects]
    .filter((project) => !verifiedOnly || project.verified)
    .filter((project) => category === 'all' || project.category === category)
    .sort((left, right) => {
      const filterPriority = filter
        ? Number(Boolean(right.tags?.includes(filter))) - Number(Boolean(left.tags?.includes(filter)))
        : 0
      return filterPriority || (projectSort === 'latest' ? right.year - left.year : left.year - right.year)
    })

  const projectFilters = [
    { key: 'all' as const, count: contractor.similarProjects },
    ...(['house', 'villa', 'renovation', 'factory'] as const).map((key) => ({
      key,
      count: contractor.featuredProjects.filter((project) => project.category === key).length
    }))
  ]
  const visibleProjects = showAllProjects ? projects : projects.slice(0, 6)
  const moreCount = Math.max(0, projects.length - visibleProjects.length)
  const resultsKey = `${verifiedOnly}-${category}-${projectSort}-${filter ?? 'all'}`

  if (detailed) {
    return (
      <>
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
          className='border-t px-4 py-5 sm:px-5 sm:py-6'
        >
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <p className='text-sm'>
              <strong className='font-semibold'>
                {t('projects.projectCount', { count: contractor.similarProjects })}
              </strong>
              <span className='text-muted-foreground'>
                {' '}
                · {t('projects.verifiedSummary', { count: contractor.verifiedProjects })}
              </span>
            </p>

            <div className='flex flex-wrap items-center gap-3'>
              <label className='hover:bg-muted/40 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors'>
                <Checkbox
                  checked={verifiedOnly}
                  onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                  aria-label={t('projects.verifiedOnly')}
                />
                <span>{t('projects.verifiedOnly')}</span>
              </label>
              <Select value={projectSort} onValueChange={(value) => setProjectSort(value as 'latest' | 'oldest')}>
                <SelectTrigger className='w-36' aria-label={t('projects.sortLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='latest'>{t('projects.sortLatest')}</SelectItem>
                  <SelectItem value='oldest'>{t('projects.sortOldest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='mt-4 flex gap-2 overflow-x-auto pb-1' role='group' aria-label={t('projects.filterLabel')}>
            {projectFilters.map((item) => (
              <button
                key={item.key}
                type='button'
                aria-pressed={category === item.key}
                onClick={() => setCategory(item.key)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98]',
                  category === item.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:border-primary/40 hover:text-primary-strong bg-background'
                )}
              >
                {t(`projects.filters.${item.key}`, { count: item.count })}
              </button>
            ))}
          </div>

          {filter ? (
            <button
              type='button'
              onClick={onClearFilter}
              className='bg-primary/10 text-primary-strong mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium'
            >
              {filter}
              <X className='size-3' />
              <span className='sr-only'>{t('clearProjectFilter')}</span>
            </button>
          ) : null}

          {projects.length ? (
            <motion.ul
              key={resultsKey}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
              className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'
            >
              <AnimatePresence mode='popLayout'>
                {visibleProjects.map((project, index) => (
                  <motion.li
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    whileHover={reduceMotion ? undefined : { y: -3 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.26,
                      delay: reduceMotion ? 0 : Math.min(index % 6, 5) * 0.045,
                      ease: revealEase
                    }}
                    key={project.id}
                    className='overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-[0_14px_28px_-22px_rgba(24,80,42,0.62)]'
                  >
                    <button
                      type='button'
                      onClick={() => setSelectedProject(project)}
                      className='group block size-full text-left active:scale-[0.995]'
                    >
                      <div className='bg-muted/30 relative aspect-[16/9] overflow-hidden'>
                        {project.imageUrl ? (
                          <RevealPhoto
                            src={project.imageUrl}
                            alt={project.name}
                            className='size-full transition-transform duration-300 group-hover:scale-[1.02]'
                            sizes='(max-width: 640px) 90vw, (max-width: 1280px) 40vw, 260px'
                          />
                        ) : (
                          <div className='flex size-full items-center justify-center'>
                            <ImageIcon className='text-muted-foreground/45 size-8' />
                          </div>
                        )}
                        {project.verified ? (
                          <span className='bg-background/95 text-primary-strong absolute top-2 left-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm'>
                            <CircleCheck className='size-3.5' />
                            {t('projects.verifiedBadge')}
                          </span>
                        ) : null}
                      </div>

                      <div className='p-3'>
                        <h3 className='group-hover:text-primary-strong text-sm font-semibold transition-colors'>
                          {project.name}
                        </h3>
                        {project.tags?.length ? (
                          <div className='mt-2 flex flex-wrap gap-1.5'>
                            {project.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className='bg-muted rounded-md px-2 py-1 text-[11px] text-muted-foreground'
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className='text-muted-foreground mt-3 flex flex-wrap items-center gap-y-1 text-xs'>
                          {project.dimensions ? <span className='pr-2'>{project.dimensions}</span> : null}
                          {project.areaM2 ? (
                            <span className='border-l px-2'>{t('projects.area', { area: project.areaM2 })}</span>
                          ) : null}
                          {project.scale ? <span className='border-l px-2'>{project.scale}</span> : null}
                        </div>
                        <p className='text-muted-foreground mt-2 text-xs'>
                          {t('projects.completed', { year: project.year })}
                        </p>
                        {project.location ? (
                          <p className='text-muted-foreground mt-2 flex items-start gap-1.5 text-xs'>
                            <MapPin className='mt-0.5 size-3.5 shrink-0' />
                            <span>{project.location}</span>
                          </p>
                        ) : null}
                        <span className='text-primary-strong mt-3 inline-flex items-center gap-1 text-xs font-medium'>
                          {t('projects.viewDetail')}
                          <span className='transition-transform group-hover:translate-x-0.5'>→</span>
                        </span>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          ) : (
            <motion.div
              key={resultsKey}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-muted/30 mt-4 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground'
            >
              {t('projects.empty')}
            </motion.div>
          )}

          {moreCount > 0 ? (
            <div className='mt-5 text-center'>
              <Button type='button' variant='outline' size='sm' onClick={() => setShowAllProjects(true)}>
                {t('projects.showMore', { count: moreCount })}
              </Button>
            </div>
          ) : null}

          <p className='text-muted-foreground mt-5 flex items-start gap-1.5 text-xs'>
            <CircleCheck className='mt-0.5 size-3.5 shrink-0' />
            <span>{t('projects.disclaimer')}</span>
          </p>
        </motion.section>

        <ProjectDetailSheet
          contractor={contractor}
          project={selectedProject}
          inviteAction={inviteAction}
          onClose={() => setSelectedProject(null)}
        />
      </>
    )
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.4, ease: revealEase }}
        className='bg-card rounded-2xl border p-4'
      >
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-base font-semibold'>{t('featured')}</h2>
          <AnimatePresence>
            {filter ? (
              <motion.button
                type='button'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onClearFilter}
                className='bg-primary/10 text-primary-strong inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium'
              >
                {filter}
                <X className='size-3' />
                <span className='sr-only'>{t('clearProjectFilter')}</span>
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        <motion.ul layout className='mt-3 grid gap-x-[3%] gap-y-4 sm:grid-cols-3'>
          <AnimatePresence mode='popLayout'>
            {projects.map((project) => (
              <motion.li
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                key={project.id}
              >
                <button
                  type='button'
                  onClick={() => setSelectedProject(project)}
                  className='group flex w-full min-w-0 gap-3 text-left active:scale-[0.99]'
                >
                  {project.imageUrl ? (
                    <div className='w-1/2 shrink-0 overflow-hidden rounded-lg'>
                      <RevealPhoto
                        src={project.imageUrl}
                        alt={project.name}
                        className='aspect-video size-full'
                        sizes='(max-width: 768px) 40vw, 160px'
                      />
                    </div>
                  ) : (
                    <div className='bg-muted/30 flex aspect-video w-1/2 shrink-0 items-center justify-center rounded-lg border border-dashed'>
                      <ImageIcon className='text-muted-foreground/50 size-5' />
                    </div>
                  )}
                  <div className='min-w-0'>
                    <p className='group-hover:text-primary text-sm leading-snug font-medium text-pretty transition-colors'>
                      {project.name}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs'>{project.year}</p>
                    <span className='text-primary-strong mt-2 inline-flex items-center gap-1.5 text-xs font-medium'>
                      {t('viewProject')}
                      <span className='inline-block transition-transform group-hover:translate-x-1'>→</span>
                    </span>
                  </div>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </motion.section>

      <ProjectDetailSheet contractor={contractor} project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  )
}

function ProjectDetailSheet({
  contractor,
  project,
  inviteAction,
  onClose
}: {
  contractor: Contractor
  project: ContractorProject | null
  inviteAction?: React.ReactNode
  onClose: () => void
}) {
  const t = useTranslations('contractors.firm.projects.detail')
  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | undefined>()

  const projectType = project?.category ? t(`projectTypes.${project.category}`) : t('notUpdated')
  const constructionScope = project?.constructionScope
    ? t(`constructionScopes.${project.constructionScope}`)
    : (project?.tags?.[1] ?? t('notUpdated'))
  const contractorRole = project?.contractorRole ? t(`roles.${project.contractorRole}`) : t('roles.contractor')
  const dimensions = [project?.dimensions, project?.areaM2 ? t('area', { area: project.areaM2 }) : null, project?.scale]
    .filter(Boolean)
    .join(' · ')
  const constructionPeriod =
    project?.constructionMonths && project.constructionStartedAt && project.constructionEndedAt
      ? t('constructionPeriodValue', {
          months: project.constructionMonths,
          from: formatDate(project.constructionStartedAt, locale, { month: '2-digit', year: 'numeric' }),
          to: formatDate(project.constructionEndedAt, locale, { month: '2-digit', year: 'numeric' })
        })
      : t('completedYear', { year: project?.year ?? '' })
  const gallery = project ? [project.imageUrl, ...(project.galleryUrls ?? [])].filter(Boolean).slice(0, 3) : []
  const activeImage = activeGalleryImage && gallery.includes(activeGalleryImage) ? activeGalleryImage : gallery[0]
  const thumbnails = gallery.filter((imageUrl) => imageUrl !== activeImage).slice(0, 2)
  const sheetInviteAction = isValidElement<{
    onNavigate?: () => void
    onOpenPicker?: () => void
  }>(inviteAction)
    ? cloneElement(inviteAction, {
        onNavigate: () => {
          onClose()
          inviteAction.props.onNavigate?.()
        },
        onOpenPicker: () => {
          onClose()
          inviteAction.props.onOpenPicker?.()
        }
      })
    : inviteAction

  return (
    <Sheet open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-[96vw] gap-0 overflow-hidden sm:max-w-xl lg:w-[34rem] lg:max-w-[34rem]'>
        {project ? (
          <>
            <SheetHeader className='border-b px-5 py-4 pr-12'>
              <SheetTitle className='text-base'>{project.name}</SheetTitle>
              <SheetDescription className='sr-only'>
                {t('description', { contractor: contractor.name })}
              </SheetDescription>
            </SheetHeader>

            <div className='min-h-0 flex-1 overflow-y-auto px-5 py-4'>
              <div className='grid grid-cols-[2fr_1fr] grid-rows-2 gap-1.5'>
                <div className='bg-muted/50 relative row-span-2 aspect-[4/3] overflow-hidden rounded-lg border'>
                  <AnimatePresence mode='wait' initial={false}>
                    {activeImage ? (
                      <motion.div
                        key={activeImage}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.22 }}
                        className='absolute inset-0'
                      >
                        <RevealPhoto
                          src={activeImage}
                          alt={t('imageAlt', { project: project.name, index: 1 })}
                          className='size-full rounded-lg'
                          sizes='(max-width: 640px) 62vw, 350px'
                        />
                      </motion.div>
                    ) : (
                      <div className='flex size-full items-center justify-center'>
                        <ImageIcon className='text-muted-foreground/55 size-6' />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {[0, 1].map((index) => {
                  const imageUrl = thumbnails[index]
                  return imageUrl ? (
                    <button
                      key={imageUrl}
                      type='button'
                      onClick={() => setActiveGalleryImage(imageUrl)}
                      className='group aspect-[4/3] overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                      aria-label={t('selectImage', { index: index + 2 })}
                    >
                      <RevealPhoto
                        src={imageUrl}
                        alt={t('imageAlt', { project: project.name, index: index + 2 })}
                        className='size-full transition-transform duration-200 group-hover:scale-[1.03]'
                        sizes='(max-width: 640px) 30vw, 170px'
                      />
                    </button>
                  ) : (
                    <div
                      key={`${project.id}-placeholder-${index}`}
                      className='bg-muted/50 flex aspect-[4/3] items-center justify-center rounded-lg border'
                    >
                      <ImageIcon className='text-muted-foreground/55 size-6' />
                    </div>
                  )
                })}
              </div>

              <div className='mt-3 flex flex-wrap gap-2'>
                <span className='bg-muted rounded-md px-2.5 py-1 text-xs'>{projectType}</span>
                <span className='bg-muted rounded-md px-2.5 py-1 text-xs'>{constructionScope}</span>
                {project.verified ? (
                  <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium'>
                    <CircleCheck className='size-3.5' />
                    {t('verifiedBadge')}
                  </span>
                ) : null}
              </div>

              <motion.section
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.08 }}
                className='mt-5'
              >
                <h3 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>{t('title')}</h3>
                <dl className='mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm'>
                  <dt className='text-muted-foreground'>{t('projectType')}</dt>
                  <dd className='font-medium'>{projectType}</dd>
                  <dt className='text-muted-foreground'>{t('scale')}</dt>
                  <dd className='font-medium'>{dimensions || t('notUpdated')}</dd>
                  <dt className='text-muted-foreground'>{t('constructionScope')}</dt>
                  <dd className='font-medium'>{constructionScope}</dd>
                  <dt className='text-muted-foreground'>{t('role')}</dt>
                  <dd className='font-medium'>{contractorRole}</dd>
                  <dt className='text-muted-foreground'>{t('constructionPeriod')}</dt>
                  <dd className='font-medium'>{constructionPeriod}</dd>
                  <dt className='text-muted-foreground'>{t('location')}</dt>
                  <dd className='font-medium'>{project.location ?? t('notUpdated')}</dd>
                  <dt className='text-muted-foreground'>{t('mainItems')}</dt>
                  <dd className='font-medium text-pretty'>{project.mainItems ?? t('mainItemsFallback')}</dd>
                </dl>
              </motion.section>

              {project.verified ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.13 }}
                  className='border-primary/25 bg-primary/5 mt-5 flex items-start gap-3 rounded-xl border p-3.5'
                >
                  <ShieldCheck className='text-primary mt-0.5 size-5 shrink-0' />
                  <div>
                    <p className='text-sm font-semibold'>
                      {t('verifiedTitle', {
                        date: project.verifiedAt
                          ? formatDate(project.verifiedAt, locale, {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : t('verifiedDateFallback')
                      })}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>{t('verifiedBody')}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.13 }}
                  className='mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 p-3.5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                >
                  <CircleAlert className='mt-0.5 size-4 shrink-0' />
                  <div>
                    <p className='text-sm font-semibold'>{t('selfReportedTitle')}</p>
                    <p className='mt-1 text-xs leading-relaxed'>{t('selfReportedBody')}</p>
                  </div>
                </motion.div>
              )}

              <div className='mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 p-3.5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'>
                <CircleAlert className='mt-0.5 size-4 shrink-0' />
                <p className='text-xs leading-relaxed'>{t('priceNotice')}</p>
              </div>
            </div>

            <SheetFooter className='flex-row items-center justify-end border-t bg-background px-5 py-3'>
              <SheetClose asChild>
                <Button type='button' variant='outline' size='sm' className='hover:bg-muted/80'>
                  {t('close')}
                </Button>
              </SheetClose>
              {sheetInviteAction ? (
                <div className='min-w-36 [&>*]:w-full [&>*]:transition-[filter] [&>*]:hover:brightness-105'>
                  {sheetInviteAction}
                </div>
              ) : null}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

/** Khối "Năng lực & xác minh" — bốn mục đã được SAVICO đối chiếu. */
function LegalChecks({
  contractor,
  detailed = false,
  scanUnlocked = false,
  inviteAction
}: {
  contractor: Contractor
  detailed?: boolean
  scanUnlocked?: boolean
  inviteAction?: React.ReactNode
}) {
  const t = useTranslations('contractors.firm')
  const tLegal = useTranslations('contractors.firm.legal')
  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false)
  const [licenseOpen, setLicenseOpen] = useState(false)
  const checks = [...contractor.legalChecks]
  const fallbackChecks = [
    t('team', { count: contractor.teamSize }),
    t('warranty', { months: contractor.warrantyMonths })
  ]

  for (const fallback of fallbackChecks) {
    if (checks.length >= 4) break
    if (!checks.includes(fallback)) checks.push(fallback)
  }

  if (detailed) {
    const legal = contractor.legalProfile
    const verified = legal?.registrationStatus !== 'pending'
    const rows = [
      { key: 'legalName', label: tLegal('fields.legalName'), value: legal?.legalName ?? contractor.name },
      {
        key: 'taxCode',
        label: tLegal('fields.taxCode'),
        value: (
          <span className='inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='decoration-primary/45 cursor-help underline decoration-dotted underline-offset-4'>
                  {legal?.taxCodeMasked ?? tLegal('updating')}
                </span>
              </TooltipTrigger>
              <TooltipContent side='top' sideOffset={7} className='max-w-64'>
                {tLegal('fields.taxCodeHint')}
              </TooltipContent>
            </Tooltip>
            <span className='text-muted-foreground text-[11px] font-normal'>{tLegal('fields.taxCodeHint')}</span>
          </span>
        )
      },
      {
        key: 'establishedAt',
        label: tLegal('fields.establishedAt'),
        value: legal
          ? tLegal('establishedValue', {
              date: formatDate(legal.establishedAt, locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
              years: legal.operationYears
            })
          : tLegal('updating')
      },
      {
        key: 'representative',
        label: tLegal('fields.representative'),
        value: legal ? `${legal.representative} · ${legal.representativeTitle}` : tLegal('updating')
      },
      {
        key: 'address',
        label: tLegal('fields.registeredAddress'),
        value: legal?.registeredAddress ?? contractor.officeAddress
      },
      { key: 'business', label: tLegal('fields.primaryBusiness'), value: legal?.primaryBusiness ?? contractor.kind },
      {
        key: 'workforce',
        label: tLegal('fields.capacity'),
        value: legal?.workforce ?? t('team', { count: contractor.teamSize })
      }
    ]

    const commitments = [
      {
        key: 'warranty',
        icon: ShieldCheck,
        title: tLegal('commitments.warrantyTitle', { months: legal?.warrantyMonths ?? contractor.warrantyMonths }),
        body: tLegal('commitments.warrantyBody', { months: 12 })
      },
      {
        key: 'contract',
        icon: FileCheck2,
        title: tLegal('commitments.contractTitle'),
        body: legal?.usesSavicoContract === false ? tLegal('commitments.updating') : tLegal('commitments.contractBody')
      },
      {
        key: 'insurance',
        icon: BadgeCheck,
        title: tLegal('commitments.insuranceTitle'),
        body:
          legal?.hasConstructionInsurance === false
            ? tLegal('commitments.updating')
            : tLegal('commitments.insuranceBody')
      }
    ]

    return (
      <div className='space-y-5'>
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
          className='border-primary/25 bg-primary/5 rounded-2xl border p-4 sm:p-5'
        >
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
            <div className='bg-background text-primary flex size-11 shrink-0 items-center justify-center rounded-xl border'>
              <ShieldCheck className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h2 className='text-sm font-semibold'>{tLegal('verification.title')}</h2>
              <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                {tLegal('verification.body', {
                  date: legal
                    ? formatDate(legal.verifiedUntil, locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : tLegal('updating')
                })}
              </p>
            </div>
            <div className='shrink-0 text-left sm:text-right'>
              <p className='text-muted-foreground flex items-center gap-1 text-[11px] sm:justify-end'>
                <span>{tLegal('verification.updated')}</span>
                <span className='font-medium text-foreground'>
                  {legal
                    ? formatDate(legal.verifiedAt, locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : tLegal('updating')}
                </span>
              </p>
              <span className='bg-primary mt-1.5 block h-[3px] w-32 rounded-full sm:ml-auto' aria-hidden />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.1, ease: revealEase }}
        >
          <div className='mb-3 flex flex-wrap items-center gap-2'>
            <h2 className='text-base font-semibold'>{tLegal('identity.title')}</h2>
            <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium'>
              <CircleCheck className='size-3.5' />
              {verified ? tLegal('identity.active') : tLegal('identity.pending')}
            </span>
          </div>
          <dl className='bg-card grid gap-x-6 gap-y-3 rounded-2xl border p-4 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:p-5'>
            {rows.map((row) => (
              <div key={row.key} className='contents'>
                <dt className='text-muted-foreground text-xs sm:py-0.5'>{row.label}</dt>
                <dd className='font-medium text-pretty'>{row.value}</dd>
              </div>
            ))}
          </dl>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.2, ease: revealEase }}
        >
          <div className='mb-3 flex flex-wrap items-center gap-2'>
            <h2 className='text-base font-semibold'>{tLegal('license.title')}</h2>
            <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium'>
              <CircleCheck className='size-3.5' />
              {verified ? tLegal('license.verified') : tLegal('identity.pending')}
            </span>
          </div>
          <div className='bg-card hover:bg-primary/[0.035] flex flex-col gap-4 rounded-2xl border p-4 transition-colors duration-200 sm:flex-row sm:items-center'>
            <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
              <FileText className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <h3 className='text-sm font-semibold'>{tLegal('license.documentTitle')}</h3>
              <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                <span className='block'>{tLegal('license.documentMatch')}</span>
                <span className='block'>{tLegal('license.issuer')}</span>
              </p>
            </div>
            <dl className='grid shrink-0 grid-cols-2 gap-x-8 text-xs sm:min-w-64'>
              <div>
                <dt className='text-muted-foreground'>{tLegal('license.number')}</dt>
                <dd className='mt-1 font-medium'>{legal?.registrationNumberMasked ?? tLegal('updating')}</dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>{tLegal('license.issuedAt')}</dt>
                <dd className='mt-1 font-medium whitespace-nowrap'>
                  {legal
                    ? tLegal('license.effectiveValue', {
                        date: formatDate(legal.registrationIssuedAt, locale, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      })
                    : tLegal('updating')}
                </dd>
              </div>
            </dl>
            <div className='flex items-center gap-2 sm:justify-end'>
              <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium'>
                <CircleCheck className='size-3.5' />
                {verified ? tLegal('license.verified') : tLegal('identity.pending')}
              </span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setLicenseOpen(true)}
                className='hover:border-primary/40 hover:bg-primary/10 hover:text-primary-strong transition-colors'
              >
                <Eye className='size-3.5' />
                {tLegal('license.view')}
              </Button>
            </div>
          </div>
          <p className='text-muted-foreground mt-2 flex items-start gap-1.5 text-[11px]'>
            <Lock className='mt-0.5 size-3 shrink-0' />
            {tLegal('license.privacy')}
          </p>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.34, ease: revealEase }}
        >
          <h2 className='mb-3 text-base font-semibold'>{tLegal('commitments.title')}</h2>
          <ul className='grid gap-3 md:grid-cols-3'>
            {commitments.map((item) => (
              <motion.li
                key={item.key}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                transition={{ duration: 0.18, ease: revealEase }}
                className='bg-card flex items-start gap-3 rounded-2xl border p-4 hover:shadow-[0_10px_24px_-20px_rgba(24,80,42,0.55)]'
              >
                <item.icon className='text-primary mt-0.5 size-4 shrink-0' />
                <div>
                  <h3 className='text-sm font-semibold'>{item.title}</h3>
                  <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>{item.body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: reduceMotion ? 0 : 0.34, ease: revealEase }}
        >
          <h2 className='mb-3 text-base font-semibold'>{tLegal('cooperation.title')}</h2>
          <div className='bg-card flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border p-4 text-xs'>
            <span className='inline-flex items-center gap-1.5'>
              <CircleCheck className='text-primary size-3.5' />
              {tLegal('cooperation.verified')}
            </span>
            <span>{tLegal('cooperation.since', { since: contractor.partnership.since })}</span>
            <span>
              {tLegal('cooperation.rank', {
                rank: legal?.cooperationRank ?? 0,
                percent: legal?.cooperationPercent ?? 0
              })}
            </span>
            <span>{tLegal('cooperation.complaints', { count: legal?.complaintCount ?? 0 })}</span>
          </div>
        </motion.section>

        <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}>
          <DialogContent className='gap-0 overflow-hidden p-0 sm:max-w-lg'>
            <DialogHeader className='border-b px-5 py-4 pr-12'>
              <DialogTitle className='text-sm'>{tLegal('license.documentTitle')}</DialogTitle>
              <DialogDescription className='sr-only'>{tLegal('license.dialogBody')}</DialogDescription>
            </DialogHeader>

            <div className='bg-muted/35 relative min-h-80 overflow-hidden p-5 sm:min-h-96'>
              {scanUnlocked ? (
                <div className='bg-background mx-auto max-w-sm rounded-lg border p-5 shadow-sm'>
                  <div className='flex items-center gap-3 border-b pb-4'>
                    <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
                      <FileCheck2 className='size-5' />
                    </div>
                    <div>
                      <p className='text-sm font-semibold'>{tLegal('license.scanUnlocked')}</p>
                      <p className='text-primary-strong mt-1 text-xs'>{tLegal('license.verified')}</p>
                    </div>
                  </div>
                  <dl className='mt-4 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-xs'>
                    <dt className='text-muted-foreground'>{tLegal('fields.legalName')}</dt>
                    <dd className='font-medium'>{legal?.legalName ?? contractor.name}</dd>
                    <dt className='text-muted-foreground'>{tLegal('license.number')}</dt>
                    <dd className='font-medium'>{legal?.registrationNumberMasked ?? tLegal('updating')}</dd>
                    <dt className='text-muted-foreground'>{tLegal('license.issuedAt')}</dt>
                    <dd className='font-medium'>
                      {legal
                        ? formatDate(legal.registrationIssuedAt, locale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : tLegal('updating')}
                    </dd>
                    <dt className='text-muted-foreground'>{tLegal('license.status')}</dt>
                    <dd className='text-primary-strong font-medium'>{tLegal('license.verified')}</dd>
                  </dl>
                </div>
              ) : (
                <>
                  <div className='pointer-events-none absolute inset-5 overflow-hidden rounded-lg border bg-background p-6 opacity-55 blur-[2px]'>
                    <div className='bg-muted h-5 w-2/3 rounded' />
                    <div className='mt-5 space-y-3'>
                      <div className='bg-muted h-3 w-full rounded' />
                      <div className='bg-muted h-3 w-5/6 rounded' />
                      <div className='bg-muted h-3 w-11/12 rounded' />
                    </div>
                    <div className='mt-7 grid grid-cols-2 gap-5'>
                      <div className='space-y-3'>
                        <div className='bg-muted h-3 w-3/4 rounded' />
                        <div className='bg-muted h-3 w-full rounded' />
                        <div className='bg-muted h-3 w-4/5 rounded' />
                      </div>
                      <div className='space-y-3'>
                        <div className='bg-muted h-3 w-2/3 rounded' />
                        <div className='bg-muted h-3 w-full rounded' />
                        <div className='bg-muted h-3 w-5/6 rounded' />
                      </div>
                    </div>
                  </div>

                  <div className='absolute inset-0 flex items-center justify-center p-8'>
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : 0.08 }}
                      className='bg-background w-full max-w-xs rounded-xl border p-5 text-center shadow-[0_14px_36px_-18px_rgba(20,72,40,0.45)]'
                    >
                      <Lock className='text-primary mx-auto size-5' />
                      <h3 className='mt-3 text-sm font-semibold'>{tLegal('license.lockedTitle')}</h3>
                      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
                        {tLegal('license.lockedBody', {
                          date: legal
                            ? formatDate(legal.verifiedUntil, locale, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : tLegal('updating')
                        })}
                      </p>
                    </motion.div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className='border-t bg-background px-5 py-3'>
              <Button type='button' variant='outline' size='sm' onClick={() => setLicenseOpen(false)}>
                {tLegal('license.close')}
              </Button>
              {!scanUnlocked && inviteAction ? <div className='min-w-32 [&>*]:w-full'>{inviteAction}</div> : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <motion.section
      variants={revealItemVariants}
      initial='hidden'
      whileInView='show'
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={() => setHasEnteredViewport(true)}
      className='bg-card rounded-2xl border p-4'
    >
      <h2 className='text-base font-semibold'>{t('legalTitle')}</h2>
      <motion.ul
        variants={revealContainerVariants}
        className='mt-3 grid gap-x-[3%] gap-y-3 sm:grid-cols-2 lg:grid-cols-4'
      >
        {checks.map((check, index) => (
          <motion.li
            variants={revealItemVariants}
            key={check}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.4 }}
            className='flex items-start gap-2.5 text-sm'
          >
            <DrawnCircleCheck className='mt-0.5' delay={index * 0.12} active={hasEnteredViewport} />
            <span className='text-muted-foreground text-pretty'>{check}</span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  )
}

/**
 * Tab Hợp tác SAVICO (S14).
 *
 * Hình S14 vẽ một khung xem tài liệu đầy đủ: dải thumbnail từng trang bên
 * trái, khung trang ở giữa với thanh công cụ (số trang, thu/phóng, toàn màn
 * hình) ở đáy, cột siêu dữ liệu bên phải. Tỉ lệ ba cột 10,3% / 57,8% / 27,9%
 * đo từ ảnh đó.
 *
 * CHỖ CHỜ ASSET: bản scan thật do đội vận hành tải lên (`partnership.scanUrl`).
 * Chưa có thì khung xem và dải thumbnail để NÉT ĐỨT, thanh công cụ và hai nút
 * thao tác khóa lại — dựng khung sẵn để khi có tệp là hiện, chứ không vẽ một
 * trang hợp đồng giả cho đẹp ảnh chụp màn hình.
 *
 * Lưu ý nội dung: hợp đồng nguyên bản có chữ ký và con dấu của hai pháp nhân,
 * nên thứ hiển thị ở đây phải là bản ĐÃ CHE các nội dung bảo mật.
 */
function PartnershipTab({ contractor }: { contractor: Contractor }) {
  const t = useTranslations('contractors.firm.partnership')
  const locale = useLocale() as Locale
  const { partnership } = contractor

  const hasScan = Boolean(partnership.scanUrl)
  const pages = Array.from({ length: partnership.pageCount }, (_, index) => index + 1)

  const rows = [
    { key: 'code', icon: FileText, label: t('code'), value: partnership.contractCode },
    {
      key: 'signedAt',
      icon: CalendarDays,
      label: t('signedAt'),
      value: formatDate(partnership.signedAt, locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    },
    { key: 'pages', icon: FileText, label: t('pages'), value: String(partnership.pageCount) },
    { key: 'state', icon: CircleCheck, label: t('state'), value: t('stateVerified'), highlight: true }
  ]

  return (
    <div className='space-y-5'>
      <PartnershipSummary contractor={contractor} />

      <section className='bg-card rounded-2xl border p-4'>
        <h3 className='text-base font-semibold'>{t('scanTitle')}</h3>

        <div className='mt-3 grid gap-x-[2%] gap-y-4 lg:grid-cols-[10.3%_57.8%_minmax(0,1fr)]'>
          {/* Dải thumbnail: ô trang bên trái, số trang bên phải. */}
          <ol className='bg-muted/40 flex gap-2 overflow-x-auto rounded-xl p-2 lg:flex-col lg:self-start lg:overflow-x-visible'>
            {pages.map((page) => (
              <li key={page} className='flex shrink-0 items-center gap-2 lg:shrink'>
                <button
                  type='button'
                  disabled={!hasScan}
                  aria-label={t('goToPage', { page })}
                  className={cn(
                    'bg-card aspect-3/4 w-12 rounded-md border lg:w-[57%]',
                    page === 1 ? 'border-primary' : 'border-dashed',
                    hasScan ? 'hover:border-primary' : 'cursor-default'
                  )}
                />
                <span className='text-muted-foreground text-xs'>{page}</span>
              </li>
            ))}
          </ol>

          {/* Khung xem: vùng trang + thanh công cụ dưới đáy. */}
          <div className='bg-muted/40 flex aspect-315/268 min-h-64 flex-col overflow-hidden rounded-xl'>
            <div className='flex min-h-0 flex-1 items-center justify-center p-4'>
              <div className='bg-card flex aspect-3/4 h-full max-w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center'>
                <FileCheck2 className='text-muted-foreground/60 size-9' strokeWidth={1.25} />
                <p className='text-muted-foreground max-w-xs text-xs text-pretty'>
                  {hasScan ? t('privacyNote') : t('unavailable')}
                </p>
              </div>
            </div>

            <div className='text-muted-foreground flex items-center justify-between gap-3 border-t px-3 py-2 text-xs'>
              <span>{t('page', { current: 1, total: partnership.pageCount })}</span>
              <div className='flex items-center gap-1'>
                <ViewerControl icon={Minus} label={t('zoomOut')} disabled={!hasScan} />
                <ViewerControl icon={Search} label={t('zoomFit')} disabled={!hasScan} />
                <ViewerControl icon={Plus} label={t('zoomIn')} disabled={!hasScan} />
                <ViewerControl icon={Maximize2} label={t('fullscreen')} disabled={!hasScan} />
              </div>
            </div>
          </div>

          {/* Cột siêu dữ liệu đã xác minh. */}
          <div className='min-w-0'>
            <p className='text-muted-foreground text-sm'>{t('agreement')}</p>
            <p className='mt-1 text-base font-semibold text-pretty'>{t('parties', { name: contractor.name })}</p>

            <dl className='mt-4 space-y-3 text-sm'>
              {rows.map((row) => (
                <div key={row.key} className='flex items-center gap-3'>
                  <dt className='text-muted-foreground flex min-w-0 flex-1 items-center gap-2'>
                    <row.icon
                      aria-hidden
                      className={cn('size-4 shrink-0', row.highlight ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <span className='truncate'>{row.label}</span>
                  </dt>
                  <dd className={cn('shrink-0 font-medium', row.highlight && 'text-primary-strong')}>{row.value}</dd>
                </div>
              ))}
            </dl>

            <p className='text-primary-strong bg-primary/10 mt-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed'>
              <CircleCheck className='mt-0.5 size-4 shrink-0' />
              <span>{t('checked')}</span>
            </p>

            <div className='mt-4 space-y-2.5'>
              <Button className='h-11 w-full' disabled={!hasScan}>
                <Maximize2 className='size-4' />
                {t('fullscreen')}
              </Button>
              <Button
                variant='outline'
                className='border-primary/50 text-primary-strong h-11 w-full'
                disabled={!hasScan}
              >
                <Download className='size-4' />
                {t('download')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/** Một nút nhỏ trên thanh công cụ của khung xem. */
function ViewerControl({ icon: Icon, label, disabled }: { icon: typeof Plus; label: string; disabled: boolean }) {
  return (
    <button
      type='button'
      disabled={disabled}
      aria-label={label}
      title={label}
      className='hover:bg-card flex size-7 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50'
    >
      <Icon className='size-3.5' />
    </button>
  )
}
