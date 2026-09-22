import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { AccountContentTransition } from './account-content-transition'
import { AccountSide } from './account-side'
import { AccountSupervision } from './account-supervision'
import { AccountNav } from './account-tabs'

interface AccountLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Khung dùng chung của toàn bộ /account/*.
 *
 * Sidebar và thanh điều hướng nằm ở layout để không remount khi chuyển giữa
 * các mục. Chỉ phần children bên phải thay đổi theo route con.
 */
export default async function AccountLayout({ children, params }: AccountLayoutProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)
  const t = await getTranslations('account')

  return (
    <ProtectedRoute>
      <div className='mx-auto w-[94%] max-w-[88rem] py-8'>
        <div className='grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]'>
          <aside className='space-y-5 lg:sticky lg:top-24 lg:self-start'>
            <AccountSide />
            <AccountSupervision />
          </aside>

          <main className='min-w-0'>
            <h1 className='mb-4 text-3xl font-semibold tracking-tight'>{t('title')}</h1>
            <AccountNav />
            <div className='mt-4'>
              <AccountContentTransition>{children}</AccountContentTransition>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
