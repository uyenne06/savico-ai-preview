'use client'

import { Plus } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { type ComponentType, useEffect, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { Logo } from '@/shared/components/common'
import { GuestMenu } from '@/shared/components/guest-menu'
import { Button } from '@/shared/components/ui/button'
import { ROUTES } from '@/shared/constants/routes'
import { useMounted, useScrolled } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { SiteNavMobile } from './site-nav-mobile'
import { SITE_NAV } from './site-nav.config'

interface SiteHeaderProps {
  /** App-layer account dropdown, shown once signed in. Falls back to GuestMenu. */
  UserMenu?: ComponentType
  /** Opens the "Tạo dự án" modal (mục III.1). Injected by the app layer. */
  onCreateProject?: () => void
}

/**
 * Thanh công cụ cố định trên cùng mọi trang (mục II.1).
 * Nền sáng, logo bên trái, 3 mục điều hướng ở giữa, nút "Tạo dự án mới" và
 * avatar bên phải. Mục đang mở được gạch chân bằng màu thương hiệu.
 *
 * ★ Nền động (mục II.1): mặt kính đặc hơn nền trang, quầng xanh thương hiệu
 * trôi ngang và viền dưới sáng ở giữa — xem `.site-header-shell` trong
 * `globals.css`. Cuộn khỏi đỉnh trang thì header đặc thêm và đổ bóng sâu hơn.
 */
export function SiteHeader({ UserMenu, onCreateProject }: SiteHeaderProps = {}) {
  const t = useTranslations('nav')
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()

  // Auth state is client-only; gate on hydration so SSR and first paint match.
  const mounted = useMounted()
  const authed = mounted && isAuthenticated
  const scrolled = useScrolled()
  const reduceMotion = useReducedMotion()
  const [hidden, setHidden] = useState(false)
  const [pastTitle, setPastTitle] = useState(false)
  const onHandbook = pathname === ROUTES.HANDBOOK || pathname.startsWith(`${ROUTES.HANDBOOK}/`)
  const onHandbookArticle = pathname.startsWith(`${ROUTES.HANDBOOK}/bai-viet/`)
  const onDesign = pathname === ROUTES.DESIGN || pathname.startsWith(`${ROUTES.DESIGN}/`)

  useEffect(() => {
    if (!onHandbook) return

    let previousY = window.scrollY
    let direction = 0
    let distance = 0
    let frame = 0
    let titleThreshold = 120

    const measureTitle = () => {
      const title = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('h1')
      if (!title) return
      titleThreshold = Math.max(120, title.offsetTop + title.offsetHeight)
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY)
        const delta = currentY - previousY
        previousY = currentY
        const hasPassedTitle = currentY > titleThreshold

        setPastTitle(hasPassedTitle)
        if (!hasPassedTitle) {
          direction = 0
          distance = 0
          setHidden(false)
          return
        }

        if (!delta) return
        const nextDirection = Math.sign(delta)
        distance = nextDirection === direction ? distance + Math.abs(delta) : Math.abs(delta)
        direction = nextDirection

        if (distance >= (direction > 0 ? 18 : 6)) setHidden(direction > 0)
      })
    }

    measureTitle()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measureTitle)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measureTitle)
    }
  }, [onHandbook, pathname])

  const isHidden = onHandbook && hidden
  const isCompact = (onHandbook && pastTitle) || (onDesign && scrolled)

  useEffect(() => {
    const style = document.documentElement.style
    style.setProperty('--public-header-offset', isHidden ? '0px' : isCompact ? '56px' : '64px')
    style.setProperty('--public-header-duration', reduceMotion ? '0ms' : isHidden ? '280ms' : '180ms')

    return () => {
      style.removeProperty('--public-header-offset')
      style.removeProperty('--public-header-duration')
    }
  }, [isCompact, isHidden, reduceMotion])

  const createLabel = t('createProject')

  return (
    <header
      data-scrolled={onHandbook ? pastTitle : scrolled}
      data-handbook={onHandbook}
      data-hidden={isHidden}
      className={cn(
        'site-header-shell sticky top-0 z-40 transition-transform motion-reduce:transition-none',
        isHidden ? '-translate-y-full duration-[280ms]' : 'translate-y-0 duration-[180ms]'
      )}
    >
      <div
        className={cn(
          'relative mx-auto flex w-full max-w-[90rem] items-center gap-6 px-4 transition-[height] motion-reduce:transition-none lg:px-8',
          isCompact ? 'h-14 duration-[180ms]' : 'h-16 duration-[180ms]'
        )}
      >
        <Link href={ROUTES.HOME} aria-label={t('home')} className='shrink-0'>
          <Logo tagline={t('brandTagline')} />
        </Link>

        <nav className='absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex'>
          {SITE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                data-site-nav-link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out',
                  active
                    ? 'text-foreground after:bg-primary after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:content-[""]'
                    : 'text-muted-foreground hover:text-primary focus-visible:text-primary hover:bg-foreground/[0.06]'
                )}
              >
                {/* Bản mô tả S01: mục này tên "Bảng giá" với khách chưa đăng
                    nhập, "Gói đăng ký" khi đã đăng nhập. */}
                {t(item.labelKey === 'plans' && !authed ? 'plansGuest' : item.labelKey)}
                {!active ? (
                  <span
                    data-site-nav-hover-line
                    aria-hidden='true'
                    className='bg-primary pointer-events-none absolute left-3 -bottom-0.5 h-0.5 w-[calc(100%_-_1.5rem)] origin-center scale-x-0 rounded-full transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100'
                  />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className='ml-auto flex items-center gap-2'>
          <Button
            data-create-project-trigger
            size='sm'
            className='rounded-xl transition-[transform,filter,box-shadow] duration-200'
            onClick={onCreateProject}
          >
            <Plus data-create-project-plus className='size-4 transition-transform duration-300' />
            <span className='hidden sm:inline'>{createLabel}</span>
          </Button>

          {/* Avatar luôn hiện — mục IV: bấm avatar mở Cửa sổ cá nhân. Khách chưa
              đăng nhập thấy cùng một biểu tượng, chỉ khác nội dung dropdown, để
              thanh công cụ không đổi bố cục khi đăng nhập / đăng xuất. */}
          {authed && UserMenu ? <UserMenu /> : <GuestMenu />}

          <SiteNavMobile />
        </div>
      </div>
      {onHandbookArticle ? <span data-handbook-reading-progress aria-hidden='true' /> : null}
    </header>
  )
}
