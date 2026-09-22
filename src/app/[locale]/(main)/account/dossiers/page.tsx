import { setRequestLocale } from 'next-intl/server'

import { AccountDossierList } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AccountDossiersPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <AccountDossierList />
}
