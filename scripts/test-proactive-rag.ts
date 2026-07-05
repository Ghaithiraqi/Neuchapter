/**
 * scripts/test-proactive-rag.ts
 * اختبار منطق RAG الاستباقي — يعكس app/api/chat/route.ts بالضبط.
 * يتجنّب استدعاء السيرفر ويعمل مباشرة مع neon + openai.
 *
 * npx tsx scripts/test-proactive-rag.ts
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

// ─── نسخة مباشرة من searchKnowledge في lib/knowledge.ts ─────────────────────

interface KnowledgeResult {
  id: string
  bookSlug: string
  bookTitle: string
  unitNumber: number
  unitTitle: string
  content: string
  similarity: number
}

async function searchKnowledge(
  query: string,
  opts: { minSimilarity?: number; limit?: number } = {}
): Promise<KnowledgeResult[]> {
  const { limit = 3, minSimilarity = 0 } = opts

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
      kc.id,
      kc."bookSlug",
      kc."bookTitle",
      kc."unitNumber",
      kc."unitTitle",
      kc.content,
      CAST(1 - (kc.embedding <=> qv.vec) AS FLOAT8) AS similarity
    FROM "KnowledgeChunk" kc, query_vec qv
    WHERE kc.embedding IS NOT NULL
      AND CAST(1 - (kc.embedding <=> qv.vec) AS FLOAT8) >= ${minSimilarity}
    ORDER BY kc.embedding <=> qv.vec
    LIMIT ${limit}
  ` as KnowledgeResult[]

  return rows
}

// ─── نسخة مباشرة من المنطق الاستباقي في route.ts ────────────────────────────

const PROACTIVE_MODES = new Set(['reflect', 'analyze', 'motivate'])

async function runProactiveLogic(opts: {
  message: string
  mode?: string
  triggers: string[]
}): Promise<{
  proactiveActivated: boolean
  allKnowledgeResults: KnowledgeResult[]
  source: 'message' | 'proactive' | 'none'
}> {
  const { message, mode, triggers } = opts

  // بحث الرسالة (مطابق للـ Promise.all في route.ts)
  const knowledgeResults = await searchKnowledge(message, {
    minSimilarity: 0.27,
    limit: 2,
  }).catch(() => [] as KnowledgeResult[])

  const modeAllowed = typeof mode === 'string' && PROACTIVE_MODES.has(mode)

  let allKnowledgeResults = knowledgeResults
  let proactiveActivated = false

  if (knowledgeResults.length === 0 && modeAllowed && triggers.length > 0) {
    proactiveActivated = true
    const triggerQuery = `أشعر بـ ${triggers.join(' و')} وأحتاج طرقًا للتعامل مع هذه المحفّزات`
    const proactive = await searchKnowledge(triggerQuery, {
      minSimilarity: 0.32,
      limit: 2,
    }).catch(() => [] as KnowledgeResult[])
    const seenIds = new Set(knowledgeResults.map((r) => r.id))
    const fresh = proactive.filter((r) => !seenIds.has(r.id))
    allKnowledgeResults = [...knowledgeResults, ...fresh].slice(0, 2)
  }

  const source =
    allKnowledgeResults.length === 0
      ? 'none'
      : proactiveActivated
      ? 'proactive'
      : 'message'

  return { proactiveActivated, allKnowledgeResults, source }
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

const LINE  = '═'.repeat(72)
const DLINE = '─'.repeat(72)

async function main() {
  console.log('\n' + LINE)
  console.log('  اختبار RAG الاستباقي — جددني')
  console.log(LINE + '\n')

  // ── 1. قراءة profileSummary الحالي ──────────────────────────────────────────
  const settings = await sql`
    SELECT "profileSummary" FROM "UserSettings" WHERE id = 1 LIMIT 1
  ` as Array<{ profileSummary: string | null }>

  const currentProfile = settings[0]?.profileSummary ?? null
  console.log('الملف الشخصي الحالي في DB:')
  console.log(currentProfile ? currentProfile.slice(0, 300) : '  [فارغ أو null]')
  console.log()

  // ── 2. استخراج المحفّزات أو حقن تجريبي ─────────────────────────────────────
  let triggers: string[] = []
  let injected = false

  try {
    const parsed = JSON.parse(currentProfile ?? '{}')
    triggers = Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : []
  } catch { /* silent */ }

  if (triggers.length === 0) {
    console.log('⚠ لا محفّزات في الملف → حقن قيم تجريبية مؤقتة للاختبار')
    triggers = ['الوحدة', 'السهر المتأخر', 'الملل']
    injected = true

    const testProfile = JSON.stringify({
      triggers,
      copingWorks: ['المشي', 'الاتصال بصديق'],
      patterns: ['الانتكاس عادةً يكون ليلًا'],
      goals: ['٩٠ يوم نظيف'],
      tone: 'هادئ ومحفّز',
    })

    await sql`
      UPDATE "UserSettings"
      SET "profileSummary" = ${testProfile}
      WHERE id = 1
    `
    console.log(`  المحفّزات المحقونة: ${triggers.join('، ')}`)
  } else {
    console.log(`المحفّزات المستخرجة من DB: ${triggers.join('، ')}`)
  }

  console.log('\n' + LINE)

  // ─── السيناريوهات الأربعة ────────────────────────────────────────────────────

  const scenarios: Array<{
    label: string
    message: string
    mode?: string
    expect: string
  }> = [
    {
      label: 'س١ — رسالة محدّدة (بلا mode)',
      message: 'كيف أوقف رغبة قوية؟',
      mode: undefined,
      expect: 'بحث الرسالة يجد نتائج → لا استباقي',
    },
    {
      label: 'س٢ — رسالة عامة غامضة (بلا mode)',
      message: 'أنا مهموم اليوم وما أعرف ليش',
      mode: undefined,
      expect: 'بحث الرسالة فارغ → استباقي يُفعّل',
    },
    {
      label: 'س٣ — نفس الرسالة العامة (mode = support)',
      message: 'أنا مهموم اليوم وما أعرف ليش',
      mode: 'support',
      expect: 'بوابة الوضع تمنع الاستباقي → لا شيء',
    },
    {
      label: 'س٤ — رسالة بعيدة عن التعافي (بلا mode)',
      message: 'اشرح لي خوارزمية الترتيب',
      mode: undefined,
      expect: 'بوابة الوضع تمنع (لا mode صريح) → لا استباقي',
    },
    {
      label: 'س٥ — رسالة عامة غامضة (mode = reflect)',
      message: 'أنا مهموم اليوم وما أعرف ليش',
      mode: 'reflect',
      expect: 'وضع تأمّلي صريح → استباقي يُفعّل ويجلب محتوى المحفّزات',
    },
  ]

  const tableRows: Array<{
    label: string
    proactive: string
    count: string
    source: string
    chunks: string
  }> = []

  for (const sc of scenarios) {
    console.log(`\n${sc.label}`)
    console.log(`  الرسالة : "${sc.message}"`)
    console.log(`  الوضع   : ${sc.mode ?? 'undefined (general)'}`)
    console.log(`  المتوقّع: ${sc.expect}`)
    console.log(DLINE)

    const result = await runProactiveLogic({
      message: sc.message,
      mode: sc.mode,
      triggers,
    })

    const { proactiveActivated, allKnowledgeResults, source } = result

    console.log(`  الاستباقي فُعِّل : ${proactiveActivated ? '✅ نعم' : '❌ لا'}`)
    console.log(`  عدد المقاطع     : ${allKnowledgeResults.length}`)
    console.log(`  مصدر النتائج    : ${source === 'message' ? '📨 رسالة' : source === 'proactive' ? '🧠 محفّزات' : '—'}`)

    for (let i = 0; i < allKnowledgeResults.length; i++) {
      const r = allKnowledgeResults[i]
      const sim = typeof r.similarity === 'number' ? r.similarity : parseFloat(String(r.similarity))
      console.log(`    [${i + 1}] [${sim.toFixed(4)}] ${r.bookTitle} — ${r.unitTitle}`)
    }

    tableRows.push({
      label: sc.label,
      proactive: proactiveActivated ? 'نعم ✅' : 'لا ❌',
      count: String(allKnowledgeResults.length),
      source: source === 'message' ? 'رسالة 📨' : source === 'proactive' ? 'محفّزات 🧠' : '—',
      chunks: allKnowledgeResults
        .map((r) => r.unitTitle.slice(0, 20))
        .join(' | ') || '—',
    })
  }

  // ─── جدول الملخص ─────────────────────────────────────────────────────────────

  console.log('\n\n' + LINE)
  console.log('  ملخّص النتائج')
  console.log(LINE)
  console.log('  السيناريو                              | استباقي | مقاطع | مصدر')
  console.log('  ' + '─'.repeat(68))
  for (const row of tableRows) {
    const lbl = row.label.padEnd(38)
    console.log(`  ${lbl} | ${row.proactive.padEnd(7)} | ${row.count.padEnd(5)} | ${row.source}`)
  }
  console.log(LINE)

  // ─── استعادة الملف الأصلي إن كان الحقن تجريبيًا ─────────────────────────────

  if (injected) {
    console.log('\n⚠ تم حقن profileSummary تجريبيًا أثناء الاختبار.')
    console.log('  هل تريد إبقاءه أم إعادة القيمة الأصلية؟')
    console.log('  الأصلي: ' + (currentProfile ?? '[null]').slice(0, 120))
    console.log()
    console.log('  لإعادة القيمة الأصلية شغّل:')
    if (currentProfile === null) {
      console.log('  UPDATE "UserSettings" SET "profileSummary" = NULL WHERE id = 1;')
    } else {
      console.log(`  npx tsx scripts/restore-profile.ts`)
    }
    console.log()
    console.log('  القيمة التجريبية ستُستبدل تلقائيًا بأول محادثة تُكمل ٥ أدوار.')
  } else {
    console.log('\n✓ لم يُعدَّل profileSummary — لا حاجة لاستعادة.')
  }

  console.log(LINE + '\n')
}

main().catch((e) => {
  console.error('\n✗ خطأ:', e instanceof Error ? e.message : e)
  process.exit(1)
})
