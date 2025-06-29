// src/pages/api/movies/[id].ts
import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ error: 'Movie ID is required.' }, { status: 400 });
  }

  const db = await openDb();
  const movie = await db.get('SELECT * FROM movies WHERE id = ?', Number(id));

  if (!movie) {
    return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
  }

  return NextResponse.json(movie, { status: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const db = await openDb();
  const result = await db.run('DELETE FROM movies WHERE id = ?', Number(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}