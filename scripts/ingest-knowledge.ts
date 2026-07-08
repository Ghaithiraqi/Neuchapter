/**
 * ingest-knowledge.ts
 * يقرأ ملفات knowledge/، يقطّعها بعناوين "## الوحدة"،
 * يولّد تضمينات text-embedding-3-large، ويحفظها في KnowledgeChunk بـ upsert.
 *
 * npx tsx scripts/ingest-knowledge.ts
 */

import { neon } from '@neondatabase/serverless'
import OpenAI from 'openai'
import { config } from 'dotenv'
import { resolve, join } from 'path'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

config({ path: resolve(process.cwd(), '.env.local') })

// ─── إعداد العملاء ───────────────────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL
const openaiKey   = process.env.OPENAI_API_KEY

if (!databaseUrl) throw new Error('DATABASE_URL غير موجود في .env.local')
if (!openaiKey)   throw new Error('OPENAI_API_KEY غير موجود في .env.local')

const sql    = neon(databaseUrl)
const openai = new OpenAI({ apiKey: openaiKey })

// ─── تعريف الكتب ─────────────────────────────────────────────────────────────

const BOOKS = [
  {
    slug:  'atomic_habits',
    title: 'العادات الذرية (Atomic Habits)',
    file:  'atomic_habits_kb_v2.md',
  },
  {
    slug:  'seven_habits',
    title: 'العادات السبع للناس الأكثر فعالية (The 7 Habits)',
    file:  'seven_habits_kb_v2.md',
  },
  {
    slug:  'your_brain_on_porn',
    title: 'عقلك على الإباحية (Your Brain on Porn)',
    file:  'recovery_science_kb_v2.md',
  },
] as const

// ─── التقطيع ─────────────────────────────────────────────────────────────────

interface Chunk {
  bookSlug:   string
  bookTitle:  string
  unitNumber: number
  unitTitle:  string
  content:    string
}

/** يحوّل الأرقام العربية إلى غربية: ١٢ → 12 */
function arabicToInt(s: string): number {
  const mapped = s.replace(/[٠-٩]/g, d =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  )
  return parseInt(mapped, 10)
}

function parseChunks(bookSlug: string, bookTitle: string, text: string): Chunk[] {
  // قسّم عند كل عنوان ## (مع ترك المحتوى الأول — مقدمة الملف — خارج النتائج)
  const sections = text.split(/\n(?=## )/)
  const chunks: Chunk[] = []

  for (const section of sections) {
    const firstNewline = section.indexOf('\n')
    const header  = firstNewline === -1 ? section : section.slice(0, firstNewline)
    const body    = firstNewline === -1 ? '' : section.slice(firstNewline + 1)

    if (!header.startsWith('## ')) continue

    const title   = header.replace(/^## /, '').trim()
    // أزل فواصل --- من نهاية المحتوى
    const content = body.replace(/\n---\s*$/, '').trim()

    if (!content) continue

    // وحدة عادية: "الوحدة ١ —"
    const unitMatch = title.match(/الوحدة\s+([٠-٩]+)/)
    // بطاقة مرجعية
    const isRef = title.includes('بطاقة مرجعية')

    let unitNumber: number
    if (unitMatch) {
      unitNumber = arabicToInt(unitMatch[1])
    } else if (isRef) {
      unitNumber = 99
    } else {
      continue // قسم غير معروف — تجاهَل
    }

    chunks.push({ bookSlug, bookTitle, unitNumber, unitTitle: title, content })
  }

  return chunks
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

async function main() {
  const LINE = '━'.repeat(52)
  console.log(LINE)
  console.log('  إدخال قاعدة المعرفة — جدائد')
  console.log(LINE)

  // ١. إنشاء فهرس HNSW (idempotent — آمن للتكرار)
  console.log('\n[١] فهرس HNSW...')
  await sql`
    CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_hnsw
    ON "KnowledgeChunk"
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `
  console.log('    ✓ جاهز')

  // ٢. حذف المقاطع القديمة للكتب الثلاثة
  console.log('\n[٢] حذف المقاطع القديمة...')
  const slugsToDelete = BOOKS.map(b => b.slug)
  for (const slug of slugsToDelete) {
    const deleted = await sql`
      DELETE FROM "KnowledgeChunk" WHERE "bookSlug" = ${slug}
    `
    console.log(`    حُذف: ${slug}`)
  }
  console.log('    ✓ اكتمل الحذف')

  // ٣. تقطيع الملفات
  console.log('\n[٣] تقطيع الملفات...')
  const allChunks: Chunk[] = []

  for (const book of BOOKS) {
    const filePath = join(process.cwd(), 'knowledge', book.file)
    const text     = readFileSync(filePath, 'utf-8')
    const chunks   = parseChunks(book.slug, book.title, text)
    allChunks.push(...chunks)
    console.log(`    ${book.slug}: ${chunks.length} مقطع`)
  }

  console.log(`    الإجمالي: ${allChunks.length} مقطع`)

  // ٤. توليد التضمينات (دفعة واحدة)
  console.log('\n[٤] توليد التضمينات (text-embedding-3-large)...')

  // نصّ الإدخال: عنوان الكتاب + عنوان الوحدة + المحتوى
  const inputs = allChunks.map(c =>
    `${c.bookTitle}\n${c.unitTitle}\n\n${c.content}`
  )

  // dimensions: 1536 — Matryoshka truncation (pgvector hnsw يقيّد hnsw بـ 2000 بُعد)
  // تقليص الأبعاد لا يفقد جودة النموذج — OpenAI يدعم MRL رسميًا
  const embResponse = await openai.embeddings.create({
    model:      'text-embedding-3-large',
    input:      inputs,
    dimensions: 1536,
  })

  const totalTokens = embResponse.usage.total_tokens
  const costUsd     = (totalTokens / 1_000_000) * 0.13
  console.log(`    ✓ ${allChunks.length} تضمين — ${totalTokens} رمز — $${costUsd.toFixed(6)}`)

  // ٥. INSERT في قاعدة البيانات
  console.log('\n[٥] حفظ في قاعدة البيانات...')
  const bookCounts: Record<string, number> = {}

  for (let i = 0; i < allChunks.length; i++) {
    const chunk     = allChunks[i]
    const embedding = embResponse.data[i].embedding
    // pgvector يقبل النص '[x1,x2,...]'
    const vecStr    = '[' + embedding.join(',') + ']'
    const id        = randomUUID()

    await sql`
      INSERT INTO "KnowledgeChunk"
        (id, "bookSlug", "bookTitle", "unitNumber", "unitTitle", content, embedding, "createdAt")
      VALUES
        (${id}, ${chunk.bookSlug}, ${chunk.bookTitle}, ${chunk.unitNumber},
         ${chunk.unitTitle}, ${chunk.content}, ${vecStr}::vector, NOW())
      ON CONFLICT ("bookSlug", "unitNumber")
      DO UPDATE SET
        embedding  = EXCLUDED.embedding,
        content    = EXCLUDED.content,
        "unitTitle" = EXCLUDED."unitTitle"
    `

    bookCounts[chunk.bookSlug] = (bookCounts[chunk.bookSlug] ?? 0) + 1
    process.stdout.write(`\r    ${i + 1}/${allChunks.length} مقطع`)
  }

  console.log('\n    ✓ اكتمل الحفظ')

  // ٥. ملخص
  console.log('\n' + LINE)
  console.log('  ملخص النتائج')
  console.log(LINE)

  for (const [slug, count] of Object.entries(bookCounts)) {
    console.log(`  ${slug.padEnd(24)} ${count} مقطع`)
  }

  const total = Object.values(bookCounts).reduce((a, b) => a + b, 0)
  console.log(`  ${'الإجمالي'.padEnd(24)} ${total} مقطع`)
  console.log(`  ${'التكلفة'.padEnd(24)} $${costUsd.toFixed(6)}`)
  console.log(LINE)

  // ٦. التحقق من قاعدة البيانات
  console.log('\n[٦] التحقق...')

  const stats = await sql`
    SELECT
      "bookSlug",
      COUNT(*)                                    AS total,
      COUNT(embedding)                            AS with_embedding,
      COUNT(*) FILTER (WHERE embedding IS NULL)   AS missing_embedding
    FROM "KnowledgeChunk"
    GROUP BY "bookSlug"
    ORDER BY "bookSlug"
  ` as Array<{
    bookSlug: string
    total: string
    with_embedding: string
    missing_embedding: string
  }>

  console.log('\n  الكتاب                   مقاطع   بتضمين   بدون تضمين')
  console.log('  ' + '─'.repeat(52))
  for (const row of stats) {
    console.log(
      `  ${row.bookSlug.padEnd(24)} ${String(row.total).padEnd(8)} ${String(row.with_embedding).padEnd(9)} ${row.missing_embedding}`
    )
  }

  // ٧. طباعة عناوين الوحدات للتأكيد
  const titles = await sql`
    SELECT "bookSlug", "unitNumber", "unitTitle"
    FROM "KnowledgeChunk"
    ORDER BY "bookSlug", "unitNumber"
  ` as Array<{ bookSlug: string; unitNumber: number; unitTitle: string }>

  console.log('\n  عناوين الوحدات المخزّنة:')
  let currentBook = ''
  for (const row of titles) {
    if (row.bookSlug !== currentBook) {
      currentBook = row.bookSlug
      console.log(`\n  ── ${currentBook} ──`)
    }
    console.log(`    ${String(row.unitNumber).padStart(2)}. ${row.unitTitle}`)
  }

  console.log('\n' + LINE)
  console.log('  ✓ اكتمل الإدخال بنجاح')
  console.log(LINE)
}

main().catch(e => {
  console.error('\n✗ خطأ:', e instanceof Error ? e.message : e)
  process.exit(1)
})
