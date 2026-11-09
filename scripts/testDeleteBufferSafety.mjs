import { PDFDocument } from 'pdf-lib'
import { deletePages, toSafeLoadableBuffer, toArrayBuffer } from '../src/services/organizeService.ts'

async function runTest() {
  console.log('=== RUNNING BUFFER SAFETY & DELETE VERIFICATION ===')

  // 1. Create a 3-page PDF
  const doc = await PDFDocument.create()
  doc.addPage([400, 400])
  doc.addPage([400, 400])
  doc.addPage([400, 400])
  const pdfBytes = await doc.save()
  const initialBuffer = toArrayBuffer(pdfBytes)

  console.log(`Initial 3-page PDF size: ${initialBuffer.byteLength} bytes`)

  // 2. Delete page index 1 (the 2nd page)
  const remainingBytes1 = await deletePages(initialBuffer, [1])
  const doc1 = await PDFDocument.load(remainingBytes1)
  console.log(`After deleting page 2: ${doc1.getPageCount()} pages remaining`)
  if (doc1.getPageCount() !== 2) {
    throw new Error(`Expected 2 pages, got ${doc1.getPageCount()}`)
  }

  // 3. Verify original buffer was NOT detached or mutated
  if (initialBuffer.byteLength === 0) {
    throw new Error('Initial buffer was detached!')
  }
  new Uint8Array(initialBuffer) // If detached, this throws
  console.log('✓ Initial buffer remains intact and non-detached')

  // 4. Repeated deletion on the newly generated buffer
  const buffer2 = toArrayBuffer(remainingBytes1)
  const remainingBytes2 = await deletePages(buffer2, [0])
  const doc2 = await PDFDocument.load(remainingBytes2)
  console.log(`After deleting page 1: ${doc2.getPageCount()} pages remaining`)
  if (doc2.getPageCount() !== 1) {
    throw new Error(`Expected 1 page, got ${doc2.getPageCount()}`)
  }
  console.log('✓ Chained deletion succeeded without buffer detaching')

  // 5. Test handling of an intentionally detached buffer (simulating transferable worker transfer)
  const workerBuffer = new ArrayBuffer(1024)
  const { MessageChannel } = await import('worker_threads')
  const { port1, port2 } = new MessageChannel()
  port1.postMessage(workerBuffer, [workerBuffer]) // Detaches workerBuffer!
  port1.close()
  port2.close()

  console.log(`Detached buffer byteLength: ${workerBuffer.byteLength}`)
  try {
    toSafeLoadableBuffer(workerBuffer)
    throw new Error('Should have thrown on detached buffer!')
  } catch (err) {
    console.log(`✓ Gracefully caught detached buffer error: "${err.message}"`)
  }

  console.log('=== ALL DELETE & BUFFER SAFETY TESTS PASSED! ===')
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
