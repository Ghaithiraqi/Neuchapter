/**
 * scripts/test-search.ts
 * اختبار دالة البحث الدلالي على 10 استعلامات عربية متنوّعة.
 * يُشغَّل بمعزل عن /api/chat تمامًا.
 *
 * npx tsx scripts/test-search.ts
 */

import { neon } from '@neondatabase/serverless'
import OpenAI from 'openai'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const databaseUrl = process.env.DATABASE_URL
const openaiKey   = process.env.OPENAI_API_KEY

if (!databaseUrl) throw new Error('DATABASE_URL غير موجود في .env.local')
if (!openaiKey)   throw new Error('OPENAI_API_KEY غير موجود في .env.local')

const sql    = neon(databaseUrl)
const openai = new OpenAI({ apiKey: openaiKey })

// ─── الاستعلامات ──────────────────────────────────────────────────────────────

/**
 * 10 استعلامات:
 *  - 3 تخصّ "عقلك على الإباحية"
 *  - 3 تخصّ "العادات الذرية"
 *  - 2 تخصّ "العادات السبع"
 *  - 1 مختلطة بين الكتب
 *  - 1 لا علاقة لها بأي كتاب (اختبار عتبة القطع)
 */
const QUERIES = [
  // ── عقلك على الإباحية ──
  'كيف أوقف رغبة قوية في اللحظة؟',
  'لماذا أفقد المتعة في الأشياء العادية؟',
  'أشعر بالوحدة وهذا يدفعني للانتكاس',
  // ── العادات الذرية ──
  'كيف أبني عادة جديدة تستمر؟',
  'ما الفرق بين الهدف والنظام؟',
  'كيف أجعل العادة السيئة صعبة التنفيذ؟',
  // ── العادات السبع ──
  'كيف أحدّد ما هو مهم فعلًا في حياتي؟',
  'كيف أتعامل مع شخص لا يفهمني؟',
  // ── مختلطة (تعافٍ + عادات) ──
  'هل الانتكاسة تعني أن كل شيء انتهى؟',
  // ── خارج نطاق الكتب الثلاثة (اختبار عتبة) ──
  'ما هي أفضل وصفة لطبخ الرز البسمتي؟',
] as const

// ─── دالة البحث (تعكس منطق lib/knowledge.ts بالضبط) ─────────────────────────

interface SearchResult {
  bookTitle: string
  unitTitle: string
  content: string
  similarity: number
}

async function search(query: string, limit = 3): Promise<SearchResult[]> {
  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536,
  })

  const vecStr = '[' + embResponse.data[0].embedding.join(',') + ']'

  const rows = await sql`
    WITH query_vec AS (
      SELECT ${vecStr}::vector AS vec
    )
    SELECT
      kc."bookTitle",
      kc."unitTitle",
      kc.content,
      CAST(1 - (kc.embedding <=> qv.vec) AS FLOAT8) AS similarity
    FROM "KnowledgeChunk" kc, query_vec qv
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> qv.vec
    LIMIT ${limit}
  ` as SearchResult[]

  return rows
}

// ─── التنسيق ─────────────────────────────────────────────────────────────────

function firstLine(content: string): string {
  return content.split('\n').find(l => l.trim()) ?? ''
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

const LINE  = '═'.repeat(80)
const DLINE = '─'.repeat(80)

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + LINE)
  console.log('  اختبار البحث الدلالي — جدائد')
  console.log(LINE + '\n')

  const summaryRows: Array<{ query: string; top: number; bottom: number }> = []

  for (let i = 0; i < QUERIES.length; i++) {
    const query = QUERIES[i]
    console.log(`[${i + 1}/${QUERIES.length}] ${query}`)

    const results = await search(query, 3)

    if (results.length === 0) {
      console.log('  ⚠ لا نتائج\n')
      continue
    }

    for (let r = 0; r < results.length; r++) {
      const { bookTitle, unitTitle, content, similarity } = results[r]
      const score = typeof similarity === 'number' ? similarity : parseFloat(String(similarity))
      const preview = truncate(firstLine(content), 72)
      console.log(`  ${r + 1}. [${score.toFixed(4)}] ${truncate(bookTitle, 24)} — ${truncate(unitTitle, 28)}`)
      console.log(`       ${preview}`)
    }

    const scores = results.map(r =>
      typeof r.similarity === 'number' ? r.similarity : parseFloat(String(r.similarity))
    )
    summaryRows.push({ query, top: scores[0], bottom: scores[scores.length - 1] })

    console.log(DLINE + '\n')
  }

  // ─── جدول الملخص ─────────────────────────────────────────────────────────

  console.log(LINE)
  console.log('  ملخص درجات التشابه')
  console.log(LINE)
  console.log('  #  أعلى درجة  أدنى درجة  الاستعلام')
  console.log('  ' + '─'.repeat(76))

  for (let i = 0; i < summaryRows.length; i++) {
    const { query, top, bottom } = summaryRows[i]
    const idx   = String(i + 1).padStart(2)
    const topS  = top.toFixed(4).padStart(10)
    const botS  = bottom.toFixed(4).padStart(11)
    console.log(`  ${idx} ${topS} ${botS}  ${truncate(query, 44)}`)
  }

  console.log(LINE)

  // ─── تحليل العتبة ────────────────────────────────────────────────────────

  const related    = summaryRows.slice(0, 9)
  const unrelated  = summaryRows[9]

  const avgRelated   = related.reduce((s, r) => s + r.top, 0) / related.length
  const topUnrelated = unrelated?.top ?? 0

  console.log('\n  التحليل:')
  console.log(`  • متوسط أعلى درجة للأسئلة المتعلّقة : ${avgRelated.toFixed(4)}`)
  console.log(`  • أعلى درجة للسؤال غير المتعلّق    : ${topUnrelated.toFixed(4)}`)

  const gap = avgRelated - topUnrelated
  const recommended = (topUnrelated + gap * 0.4).toFixed(3)

  console.log(`  • الفجوة                            : ${gap.toFixed(4)}`)
  console.log(`\n  ▶ عتبة التشابه الموصى بها : ${recommended}`)
  console.log('    (= أعلى درجة غير المتعلّق + 40% من الفجوة)')
  console.log(LINE + '\n')
}

main().catch(e => {
  console.error('\n✗ خطأ:', e instanceof Error ? e.message : e)
  process.exit(1)
})
