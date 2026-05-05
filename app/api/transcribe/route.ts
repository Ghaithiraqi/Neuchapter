import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { toFile } from 'openai/uploads';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = await toFile(buffer, 'recording.webm', { type: audioFile.type });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ar',
      response_format: 'json',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
