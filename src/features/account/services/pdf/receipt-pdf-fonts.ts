import { Font } from '@react-pdf/renderer'

const FONT_BASE = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro'

export const RECEIPT_PDF_FONT = 'Be Vietnam Pro'

let registered = false

/** Unicode font để PDF hiển thị đầy đủ dấu tiếng Việt. */
export function registerReceiptPdfFonts(): void {
  if (registered) return

  Font.register({
    family: RECEIPT_PDF_FONT,
    fonts: [
      { src: `${FONT_BASE}/BeVietnamPro-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_BASE}/BeVietnamPro-Medium.ttf`, fontWeight: 500 },
      { src: `${FONT_BASE}/BeVietnamPro-SemiBold.ttf`, fontWeight: 600 },
      { src: `${FONT_BASE}/BeVietnamPro-Bold.ttf`, fontWeight: 700 }
    ]
  })

  registered = true
}
