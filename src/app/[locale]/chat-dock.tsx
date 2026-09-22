'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ChatPanel, useProactiveChat } from '@/features/chatbot'
import { useChatContextStore } from '@/shared/chat-context'
import { AssistantDrawer } from '@/shared/components/assistant-drawer'
import { cn } from '@/shared/lib/utils'

const ASSISTANT_OPENED_KEY = 'savico.assistant.opened'
const TOPIC_SUGGESTION_PREFIX = 'savico.assistant.topic-suggestion.'
const MAIN_MOTION_SETTLE_TIMEOUT_MS = 2600
const MAIN_MOTION_SAMPLE_MS = 50

interface TopicSuggestion {
  id: string
  title: string
}

/**
 * Chatbox AI nổi ở góc phải dưới trên mọi màn hình (quy ước xuyên suốt, mục I).
 * App-layer glue: `shared/` may not import `features/chatbot`, so the drawer
 * shell lives in shared and the chat content is injected here.
 *
 * Cũng là nơi DUY NHẤT chạy kịch bản "AI tự trò chuyện lúc chờ" (mục III.3a) —
 * component này luôn mounted trong layout nên kịch bản không bị chạy lặp.
 */
export function ChatDock() {
  const t = useTranslations('assistant')
  const open = useChatContextStore((s) => s.panelOpen)
  const setOpen = useChatContextStore((s) => s.setPanelOpen)
  const suppressed = useChatContextStore((s) => s.dockSuppressed)
  const [ready, setReady] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [openedOnce, setOpenedOnce] = useState(false)
  const [suggestion, setSuggestion] = useState<TopicSuggestion | null>(null)
  const scrollStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useProactiveChat()

  useEffect(() => {
    let cancelled = false
    let settleFrame = 0

    const frame = window.requestAnimationFrame(() => {
      setOpenedOnce(localStorage.getItem(ASSISTANT_OPENED_KEY) === '1')

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setReady(true)
        return
      }

      const startedAt = performance.now()
      let quietSamples = 0

      const waitForMainMotion = () => {
        if (cancelled) return

        const main = document.querySelector('main')
        const finiteAnimations = (main?.getAnimations({ subtree: true }) ?? []).filter((animation) => {
          if (animation.playState === 'finished' || animation.playState === 'idle') return false
          const iterations = animation.effect?.getTiming().iterations
          return typeof iterations !== 'number' || Number.isFinite(iterations)
        })

        quietSamples = finiteAnimations.length === 0 ? quietSamples + 1 : 0
        const timedOut = performance.now() - startedAt >= MAIN_MOTION_SETTLE_TIMEOUT_MS

        // Two quiet samples prevent the FAB from racing ahead during the frame
        // where async content has mounted but its entrance animations have not
        // been registered by the browser yet.
        if (quietSamples >= 2 || timedOut) {
          setReady(true)
          return
        }

        readyTimerRef.current = setTimeout(waitForMainMotion, MAIN_MOTION_SAMPLE_MS)
      }

      // Give React/CSS one full paint boundary to register opening animations.
      settleFrame = window.requestAnimationFrame(() => {
        readyTimerRef.current = setTimeout(waitForMainMotion, MAIN_MOTION_SAMPLE_MS)
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(settleFrame)
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      localStorage.setItem(ASSISTANT_OPENED_KEY, '1')
      setOpenedOnce(true)
      setSuggestion(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    const onScroll = () => {
      setScrolling(true)
      if (scrollStopTimerRef.current) clearTimeout(scrollStopTimerRef.current)
      scrollStopTimerRef.current = setTimeout(() => setScrolling(false), 180)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollStopTimerRef.current) clearTimeout(scrollStopTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onTopicOpened = (event: Event) => {
      const detail = (event as CustomEvent<TopicSuggestion>).detail
      if (!detail?.id || !detail.title || open) return

      const key = `${TOPIC_SUGGESTION_PREFIX}${detail.id}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
      setSuggestion(detail)

      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
      suggestionTimerRef.current = setTimeout(() => setSuggestion(null), 6500)
    }

    window.addEventListener('savico:handbook-topic-opened', onTopicOpened)
    return () => {
      window.removeEventListener('savico:handbook-topic-opened', onTopicOpened)
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    }
  }, [open])

  const labelAvailable = ready && !scrolling && !open && !suppressed

  function toggleAssistant() {
    if (!open) {
      localStorage.setItem(ASSISTANT_OPENED_KEY, '1')
      setOpenedOnce(true)
      setSuggestion(null)
    }
    setOpen(!open)
  }

  function openFromSuggestion() {
    localStorage.setItem(ASSISTANT_OPENED_KEY, '1')
    setOpenedOnce(true)
    setSuggestion(null)
    setOpen(true)
  }

  return (
    <>
      {suggestion && ready && !open && !suppressed ? (
        <button
          type='button'
          data-assistant-topic-suggestion
          onClick={openFromSuggestion}
          className='bg-background/95 text-foreground fixed right-6 bottom-28 z-40 max-w-64 rounded-2xl border px-4 py-3 text-left text-sm shadow-lg backdrop-blur-md transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none'
        >
          {t('topicSuggestion', { topic: suggestion.title })}
        </button>
      ) : null}

      <button
        type='button'
        data-assistant-fab
        data-ready={ready}
        data-opened-once={openedOnce}
        aria-label={open ? t('close') : t('title')}
        aria-expanded={open}
        onClick={toggleAssistant}
        className={cn(
          'group fixed right-6 bottom-6 z-[60] flex cursor-pointer flex-col items-center drop-shadow-lg transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
          ready && !suppressed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        style={{ transform: ready && !suppressed ? undefined : 'translate3d(0, 40px, 0)' }}
      >
        {!openedOnce && ready && !open ? (
          <span
            data-assistant-idle-ring
            aria-hidden
            className='border-primary/35 pointer-events-none absolute top-0 z-0 size-14 rounded-full border-2'
          />
        ) : null}

        <span className='brand-gradient text-primary-foreground relative z-10 flex size-14 items-center justify-center rounded-full'>
          <span data-assistant-fab-icon className='relative size-7' aria-hidden>
            <Bot
              data-assistant-bot-icon
              className={cn(
                'absolute inset-0 size-7 transition-[opacity,transform] duration-250 motion-reduce:transition-none',
                open ? 'opacity-0' : 'opacity-100'
              )}
              style={{ transform: open ? 'rotate(90deg) scale(0.75)' : 'rotate(0deg) scale(1)' }}
            />
            <X
              data-assistant-close-icon
              className={cn(
                'absolute inset-0 size-7 transition-[opacity,transform] duration-250 motion-reduce:transition-none',
                open ? 'opacity-100' : 'opacity-0'
              )}
              style={{ transform: open ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.75)' }}
            />
          </span>
        </span>

        <span
          data-assistant-label
          aria-hidden='true'
          className={cn(
            'brand-gradient text-primary-foreground -mt-3 max-h-0 -translate-y-2 overflow-hidden rounded-full px-3 pt-0 pb-0 text-[0.7rem] font-semibold whitespace-nowrap opacity-0 transition-[max-height,opacity,padding,transform] duration-250 ease-out motion-reduce:transition-none',
            labelAvailable &&
              'group-hover:max-h-10 group-hover:translate-y-0 group-hover:pt-3.5 group-hover:pb-1 group-hover:opacity-100 group-focus-visible:max-h-10 group-focus-visible:translate-y-0 group-focus-visible:pt-3.5 group-focus-visible:pb-1 group-focus-visible:opacity-100'
          )}
        >
          {t('fab')}
        </span>
      </button>

      <AssistantDrawer open={open} onClose={() => setOpen(false)}>
        <ChatPanel />
      </AssistantDrawer>
    </>
  )
}
