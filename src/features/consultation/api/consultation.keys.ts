export const consultationKeys = {
  all: ['consultation'] as const,

  consultants: () => [...consultationKeys.all, 'consultants'] as const,
  consultantDetail: (id: string) => [...consultationKeys.consultants(), 'detail', id] as const,

  availability: (consultantId: string) => [...consultationKeys.all, 'availability', consultantId] as const,
  myBookings: () => [...consultationKeys.all, 'my-bookings'] as const
} as const
