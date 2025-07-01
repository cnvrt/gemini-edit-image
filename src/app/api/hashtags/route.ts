// src/app/api/hashtags/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db'; // Apna PostgreSQL pool import karo

export async function GET() {
  try {
    // Humara 'hashtags' table pehle se production DB mein bana hua hai
    const result = await pool.query('SELECT tag FROM hashtags ORDER BY tag ASC');
    
    // pg se result .rows mein aata hai. Hum bas 'tag' property nikalenge.
    const tags = result.rows.map(row => row.tag);
    
    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch hashtags:', error);
    return NextResponse.json({ error: 'Failed to fetch hashtags' }, { status: 500 });
  }
}