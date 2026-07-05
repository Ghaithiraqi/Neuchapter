/**
 * lib/knowledge.ts
 * البحث الدلالي في قاعدة المعرفة عبر تضمينات text-embedding-3-large وpgvector.
 * تُستخدم من API routes — لا تعدّل /api/chat مباشرة هنا.
 */

import { db } from '@/lib/db'
import OpenAI from 'openai'

export interface KnowledgeResult {
  id: string
  bookTitle: string
  unitTitle: string
  content: string
  similarity: number
}

export interface SearchOptions {
  /** عدد النتائج المُرجَعة — افتراضي 3 */
  limit?: number
  /** عتبة تشابه دنيا (0–1) — يُتجاهل ما دونها */
  minSimilarity?: number
}

/**
 * تبحث في KnowledgeChunk عن المقاطع الأقرب للاستعلام
 * بمقياس cosine عبر pgvector.
 *
 * التضمين يُولَّد بـ text-embedding-3-large / dimensions:1536
 * لمطابقة ما خُزِّن أثناء الإدخال.
 */
export async function searchKnowledge(
  query: string,
  options: SearchOptions = {}
): Promise<KnowledgeResult[]> {
  const { limit = 3, minSimilarity = 0 } = options

  // يُنشأ العميل عند الاستدعاء لضمان وجود المفتاح في process.env
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536, // نفس أبعاد الإدخال بالضبط
  })

  const vecStr = '[' + embResponse.data[0].embedding.join(',') + ']'

  // CTE لتمرير المتجه مرة واحدة وتجنّب تكرار الحساب
  const rows = await db.$queryRaw<
    Array<{
      id: string
      bookTitle: string
      unitTitle: string
      content: string
      similarity: number
    }>
  >`
    WITH query_vec AS (
      SELECT ${vecStr}::vector AS vec
    )
    SELECT
      kc.id,
      kc."bookTitle",
      kc."unitTitle",
      kc.content,
      CAST(1 - (kc.embedding <=> qv.vec) AS FLOAT8) AS similarity
    FROM "KnowledgeChunk" kc, query_vec qv
    WHERE kc.embedding IS NOT NULL
      AND CAST(1 - (kc.embedding <=> qv.vec) AS FLOAT8) >= ${minSimilarity}
    ORDER BY kc.embedding <=> qv.vec
    LIMIT ${limit}
  `

  return rows
}
