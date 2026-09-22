import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { RECEIPT_PDF_FONT } from './receipt-pdf-fonts'
import type { ReceiptPdfData, ReceiptPdfLabels } from './receipt-pdf.types'

const colors = {
  text: '#172019',
  muted: '#6b746d',
  border: '#dfe6e1',
  soft: '#f5f8f6',
  primary: '#0f6b3d',
  primarySoft: '#edf7f1'
} as const

const styles = StyleSheet.create({
  page: {
    fontFamily: RECEIPT_PDF_FONT,
    fontSize: 9.5,
    color: colors.text,
    padding: 36,
    lineHeight: 1.45
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 18
  },
  receipt: {
    borderWidth: 0.8,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden'
  },
  receiptHead: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.8,
    borderBottomColor: colors.border
  },
  receiptHeadText: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: 'uppercase'
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 0.6,
    borderBottomColor: colors.border
  },
  rowLast: {
    borderBottomWidth: 0
  },
  totalRow: {
    backgroundColor: colors.primarySoft
  },
  label: {
    width: '31%',
    color: colors.muted
  },
  value: {
    width: '69%',
    textAlign: 'right',
    fontWeight: 500
  },
  valueStrong: {
    fontWeight: 700
  },
  totalValue: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 700
  },
  buyerEmail: {
    color: colors.muted,
    fontSize: 8.5,
    marginTop: 2
  },
  planDetail: {
    color: colors.muted,
    fontSize: 8.5,
    marginTop: 2
  },
  status: {
    color: colors.primary,
    fontWeight: 700
  },
  note: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 8.5,
    lineHeight: 1.5
  },
  brand: {
    marginTop: 22,
    color: colors.primary,
    fontSize: 8.5,
    fontWeight: 700,
    textAlign: 'center'
  }
})

function PdfRow({
  label,
  children,
  total = false,
  last = false
}: {
  label: string
  children: React.ReactNode
  total?: boolean
  last?: boolean
}) {
  return (
    <View style={[styles.row, total ? styles.totalRow : {}, last ? styles.rowLast : {}]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>{children}</View>
    </View>
  )
}

export function ReceiptPdf({ data, labels }: { data: ReceiptPdfData; labels: ReceiptPdfLabels }) {
  return (
    <Document title={`${labels.documentTitle} #${data.code}`} author='SAVICO'>
      <Page size='A4' style={styles.page}>
        <Text style={styles.title}>
          {labels.documentTitle} #{data.code}
        </Text>

        <View style={styles.receipt}>
          <View style={styles.receiptHead}>
            <Text style={styles.receiptHeadText}>{data.receiptHeading}</Text>
          </View>

          <PdfRow label={labels.time}>
            <Text>{data.issuedAt}</Text>
          </PdfRow>

          <PdfRow label={labels.buyer}>
            <Text style={styles.valueStrong}>
              {data.buyerName}
              {data.buyerPhone ? ` · ${data.buyerPhone}` : ''}
            </Text>
            <Text style={styles.buyerEmail}>{data.buyerEmail}</Text>
          </PdfRow>

          <PdfRow label={labels.plan}>
            <Text style={styles.valueStrong}>{data.planName}</Text>
            <Text style={styles.planDetail}>{data.planDetail}</Text>
          </PdfRow>

          <PdfRow label={labels.subtotal}>
            <Text>{data.subtotal}</Text>
          </PdfRow>

          <PdfRow label={labels.discount}>
            <Text>{data.discount}</Text>
          </PdfRow>

          <PdfRow label={labels.total} total>
            <Text style={styles.totalValue}>{data.total}</Text>
          </PdfRow>

          <PdfRow label={labels.method}>
            <Text style={styles.valueStrong}>{data.method}</Text>
          </PdfRow>

          {data.transferContent ? (
            <PdfRow label={labels.transferContent}>
              <Text style={styles.valueStrong}>{data.transferContent}</Text>
            </PdfRow>
          ) : null}

          <PdfRow label={labels.status}>
            <Text style={styles.status}>{data.status}</Text>
          </PdfRow>

          <PdfRow label={labels.vatInvoice} last>
            <Text style={styles.valueStrong}>{data.vat}</Text>
          </PdfRow>
        </View>

        <Text style={styles.note}>{data.supportNote}</Text>
        <Text style={styles.brand}>SAVICO</Text>
      </Page>
    </Document>
  )
}
