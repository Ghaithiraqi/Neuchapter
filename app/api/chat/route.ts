import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { CHAT_SYSTEM_PROMPT } from '@/lib/prompts/chat';
import { SOS_SYSTEM_PROMPT } from '@/lib/prompts/sos';
import { JOURNAL_SYSTEM_PROMPT } from '@/lib/prompts/journal';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { calculateCost } from '@/lib/utils';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { mode, sessionId, message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const systemPrompt =
      mode === 'sos'
        ? SOS_SYSTEM_PROMPT
        : mode === 'journal'
          ? JOURNAL_SYSTEM_PROMPT
          : CHAT_SYSTEM_PROMPT;

    const model =
      mode === 'sos' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

    let session;
    if (sessionId) {
      session = await db.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    } else {
      session = await db.chatSession.create({
        data: { mode: mode ?? 'general' },
        include: { messages: true },
      });
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
      session.messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    messages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model,
      max_tokens: mode === 'sos' ? 200 : 800,
      system: systemPrompt,
      messages,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    await db.chatMessage.createMany({
      data: [
        { sessionId: session.id, role: 'user', content: message },
        {
          sessionId: session.id,
          role: 'assistant',
          content: assistantMessage,
          model,
          tokens: response.usage.output_tokens,
        },
      ],
    });

    await db.usageLog.create({
      data: {
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        estimatedCost: calculateCost(model, response.usage),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      message: assistantMessage,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
