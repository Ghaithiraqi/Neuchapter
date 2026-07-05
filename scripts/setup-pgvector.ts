/**
 * setup-pgvector.ts
 * تفعيل إضافة pgvector على Neon والتحقق من تثبيتها
 * يُشغَّل مرة واحدة قبل `prisma db push`
 *
 * npx tsx scripts/setup-pgvector.ts
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL غير موجود في .env.local')

  const sql = neon(url)

  console.log('── تفعيل pgvector ──────────────────────────')
  await sql`CREATE EXTENSION IF NOT EXISTS vector`

  const rows = await sql`
    SELECT extname, extversion
    FROM pg_extension
    WHERE extname = 'vector'
  `

  if (rows.length === 0) throw new Error('فشل تفعيل pgvector')

  console.log(`✓ pgvector مُفعَّل — الإصدار: ${rows[0].extversion}`)
  console.log('────────────────────────────────────────────')
  console.log('الخطوة التالية: npx prisma db push')
}

main().catch(e => {
  console.error('✗', e instanceof Error ? e.message : e)
  process.exit(1)
})
