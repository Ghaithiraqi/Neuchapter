/**
 * scripts/seed-tips.ts
 * يملأ جدول DailyTip بنصائح عربية أصيلة داعمة للتعافي.
 * آمن للتكرار: يتحقق من الوجود قبل الإدراج (upsert بسيط بدلالة المحتوى).
 *
 * npx tsx scripts/seed-tips.ts
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

// ─── النصائح ─────────────────────────────────────────────────────────────────
// 4 فئات: neuroscience | cbt | spiritual | practical
// مستندة لمبادئ: عقلك على الإباحية، العادات الذرية، العادات السبع

const TIPS: Array<{ content: string; source: string; category: string }> = [
  // ── neuroscience (علم الأعصاب) ────────────────────────────────────────────
  {
    content: 'كل رغبة موجة: ترتفع ١٥-٢٠ دقيقة ثم تنحسر حتمًا حتى لو لم تفعل شيئًا. ركبها — لا تقاومها.',
    source: 'Urge Surfing · عقلك على الإباحية',
    category: 'neuroscience',
  },
  {
    content: 'دماغك يعيد بناء نفسه فعليًا بعد ٩٠ يومًا من الامتناع. كل يوم تضيف طبقة جديدة من الأسلاك العصبية.',
    source: 'Neuroplasticity · عقلك على الإباحية',
    category: 'neuroscience',
  },
  {
    content: 'الإباحية تخفض حساسية مستقبلات الدوبامين. المتعة العادية تعود — لكنها تحتاج وقتًا وصبرًا.',
    source: 'Desensitization · عقلك على الإباحية',
    category: 'neuroscience',
  },
  {
    content: 'النوم قبل الحادية عشرة يرفع مستوى ضبط النفس صباحًا. إرهاق الليل بوابة رئيسية للانزلاق.',
    source: 'Matthew Walker · Why We Sleep',
    category: 'neuroscience',
  },
  {
    content: 'الدماغ في الساعة الأولى بعد الاستيقاظ أصفى ثلاث مرات. اجعل قرارك الأصعب في هذه النافذة.',
    source: 'Prefrontal Cortex · علم الأعصاب السلوكي',
    category: 'neuroscience',
  },
  {
    content: 'التحسّس العصبي يعني أن أقل المثيرات تطلق شهوة قوية. الحل ليس قوة الإرادة — بل إزالة المثير من البيئة.',
    source: 'Sensitization · عقلك على الإباحية',
    category: 'neuroscience',
  },
  {
    content: 'الرياضة ٣٠ دقيقة يوميًا ترفع الدوبامين الطبيعي وتخفف شدة الرغبة. أفضل دواء بدون وصفة.',
    source: 'Exercise Neuroscience · Andrew Huberman',
    category: 'neuroscience',
  },

  // ── cbt (العلاج المعرفي السلوكي) ─────────────────────────────────────────
  {
    content: 'حين تشعر بالرغبة، سمّها: "هذه رغبة، لست أنا." المسافة بين الشعور والفعل هي حريتك.',
    source: 'Cognitive Defusion · ACT',
    category: 'cbt',
  },
  {
    content: 'الانتكاسة ليست فشلًا — هي بيانات. سؤال واحد فقط: ما الذي سبقها؟ هذا يبني المناعة.',
    source: 'Relapse Prevention · CBT',
    category: 'cbt',
  },
  {
    content: 'دوّن ثلاثة محفزات تسبق الرغبة عادةً. إن عرفت الإشارة، كسرت الحلقة قبل أن تبدأ.',
    source: 'Habit Loop · العادات الذرية',
    category: 'cbt',
  },
  {
    content: 'حين تشعر بالرغبة، اخرج من الغرفة فورًا — حتى بدون سبب. حركة الجسم تقطع المسار العصبي.',
    source: 'Pattern Interrupt · CBT',
    category: 'cbt',
  },
  {
    content: 'ضع احتكاكًا بين نفسك والسلوك السلبي: أغلق الجهاز، أبعده، اجعل الوصول يستغرق خمس خطوات.',
    source: 'قانون الاحتكاك · العادات الذرية',
    category: 'cbt',
  },
  {
    content: 'السلوك الجيد يحتاج احتكاكًا أقل. ضع كتاب أو دفتر أو حذاء الرياضة أمامك مباشرةً — الظهور أولًا.',
    source: 'قانون السهولة · العادات الذرية',
    category: 'cbt',
  },
  {
    content: 'المزاج السيئ والوحدة والملل بوابات رئيسية. إن عرفت ذلك، تستطيع إعداد خطة لكل بوابة مسبقًا.',
    source: 'HALT Model · Recovery Psychology',
    category: 'cbt',
  },

  // ── practical (عملي) ───────────────────────────────────────────────────────
  {
    content: 'قاعدة الدقيقتين: أي عادة جديدة تبدأها، اجعلها تستغرق دقيقتين فقط. البداية هي كل شيء.',
    source: 'Two-Minute Rule · العادات الذرية',
    category: 'practical',
  },
  {
    content: 'لا تكسر السلسلة يومين متتاليين. يوم واحد خطأ — يومان بداية عادة جديدة سيئة.',
    source: 'Never Miss Twice · العادات الذرية',
    category: 'practical',
  },
  {
    content: 'الهوية تسبق السلوك. لا تقل "أحاول الإقلاع" — قل "أنا شخص لا يفعل هذا." الكلمات تبني من أنت.',
    source: 'Identity-Based Habits · العادات الذرية',
    category: 'practical',
  },
  {
    content: 'ابنِ نظامًا يوميًا واضحًا، لا هدفًا ضبابيًا. الفائز والخاسر لهما الهدف نفسه — الفرق في النظام.',
    source: 'Systems vs Goals · العادات الذرية',
    category: 'practical',
  },
  {
    content: 'تواصل مع شخص واحد اليوم — رسالة، مكالمة، لقاء. العزلة تغذي الإدمان. الاتصال يشفيه.',
    source: 'Connection is the Opposite of Addiction · Johann Hari',
    category: 'practical',
  },
  {
    content: 'دوّن ثلاثة أشياء جيدة حدثت اليوم — حتى صغيرة. هذا يعيد ضبط ما يبحث عنه دماغك كمكافأة.',
    source: 'Gratitude Practice · Positive Psychology',
    category: 'practical',
  },
  {
    content: 'ضع خطة طوارئ مسبقة: "إن حدث X، سأفعل Y." الدماغ يتبع الخطة المحضّرة أسرع من القرار اللحظي.',
    source: 'Implementation Intention · CBT',
    category: 'practical',
  },
  {
    content: 'قبل النوم، حدّد ثلاثة أولويات غدًا. الوضوح يقلل من القرارات المُجهِدة التي تفتح باب الإرادة الضعيفة.',
    source: 'العادة الثالثة · العادات السبع',
    category: 'practical',
  },

  // ── spiritual (روحي / معنوي) ──────────────────────────────────────────────
  {
    content: 'ما بين المثير والاستجابة مساحة. في تلك المساحة تكمن حريتك وقدرتك على الاختيار.',
    source: 'Viktor Frankl · العادة الأولى',
    category: 'spiritual',
  },
  {
    content: 'كل يوم تقاوم فيه هو تصويت لهوية الشخص الذي تريد أن تصبح. الهوية تُبنى بالتراكم.',
    source: 'Identity Voting · العادات الذرية',
    category: 'spiritual',
  },
  {
    content: 'الرحلة ليست خطًا مستقيمًا. الانتكاسة جزء من التعافي — ما يهم هو كم تنتظر قبل أن تقوم.',
    source: 'Recovery Paradox · علم نفس التعافي',
    category: 'spiritual',
  },
]

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────

async function main() {
  const LINE = '━'.repeat(52)
  console.log('\n' + LINE)
  console.log('  بذر النصائح اليومية — جدائد')
  console.log(LINE)

  // تحقق من الموجود حاليًا
  const existing = await sql`SELECT COUNT(*) AS cnt FROM "DailyTip"` as Array<{ cnt: string }>
  const currentCount = parseInt(existing[0].cnt, 10)
  console.log(`\n[١] الموجود حاليًا: ${currentCount} نصيحة`)

  if (currentCount >= TIPS.length) {
    console.log(`    ✓ الجدول ممتلئ بالفعل — لا حاجة للبذر`)
    console.log(LINE + '\n')
    return
  }

  // أدرج النصائح الجديدة فقط (بدلالة المحتوى)
  const existingContents = await sql`SELECT content FROM "DailyTip"` as Array<{ content: string }>
  const existingSet = new Set(existingContents.map(r => r.content.trim()))

  const toInsert = TIPS.filter(t => !existingSet.has(t.content.trim()))
  console.log(`[٢] تُضاف: ${toInsert.length} نصيحة جديدة`)

  for (const tip of toInsert) {
    await sql`
      INSERT INTO "DailyTip" (content, source, category)
      VALUES (${tip.content}, ${tip.source}, ${tip.category})
    `
    process.stdout.write('.')
  }

  console.log('\n')

  // إحصاء بعد الإدراج
  const stats = await sql`
    SELECT category, COUNT(*) AS cnt
    FROM "DailyTip"
    GROUP BY category
    ORDER BY category
  ` as Array<{ category: string; cnt: string }>

  console.log('[٣] الإحصاء النهائي:')
  let total = 0
  for (const row of stats) {
    console.log(`    ${row.category.padEnd(16)} ${row.cnt} نصيحة`)
    total += parseInt(row.cnt, 10)
  }
  console.log(`    ${'الإجمالي'.padEnd(16)} ${total} نصيحة`)

  // اختبار: تحقق أن منطق /api/tip سيجد نصيحة غير مشاهَدة
  const unseen = await sql`SELECT COUNT(*) AS cnt FROM "DailyTip" WHERE "shownAt" IS NULL` as Array<{ cnt: string }>
  console.log(`\n[٤] غير مشاهَدة (متاحة للعرض): ${unseen[0].cnt} نصيحة`)

  console.log('\n' + LINE)
  console.log('  ✓ اكتمل البذر بنجاح')
  console.log(LINE + '\n')
}

main().catch(e => {
  console.error('\n✗ خطأ:', e instanceof Error ? e.message : e)
  process.exit(1)
})
