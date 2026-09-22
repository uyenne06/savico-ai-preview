'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Anchor,
  ArrowRight,
  Blocks,
  BookOpenCheck,
  BrickWall,
  Brush,
  ClipboardCheck,
  Clock,
  DoorOpen,
  Footprints,
  Grid2x2,
  Hammer,
  Home,
  Layers,
  Lightbulb,
  PencilRuler,
  PlugZap,
  Plus,
  ShowerHead,
  Sofa,
  Wallet,
  X
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Photo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { handbookArticleRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { useHandbookArticles, useHandbookStages } from '../hooks/use-handbook'
import { articlesOfTopic, countArticlesByTopic } from '../services/handbook.service'
import type { HandbookStage, HandbookStageId } from '../types/handbook.types'

/** Biểu tượng tròn của từng giai đoạn trên thẻ (Hình 9). */
const STAGE_ICON: Record<HandbookStageId, typeof Blocks> = {
  structure: Blocks,
  finishing: Brush,
  interior: Sofa
}

/**
 * Biểu tượng của từng chủ đề trong bảng chủ đề (Hình 10). Chủ đề nào chưa có
 * biểu tượng riêng thì dùng `Layers` — bảng vẫn đều mắt.
 */
const TOPIC_ICON: Record<string, typeof Blocks> = {
  foundation: Layers,
  piling: Anchor,
  frame: Blocks,
  masonry: BrickWall,
  roofing: Home,
  stairs: Footprints,
  mep: PlugZap,
  'structure-handover': ClipboardCheck,
  tiling: Grid2x2,
  painting: Brush,
  doors: DoorOpen,
  sanitary: ShowerHead,
  lighting: Lightbulb,
  'finishing-handover': ClipboardCheck,
  'interior-design': PencilRuler,
  joinery: Hammer,
  'loose-furniture': Sofa,
  'interior-budget': Wallet
}

/** Biểu tượng của một chủ đề, cỡ đồng nhất trong bảng chủ đề. */
function TopicIcon({ topicId }: { topicId: string }) {
  const Icon = TOPIC_ICON[topicId] ?? Layers
  return <Icon className='size-4' />
}

const STEP_TOGGLE_ROTATE_DURATION = 300
const CTA_IDLE_DELAY_MS = 4800
const CTA_NUDGE_DURATION_MS = 680

function StepToggleIcon({ open }: { open: boolean }) {
  const iconRef = useRef<SVGSVGElement>(null)
  const strokeRef = useRef<SVGPathElement>(null)
  const animationsRef = useRef<Animation[]>([])
  const lastOpenRef = useRef(open)

  useLayoutEffect(() => {
    const icon = iconRef.current
    const stroke = strokeRef.current
    if (!icon || !stroke) return

    if (lastOpenRef.current === open && animationsRef.current.length === 0) {
      icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)'
      stroke.style.transform = open ? 'scaleY(0)' : 'scaleY(1)'
      stroke.style.opacity = open ? '0' : '1'
      return
    }
    lastOpenRef.current = open

    // Lấy đúng tư thế đang hiển thị trước khi thay lượt chạy, không nhảy về đầu.
    const matrix = new DOMMatrixReadOnly(getComputedStyle(icon).transform)
    const startRotation = (Math.atan2(Math.abs(matrix.b), matrix.a) * 180) / Math.PI
    const strokeStyle = getComputedStyle(stroke)
    const startStroke = { transform: strokeStyle.transform, opacity: strokeStyle.opacity }
    animationsRef.current.forEach((animation) => animation.cancel())
    animationsRef.current = []

    // Mở xoay phải, đóng xoay trái về đúng tư thế ban đầu.
    // Bấm giữa chừng đảo chiều từ góc và độ dài nét hiện tại, không xếp hàng.
    const endRotation = open ? 180 : 0
    icon.style.transform = `rotate(${endRotation}deg)`
    stroke.style.transform = open ? 'scaleY(0)' : 'scaleY(1)'
    stroke.style.opacity = open ? '0' : '1'
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timing: KeyframeAnimationOptions = {
      duration: open ? STEP_TOGGLE_ROTATE_DURATION : 240,
      fill: 'both'
    }
    animationsRef.current = [
      icon.animate(
        [
          { transform: `rotate(${startRotation}deg)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { transform: `rotate(${endRotation}deg)` }
        ],
        timing
      ),
      stroke.animate(
        [
          { ...startStroke, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { transform: stroke.style.transform, opacity: stroke.style.opacity }
        ],
        timing
      )
    ]
  }, [open])

  useLayoutEffect(() => {
    return () => {
      for (const animation of animationsRef.current) animation.cancel()
      animationsRef.current = []
    }
  }, [])

  return (
    <span data-step-toggle-icon className='relative size-4' aria-hidden>
      <svg
        ref={iconRef}
        className='absolute inset-0 size-4'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
        style={{ transformBox: 'view-box', transformOrigin: '50% 50%' }}
      >
        <path d='M5 12h14' />
        <path ref={strokeRef} d='M12 5v14' style={{ transformBox: 'view-box', transformOrigin: '50% 50%' }} />
      </svg>
    </span>
  )
}

/**
 * Khối "Cẩm nang nền tảng" (Phần 3.1, Hình 9 và Hình 10).
 *
 * Băng giới thiệu + ba thẻ giai đoạn. Mở một giai đoạn ngay tại trang: hiện bảng
 * chủ đề kèm số bài, rồi hiện danh sách bài của chủ đề đang chọn — người dùng
 * thấy ngay độ dày của kho kiến thức mà không phải rời trang.
 */
export function FoundationBlock() {
  const t = useTranslations('handbook.foundation')
  const searchParams = useSearchParams()
  // "Mở nhanh bài viết" / "Thu gọn" / "Xem chi tiết" là chữ của HÀNH VI mở nhanh,
  // dùng chung với khối "Tất cả bài viết" — hai khối cùng một thao tác thì phải
  // cùng một câu, để mỗi khối một bản dịch riêng là admin sửa một chỗ hụt chỗ kia.
  const tArticles = useTranslations('handbook.articles')

  const { data: stages, isPending } = useHandbookStages()
  const { data: articles } = useHandbookArticles()

  const [openStage, setOpenStage] = useState<HandbookStageId | null>(null)
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  /**
   * Dòng bài đang mở nhanh; chỉ một dòng mở tại một thời điểm (PHỤ LỤC bản mô
   * tả v1.1). Đổi chủ đề hay đổi giai đoạn thì đóng lại — dòng đang mở thuộc về
   * danh sách cũ, giữ nguyên id thì danh sách mới hiện ra đã có sẵn một dòng bung.
   */
  const [openArticle, setOpenArticle] = useState<string | null>(null)
  const [flashStage, setFlashStage] = useState<HandbookStageId | null>(null)
  const [ctaNudge, setCtaNudge] = useState(false)
  const [panelStage, setPanelStage] = useState<HandbookStageId | null>(null)
  const [outgoingPanelStage, setOutgoingPanelStage] = useState<HandbookStageId | null>(null)
  const [outgoingTopic, setOutgoingTopic] = useState<string | null>(null)
  const [panelPhase, setPanelPhase] = useState<'idle' | 'opening' | 'switching' | 'closing'>('idle')
  const foundationRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const stagesHeadingRef = useRef<HTMLHeadingElement>(null)
  const panelFrameRef = useRef<HTMLDivElement>(null)
  const panelCurrentRef = useRef<HTMLDivElement>(null)
  const panelOutgoingRef = useRef<HTMLDivElement>(null)
  const articleListRef = useRef<HTMLUListElement>(null)
  const articleListTopicRef = useRef<string | null>(null)
  const panelAnimationsRef = useRef<Animation[]>([])
  const panelRunIdRef = useRef(0)
  const panelVisibleRef = useRef(false)
  const nudgeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nudgeResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctaPointerInsideRef = useRef(false)
  const ctaFocusedRef = useRef(false)
  const ctaClickedRef = useRef(false)
  const deepLinkAppliedRef = useRef<string | null>(null)

  const clearCtaIdleLoop = useCallback(() => {
    if (nudgeTimerRef.current) {
      clearInterval(nudgeTimerRef.current)
      nudgeTimerRef.current = null
    }
    if (nudgeResetTimerRef.current) {
      clearTimeout(nudgeResetTimerRef.current)
      nudgeResetTimerRef.current = null
    }
  }, [])

  const startCtaIdleLoop = useCallback(() => {
    clearCtaIdleLoop()
    if (ctaClickedRef.current || ctaPointerInsideRef.current || ctaFocusedRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    nudgeTimerRef.current = setInterval(() => {
      if (ctaClickedRef.current || ctaPointerInsideRef.current || ctaFocusedRef.current) return
      if (document.visibilityState !== 'visible') return

      setCtaNudge(true)
      if (nudgeResetTimerRef.current) clearTimeout(nudgeResetTimerRef.current)
      nudgeResetTimerRef.current = setTimeout(() => {
        nudgeResetTimerRef.current = null
        setCtaNudge(false)
      }, CTA_NUDGE_DURATION_MS)
    }, CTA_IDLE_DELAY_MS)
  }, [clearCtaIdleLoop])

  const pauseCtaIdle = useCallback(() => {
    clearCtaIdleLoop()
    setCtaNudge(false)
  }, [clearCtaIdleLoop])

  const resumeCtaIdle = useCallback(() => {
    if (ctaPointerInsideRef.current || ctaFocusedRef.current || ctaClickedRef.current) return
    startCtaIdleLoop()
  }, [startCtaIdleLoop])

  useLayoutEffect(() => {
    const section = foundationRef.current
    if (!section) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const animations: Animation[] = []
    let hasPlayed = false

    const keepUntilFinished = (animation: Animation) => {
      animations.push(animation)
      void animation.finished.then(() => animation.cancel()).catch(() => undefined)
    }

    const playEntrance = () => {
      if (hasPlayed) return
      hasPlayed = true

      const book = section.querySelector<HTMLElement>('[data-foundation-book]')
      const hero = section.querySelector<HTMLElement>('.foundation-hero-motion')
      const tick = book?.querySelector<SVGPathElement>('svg path:nth-of-type(2)')
      const sequence = Array.from(section.querySelectorAll<HTMLElement>('[data-foundation-sequence]'))

      const finalBorderColor = getComputedStyle(section).borderColor
      keepUntilFinished(
        section.animate([{ borderColor: 'transparent' }, { borderColor: finalBorderColor }], {
          duration: 220,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both'
        })
      )
      if (book) {
        keepUntilFinished(
          book.animate(
            [
              { opacity: 0, transform: 'scale(0.82)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 360, delay: 140, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          )
        )
      }
      if (tick) {
        const length = tick.getTotalLength()
        keepUntilFinished(
          tick.animate(
            [
              { strokeDasharray: `${length}`, strokeDashoffset: `${length}`, opacity: 0.35 },
              { strokeDasharray: `${length}`, strokeDashoffset: '0', opacity: 1 }
            ],
            { duration: 300, delay: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          )
        )
      }
      if (hero) {
        keepUntilFinished(
          hero.animate(
            [
              { opacity: 0, transform: 'scale(1.035)' },
              { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 680, delay: 160, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
          )
        )
      }
      sequence.forEach((node, index) => {
        keepUntilFinished(
          node.animate(
            [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 280,
              delay: 520 + index * 85,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          )
        )
      })

      startCtaIdleLoop()
    }

    const rect = section.getBoundingClientRect()
    const visible = rect.top < window.innerHeight && rect.bottom > 0
    let observer: IntersectionObserver | null = null

    if (visible) {
      playEntrance()
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return
          observer?.disconnect()
          playEntrance()
        },
        { threshold: 0.08 }
      )
      observer.observe(section)
    }

    return () => {
      observer?.disconnect()
      animations.forEach((animation) => animation.cancel())
      clearCtaIdleLoop()
    }
  }, [clearCtaIdleLoop, startCtaIdleLoop])

  useLayoutEffect(() => {
    const row = stepsRef.current
    if (!row || isPending) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const animations: Animation[] = []
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        Array.from(row.querySelectorAll<HTMLElement>('[data-foundation-step]')).forEach((card, index) => {
          const cardDelay = index * 120
          const cardAnimation = card.animate(
            [
              { opacity: 0, transform: 'translateX(-24px)' },
              { opacity: 1, transform: 'translateX(0)' }
            ],
            {
              duration: 340,
              delay: cardDelay,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          )
          animations.push(cardAnimation)
          void cardAnimation.finished.then(() => cardAnimation.cancel()).catch(() => undefined)

          const sequence = [
            card.querySelector<HTMLElement>('.foundation-step-image-motion'),
            ...['label', 'title', 'description', 'link'].map((part) =>
              card.querySelector<HTMLElement>(`[data-step-reveal='${part}']`)
            )
          ].filter((node): node is HTMLElement => Boolean(node))

          sequence.forEach((node, sequenceIndex) => {
            const isImage = node.classList.contains('foundation-step-image-motion')
            const childAnimation = node.animate(
              isImage
                ? [
                    { opacity: 0, transform: 'scale(1.025)' },
                    { opacity: 1, transform: 'scale(1)' }
                  ]
                : [
                    { opacity: 0, transform: 'translateY(6px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                  ],
              {
                duration: isImage ? 280 : 220,
                delay: cardDelay + 75 + sequenceIndex * 55,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
              }
            )
            animations.push(childAnimation)
            void childAnimation.finished.then(() => childAnimation.cancel()).catch(() => undefined)
          })
        })
      },
      { threshold: 0.2 }
    )

    observer.observe(row)
    return () => {
      observer.disconnect()
      animations.forEach((animation) => animation.cancel())
    }
  }, [isPending, stages])

  useLayoutEffect(() => {
    const frame = panelFrameRef.current
    const current = panelCurrentRef.current
    if (!frame || !current || !panelStage || panelPhase === 'idle') return

    const runId = ++panelRunIdRef.current
    const isCurrentRun = () => panelRunIdRef.current === runId
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const heightBeforeCancel = frame.getBoundingClientRect().height
    const gapBeforeCancel = Number.parseFloat(getComputedStyle(frame).paddingTop) || 0
    const opacityBeforeCancel = Number.parseFloat(getComputedStyle(current).opacity) || 0
    const transformBeforeCancel = getComputedStyle(current).transform
    const wasVisible = panelVisibleRef.current
    const freezeAndCancelPanelAnimations = () => {
      panelAnimationsRef.current.forEach((animation) => {
        // Preserve the exact visual frame before cancelling so a rapid second
        // click reverses from the current position instead of snapping to the
        // animation's authored start/end state.
        if (animation.playState !== 'idle') {
          try {
            animation.commitStyles()
          } catch {
            // `commitStyles` can throw for detached targets; cancelling is still safe.
          }
        }
        animation.cancel()
      })
      panelAnimationsRef.current = []
    }
    freezeAndCancelPanelAnimations()

    const remember = (animation: Animation) => {
      panelAnimationsRef.current.push(animation)
      return animation
    }

    const finishOpenOrSwitch = () => {
      if (!isCurrentRun()) return
      // Bỏ fill trước khi trả về kích thước tự nhiên, tránh giữ chiều cao cũ.
      panelAnimationsRef.current.forEach((animation) => animation.cancel())
      panelAnimationsRef.current = []
      frame.style.removeProperty('height')
      frame.style.removeProperty('padding-top')
      frame.style.removeProperty('overflow')
      current.style.removeProperty('opacity')
      current.style.removeProperty('transform')
      current.querySelectorAll<HTMLElement>('[data-foundation-topic-card]').forEach((card) => {
        card.style.removeProperty('opacity')
        card.style.removeProperty('transform')
      })
      const articleList = current.querySelector<HTMLElement>('[data-foundation-article-list]')
      articleList?.style.removeProperty('opacity')
      articleList?.style.removeProperty('transform')
      setOutgoingPanelStage(null)
      setOutgoingTopic(null)
      setPanelPhase('idle')
    }

    if (reduced) {
      const settleFrame = window.requestAnimationFrame(() => {
        if (!isCurrentRun()) return
        if (panelPhase === 'closing') {
          panelVisibleRef.current = false
          setPanelStage(null)
          setOpenTopic(null)
          setOpenArticle(null)
          setOutgoingPanelStage(null)
          setOutgoingTopic(null)
          setPanelPhase('idle')
        } else {
          finishOpenOrSwitch()
        }
      })
      return () => window.cancelAnimationFrame(settleFrame)
    }

    panelVisibleRef.current = true
    const startHeight = panelPhase === 'opening' && !wasVisible ? 0 : heightBeforeCancel
    const savedPadding = frame.style.paddingTop
    frame.style.removeProperty('padding-top')
    const panelGap = Number.parseFloat(getComputedStyle(frame).paddingTop) || 0
    frame.style.paddingTop = savedPadding
    const targetHeight = current.getBoundingClientRect().height + panelGap

    if (panelPhase === 'opening') {
      const startOpacity = wasVisible ? opacityBeforeCancel : 0
      frame.style.height = `${startHeight}px`
      frame.style.overflow = 'hidden'

      const heightAnimation = remember(
        frame.animate(
          [
            { height: `${startHeight}px`, paddingTop: `${wasVisible ? gapBeforeCancel : 0}px` },
            { height: `${targetHeight}px`, paddingTop: `${panelGap}px` }
          ],
          {
            duration: 430,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both'
          }
        )
      )
      const contentAnimation = remember(
        current.animate(
          [
            { opacity: startOpacity, transform: wasVisible ? transformBeforeCancel : 'translateY(-8px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
        )
      )
      const openingAnimations: Animation[] = [heightAnimation, contentAnimation]

      const topicCards = Array.from(current.querySelectorAll<HTMLElement>('[data-foundation-topic-card]'))
      topicCards.forEach((card, index) => {
        const cardStyle = getComputedStyle(card)
        const topicAnimation = remember(
          card.animate(
            wasVisible
              ? [
                  { opacity: cardStyle.opacity, transform: cardStyle.transform },
                  { opacity: 1, transform: 'translateY(0)' }
                ]
              : [
                  { opacity: 0, transform: 'translateY(8px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
            {
              duration: wasVisible ? 180 : 240,
              delay: wasVisible ? 0 : 90 + index * 55,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          )
        )
        openingAnimations.push(topicAnimation)
      })

      const list = current.querySelector<HTMLElement>('[data-foundation-article-list]')
      if (list) {
        const listStyle = getComputedStyle(list)
        const listDelay = wasVisible ? 0 : 90 + Math.max(0, topicCards.length - 1) * 55 + 160
        const listAnimation = remember(
          list.animate(
            wasVisible
              ? [
                  { opacity: listStyle.opacity, transform: listStyle.transform },
                  { opacity: 1, transform: 'translateY(0)' }
                ]
              : [
                  { opacity: 0, transform: 'translateY(14px)' },
                  { opacity: 1, transform: 'translateY(0)' }
                ],
            {
              duration: wasVisible ? 200 : 280,
              delay: listDelay,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'both'
            }
          )
        )
        openingAnimations.push(listAnimation)
      }

      requestAnimationFrame(() => {
        if (!isCurrentRun()) return
        const heading = current.querySelector<HTMLElement>('[data-foundation-panel-heading]')
        if (!heading) return
        const rect = heading.getBoundingClientRect()
        const headerOffset = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')
        )
        if (rect.top < (headerOffset || 64) + 12 || rect.bottom > window.innerHeight - 20) {
          window.scrollTo({
            top: Math.max(0, window.scrollY + rect.top - (headerOffset || 64) - 20),
            behavior: 'smooth'
          })
        }
      })

      void Promise.allSettled(openingAnimations.map((animation) => animation.finished)).then(() => {
        if (isCurrentRun() && panelPhase === 'opening') finishOpenOrSwitch()
      })
      return () => {
        if (!isCurrentRun()) return
        ++panelRunIdRef.current
        freezeAndCancelPanelAnimations()
      }
    }

    if (panelPhase === 'switching') {
      const outgoing = panelOutgoingRef.current
      if (!outgoing) return
      const fromOrder = stages?.find((stage) => stage.id === outgoingPanelStage)?.order ?? 0
      const toOrder = stages?.find((stage) => stage.id === panelStage)?.order ?? 0
      const direction = toOrder >= fromOrder ? 1 : -1

      frame.style.height = `${startHeight}px`
      frame.style.overflow = 'hidden'
      const heightAnimation = remember(
        frame.animate(
          [
            { height: `${startHeight}px`, paddingTop: `${gapBeforeCancel}px` },
            { height: `${targetHeight}px`, paddingTop: `${panelGap}px` }
          ],
          {
            duration: 360,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both'
          }
        )
      )
      const outgoingAnimation = remember(
        outgoing.animate(
          [
            { opacity: getComputedStyle(outgoing).opacity, transform: getComputedStyle(outgoing).transform },
            { opacity: 0, transform: `translateX(${-direction * 34}px)` }
          ],
          { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
        )
      )
      const incomingAnimation = remember(
        current.animate(
          [
            // Panel mới phải hiện ngay cùng frame card mới active. Bắt đầu từ
            // opacity nhẹ thay vì 0 để tránh một frame trống, trong khi panel
            // outgoing đã bị ẩn hoàn toàn.
            { opacity: 0.38, transform: `translateX(${direction * 34}px)` },
            { opacity: 1, transform: 'translateX(0)' }
          ],
          { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
        )
      )

      void Promise.allSettled([heightAnimation.finished, outgoingAnimation.finished, incomingAnimation.finished]).then(
        () => {
          if (isCurrentRun() && panelPhase === 'switching') finishOpenOrSwitch()
        }
      )
      return () => {
        if (!isCurrentRun()) return
        ++panelRunIdRef.current
        freezeAndCancelPanelAnimations()
      }
    }

    if (panelPhase === 'closing') {
      frame.style.height = `${startHeight}px`
      frame.style.overflow = 'hidden'
      const fadeAnimation = remember(
        current.animate(
          [
            { opacity: getComputedStyle(current).opacity, transform: getComputedStyle(current).transform },
            { opacity: 0, transform: 'translateY(-6px)' }
          ],
          { duration: 120, easing: 'ease-out', fill: 'both' }
        )
      )

      void fadeAnimation.finished
        .then(() => {
          if (!isCurrentRun() || panelPhase !== 'closing') return
          const collapseAnimation = remember(
            frame.animate(
              [
                { height: `${frame.getBoundingClientRect().height}px`, paddingTop: `${gapBeforeCancel}px` },
                { height: '0px', paddingTop: '0px' }
              ],
              {
                duration: 190,
                easing: 'cubic-bezier(0.4, 0, 1, 1)',
                fill: 'both'
              }
            )
          )
          return collapseAnimation.finished.then(() => {
            if (!isCurrentRun() || panelPhase !== 'closing') return
            // Giữ cả khung và khoảng cách ở 0 đến khi React gỡ nội dung.
            frame.style.height = '0px'
            frame.style.paddingTop = '0px'
            panelVisibleRef.current = false
            setPanelStage(null)
            setOpenTopic(null)
            setOpenArticle(null)
            setOutgoingPanelStage(null)
            setOutgoingTopic(null)
            setPanelPhase('idle')
          })
        })
        .catch(() => undefined)

      return () => {
        if (!isCurrentRun()) return
        ++panelRunIdRef.current
        freezeAndCancelPanelAnimations()
      }
    }
  }, [outgoingPanelStage, panelPhase, panelStage, stages])

  useEffect(() => {
    if (!openStage) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (!panelStage) return
      setOpenStage(null)
      setOutgoingPanelStage(null)
      setOutgoingTopic(null)
      setPanelPhase('closing')

      const row = stepsRef.current
      if (!row) return
      const rect = row.getBoundingClientRect()
      const headerOffset = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')
      )
      if (rect.bottom < (headerOffset || 64) + 24 || rect.top > window.innerHeight - 80) {
        window.scrollTo({
          top: Math.max(0, window.scrollY + rect.top - (headerOffset || 64) - 24),
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openStage, panelStage])

  useLayoutEffect(() => {
    const list = articleListRef.current
    if (!openTopic) {
      articleListTopicRef.current = null
      return
    }
    if (!list) return
    if (panelPhase !== 'idle') {
      articleListTopicRef.current = openTopic
      return
    }
    if (articleListTopicRef.current === openTopic) return
    articleListTopicRef.current = openTopic
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = list.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
    return () => animation.cancel()
  }, [openTopic, panelPhase])

  useEffect(() => {
    if (!flashStage) return
    const timer = setTimeout(() => setFlashStage(null), 850)
    return () => clearTimeout(timer)
  }, [flashStage])

  const counts = useMemo(() => countArticlesByTopic(articles ?? []), [articles])
  const activeStage = stages?.find((stage) => stage.id === panelStage)
  const outgoingStage = stages?.find((stage) => stage.id === outgoingPanelStage)

  useEffect(() => {
    if (!stages?.length) return
    const requestedStageId = searchParams.get('stage')
    if (!requestedStageId) return

    const requestedStage = stages.find((stage) => stage.id === requestedStageId)
    if (!requestedStage) return
    const requestedTopicId = searchParams.get('topic')
    const requestedTopic = requestedTopicId
      ? requestedStage.topics.find((topic) => topic.id === requestedTopicId)
      : undefined
    const targetTopicId = requestedTopic?.id ?? requestedStage.topics[0]?.id ?? null
    const deepLinkKey = `${requestedStage.id}:${targetTopicId ?? ''}`
    if (deepLinkAppliedRef.current === deepLinkKey) return
    deepLinkAppliedRef.current = deepLinkKey

    setOpenArticle(null)
    setOpenStage(requestedStage.id)
    setPanelStage(requestedStage.id)
    setOpenTopic(targetTopicId)
    setOutgoingPanelStage(null)
    setOutgoingTopic(null)
    setPanelPhase('opening')

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = stagesHeadingRef.current ?? foundationRef.current
        if (!target) return
        const headerOffset =
          Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')) || 64
        const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerOffset - 16)
        window.scrollTo({ top, behavior: 'auto' })
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
    }
  }, [searchParams, stages])

  function toggleStage(id: HandbookStageId, firstTopicId?: string) {
    if (openStage === id) {
      closeStagePanel()
      return
    }

    setOpenArticle(null)
    const previousStage = panelStage ?? openStage
    const previousTopic = openTopic
    if (previousStage && previousStage !== id) {
      const frame = panelFrameRef.current
      if (frame) {
        const currentHeight = frame.getBoundingClientRect().height
        frame.style.height = `${currentHeight}px`
        frame.style.overflow = 'hidden'
      }
    }
    setOpenStage(id)
    setPanelStage(id)
    setOpenTopic(firstTopicId ?? null)
    if (previousStage && previousStage !== id) {
      setOutgoingPanelStage(previousStage)
      setOutgoingTopic(previousTopic)
      setPanelPhase('switching')
    } else {
      setOutgoingPanelStage(null)
      setOutgoingTopic(null)
      setPanelPhase('opening')
    }
  }

  function selectTopic(topicId: string) {
    setOpenTopic(topicId)
    setOpenArticle(null)
    const topic = activeStage?.topics.find((item) => item.id === topicId)
    if (topic) {
      window.dispatchEvent(
        new CustomEvent('savico:handbook-topic-opened', { detail: { id: topic.id, title: topic.title } })
      )
    }
  }

  function closeStagePanel() {
    if (!panelStage) return
    setOpenStage(null)
    setOutgoingPanelStage(null)
    setOutgoingTopic(null)
    setPanelPhase('closing')

    const row = stepsRef.current
    if (!row) return
    const rect = row.getBoundingClientRect()
    const headerOffset = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')
    )
    if (rect.bottom < (headerOffset || 64) + 24 || rect.top > window.innerHeight - 80) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + rect.top - (headerOffset || 64) - 24),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      })
    }
  }

  function renderStagePanel(stage: HandbookStage, topicId: string | null, interactive: boolean) {
    const panelArticles = topicId ? articlesOfTopic(articles ?? [], topicId) : []

    return (
      <div
        ref={interactive ? panelCurrentRef : panelOutgoingRef}
        data-foundation-stage-panel={stage.id}
        aria-hidden={!interactive}
        inert={!interactive}
        className={cn(
          'relative space-y-4 rounded-xl border p-4',
          // Khi đổi stage, panel cũ vẫn được giữ tạm trong DOM để lifecycle
          // animation/height có thể settle an toàn. Tuy nhiên nó không được phép
          // còn nhìn thấy sau khi card mới đã active, nếu không sẽ tạo một frame
          // "card mới + data cũ" như clip QA.
          !interactive && 'pointer-events-none absolute inset-x-0 top-5 opacity-0'
        )}
      >
        <div className='flex items-start justify-between gap-3'>
          <h3 data-foundation-panel-heading className='text-base font-semibold'>
            {t('stageHeading', { stage: stage.title })}
          </h3>
          {interactive ? (
            <button
              type='button'
              data-foundation-panel-close
              onClick={closeStagePanel}
              aria-label={tArticles('collapse')}
              className='text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-full transition-colors'
            >
              <X className='size-4' />
            </button>
          ) : null}
        </div>

        <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {stage.topics.map((topic) => (
            <li key={topic.id} data-foundation-topic-card>
              <button
                type='button'
                onClick={interactive ? () => selectTopic(topic.id) : undefined}
                aria-pressed={interactive && topic.id === topicId}
                tabIndex={interactive ? 0 : -1}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  interactive && topic.id === topicId ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
                )}
              >
                <span className='flex items-start gap-2.5'>
                  <span className='text-primary mt-0.5 shrink-0'>
                    <TopicIcon topicId={topic.id} />
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-sm font-medium'>{topic.title}</span>
                    <span className='text-muted-foreground block text-xs'>
                      {t('articleCount', { count: counts[topic.id] ?? 0 })}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {panelArticles.length > 0 ? (
          <ul ref={interactive ? articleListRef : undefined} data-foundation-article-list className='space-y-2'>
            {panelArticles.map((article) => {
              const expanded = interactive && openArticle === article.id
              return (
                <li key={article.id} className='overflow-hidden rounded-lg border'>
                  <button
                    type='button'
                    onClick={interactive ? () => setOpenArticle(expanded ? null : article.id) : undefined}
                    aria-expanded={expanded}
                    tabIndex={interactive ? 0 : -1}
                    className='hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors'
                  >
                    <span className='bg-primary size-1.5 shrink-0 rounded-full' aria-hidden />
                    <span className='min-w-0 flex-1 text-sm font-medium'>{article.title}</span>
                    <span className='text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs'>
                      <Clock className='size-3.5' />
                      {t('readingTime', { minutes: article.readingMinutes })}
                    </span>
                    <span
                      aria-label={expanded ? tArticles('collapse') : tArticles('expand')}
                      className={cn(
                        'bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full transition-transform duration-200',
                        expanded && 'rotate-45'
                      )}
                    >
                      <Plus className='size-3.5' />
                    </span>
                  </button>

                  <div
                    className={cn(
                      'grid transition-all duration-200 ease-out',
                      expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className='overflow-hidden'>
                      <div className='px-4 pb-3 sm:pl-9'>
                        <p className='text-muted-foreground text-sm text-pretty'>{article.excerpt}</p>
                        <Link
                          href={handbookArticleRoute(article.slug)}
                          className='text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1.5 text-sm font-medium'
                          tabIndex={interactive ? 0 : -1}
                        >
                          {tArticles('viewDetail')}
                          <ArrowRight className='size-4' />
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className='text-muted-foreground text-sm'>{t('topicEmpty')}</p>
        )}
      </div>
    )
  }

  return (
    <section
      ref={foundationRef}
      data-handbook-foundation
      className='border-primary/40 bg-card space-y-5 rounded-2xl border p-5'
    >
      {/* Hình 9: nhãn chữ xanh in hoa ở góc trên, không phải chip có nền. */}
      <p data-foundation-sequence className='text-primary text-sm font-bold tracking-wide uppercase'>
        {t('eyebrow')}
      </p>

      {/* Băng giới thiệu ba phần: minh họa · chữ · ảnh công trình (Hình 9). */}
      <div className='bg-primary/5 grid items-center gap-4 overflow-hidden rounded-xl md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1.1fr_1fr]'>
        <div className='flex justify-center p-6 pr-0 md:pl-8'>
          <span
            data-foundation-book
            className='bg-primary/15 text-primary flex size-32 items-center justify-center rounded-full'
          >
            <BookOpenCheck className='size-16' strokeWidth={1.5} />
          </span>
        </div>

        <div className='space-y-3 p-6'>
          <p data-foundation-sequence className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {t('kicker')}
          </p>
          <h2 data-foundation-sequence className='text-2xl font-semibold tracking-tight text-balance'>
            {t('title')}
          </h2>
          <p data-foundation-sequence className='text-muted-foreground text-sm leading-relaxed'>
            {t('description')}
          </p>
          <Button
            data-foundation-cta
            data-foundation-sequence
            className='relative isolate overflow-hidden transition-[transform,filter,box-shadow] duration-200 ease-out'
            onPointerEnter={() => {
              ctaPointerInsideRef.current = true
              pauseCtaIdle()
            }}
            onPointerLeave={() => {
              ctaPointerInsideRef.current = false
              resumeCtaIdle()
            }}
            onFocus={() => {
              ctaFocusedRef.current = true
              pauseCtaIdle()
            }}
            onBlur={() => {
              ctaFocusedRef.current = false
              resumeCtaIdle()
            }}
            onClick={() => {
              ctaClickedRef.current = true
              pauseCtaIdle()
              const first = stages?.[0]
              if (!first) return

              if (openStage !== first.id) toggleStage(first.id, first.topics[0]?.id)
              else setOpenTopic(first.topics[0]?.id ?? null)
              setFlashStage(first.id)

              requestAnimationFrame(() => {
                const target = stagesHeadingRef.current ?? stepsRef.current
                if (!target) return
                const headerOffset = Number.parseFloat(
                  getComputedStyle(document.documentElement).getPropertyValue('--public-header-offset')
                )
                const top = window.scrollY + target.getBoundingClientRect().top - (headerOffset || 64) - 16
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
              })
            }}
          >
            <span data-foundation-cta-sheen data-nudge={ctaNudge} aria-hidden />
            <span className='relative z-10'>{t('start')}</span>
            <ArrowRight
              data-foundation-cta-arrow
              data-nudge={ctaNudge}
              className='relative z-10 size-4 transition-transform duration-200'
            />
          </Button>
        </div>

        {stages?.[0] ? (
          <Photo
            className='foundation-hero-motion hidden h-full min-h-56 w-full transition-[filter] duration-300 motion-reduce:!filter-none lg:block'
            src={stages[0].imageUrl}
            alt={t('title')}
            sizes='(max-width: 1024px) 100vw, 520px'
          />
        ) : null}
      </div>

      <h3 ref={stagesHeadingRef} className='text-base font-semibold'>
        {t('stagesTitle')}
      </h3>

      {isPending ? (
        <div className='grid gap-4 lg:grid-cols-3'>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className='h-36 rounded-xl' />
          ))}
        </div>
      ) : (
        <div ref={stepsRef} className='grid gap-4 lg:grid-cols-3' style={{ marginBlockEnd: 0 }}>
          {stages?.map((stage) => {
            const open = stage.id === openStage
            const Icon = STAGE_ICON[stage.id]
            const stageArticle =
              articles?.find((article) => article.stage === stage.id) ??
              articles?.find((article) => stage.topics.some((topic) => topic.id === article.topicId))
            return (
              <article
                data-foundation-step={stage.order}
                key={stage.id}
                onClick={() => toggleStage(stage.id, stage.topics[0]?.id)}
                className={cn(
                  'relative flex cursor-pointer overflow-hidden rounded-xl border transition-[border-color,opacity,transform,box-shadow] hover:shadow-md focus-within:shadow-md',
                  open ? 'border-primary bg-primary/5' : 'hover:border-primary/40',
                  openStage && !open && 'opacity-70',
                  flashStage === stage.id && 'ring-primary ring-2 ring-offset-2'
                )}
              >
                <Photo
                  className='foundation-step-image-motion w-40 shrink-0 transition-transform duration-500'
                  src={stage.imageUrl}
                  alt={stage.title}
                  sizes='160px'
                />

                <div className='flex min-w-0 flex-1 items-start gap-3 p-3 pr-12'>
                  <span
                    data-step-icon
                    className='bg-primary/10 text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-[filter] duration-200'
                  >
                    <Icon className='size-5' />
                  </span>
                  <div className='min-w-0 space-y-1'>
                    <p data-step-reveal='label' className='text-muted-foreground text-xs'>
                      {t('stepLabel', { order: stage.order })}
                    </p>
                    <h4 data-step-reveal='title' className='text-lg leading-tight font-semibold'>
                      {stage.title}
                    </h4>
                    <p
                      data-step-reveal='description'
                      className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'
                    >
                      {stage.description}
                    </p>
                    {/* Hình 9: mỗi thẻ có liên kết "Xem cẩm nang →" ở dưới cùng. */}
                    {stageArticle ? (
                      <Link
                        data-step-reveal='link'
                        data-stage-guide-link
                        href={handbookArticleRoute(stageArticle.slug)}
                        onClick={(event) => event.stopPropagation()}
                        className='text-primary inline-flex items-center gap-1.5 pt-1 text-xs font-medium hover:font-bold focus-visible:font-bold'
                      >
                        <span data-stage-guide-text className='relative grid'>
                          <span aria-hidden className='invisible col-start-1 row-start-1 font-bold'>
                            {t('openStage')}
                          </span>
                          <span className='col-start-1 row-start-1'>{t('openStage')}</span>
                          <span
                            data-stage-guide-underline
                            aria-hidden
                            className='bg-primary absolute right-0 -bottom-0.5 left-0 h-px motion-reduce:transition-none'
                          />
                        </span>
                        <ArrowRight
                          data-step-link-arrow
                          className='size-3.5 transition-transform duration-200 motion-reduce:transition-none'
                        />
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* Nút ⊕ / ⊖ ở góc trên phải thẻ (Hình 9, Hình 10). */}
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleStage(stage.id, stage.topics[0]?.id)
                  }}
                  aria-expanded={open}
                  aria-label={t('openStage')}
                  className='bg-primary text-primary-foreground absolute top-3 right-3 flex size-8 items-center justify-center rounded-full'
                >
                  <StepToggleIcon open={open} />
                </button>
              </article>
            )
          })}
        </div>
      )}

      {activeStage ? (
        <div ref={panelFrameRef} data-foundation-panel-frame className='relative pt-5'>
          {outgoingStage ? renderStagePanel(outgoingStage, outgoingTopic, false) : null}
          {renderStagePanel(activeStage, openTopic, true)}
        </div>
      ) : null}
    </section>
  )
}
