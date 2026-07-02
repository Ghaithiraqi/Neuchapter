export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { calculateCost } from '@/lib/utils';
import { getCurrentMilestone } from '@/lib/milestones';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function buildBasePrompt(userName: string, profileSummary?: string | null): string {
  const base = `أنت مساعد ذكي وصديق صادق لشخص اسمه ${userName} في رحلة تعافيه من الإدمان على المواد الإباحية.
قواعد أساسية:
١. الصراحة أهم من الإرضاء. لا تتملق.
٢. عند علامات اكتئاب شديد أو أفكار إيذاء، وجّهه لمصدر بشري.
٣. تجنب اللغة الواعظة أو الدينية ما لم يبدأ هو.
٤. التعافي ليس خطاً مستقيماً — الانتكاسات جزء من الرحلة.
٥. اللهجة: عربي فصيح ودود، ليس رسمياً مبالغاً.`;
  if (profileSummary && profileSummary.trim()) {
    return base + `\n[ملف شخصي متراكم — استخدمه كسياق خلفي فقط، لا تذكره صراحةً للمستخدم]:\n${profileSummary}`;
  }
  return base;
}

async function updateUserProfile(sessionId: number): Promise<void> {
  try {
    // Cooldown check: skip if updated within last 30 minutes
    const settings = await db.userSettings.findUnique({
      where: { id: 1 },
      select: { profileSummary: true, profileUpdatedAt: true },
    });
    if (
      settings?.profileUpdatedAt &&
      Date.now() - settings.profileUpdatedAt.getTime() < 30 * 60 * 1000
    ) return;

    // Fetch last 10 messages from this session
    const recentMessages = await db.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });
    if (recentMessages.length === 0) return;

    const messagesText = recentMessages
      .reverse()
      .map((m) => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.content.slice(0, 300)}`)
      .join('\n');

    const currentProfile = settings?.profileSummary ?? 'لا يوجد ملف سابق';

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `أنت محلل سلوكي. مهمتك استخراج معلومات موضوعية وواقعية فقط.

توجيه صارم: استخرج وقائع وأنماطًا فقط. ممنوع منعًا باتًا إصدار أي أحكام أو تقييمات سلبية عن المستخدم. صف ما يحدث فقط، لا تحكم على شخصيته أو قيمته.

الملف الحالي:
${currentProfile}

آخر رسائل المحادثة:
${messagesText}

أعد توليد الملف كاملاً (ليس تحديثًا جزئيًا) بصيغة JSON فقط:
{"triggers":["..."],"copingWorks":["..."],"patterns":["..."],"goals":["..."],"tone":"..."}

القواعد:
- كل النصوص بالعربية
- triggers: المحفزات الموثقة (أسباب الوقوع في الإغراء)
- copingWorks: أساليب المقاومة التي أثبتت نجاعتها
- patterns: أنماط سلوكية موثقة (وقائع، لا أحكام)
- goals: الأهداف التي ذكرها المستخدم
- tone: نبرة التواصل المفضلة لديه
- إن لم تجد معلومات كافية لمفتاح، اجعله مصفوفة فارغة أو نص فارغ
- أرجع JSON صالح فقط، بلا نص خارجه`,
        },
      ],
    });

    const text = res.content[0].type === 'text' ? res.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return;

    JSON.parse(match[0]); // validate — throws if invalid

    await db.userSettings.upsert({
      where: { id: 1 },
      create: { id: 1, profileSummary: match[0], profileUpdatedAt: new Date() },
      update: { profileSummary: match[0], profileUpdatedAt: new Date() },
    });
  } catch (err) {
    console.error('Profile update error (silent):', err);
  }
}

async function getSuggestions(userMsg: string, aiResponse: string): Promise<string[]> {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `المستخدم قال: "${userMsg.slice(0, 200)}"\nكلود رد: "${aiResponse.slice(0, 300)}"\nاقترح ٣ ردود قصيرة جداً (٣-٦ كلمات) يمكن للمستخدم قولها. أرجع JSON فقط: {"suggestions":["...","...","..."]}`,
        },
      ],
    });
    const text = res.content[0].type === 'text' ? res.content[0].text : '{"suggestions":[]}';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return (parsed.suggestions ?? []).slice(0, 3) as string[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode, modePrompt, sessionId, message } = body as {
      mode?: string;
      modePrompt?: string;
      sessionId?: number | null;
      message: string;
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message' }), { status: 400 });
    }

    // ─── تحميل سياق المستخدم بالتوازي ──────────────────────────────────────
    const [activeStreak, journals, urgesCount, userSettings] = await Promise.all([
      db.streak.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
      db.journalEntry.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { content: true, mood: true, createdAt: true },
      }),
      db.urgeLog.count({
        where: { timestamp: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      db.userSettings.findUnique({ where: { id: 1 }, select: { name: true, profileSummary: true } }),
    ]);

    const userName = userSettings?.name?.trim() || 'غيث';

    // احتساب أيام الـ streak
    let streakDays = 0;
    let milestoneName = '';
    if (activeStreak) {
      const now = new Date();
      const startMs = Date.UTC(
        activeStreak.startDate.getUTCFullYear(),
        activeStreak.startDate.getUTCMonth(),
        activeStreak.startDate.getUTCDate(),
      );
      const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      streakDays = Math.floor((nowMs - startMs) / 86_400_000) + 1;
      milestoneName = getCurrentMilestone(streakDays)?.name ?? '';
    }

    const moodEntries = journals.filter((j) => j.mood != null);
    const moodAvg =
      moodEntries.length > 0
        ? (moodEntries.reduce((s, j) => s + (j.mood ?? 0), 0) / moodEntries.length).toFixed(1)
        : null;
    const lastJournal = journals[0];

    const contextBlock =
      streakDays > 0
        ? `\n[سياق المستخدم — استخدمه بحكمة، لا تذكره صراحةً إلا لو طلب السياق]:
- اليوم الـ ${streakDays} في رحلة التعافي${milestoneName ? ` (${milestoneName})` : ''}
${moodAvg ? `- متوسط مزاجه هذا الأسبوع: ${moodAvg}/٧` : ''}
${lastJournal ? `- آخر مذكرة (${new Date(lastJournal.createdAt).toLocaleDateString('ar')}): "${lastJournal.content.slice(0, 100)}..."` : ''}
- عدد اللحظات الصعبة هذا الأسبوع: ${urgesCount}`
        : '';

    const systemPrompt = [modePrompt || buildBasePrompt(userName, userSettings?.profileSummary), contextBlock].filter(Boolean).join('\n');

    // ─── الجلسة ──────────────────────────────────────────────────────────────
    let session;
    if (sessionId) {
      session = await db.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
      }
    } else {
      session = await db.chatSession.create({
        data: { mode: mode ?? 'support' },
        include: { messages: true },
      });
    }

    const history: Array<{ role: 'user' | 'assistant'; content: string }> = session.messages.map(
      (m) => ({ role: m.role as 'user' | 'assistant', content: m.content }),
    );
    history.push({ role: 'user', content: message });

    const currentSessionId = session.id;

    // ─── ReadableStream (Streaming) ───────────────────────────────────────────
    const readable = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        let fullText = '';

        const send = (obj: object) =>
          controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'));

        try {
          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            system: systemPrompt,
            messages: history,
          });

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              fullText += event.delta.text;
              send({ type: 'delta', text: event.delta.text });
            }
          }

          const finalMsg = await stream.finalMessage();

          // حفظ الرسائل + توليد الاقتراحات بالتوازي
          const [, suggestions] = await Promise.all([
            db.chatMessage
              .createMany({
                data: [
                  { sessionId: currentSessionId, role: 'user', content: message },
                  {
                    sessionId: currentSessionId,
                    role: 'assistant',
                    content: fullText,
                    model: 'claude-sonnet-4-6',
                    tokens: finalMsg.usage.output_tokens,
                  },
                ],
              })
              .then(() =>
                db.usageLog.create({
                  data: {
                    model: 'claude-sonnet-4-6',
                    inputTokens: finalMsg.usage.input_tokens,
                    outputTokens: finalMsg.usage.output_tokens,
                    estimatedCost: calculateCost('claude-sonnet-4-6', {
                      input_tokens: finalMsg.usage.input_tokens,
                      output_tokens: finalMsg.usage.output_tokens,
                    }),
                  },
                }),
              ),
            getSuggestions(message, fullText),
          ]);

          send({ type: 'done', sessionId: currentSessionId, suggestions });

          // Count AI turns in this session
          const aiTurnCount = await db.chatMessage.count({
            where: { sessionId: currentSessionId, role: 'assistant' },
          });
          if (aiTurnCount > 0 && aiTurnCount % 5 === 0) {
            updateUserProfile(currentSessionId).catch(console.error);
          }
        } catch (err) {
          console.error('Stream error:', err);
          send({ type: 'error', message: 'حدث خطأ أثناء الاتصال' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('Chat POST error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
