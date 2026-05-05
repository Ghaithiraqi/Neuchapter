'use client';

import { useState, useRef } from 'react';

export type VoiceRecorderStatus = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceRecorderOptions {
  onTranscript: (text: string) => void;
}

export function useVoiceRecorder({ onTranscript }: UseVoiceRecorderOptions) {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setStatus('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          if (!res.ok) {
            setErrorMessage(
              !navigator.onLine ? 'تحقق من الاتصال' : 'تعذر فهم الصوت، حاول مرة أخرى'
            );
            setStatus('error');
            return;
          }
          const { text } = await res.json();
          if (text) onTranscript(text);
          setStatus('idle');
        } catch {
          setErrorMessage(
            !navigator.onLine ? 'تحقق من الاتصال' : 'تعذر فهم الصوت، حاول مرة أخرى'
          );
          setStatus('error');
        } finally {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setErrorMessage(isDenied ? 'تأكد من السماح للميكروفون' : 'تعذر الوصول للميكروفون');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggle = () => {
    if (status === 'recording') stopRecording();
    else if (status === 'idle' || status === 'error') {
      setStatus('idle');
      startRecording();
    }
  };

  const reset = () => {
    setStatus('idle');
    setErrorMessage(null);
  };

  return {
    status,
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    errorMessage,
    toggle,
    startRecording,
    stopRecording,
    reset,
  };
}
