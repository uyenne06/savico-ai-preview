'use client'

import { CalendarDays, CreditCard, FolderOpen, Heart, LayoutGrid } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'

/**
 * Thanh điều hướng Account nhìn như tab nhưng dùng route thật.
 *
 * Mỗi mục có URL riêng nên reload, bookmark và browser Back/Forward luôn giữ
 * đúng màn. Nội dung từng route được compose ở app layer, không nằm trong
 * client state của thanh điều hướng.
 */
export function AccountNav() {
  const t = useTranslations('account')
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const tabs: Array<{ href: string; icon: LucideIcon; label: string; badge?: string }> = [
    { href: ROUTES.ACCOUNT_PROJECTS, icon: LayoutGrid, label: t('projects.title') },
    { href: ROUTES.ACCOUNT_FAVORITES, icon: Heart, label: t('favorites.title') },
    { href: ROUTES.ACCOUNT_DOSSIERS, icon: FolderOpen, label: t('dossiers.title'), badge: t('new') },
    { href: ROUTES.ACCOUNT_PURCHASES, icon: CreditCard, label: t('purchaseHistory.title'), badge: t('new') },
    {
      href: ROUTES.ACCOUNT_CONSULTATIONS,
      icon: CalendarDays,
      label: t('consultationHistory.title'),
      badge: t('new')
    }
  ] as const

  return (
    <LayoutGroup id='account-route-tabs'>
      <nav
        aria-label={t('title')}
        className='bg-card flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border p-1'
      >
        {tabs.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative inline-flex shrink-0 items-center justify-center rounded-lg px-3 py-2 text-xs font-medium transition-colors xl:px-4',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {active ? (
                <motion.span
                  layoutId='account-active-pill'
                  aria-hidden
                  className='bg-primary-strong absolute inset-0 rounded-lg'
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36, mass: 0.72 }
                  }
                />
              ) : null}

              <span className='relative z-10 inline-flex items-center gap-1.5'>
                <Icon className='size-3.5' />
                {label}
                {badge ? (
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                      active ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-accent text-primary-strong'
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
            </Link>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
