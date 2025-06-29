// src/pages/api/movies/hashtags.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET(req: Request) {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS hashtags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT UNIQUE
    )
  `);
  const tags = await db.all('SELECT tag FROM hashtags ORDER BY tag ASC');
//   res.status(200).json(tags.map((t: { tag: any; }) => t.tag));
//   return NextResponse.json(tags.map((t: { tag: any; }) => t.tag),{status:200})
    return new Response(JSON.stringify(tags.map((t: { tag: any; }) => t.tag)), {
        status: 200,
        headers: {
        'Content-Type': 'application/json',
        },
    });
}
