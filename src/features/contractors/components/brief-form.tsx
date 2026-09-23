'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  BrickWall,
  Check,
  CheckCircle2,
  FileUp,
  Gift,
  House,
  Info,
  LoaderCircle,
  PaintRoller,
  X
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useCmsCollection } from '@/shared/cms'
import { revealContainerVariants, revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Textarea } from '@/shared/components/ui/textarea'
import { contractorReviewRoute, ROUTES } from '@/shared/constants/routes'
import { useGetProvinces, useGetWards } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatBudgetShort, formatDigitGroups } from '@/shared/utils'
import { formatFileSize } from '../services/brief.service'
import {
  BRIEF_FILE_ACCEPT,
  BRIEF_FILE_MAX_BYTES,
  CONSTRUCTION_SCOPES,
  PROJECT_SCALES,
  SITE_CONDITIONS,
  START_WINDOWS
} from '../constants/contractors.constants'
import { useBrief, useSaveBrief } from '../hooks/use-brief'
import { BRIEF_NOTE_MAX_LENGTH, createBriefSchema, parseAmount, type BriefFormValues } from '../schemas/brief.schema'
import type { BriefDocument } from '../types/contractor.types'

/**
 * Icon của bốn thẻ "Phạm vi thi công" (Hình S10): ngôi nhà · tường gạch · con
 * lăn sơn · ghế. Ảnh vẽ icon lớn nằm trên nhãn, đó là thứ phân biệt bốn thẻ khi
 * chúng đứng cùng một hàng.
 */
const SCOPE_ICONS = {
  turnkey: House,
  shell: BrickWall,
  finishing: PaintRoller,
  interior: Armchair
} as const

const formColumnVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: revealEase, staggerChildren: 0.055, delayChildren: 0.04 }
  }
}

const formGroupVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: revealEase } }
}

/**
 * Dấu sao của trường bắt buộc — Hình S10 vẽ nó màu ĐỎ, tách hẳn khỏi màu nhãn.
 * Đặt `aria-hidden` vì bản thân input đã có `required`/schema Zod lo phần ngữ
 * nghĩa; dấu sao ở đây chỉ là tín hiệu thị giác.
 */
function Req() {
  return (
    <span aria-hidden className='text-destructive'>
      {' *'}
    </span>
  )
}

/**
 * Thứ tự các trường bắt buộc THẬT SỰ có thể lỗi (đúng thứ tự đọc trên trang) —
 * Các trường luôn hiện trên form; `scale`/`hasAttic` được xếp riêng trong
 * `VALIDATION_FIELD_ORDER` vì chỉ bắt buộc với loại nhà. Dùng để tính tiến độ
 * và tìm "ô thiếu đầu tiên" khi bấm "Tiếp tục" (mục 7).
 */
const REQUIRED_FIELD_ORDER = [
  'name',
  'buildingType',
  'landArea',
  'provinceCode',
  'wardCode',
  'street',
  'budget',
  'scopeNote'
] as const satisfies readonly (keyof BriefFormValues)[]

const VALIDATION_FIELD_ORDER = [
  'name',
  'buildingType',
  'scale',
  'hasAttic',
  'landArea',
  'provinceCode',
  'wardCode',
  'street',
  'budget',
  'scopeNote'
] as const satisfies readonly (keyof BriefFormValues)[]

/**
 * Cờ một-lần báo cho M03 biết vừa đến từ "Tiếp tục" ở M02 (mục 3 của M03) —
 * mở lại một nháp có sẵn (gõ thẳng URL, F5…) thì KHÔNG có cờ này, tick bước 1
 * hiện tĩnh, không chạy chuỗi vẽ vào.
 */
export const BRIEF_STEP_TRANSITION_KEY = 'savico.brief-step-transition'

/**
 * Bọc một ô nhập để rung khi bấm "Tiếp tục" lúc còn thiếu (mục 7) — viền đỏ và
 * dòng lỗi đã tự có sẵn qua `aria-invalid`/`FormMessage`, chỉ thêm cú rung.
 */
function ShakeField({
  id,
  active,
  className,
  children
}: {
  id: string
  active: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      id={id}
      animate={active ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Loé nền xanh một lần trong khối cha (`relative isolate`) khi quay lại từ
 * M03 bằng "Chỉnh sửa" (mục 4) — không thêm phần tử bọc nào để khỏi phá nhịp
 * `flex`/`grid` sẵn có của khối cha.
 */
function FlashOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
          className='bg-primary/10 pointer-events-none absolute -inset-3 -z-10 rounded-2xl'
        />
      ) : null}
    </AnimatePresence>
  )
}

interface BriefFormProps {
  projectId: string
}

/**
 * Bước 1 — Tự tạo hồ sơ dự án (S10), luồng B: khách chưa mua gói.
 *
 * Bố cục hai cột theo bản mô tả: "Thông tin công trình" bên trái, "Nhu cầu thi
 * công" + tài liệu bên phải. Cột trái dài hơn hẳn nên hai cột KHÔNG ép bằng
 * chiều cao — mỗi khối là một thẻ độc lập, xuống mobile thì xếp chồng theo đúng
 * thứ tự đọc.
 *
 * Ngân sách là trường bắt buộc nhưng có ghi chú rõ: nó chỉ dùng để ghép nhà thầu
 * và KHÔNG nằm trong hồ sơ gửi đi (xem S18) — bản mô tả nói hai điều đó ở hai
 * màn khác nhau, người nhập cần biết ngay tại chỗ nhập.
 */
export function BriefForm({ projectId }: BriefFormProps) {
  const t = useTranslations('contractors.brief')
  const tScope = useTranslations('contractors.scope')
  const tScopeHint = useTranslations('contractors.scopeHint')
  const tCondition = useTranslations('contractors.siteCondition')
  const tScale = useTranslations('contractors.scale')
  const tStart = useTranslations('contractors.startWindow')
  const tValidation = useTranslations('validation')
  const locale = useLocale() as Locale
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduceMotion = useReducedMotion()

  const { data: brief, isPending } = useBrief(projectId)
  const save = useSaveBrief(projectId)
  const buildingTypes = useCmsCollection('buildingTypes')

  const [documents, setDocuments] = useState<BriefDocument[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const documentChooseButton = useRef<HTMLButtonElement>(null)

  const schema = useMemo(
    () =>
      createBriefSchema({
        required: tValidation('required'),
        nameMaxLength: tValidation('maxLength', { max: 120 }),
        areaPositive: tValidation('positiveNumber'),
        budgetPositive: tValidation('positiveNumber'),
        noteRequired: tValidation('required'),
        noteMaxLength: tValidation('maxLength', { max: BRIEF_NOTE_MAX_LENGTH })
      }),
    [tValidation]
  )

  const form = useForm<BriefFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      name: '',
      buildingType: '',
      buildingTypeId: null,
      landArea: '',
      siteCondition: 'empty',
      scale: null,
      hasAttic: null,
      provinceCode: '',
      wardCode: '',
      street: '',
      budget: '',
      startWindow: 'in-1-3-months',
      scope: 'turnkey',
      scopeNote: ''
    }
  })

  const provinceCode = form.watch('provinceCode')
  const { provinces, isLoadingProvinces } = useGetProvinces()
  const { wards, isLoadingWards } = useGetWards(provinceCode ? Number(provinceCode) : undefined)

  /**
   * Mở lại hồ sơ đã lưu: đổ dữ liệu vào form.
   *
   * Mốc để biết "đã đổ bản này chưa" là `updatedAt`, KHÔNG phải một cờ bật-một-lần.
   * Bản trước dùng `loadedRef` bật một lần cho cả vòng đời component, nên khi khách
   * bấm "Chỉnh sửa" ở Bước 2 quay về đây mà component chưa bị gỡ (router giữ lại
   * cây React của route đã ghé), form giữ nguyên bản hồ sơ CŨ đọc được ở lần đổ đầu
   * — lúc đó Loại công trình / Tỉnh / Phường còn rỗng nên ba ô Select hiện lại
   * placeholder dù dữ liệu đã lưu đầy đủ.
   *
   * `updatedAt` chỉ đổi khi hồ sơ được ghi, nên cách này không đè lên những gì
   * khách đang gõ dở.
   */
  const loadedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!brief || buildingTypes.length === 0 || loadedRef.current === brief.updatedAt) return
    // Autosave cập nhật cache ngay khi người dùng vừa rời ô. Không reset lại
    // toàn form trong lúc họ đang nhập ô kế tiếp vì có thể làm mất ký tự mới.
    if (loadedRef.current && form.formState.isDirty) {
      loadedRef.current = brief.updatedAt
      return
    }
    loadedRef.current = brief.updatedAt
    setDocuments(brief.documents)
    form.reset({
      name: brief.name,
      buildingType: brief.buildingType,
      buildingTypeId: buildingTypes.find((option) => option.label === brief.buildingType)?.id ?? null,
      landArea: brief.landArea ? String(brief.landArea) : '',
      siteCondition: brief.siteCondition,
      scale: brief.scale,
      hasAttic: brief.hasAttic ?? null,
      provinceCode: brief.address.provinceCode ? String(brief.address.provinceCode) : '',
      wardCode: brief.address.wardCode ? String(brief.address.wardCode) : '',
      street: brief.address.street,
      budget: brief.budget ? formatDigitGroups(String(brief.budget), locale) : '',
      startWindow: brief.startWindow,
      scope: brief.scope,
      scopeNote: brief.scopeNote
    })
  }, [brief, buildingTypes, form, locale])

  // Con trỏ tự vào "Tên dự án" khi mở một hồ sơ TRẮNG (mục 4) — hồ sơ đã có
  // sẵn tên thì để yên, không cướp tiêu điểm của khách đang đọc lại. Chỉ làm
  // trên máy tính để không tự bật bàn phím ảo ngay khi mở trang trên mobile.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
    if (desktop && !isPending && !brief?.name) {
      form.setFocus('name')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi hồ sơ vừa tải xong, không phải mỗi lần `brief`/`form` đổi tham chiếu
  }, [isPending])

  /**
   * Quay lại từ M03 bằng "Chỉnh sửa" (?focus=site|needs|documents): cuộn tới
   * đúng nhóm, nhóm loé nền xanh một lần, con trỏ vào ô đầu (mục 4).
   */
  const [flashGroup, setFlashGroup] = useState<string | null>(null)
  useEffect(() => {
    const focus = searchParams.get('focus')
    if (!focus || isPending) return
    const el = document.getElementById(`brief-group-${focus}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setFlashGroup(focus)
    window.setTimeout(() => setFlashGroup(null), 900)
    if (focus === 'site') form.setFocus('name')
    else if (focus === 'needs') form.setFocus('scopeNote')
    else if (focus === 'documents') documentChooseButton.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi trang vừa tải xong với ?focus=…, không phải mỗi lần `form`/`searchParams` đổi tham chiếu
  }, [isPending])

  /** "Đã lưu nháp - 12:01" hiện cạnh tiêu đề rồi mờ đi (mục 2). */
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const lastSavedPayload = useRef<string | null>(null)
  const submitIntent = useRef(false)
  const handleFormBlur = (event: React.FocusEvent<HTMLFormElement>) => {
    const nextTarget = event.relatedTarget
    if (
      submitIntent.current ||
      (nextTarget instanceof HTMLElement && nextTarget.closest('[data-brief-navigation], [data-brief-submit]'))
    ) {
      return
    }
    if (!form.formState.isDirty) return
    const payload = toPayload(form.getValues())
    const signature = JSON.stringify(payload)
    if (signature === lastSavedPayload.current) return
    lastSavedPayload.current = signature
    save.mutate(payload, {
      onSuccess: () => {
        setDraftSavedAt(new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date()))
        window.setTimeout(() => setDraftSavedAt(null), 2500)
      },
      onError: () => {
        lastSavedPayload.current = null
      }
    })
  }

  /** Gợi ý không chặn khi diện tích quá 4 chữ số, lúc rời ô (mục 4). */
  const [areaOverHint, setAreaOverHint] = useState(false)

  /** Kéo-thả tài liệu (mục 6). */
  const [dragActive, setDragActive] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [dropShake, setDropShake] = useState(false)
  const [dropAcceptedPulse, setDropAcceptedPulse] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<{ id: string; name: string }[]>([])
  const dropAcceptedTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!dropError) return
    const timer = window.setTimeout(() => setDropError(null), 4000)
    return () => window.clearTimeout(timer)
  }, [dropError])

  useEffect(
    () => () => {
      if (dropAcceptedTimer.current) window.clearTimeout(dropAcceptedTimer.current)
    },
    []
  )

  /** Rung ô thiếu đầu tiên + nút khi bấm "Tiếp tục" lúc còn thiếu (mục 7). */
  const [shakeField, setShakeField] = useState<string | null>(null)
  const [buttonEffect, setButtonEffect] = useState<'shake' | 'breathe' | null>(null)
  const [leavePromptOpen, setLeavePromptOpen] = useState(false)
  const [pageTransition, setPageTransition] = useState<'back' | 'forward' | null>(null)

  const [nameVal, buildingTypeVal, landAreaVal, provinceVal, wardVal, streetVal, budgetVal, scopeNoteVal] =
    form.watch(REQUIRED_FIELD_ORDER)
  const scope = form.watch('scope')
  const siteCondition = form.watch('siteCondition')
  const scale = form.watch('scale')
  const hasAttic = form.watch('hasAttic')
  const buildingTypeId = form.watch('buildingTypeId')
  const showScaleFields = Boolean(buildingTypeId && buildingTypeId !== 'apartment')
  const filledRequiredCount = [
    nameVal,
    buildingTypeVal,
    landAreaVal,
    provinceVal,
    wardVal,
    streetVal,
    budgetVal,
    scopeNoteVal
  ].filter(Boolean).length
  const conditionalRequiredCount = showScaleFields ? Number(Boolean(scale)) + Number(hasAttic !== null) : 0
  const requiredFilled =
    filledRequiredCount === REQUIRED_FIELD_ORDER.length && (!showScaleFields || conditionalRequiredCount === 2)
  const progressFilledCount =
    filledRequiredCount + Number(Boolean(siteCondition)) + Number(Boolean(scope)) + conditionalRequiredCount
  const requiredProgress = progressFilledCount / (REQUIRED_FIELD_ORDER.length + 2 + (showScaleFields ? 2 : 0))
  const hasUserData =
    Boolean(
      nameVal || buildingTypeVal || landAreaVal || provinceVal || wardVal || streetVal || budgetVal || scopeNoteVal
    ) ||
    documents.length > 0 ||
    form.formState.isDirty

  /** Nút "Tiếp tục" thở một nhịp ngay khi VỪA đủ trường bắt buộc (mục 7). */
  const wasRequiredFilledRef = useRef(false)
  useEffect(() => {
    if (requiredFilled && !wasRequiredFilledRef.current) {
      setButtonEffect('breathe')
      const timer = window.setTimeout(() => setButtonEffect(null), 500)
      wasRequiredFilledRef.current = true
      return () => window.clearTimeout(timer)
    }
    wasRequiredFilledRef.current = requiredFilled
  }, [requiredFilled])

  /** Gom giá trị form + danh mục hành chính thành payload lưu xuống. */
  const toPayload = (values: BriefFormValues) => ({
    name: values.name,
    buildingType: values.buildingType,
    landArea: parseAmount(values.landArea),
    siteCondition: values.siteCondition,
    scale: values.scale ?? 'ground',
    hasAttic: values.hasAttic,
    address: {
      provinceCode: Number(values.provinceCode),
      provinceName: provinces.find((p) => String(p.code) === values.provinceCode)?.name ?? '',
      wardCode: Number(values.wardCode),
      wardName: wards.find((w) => String(w.code) === values.wardCode)?.name ?? '',
      street: values.street
    },
    budget: parseAmount(values.budget),
    startWindow: values.startWindow,
    scope: values.scope,
    scopeNote: values.scopeNote,
    documents,
    selfCreated: true
  })

  const onSubmit = async (values: BriefFormValues) => {
    submitIntent.current = false
    try {
      await save.mutateAsync(toPayload(values))
      window.sessionStorage.setItem(BRIEF_STEP_TRANSITION_KEY, projectId)
      setPageTransition('forward')
      window.setTimeout(() => router.push(contractorReviewRoute(projectId)), reduceMotion ? 0 : 240)
    } catch {
      // `useSaveBrief` đã hiển thị thông báo lỗi; giữ người dùng ở lại form để thử lại.
    }
  }

  const navigateBack = () => {
    setLeavePromptOpen(false)
    setPageTransition('back')
    window.setTimeout(() => router.push(ROUTES.CONTRACTORS), reduceMotion ? 0 : 220)
  }

  const requestBack = () => {
    if (hasUserData) {
      setLeavePromptOpen(true)
      return
    }
    navigateBack()
  }

  const saveDraftAndLeave = () => {
    save.mutate(toPayload(form.getValues()), { onSuccess: navigateBack })
  }

  /** Bấm "Tiếp tục" khi còn thiếu trường bắt buộc (mục 7). */
  const onInvalid = (errors: FieldErrors<BriefFormValues>) => {
    submitIntent.current = false
    const firstError = VALIDATION_FIELD_ORDER.find((name) => errors[name])
    if (firstError) {
      document.getElementById(`brief-field-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setShakeField(firstError)
      window.setTimeout(() => setShakeField(null), 450)
    }
    setButtonEffect('shake')
    window.setTimeout(() => setButtonEffect(null), 450)
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const accepted = BRIEF_FILE_ACCEPT.split(',')
    const next: BriefDocument[] = []
    let firstError: string | null = null

    for (const file of Array.from(files)) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
      if (!accepted.includes(extension)) {
        const message = t('documents.wrongType', { name: file.name })
        toast.error(message)
        firstError ??= message
        continue
      }
      if (file.size > BRIEF_FILE_MAX_BYTES) {
        const message = t('documents.tooLarge', { name: file.name })
        toast.error(message)
        firstError ??= message
        continue
      }
      next.push({
        id: `${file.name}-${file.size}`,
        name: file.name,
        sizeBytes: file.size,
        kind: file.type.startsWith('image/') ? 'image' : 'document'
      })
    }

    if (firstError) {
      setDropError(firstError)
      setDropShake(true)
      window.setTimeout(() => setDropShake(false), 450)
    }

    const fresh = next.filter(
      (doc) => !documents.some((item) => item.id === doc.id) && !pendingUploads.some((item) => item.id === doc.id)
    )
    if (fresh.length === 0) return

    // Giữ viền xanh ngay sau khi nhận tệp, đồng thời cho vùng thả thở và icon
    // nhích lên sau một nhịp để xác nhận thao tác trước khi thanh tiến trình chạy.
    setDropAcceptedPulse(true)
    if (dropAcceptedTimer.current) window.clearTimeout(dropAcceptedTimer.current)
    dropAcceptedTimer.current = window.setTimeout(() => setDropAcceptedPulse(false), 560)

    // Thanh tiến trình xanh trước khi dòng tệp thật xuất hiện (mục 6) — không
    // có upload thật để theo dõi (lưu cục bộ), nên đây là một nhịp cố định đủ
    // để thấy thanh chạy trước khi "hoàn tất".
    setPendingUploads((current) => [...current, ...fresh.map((doc) => ({ id: doc.id, name: doc.name }))])
    window.setTimeout(() => {
      setPendingUploads((current) => current.filter((item) => !fresh.some((doc) => doc.id === item.id)))
      setDocuments((current) => [...current, ...fresh])
    }, 650)
  }

  if (isPending) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-8'>
        <Skeleton className='h-[36rem] rounded-2xl' />
      </div>
    )
  }

  const returningToGroup = Boolean(searchParams.get('focus'))
  const hasFilesInDropzone = documents.length > 0 || pendingUploads.length > 0

  return (
    <motion.div
      initial={reduceMotion ? false : returningToGroup ? { opacity: 0, x: -32 } : { opacity: 0, y: 22 }}
      animate={pageTransition === 'back' ? { opacity: 0, x: reduceMotion ? 0 : 36 } : { opacity: 1, x: 0, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: revealEase }}
      className='mx-auto w-full max-w-6xl space-y-6 px-4 py-8 lg:px-8'
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className='flex flex-wrap items-center gap-3'
      >
        <button
          type='button'
          data-brief-navigation
          onClick={requestBack}
          // Hình S10: link "Quay lại lựa chọn" màu XANH thương hiệu, không phải chữ mờ.
          className='text-primary-strong hover:text-primary inline-flex items-center gap-1.5 text-sm font-medium'
        >
          <ArrowLeft className='size-4' />
          {t('back')}
        </button>
        <motion.span
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5, duration: 0.4, delay: 0.15 }}
          className='bg-accent text-primary-strong inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium'
        >
          <Gift className='size-3.5' />
          {t('badge')}
        </motion.span>
        <motion.button
          type='button'
          data-brief-navigation
          onClick={requestBack}
          whileHover={reduceMotion ? undefined : { rotate: 90, scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          aria-label={t('close')}
          className='bg-foreground text-background ml-auto flex size-9 items-center justify-center rounded-full shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
        >
          <X className='size-4' />
        </motion.button>
      </motion.div>

      <Dialog open={leavePromptOpen} onOpenChange={setLeavePromptOpen}>
        <DialogContent showCloseButton={false} className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('leaveTitle')}</DialogTitle>
            <DialogDescription>{t('leaveDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className='sm:flex-wrap'>
            <Button type='button' variant='ghost' onClick={() => setLeavePromptOpen(false)}>
              {t('keepEditing')}
            </Button>
            <Button type='button' variant='outline' onClick={navigateBack}>
              {t('leaveWithoutSaving')}
            </Button>
            <Button type='button' onClick={saveDraftAndLeave} disabled={save.isPending}>
              {save.isPending ? <LoaderCircle className='size-4 animate-spin' /> : null}
              {t('saveDraftAndLeave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.header
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: revealEase }}
        className='space-y-1'
      >
        <h1 className='flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold tracking-tight sm:text-3xl'>
          {t('title')}
          <AnimatePresence>
            {draftSavedAt ? (
              <motion.span
                key={draftSavedAt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className='text-muted-foreground text-xs font-normal'
              >
                {t('draftSaved', { time: draftSavedAt })}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </h1>
        <p className='text-muted-foreground text-pretty'>{t('subtitle')}</p>
      </motion.header>

      <BriefSteps current={1} progress={requiredProgress} />

      <Form {...form}>
        {/* Hình S10: TOÀN BỘ form nằm trong MỘT khung bo góc — hai cột, khối tài
            liệu và cả hàng nút "Lưu nháp / Tiếp tục" đều ở trong đó. Bản trước
            tách thành ba thẻ rời rồi để hàng nút trôi bên ngoài. */}
        <motion.form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          onBlur={handleFormBlur}
          animate={pageTransition === 'forward' ? { opacity: 0, x: reduceMotion ? 0 : -40 } : { opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
          className='space-y-4'
        >
          <section className='bg-card rounded-2xl border p-6'>
            {/* Hình S10: giữa hai cột có ĐƯỜNG KẺ DỌC. Dựng bằng `border-l`
                trên cột phải + lề hai bên, thay vì `gap-x` trơn. */}
            <motion.div
              variants={revealContainerVariants}
              initial='hidden'
              animate='show'
              className='grid items-stretch gap-y-8 lg:grid-cols-2'
            >
              {/* Cột trái — Thông tin công trình. Hiện TRƯỚC cột phải (mục 4):
                  cột phải nhận thêm `delayChildren` riêng bên dưới. */}
              <motion.div
                id='brief-group-site'
                variants={formColumnVariants}
                className='relative isolate space-y-4 lg:pr-10'
              >
                <FlashOverlay active={flashGroup === 'site'} />
                <motion.div variants={formGroupVariants}>
                  {/* Hình S10: tiêu đề hai cột đều IN HOA. */}
                  <h2 className='text-sm font-semibold tracking-wide uppercase'>{t('site.title')}</h2>
                  <p className='text-muted-foreground mt-0.5 text-xs'>{t('site.requiredHint')}</p>
                </motion.div>

                <motion.div variants={formGroupVariants} className='grid gap-4 sm:grid-cols-2'>
                  <ShakeField id='brief-field-name' active={shakeField === 'name'}>
                    <FormField
                      control={form.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('site.name')}
                            <Req />
                          </FormLabel>
                          <FormControl>
                            <Input placeholder={t('site.namePlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ShakeField>

                  <ShakeField id='brief-field-buildingType' active={shakeField === 'buildingType'}>
                    <FormField
                      control={form.control}
                      name='buildingType'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('site.buildingType')}
                            <Req />
                          </FormLabel>
                          {/* `key` đổi theo số lượng lựa chọn là để SỬA LỖI mất nhãn khi quay
                        lại Bước 1 từ Bước 2: form được `reset` ngay khi hồ sơ về, thường là
                        TRƯỚC khi danh mục (loại công trình / tỉnh / phường) tải xong. Radix
                        `SelectValue` in ra nội dung của `SelectItem` ĐANG khớp tại thời điểm
                        nhận `value`; lúc đó chưa có item nào nên nó hiện placeholder và không
                        tự vẽ lại khi danh mục về sau. Đổi `key` buộc Select dựng lại, lúc này
                        item đã có nên nhãn hiện đúng. Giá trị trong form chưa bao giờ mất —
                        chỉ phần hiển thị sai. */}
                          {/* Bỏ qua lời gọi với giá trị RỖNG.
                            Sau khi `form.reset` đổ hồ sơ đã lưu vào, ba ô Select
                            (loại công trình / tỉnh / phường) bắn `onValueChange('')`
                            và xoá sạch giá trị vừa đổ — đó là lý do bấm "Chỉnh sửa"
                            ở Bước 2 quay về thì ba ô này trắng trong khi các ô chữ
                            vẫn còn. Danh sách không có lựa chọn rỗng nào, nên chuỗi
                            rỗng chắc chắn không phải do người dùng chọn: bỏ qua là
                            đúng, và cũng chặn luôn mọi nguồn khác (autofill…) làm
                            điều tương tự. */}
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              if (!value) return
                              const nextType = buildingTypes.find((option) => option.label === value)
                              const previousTypeId = form.getValues('buildingTypeId')

                              field.onChange(value)
                              form.setValue('buildingTypeId', nextType?.id ?? null, { shouldDirty: true })
                              form.clearErrors(['scale', 'hasAttic'])

                              if (nextType?.id === 'apartment') {
                                form.setValue('scale', 'ground', { shouldDirty: true })
                                form.setValue('hasAttic', false, { shouldDirty: true })
                              } else if (!previousTypeId || previousTypeId === 'apartment') {
                                form.setValue('scale', null, { shouldDirty: true })
                                form.setValue('hasAttic', null, { shouldDirty: true })
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className='w-full'>
                                {/* Nhãn do MÌNH dựng, không để `SelectValue` tự tra.
                                  Radix chỉ in được nhãn khi `SelectItem` khớp đã
                                  mounted vào lúc nhận `value`; form thì `reset`
                                  ngay khi hồ sơ về — thường sớm hơn lúc danh mục
                                  tải xong — nên ô cứ hiện placeholder dù giá trị
                                  vẫn nằm trong form. */}
                                <SelectValue placeholder={t('site.buildingTypePlaceholder')}>
                                  {field.value || undefined}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buildingTypes
                                .filter((option) => option.enabled)
                                .map((option) => (
                                  <SelectItem key={option.id} value={option.label}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ShakeField>
                </motion.div>

                <motion.div variants={formGroupVariants}>
                  <ShakeField id='brief-field-landArea' active={shakeField === 'landArea'}>
                    <FormField
                      control={form.control}
                      name='landArea'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('site.landArea')}
                            <Req />
                          </FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <Input
                                inputMode='numeric'
                                placeholder='120'
                                name={field.name}
                                ref={field.ref}
                                value={field.value}
                                onChange={(event) => {
                                  field.onChange(event)
                                  setAreaOverHint(false)
                                }}
                                onBlur={(event) => {
                                  field.onBlur()
                                  setAreaOverHint(event.target.value.replace(/\D/g, '').length >= 4)
                                }}
                                className='pr-10'
                              />
                              {/* "m²" mờ cuối ô (mục 4). */}
                              <span
                                aria-hidden
                                className='text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm'
                              >
                                {t('site.areaSuffix')}
                              </span>
                            </div>
                          </FormControl>
                          <AnimatePresence>
                            {areaOverHint ? (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className='text-warning-strong overflow-hidden text-xs'
                              >
                                {t('site.landAreaConfirm', { value: field.value })}
                              </motion.p>
                            ) : null}
                          </AnimatePresence>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ShakeField>
                </motion.div>

                <motion.div variants={formGroupVariants}>
                  <FormField
                    control={form.control}
                    name='siteCondition'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('site.condition')}
                          <Req />
                        </FormLabel>
                        <ChoiceRow
                          options={SITE_CONDITIONS.map((value) => ({ value, label: tCondition(value) }))}
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <AnimatePresence initial={false}>
                  {showScaleFields ? (
                    <motion.div
                      key='scale-fields'
                      initial={reduceMotion ? false : { opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
                      className='space-y-4 overflow-hidden'
                    >
                      <ShakeField id='brief-field-scale' active={shakeField === 'scale'}>
                        <FormField
                          control={form.control}
                          name='scale'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('site.scale')}
                                <Req />
                              </FormLabel>
                              <ChoiceRow
                                options={PROJECT_SCALES.map((value) => ({ value, label: tScale(value) }))}
                                value={field.value}
                                onChange={(value) => {
                                  field.onChange(value)
                                  form.clearErrors('scale')
                                }}
                                className='flex-nowrap overflow-x-auto pb-1'
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </ShakeField>

                      <ShakeField id='brief-field-hasAttic' active={shakeField === 'hasAttic'}>
                        <FormField
                          control={form.control}
                          name='hasAttic'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t('site.attic')}
                                <Req />
                              </FormLabel>
                              <ChoiceRow
                                options={[
                                  { value: 'yes', label: t('site.atticYes') },
                                  { value: 'no', label: t('site.atticNo') }
                                ]}
                                value={field.value === null ? null : field.value ? 'yes' : 'no'}
                                onChange={(value) => {
                                  field.onChange(value === 'yes')
                                  form.clearErrors('hasAttic')
                                }}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </ShakeField>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.fieldset variants={formGroupVariants} className='space-y-3'>
                  <legend className='text-sm font-medium'>
                    {t('site.address')}
                    <Req />
                  </legend>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <ShakeField id='brief-field-provinceCode' active={shakeField === 'provinceCode'}>
                      <FormField
                        control={form.control}
                        name='provinceCode'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-muted-foreground text-xs'>{t('site.province')}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                // Xem ghi chú ở ô "Loại công trình".
                                if (!value) return
                                field.onChange(value)
                                // Đổi tỉnh thì phường cũ không còn thuộc tỉnh mới.
                                form.setValue('wardCode', '')
                              }}
                              disabled={isLoadingProvinces}
                            >
                              <FormControl>
                                <SelectTrigger className='w-full'>
                                  <SelectValue placeholder={t('site.province')}>
                                    {provinces.find((province) => String(province.code) === field.value)?.name}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {provinces.map((province) => (
                                  <SelectItem key={province.code} value={String(province.code)}>
                                    {province.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </ShakeField>

                    <ShakeField id='brief-field-wardCode' active={shakeField === 'wardCode'}>
                      {/* Phường/Xã "thức dậy" khi Tỉnh/TP vừa được chọn (mục 4)
                          — `key` đổi theo tỉnh buộc khối này dựng lại nên hiệu
                          ứng initial→animate chạy lại mỗi lần đổi tỉnh. */}
                      <motion.div
                        key={provinceCode || 'empty'}
                        initial={provinceCode ? { opacity: 0.4 } : false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <FormField
                          control={form.control}
                          name='wardCode'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-muted-foreground text-xs'>{t('site.ward')}</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => value && field.onChange(value)}
                                disabled={!provinceCode || isLoadingWards}
                              >
                                <FormControl>
                                  <SelectTrigger className='w-full'>
                                    {/* Chưa tải xong danh sách phường thì lấy tạm tên đã
                                    lưu trong hồ sơ, để ô không rỗng khi mở lại. */}
                                    <SelectValue placeholder={t('site.ward')}>
                                      {wards.find((ward) => String(ward.code) === field.value)?.name ??
                                        (field.value ? brief?.address.wardName : undefined)}
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {wards.map((ward) => (
                                    <SelectItem key={ward.code} value={String(ward.code)}>
                                      {ward.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    </ShakeField>
                  </div>

                  <ShakeField id='brief-field-street' active={shakeField === 'street'}>
                    <FormField
                      control={form.control}
                      name='street'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-muted-foreground text-xs'>{t('site.street')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('site.streetPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ShakeField>

                  <p className='text-muted-foreground text-xs'>{t('site.addressHint')}</p>
                </motion.fieldset>

                <motion.div variants={formGroupVariants} className='grid gap-4 sm:grid-cols-2'>
                  <ShakeField id='brief-field-budget' active={shakeField === 'budget'}>
                    <FormField
                      control={form.control}
                      name='budget'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('site.budget')}
                            <Req />
                          </FormLabel>
                          <FormControl>
                            {/* Gõ tới đâu chấm tới đó. Giá trị trong form giữ luôn
                              chuỗi ĐÃ chấm; `parseAmount` khi lưu đã lọc bỏ mọi ký
                              tự không phải số nên không cần state thứ hai. */}
                            <Input
                              inputMode='numeric'
                              placeholder='1.850.000.000'
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              value={field.value}
                              onChange={(event) => field.onChange(formatDigitGroups(event.target.value, locale))}
                            />
                          </FormControl>
                          {/* "≈ 1,85 tỷ" (mục 4) — chỉ hiện khi đã gõ một số dương. */}
                          <AnimatePresence>
                            {parseAmount(field.value) > 0 ? (
                              <motion.p
                                key='budget-approx'
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className='text-muted-foreground text-xs'
                              >
                                {t('site.budgetApprox', {
                                  value: formatBudgetShort(parseAmount(field.value), locale)
                                })}
                              </motion.p>
                            ) : null}
                          </AnimatePresence>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ShakeField>

                  <FormField
                    control={form.control}
                    name='startWindow'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('site.startWindow')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className='w-full'>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {START_WINDOWS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {tStart(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  id='brief-group-documents'
                  variants={formGroupVariants}
                  className='relative isolate space-y-3 pt-2'
                >
                  <FlashOverlay active={flashGroup === 'documents'} />
                  {/* Hình S10: khối này ở ĐÁY CỘT TRÁI, ngay dưới "Ngân sách dự
                    kiến" — không phải một thẻ riêng ở cột phải. */}
                  <h3 className='text-xs font-semibold tracking-wide uppercase'>
                    {t('documents.title')}{' '}
                    <span className='text-muted-foreground text-[11px] font-normal normal-case'>
                      ({t('documents.optional')})
                    </span>
                  </h3>

                  <motion.div
                    animate={
                      reduceMotion
                        ? { scale: 1, x: 0 }
                        : dropShake
                          ? { x: [0, -6, 6, -4, 4, 0], scale: 1 }
                          : dragActive
                            ? { scale: [1, 1.015, 1], x: 0 }
                            : dropAcceptedPulse
                              ? { scale: [1, 1.012, 1], x: 0 }
                              : { scale: 1, x: 0 }
                    }
                    transition={
                      dropShake
                        ? { duration: 0.4 }
                        : dragActive
                          ? { duration: 0.7, ease: revealEase }
                          : dropAcceptedPulse
                            ? { duration: reduceMotion ? 0 : 0.46, ease: revealEase }
                            : { duration: 0.2 }
                    }
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragActive(true)
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(event) => {
                      event.preventDefault()
                      setDragActive(false)
                      addFiles(event.dataTransfer.files)
                    }}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4 transition-colors',
                      (dragActive || hasFilesInDropzone) && 'border-primary',
                      dragActive && 'bg-accent/40'
                    )}
                  >
                    <motion.span
                      animate={
                        reduceMotion ? { y: 0 } : dropAcceptedPulse ? { y: [0, -5, 0] } : { y: dragActive ? -4 : 0 }
                      }
                      transition={
                        dropAcceptedPulse
                          ? { duration: 0.4, delay: 0.1, ease: revealEase }
                          : { duration: 0.2, ease: revealEase }
                      }
                      className='bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'
                    >
                      <FileUp className='size-5' />
                    </motion.span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium'>{t('documents.dropzone')}</p>
                      <p className='text-muted-foreground text-xs'>{t('documents.formats')}</p>
                    </div>
                    <input
                      ref={fileInput}
                      type='file'
                      multiple
                      accept={BRIEF_FILE_ACCEPT}
                      className='hidden'
                      onChange={(event) => {
                        addFiles(event.target.files)
                        event.target.value = ''
                      }}
                    />
                    <Button
                      ref={documentChooseButton}
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => fileInput.current?.click()}
                    >
                      {t('documents.choose')}
                    </Button>
                  </motion.div>

                  <AnimatePresence>
                    {dropError ? (
                      <motion.p
                        key={dropError}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className='text-destructive overflow-hidden text-xs'
                      >
                        {dropError}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  {documents.length > 0 || pendingUploads.length > 0 ? (
                    <ul className='space-y-2'>
                      <AnimatePresence initial={false}>
                        {pendingUploads.map((upload) => (
                          <motion.li
                            key={`pending-${upload.id}`}
                            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: reduceMotion ? 0 : 0.24, ease: revealEase }}
                            className='overflow-hidden rounded-lg border px-3 py-2'
                          >
                            <span className='block truncate text-sm'>{upload.name}</span>
                            <span className='bg-muted mt-1.5 block h-1 overflow-hidden rounded-full'>
                              <motion.span
                                initial={reduceMotion ? false : { scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: reduceMotion ? 0 : 0.6, ease: 'easeOut' }}
                                className='bg-primary block h-full origin-left rounded-full'
                              />
                            </span>
                          </motion.li>
                        ))}
                        {documents.map((document) => (
                          <motion.li
                            key={`document-${document.id}`}
                            layout
                            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, scale: 0.98 }}
                            className='flex origin-top items-center gap-3 overflow-hidden rounded-lg border px-3 py-2'
                          >
                            <motion.span
                              initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.6, delay: 0.1 }}
                              className='text-primary shrink-0'
                            >
                              <CheckCircle2 className='size-4' />
                            </motion.span>
                            <span className='min-w-0 flex-1 truncate text-sm'>{document.name}</span>
                            <span className='text-muted-foreground text-xs'>{formatFileSize(document, locale)}</span>
                            <button
                              type='button'
                              aria-label={t('documents.remove')}
                              onClick={() =>
                                setDocuments((current) => current.filter((item) => item.id !== document.id))
                              }
                              className='text-muted-foreground hover:text-destructive transition-colors'
                            >
                              <X className='size-3.5' />
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  ) : null}
                </motion.div>
              </motion.div>

              {/* Cột phải — Nhu cầu thi công. Hiện SAU cột trái (mục 4) nhờ
                  `staggerChildren` của container cha. */}
              <motion.div
                id='brief-group-needs'
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.42, ease: revealEase } }
                }}
                className='relative isolate flex flex-col space-y-4 lg:border-l lg:pl-10'
              >
                <FlashOverlay active={flashGroup === 'needs'} />
                <div>
                  <h2 className='text-sm font-semibold tracking-wide uppercase'>{t('needs.title')}</h2>
                  <p className='text-muted-foreground mt-0.5 text-xs'>{t('needs.subtitle')}</p>
                </div>

                <FormField
                  control={form.control}
                  name='scope'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('needs.scope')}
                        <Req />
                      </FormLabel>
                      {/* Hình S10: BỐN thẻ trên MỘT hàng, mỗi thẻ là icon lớn ở
                          giữa và nhãn nằm dưới — không có dòng mô tả phụ. Thẻ
                          đang chọn: viền xanh, nền xanh nhạt, kèm dấu tích tròn
                          xanh ở GÓC TRÊN PHẢI. */}
                      <ul className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
                        {CONSTRUCTION_SCOPES.map((value) => {
                          const active = field.value === value
                          const Icon = SCOPE_ICONS[value]
                          return (
                            <li key={value}>
                              <motion.button
                                type='button'
                                onClick={() => field.onChange(value)}
                                aria-pressed={active}
                                title={tScopeHint(value)}
                                // Ô nâng nhẹ khi chọn (mục 5) — điều khiển bằng
                                // `animate`, KHÔNG trộn vào chuỗi class tĩnh
                                // của trạng thái chọn/chưa chọn bên dưới.
                                animate={{ y: active ? -2 : 0 }}
                                transition={{ duration: 0.2 }}
                                // `h-full`: ô lưới đã giãn bằng nhau, nhưng nút
                                // bên trong chỉ cao bằng nội dung — nhãn nào
                                // xuống hai dòng ("Thi công trọn gói") thì ô đó
                                // cao hơn hẳn ba ô còn lại. Cho nút chiếm trọn ô
                                // thì cả bốn bằng nhau, và vì các thẻ xếp từ
                                // TRÊN xuống nên biểu tượng của bốn thẻ vẫn nằm
                                // đúng một hàng, phần dôi ra dồn xuống đáy.
                                className={cn(
                                  'relative flex h-full w-full flex-col items-center gap-2 rounded-xl border px-2 py-4 transition-colors',
                                  active ? 'border-primary bg-accent' : 'hover:border-primary/40'
                                )}
                              >
                                <AnimatePresence>
                                  {active ? (
                                    <motion.span
                                      key='scope-check'
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', bounce: 0.6, duration: 0.35 }}
                                      className='absolute top-1.5 right-1.5'
                                    >
                                      <CheckCircle2
                                        aria-hidden
                                        className='fill-primary text-primary-foreground size-4'
                                      />
                                    </motion.span>
                                  ) : null}
                                </AnimatePresence>
                                <Icon
                                  aria-hidden
                                  className={cn('size-7', active ? 'text-primary-strong' : 'text-primary')}
                                  strokeWidth={1.5}
                                />
                                <span
                                  className={cn(
                                    'text-center text-xs font-medium text-pretty',
                                    active && 'text-primary-strong'
                                  )}
                                >
                                  {tScope(value)}
                                </span>
                              </motion.button>
                            </li>
                          )
                        })}
                      </ul>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ShakeField
                  id='brief-field-scopeNote'
                  active={shakeField === 'scopeNote'}
                  className='flex flex-1 flex-col'
                >
                  <FormField
                    control={form.control}
                    name='scopeNote'
                    render={({ field }) => (
                      // Hình S10: ô mô tả CAO HẾT phần còn lại của cột phải, nên
                      // hai cột bằng nhau và đường kẻ dọc chạy trọn chiều cao.
                      <FormItem className='flex flex-1 flex-col'>
                        <FormLabel>
                          {t('needs.note')}
                          <Req />
                        </FormLabel>
                        <FormControl>
                          <div className='relative flex-1'>
                            <Textarea
                              placeholder=''
                              {...field}
                              onInput={(event) => {
                                const textarea = event.currentTarget
                                textarea.style.height = 'auto'
                                textarea.style.height = `${textarea.scrollHeight}px`
                              }}
                              className='min-h-40 max-h-[32rem] w-full resize-none overflow-y-auto'
                            />
                            {/* Chữ gợi ý đổi theo phạm vi vừa chọn, hiện chéo,
                                chỉ khi ô còn trống (mục 5). */}
                            {field.value.length === 0 ? (
                              <div
                                aria-hidden
                                className='pointer-events-none absolute inset-0 overflow-hidden px-3 py-2'
                              >
                                <AnimatePresence mode='sync'>
                                  <motion.span
                                    key={scope}
                                    initial={{ opacity: 0, x: 8, y: -4 }}
                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                    exit={{ opacity: 0, x: -8, y: 4 }}
                                    transition={{ duration: 0.25 }}
                                    className='text-muted-foreground absolute inset-0 px-3 py-2 text-base text-pretty md:text-sm'
                                  >
                                    {t(`needs.notePlaceholderByScope.${scope}`)}
                                  </motion.span>
                                </AnimatePresence>
                              </div>
                            ) : null}
                          </div>
                        </FormControl>
                        <div className='text-muted-foreground flex items-center justify-between text-xs'>
                          <span>{t('needs.noteHint')}</span>
                          <span
                            className={cn(
                              field.value.length >= BRIEF_NOTE_MAX_LENGTH
                                ? 'text-destructive font-medium'
                                : field.value.length >= BRIEF_NOTE_MAX_LENGTH * 0.8
                                  ? 'text-warning-strong font-medium'
                                  : undefined
                            )}
                          >
                            {t('needs.counter', { current: field.value.length, max: BRIEF_NOTE_MAX_LENGTH })}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </ShakeField>
              </motion.div>
            </motion.div>

            {/* Hàng nút nằm TRONG khung, có ĐƯỜNG KẺ NGANG ngăn với phần form
                phía trên. Hình S10 còn một nút "Lưu nháp" bên trái — đã bỏ theo
                yêu cầu: hồ sơ vốn được ghi lại ngay khi bấm "Tiếp tục" và vẫn
                nằm ở trạng thái nháp cho tới khi xác nhận ở Bước 2, nên nút đó
                chỉ là một đường ra thứ hai làm loãng thao tác chính. */}
            <div className='bg-card/95 sticky bottom-2 z-20 mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-4 pb-2 backdrop-blur-sm sm:static sm:bg-transparent sm:pt-6 sm:pb-0 sm:backdrop-blur-none'>
              <motion.span
                animate={
                  buttonEffect === 'shake'
                    ? { x: [0, -6, 6, -4, 4, 0], scale: 1 }
                    : buttonEffect === 'breathe'
                      ? { scale: [1, 1.03, 1], x: 0 }
                      : { x: 0, scale: 1 }
                }
                transition={{ duration: buttonEffect === 'breathe' ? 0.5 : 0.4 }}
                className='inline-block'
              >
                <Button
                  type='submit'
                  data-brief-submit
                  onPointerDownCapture={() => {
                    submitIntent.current = true
                  }}
                  onPointerUpCapture={() => {
                    submitIntent.current = false
                  }}
                  onPointerCancel={() => {
                    submitIntent.current = false
                  }}
                  disabled={form.formState.isSubmitting || pageTransition === 'forward'}
                  className={cn('max-sm:w-full', !requiredFilled && 'opacity-60')}
                >
                  {form.formState.isSubmitting ? <LoaderCircle className='size-4 animate-spin' /> : null}
                  {t('continue')}
                  {!form.formState.isSubmitting ? <ArrowRight className='size-4' /> : null}
                </Button>
              </motion.span>
            </div>
          </section>

          <p className='text-muted-foreground bg-warning/10 flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-xs'>
            <Info className='text-warning-strong size-4 shrink-0' />
            <span className='text-pretty'>{t('notice')}</span>
            {/* Hình S10: link nằm SÁT MÉP PHẢI của dải lưu ý và LUÔN gạch chân,
                không phải chỉ gạch khi rê chuột. */}
            <Link href={ROUTES.PLANS} className='text-primary ml-auto font-medium underline underline-offset-4'>
              {t('noticeAction')}
            </Link>
          </p>
        </motion.form>
      </Form>
    </motion.div>
  )
}

/** Hàng nút chọn một-trong-nhiều (Hiện trạng, Quy mô) — S10. */
function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
  className
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm transition-colors',
              active ? 'border-primary bg-accent text-primary-strong font-medium' : 'hover:border-primary/40'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Stepper 2 nấc dùng chung cho S10 và S11.
 *
 * Đo trên Hình S10 (ảnh gốc 800px, phần nội dung form x=50…748 = 699px):
 * - khung stepper x=128…661 → rộng 534px = **76.4% bề ngang nội dung**, canh
 *   giữa (tâm khung 394.5 so với tâm nội dung 399);
 * - cao 33px = 6.2% bề ngang khung;
 * - lề trong: trái 70px (13.1%), phải 64px (12%);
 * - VÒNG TRÒN VÀ NHÃN NẰM CẠNH NHAU trên một hàng, không phải vòng tròn trên
 *   nhãn dưới như bản trước: nấc 1 chiếm x=198…299, đường nối 312…509, nấc 2
 *   524…597. Đường nối dày 2px, đi qua tâm hai vòng (y=129) và ăn hết chỗ trống
 *   ở giữa — đó là lý do hai nấc KHÔNG chia đều bề ngang.
 *
 * Nấc đang đứng: vòng tròn xanh đặc, số trắng, nhãn đậm. Nấc chưa tới: vòng
 * tròn viền xám, số xám, nhãn xám. Nấc đã qua đổi số thành dấu tích.
 */
export function BriefSteps({
  current,
  progress,
  animateDoneCheck
}: {
  current: 1 | 2
  /**
   * Đường nối 1→2 tô dần theo số ô bắt buộc đã điền (M02, mục 3) — 0..1. Bỏ
   * qua thì đường nối đứng yên màu xám như trước (M03 truyền 1: bước 1 đã
   * xong hẳn).
   */
  progress?: number
  /**
   * Sang M03 từ M02 thì dấu tick của bước 1 chạy chuỗi vẽ vào; mở lại một
   * nháp đã có sẵn thì hiện tick tĩnh, không hiệu ứng (M03, mục 3).
   */
  animateDoneCheck?: boolean
}) {
  const t = useTranslations('contractors.brief.steps')
  const steps = [t('one'), t('two')]

  return (
    <ol className='bg-card mx-auto flex w-[76.4%] min-w-0 items-center rounded-2xl border py-3 pr-[12%] pl-[13.1%]'>
      {steps.map((label, index) => {
        const step = index + 1
        const done = step < current
        const active = step === current
        return (
          <li key={label} className='contents'>
            {/* Đường nối ăn hết chỗ trống giữa hai nấc — vệt xanh phủ lên trên
                là lớp PHỦ THÊM, đường nối xám gốc vẫn nguyên vẹn bên dưới. */}
            {index > 0 ? (
              <span aria-hidden className='bg-border relative mx-[2.4%] h-0.5 flex-1 overflow-hidden rounded-full'>
                {typeof progress === 'number' ? (
                  <motion.span
                    initial={false}
                    animate={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
                    transition={{ duration: 0.3, ease: revealEase }}
                    className='bg-primary absolute inset-y-0 left-0 rounded-full'
                  />
                ) : null}
              </span>
            ) : null}

            <span className='flex min-w-0 shrink-0 items-center gap-2'>
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  done || active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border'
                )}
              >
                {done ? (
                  animateDoneCheck ? (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', bounce: 0.6, duration: 0.4, delay: 0.15 * step }}
                    >
                      <Check className='size-4' strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <Check className='size-4' strokeWidth={3} />
                  )
                ) : (
                  step
                )}
              </span>
              <span
                className={cn(
                  'truncate text-sm',
                  active ? 'text-foreground font-semibold' : done ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
