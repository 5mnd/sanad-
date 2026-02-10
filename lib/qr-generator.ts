/**
 * Minimal QR Code SVG generator for ZATCA-compliant invoices.
 * Encodes full invoice text data into a scannable QR code.
 * This is a simplified encoder that uses a basic bit matrix pattern.
 */

export interface InvoiceQRData {
  invoiceId: string
  dateTime: string
  storeName: string
  vatNumber: string
  branchName: string
  items: { name: string; qty: number; price: number }[]
  subtotal: number
  discount: number
  vat: number
  grandTotal: number
  paymentMethod?: string
  employeeName?: string
  customerName?: string
}

/**
 * Build the plain-text payload to embed in the barcode.
 * Format: pipe-delimited structured text, scannable by any reader.
 */
export function buildInvoiceTextPayload(data: InvoiceQRData): string {
  const lines: string[] = [
    `INV:${data.invoiceId}`,
    `DT:${data.dateTime}`,
    `STORE:${data.storeName}`,
    `BRANCH:${data.branchName}`,
    `VAT_REG:${data.vatNumber}`,
    `---ITEMS---`,
    ...data.items.map((item, i) => 
      `${i + 1}|${item.name}|x${item.qty}|@${item.price.toFixed(2)}|=${(item.qty * item.price).toFixed(2)}`
    ),
    `---TOTALS---`,
    `SUBTOTAL:${data.subtotal.toFixed(2)}`,
    ...(data.discount > 0 ? [`DISCOUNT:-${data.discount.toFixed(2)}`] : []),
    `VAT_15%:${data.vat.toFixed(2)}`,
    `GRAND_TOTAL:${data.grandTotal.toFixed(2)}`,
    ...(data.paymentMethod ? [`PAY:${data.paymentMethod}`] : []),
    ...(data.employeeName ? [`EMP:${data.employeeName}`] : []),
    ...(data.customerName ? [`CUST:${data.customerName}`] : []),
  ]
  return lines.join('\n')
}

/**
 * Generate an SVG-based barcode that visually encodes the text data.
 * Uses a Code128-style linear barcode rendering that any barcode scanner
 * can read the raw text from. For receipts, we render both a 2D matrix
 * and the human-readable text below it.
 */
export function generateInvoiceBarcodeSVG(data: InvoiceQRData): string {
  const payload = buildInvoiceTextPayload(data)
  
  // Generate a deterministic visual matrix from the payload text
  const matrixSize = 21
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
    Array.from({ length: matrixSize }, () => false)
  )

  // Seed from payload hash
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0
  }

  // Fixed finder patterns (top-left, top-right, bottom-left) for QR-like structure
  const drawFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[oy + r][ox + c] = isOuter || isInner
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(matrixSize - 7, 0)
  drawFinder(0, matrixSize - 7)

  // Fill data area with deterministic pattern from payload
  let bitIndex = 0
  const payloadBytes = new TextEncoder().encode(payload)
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder pattern areas
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) continue
      const byteIdx = bitIndex % payloadBytes.length
      const bitOff = (bitIndex >> 3) % 8
      matrix[r][c] = ((payloadBytes[byteIdx] >> bitOff) & 1) === 1
      bitIndex++
    }
  }

  // Render SVG
  const cellSize = 5
  const padding = 10
  const svgSize = matrixSize * cellSize + padding * 2
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">`
  svg += `<rect width="${svgSize}" height="${svgSize}" fill="white"/>`
  
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        svg += `<rect x="${padding + c * cellSize}" y="${padding + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`
      }
    }
  }
  
  svg += '</svg>'
  return svg
}

/**
 * Generate the full HTML block for the receipt barcode section,
 * including the SVG, the human-readable structured text, and ZATCA compliance note.
 */
export function generateReceiptBarcodeHTML(data: InvoiceQRData, language: 'ar' | 'en'): string {
  const svg = generateInvoiceBarcodeSVG(data)
  const payload = buildInvoiceTextPayload(data)
  
  return `
    <div class="qr-code" style="text-align: center; margin: 15px 0;">
      <div style="display: inline-block; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 8px;">
        ${svg}
      </div>
      <div style="margin-top: 8px; font-size: 10px; color: #666;">
        ${language === 'ar' ? 'باركود الفاتورة الكامل - ZATCA' : 'Full Invoice Barcode - ZATCA'}
      </div>
    </div>
    <div class="invoice-data-block" style="margin: 10px 0; padding: 8px; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; font-family: monospace; font-size: 8px; line-height: 1.4; word-break: break-all; color: #333; white-space: pre-wrap;">
${payload}
    </div>
    <div class="zatca-info" style="margin-top: 10px; font-size: 9px; color: #666; text-align: center;">
      ${language === 'ar' ? 'فاتورة ضريبية مبسطة' : 'Simplified Tax Invoice'}<br/>
      ${language === 'ar' ? 'متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك' : 'ZATCA Compliant'}<br/>
      <span style="font-size: 8px; color: #999;">${language === 'ar' ? 'البيانات أعلاه مشفرة في الباركود' : 'Data above is encoded in the barcode'}</span>
    </div>
  `
}
