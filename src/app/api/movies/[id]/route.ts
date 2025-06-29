// src/app/api/movies/[id]/route.ts
import { NextRequest, NextResponse} from 'next/server';
import { openDb } from '@/lib/db';

export async function GET( req: NextRequest ) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  // const pattern = new URLPattern({ pathname: '/api/movies/:id' });
  // const match = pattern.exec(req.nextUrl.pathname);
  // const id = match?.pathname.groups.id;
  // const id = params.id;

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

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  // const { id } = params;

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