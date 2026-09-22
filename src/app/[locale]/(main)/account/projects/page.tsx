import { getTranslations, setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { AccountProjects } from '../account-projects'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AccountProjectsPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)
  const t = await getTranslations('account.projects')

  return (
    <section id='my-projects' className='scroll-mt-24 space-y-4'>
      <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
      <AccountProjects />
    </section>
  )
}
