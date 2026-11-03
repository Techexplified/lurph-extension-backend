import { PDFParse } from 'pdf-parse'

const MAX_PDF_PAGES = 60
const MAX_PDF_TEXT_CHARS = 45000

export async function extractPdf(req, res) {
  const file = req.file
  if (!file) {
    return res.status(400).json({ message: 'Choose a PDF file to upload.' })
  }

  const originalName = String(file.originalname || 'document.pdf').split(/[\\/]/).pop().slice(0, 200)
  const hasPdfExtension = originalName.toLowerCase().endsWith('.pdf')
  const hasPdfSignature = Buffer.isBuffer(file.buffer) && file.buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  if (!hasPdfExtension || !hasPdfSignature) {
    return res.status(400).json({ message: 'The uploaded file is not a valid PDF.' })
  }

  let parser
  try {
    parser = new PDFParse({ data: file.buffer })
    const result = await parser.getText()
    const pageCount = Number(result?.total) || result?.pages?.length || 0

    if (pageCount > MAX_PDF_PAGES) {
      return res.status(413).json({ message: `This PDF has ${pageCount} pages. Please upload a PDF with ${MAX_PDF_PAGES} pages or fewer.` })
    }

    const extractedText = String(result?.text || '').replace(/\u0000/g, '').trim()
    if (!extractedText) {
      return res.status(422).json({
        message: 'No selectable text was found in this PDF. Scanned/image-only PDFs are not supported yet.',
      })
    }

    const truncated = extractedText.length > MAX_PDF_TEXT_CHARS
    const text = extractedText.slice(0, MAX_PDF_TEXT_CHARS)

    return res.status(200).json({
      attachment: {
        name: originalName,
        pageCount,
        text,
        characterCount: text.length,
        truncated,
      },
    })
  } catch (error) {
    console.error('PDF text extraction failed:', error?.message || error)
    return res.status(422).json({
      message: 'Lurph could not read this PDF. It may be damaged, password-protected, or use an unsupported format.',
    })
  } finally {
    if (parser) {
      try {
        await parser.destroy()
      } catch (error) {
        console.warn('Could not close PDF parser cleanly:', error?.message || error)
      }
    }
  }
}
