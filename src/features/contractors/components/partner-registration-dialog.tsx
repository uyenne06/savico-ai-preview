'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Handshake, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

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
import {
  createPartnerRegistrationSchema,
  type PartnerRegistrationFormValues
} from '../schemas/partner-registration.schema'

interface PartnerRegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PartnerRegistrationDialog({ open, onOpenChange }: PartnerRegistrationDialogProps) {
  const t = useTranslations('contractors.landing.partner')
  const tValidation = useTranslations('validation')
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      createPartnerRegistrationSchema({
        required: tValidation('required'),
        email: tValidation('email'),
        phone: tValidation('phone')
      }),
    [tValidation]
  )
  const form = useForm<PartnerRegistrationFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: { contractorName: '', phone: '', email: '' }
  })

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      window.setTimeout(() => {
        setSubmittedEmail(null)
        form.reset()
      }, 200)
    }
  }

  const onSubmit = (values: PartnerRegistrationFormValues) => {
    // Repo hiện là frontend-only; giữ trạng thái xác nhận tại chỗ cho tới khi API tiếp nhận đối tác được nối vào.
    setSubmittedEmail(values.email)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {submittedEmail ? (
          <div className='flex flex-col items-center py-4 text-center'>
            <span className='bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-full'>
              <CheckCircle2 className='size-7' />
            </span>
            <DialogHeader className='items-center text-center sm:text-center'>
              <DialogTitle>{t('successTitle')}</DialogTitle>
              <DialogDescription className='max-w-sm text-pretty'>
                {t('successBody', { email: submittedEmail })}
              </DialogDescription>
            </DialogHeader>
            <Button type='button' className='mt-6 w-full' onClick={() => handleOpenChange(false)}>
              {t('close')}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <span className='bg-brand-orange-soft text-brand-orange mb-1 flex size-10 items-center justify-center rounded-xl'>
                <Handshake className='size-5' />
              </span>
              <DialogTitle>{t('dialogTitle')}</DialogTitle>
              <DialogDescription>{t('dialogDescription')}</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4' noValidate>
                <FormField
                  control={form.control}
                  name='contractorName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('name')}</FormLabel>
                      <FormControl>
                        <Input autoFocus autoComplete='organization' placeholder={t('namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl>
                        <Input
                          type='tel'
                          inputMode='tel'
                          autoComplete='tel'
                          placeholder={t('phonePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Mail className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                          <Input
                            type='email'
                            autoComplete='email'
                            placeholder={t('emailPlaceholder')}
                            className='pl-9'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <p className='text-muted-foreground text-xs'>{t('emailHint')}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className='pt-2'>
                  <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type='submit'>{t('submit')}</Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
