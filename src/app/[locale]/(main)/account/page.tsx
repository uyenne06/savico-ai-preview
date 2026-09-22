import { setRequestLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ROUTES } from '@/shared/constants/routes'

interface PageProps {
  params: Promise<{ locale: string }>
}

/** /account chỉ là entry point; màn mặc định theo mockup mới là "Hồ sơ dự án". */
export default async function AccountPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)
  redirect({ href: ROUTES.ACCOUNT_DOSSIERS, locale })
}
