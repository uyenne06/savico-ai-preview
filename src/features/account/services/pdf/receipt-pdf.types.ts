export interface ReceiptPdfData {
  code: string
  receiptHeading: string
  issuedAt: string
  buyerName: string
  buyerPhone?: string
  buyerEmail: string
  planName: string
  planDetail: string
  subtotal: string
  discount: string
  total: string
  method: string
  transferContent?: string
  status: string
  vat: string
  supportNote: string
}

export interface ReceiptPdfLabels {
  documentTitle: string
  time: string
  buyer: string
  plan: string
  subtotal: string
  discount: string
  total: string
  method: string
  transferContent: string
  status: string
  vatInvoice: string
}
