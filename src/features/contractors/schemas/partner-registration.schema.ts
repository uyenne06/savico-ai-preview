import { z } from 'zod'

import { isValidPhone } from '@/shared/utils'

export interface PartnerRegistrationSchemaMessages {
  required: string
  email: string
  phone: string
}

export function createPartnerRegistrationSchema(m: PartnerRegistrationSchemaMessages) {
  return z.object({
    contractorName: z.string().trim().min(1, { message: m.required }),
    phone: z.string().trim().min(1, { message: m.required }).refine(isValidPhone, { message: m.phone }),
    email: z.string().trim().min(1, { message: m.required }).email({ message: m.email })
  })
}

export type PartnerRegistrationFormValues = z.infer<ReturnType<typeof createPartnerRegistrationSchema>>
