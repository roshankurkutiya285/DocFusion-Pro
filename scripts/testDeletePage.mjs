import { PDFDocument } from 'pdf-lib'

async function test() {
  const doc = await PDFDocument.create()
  doc.addPage([400, 400])
  doc.addPage([400, 400])
  doc.addPage([400, 400])
  const buffer = await doc.save()

  console.log('Original page count:', doc.getPageCount())

  // Test 1: removePage
  const doc1 = await PDFDocument.load(buffer, { ignoreEncryption: true })
  doc1.removePage(1)
  const bytes1 = await doc1.save()
  const doc1Reload = await PDFDocument.load(bytes1)
  console.log('After removePage, reloaded count:', doc1Reload.getPageCount())

  // Test 2: copyPages approach
  const doc2 = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const newDoc = await PDFDocument.create()
  const keep = [0, 2]
  const copied = await newDoc.copyPages(doc2, keep)
  for (const p of copied) newDoc.addPage(p)
  const bytes2 = await newDoc.save()
  const doc2Reload = await PDFDocument.load(bytes2)
  console.log('After copyPages, reloaded count:', doc2Reload.getPageCount())
}

test().catch(console.error)
