import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const DEFAULT_TIPS = [
  {
    content: 'الدماغ في الصباح أصفى ٣ مرات. اجعل أصعب قرار اليوم في أول ساعتين بعد الاستيقاظ.',
    source: 'مبدأ CBT · علم الأعصاب السلوكي',
    category: 'neuroscience',
  },
  {
    content: 'كل رغبة موجة. أقصى شدة لها بين ١٥-٢٠ دقيقة ثم تنحسر — حتى لو لم تفعل شيئاً.',
    source: 'Urge Surfing · DBT',
    category: 'cbt',
  },
  {
    content: 'النوم قبل ١١ مساءً يرفع مستوى التحكم بالدوبامين صباحاً بنسبة ٤٠٪.',
    source: 'Matthew Walker · علم النوم',
    category: 'neuroscience',
  },
  {
    content: 'سجّل ثلاثة أشياء جيدة حدثت اليوم — حتى صغيرة. هذا يعيد برمجة دائرة المكافأة.',
    source: 'Gratitude Practice · إيجابية علم النفس',
    category: 'practical',
  },
  {
    content: 'حين تشعر بالرغبة، الخروج من الغرفة فوراً يقطع الحلقة السلوكية قبل أن تتصاعد.',
    source: 'Habit Loop Theory · Charles Duhigg',
    category: 'cbt',
  },
];

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // حاول جلب نصيحة من قاعدة البيانات
    let tip = await db.dailyTip.findFirst({
      where: { shownAt: null },
      orderBy: { id: 'asc' },
    });

    // إن استُنفدت كل النصائح، أعِد ضبطها لتدور من البداية
    if (!tip) {
      const total = await db.dailyTip.count();
      if (total > 0) {
        await db.dailyTip.updateMany({ data: { shownAt: null } });
        tip = await db.dailyTip.findFirst({
          where: { shownAt: null },
          orderBy: { id: 'asc' },
        });
      }
    }

    if (tip) {
      await db.dailyTip.update({
        where: { id: tip.id },
        data: { shownAt: new Date() },
      });
      return NextResponse.json({ tip });
    }

    // رجّع نصيحة عشوائية من القائمة الافتراضية (fallback نهائي)
    const random = DEFAULT_TIPS[Math.floor(Math.random() * DEFAULT_TIPS.length)];
    return NextResponse.json({ tip: random });
  } catch (err) {
    console.error('Tip error:', err);
    const random = DEFAULT_TIPS[0];
    return NextResponse.json({ tip: random });
  }
}
