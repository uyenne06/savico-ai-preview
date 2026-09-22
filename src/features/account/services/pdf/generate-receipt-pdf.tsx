import type { ReceiptPdfData, ReceiptPdfLabels } from './receipt-pdf.types'

/**
 * Render biên nhận thành Blob PDF và tải thẳng xuống máy.
 * Không dùng window.print nên không mở print dialog của trình duyệt.
 */
export async function generateReceiptPdf(
  data: ReceiptPdfData,
  labels: ReceiptPdfLabels,
  fileName: string
): Promise<number> {
  const [{ pdf }, { ReceiptPdf }, { registerReceiptPdfFonts }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./receipt-pdf'),
    import('./receipt-pdf-fonts')
  ])

  registerReceiptPdfFonts()

  const blob = await pdf(<ReceiptPdf data={data} labels={labels} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000)

  return blob.size
}
