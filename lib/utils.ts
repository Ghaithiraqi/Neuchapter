export function calculateCost(model: string, usage: { input_tokens: number; output_tokens: number }): number {
  // تقريبي - الأسعار بالدولار لكل مليون token
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-6': { input: 3, output: 15 },
    'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25 },
  };

  const p = pricing[model] ?? { input: 3, output: 15 };
  return (usage.input_tokens / 1_000_000) * p.input + (usage.output_tokens / 1_000_000) * p.output;
}

export function toArabicNumerals(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

/** Display a number using Western/English digits (0-9) regardless of locale. */
export function toEnglishNumerals(n: number | string): string {
  return n.toString().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function getGreeting(hour: number): string {
  if (hour < 12) return 'صباح هادئ';
  if (hour < 17) return 'مساء النور';
  if (hour < 21) return 'مساء الخير';
  return 'ليلة طيبة';
}

export function formatArabicDate(date: Date): string {
  return date.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
