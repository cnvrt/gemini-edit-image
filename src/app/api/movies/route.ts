// src/pages/api/movies/index.ts
import { NextRequest, NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

// Create table if not exists
const initDB = async () => {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT,
      rating INTEGER,
      releaseDate TEXT,
      tags TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS hashtags (
      tag TEXT PRIMARY KEY
    )
  `);

  return db;
};

export async function GET() {
  const db = await initDB();
  const movies = await db.all('SELECT * FROM movies ORDER BY id DESC');
  return NextResponse.json(movies, { status: 200 });
}

export async function POST(req: NextRequest) {
  const db = await initDB();
  const body = await req.json();
  const { name, url, rating, releaseDate, tags } = body;

  if (!name || !tags || tags.trim() === '') {
    return NextResponse.json({ error: 'Name and tags are required.' }, { status: 400 });
  }

  const tagList = tags.split(',').map((t: string) => t.trim()).filter(Boolean);

  await db.run(
    `INSERT INTO movies (name, url, rating, releaseDate, tags)
     VALUES (?, ?, ?, ?, ?)`,
    [name, url, rating, releaseDate, tagList.join(',')]
  );

  for (const tag of tagList) {
    await db.run(`INSERT OR IGNORE INTO hashtags (tag) VALUES (?)`, [tag]);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const db = await initDB();
  const body = await req.json();
  const { id, name, url, rating, releaseDate, tags } = body;

  if (!id || !name || !tags) {
    return NextResponse.json({ error: 'ID, name and tags are required.' }, { status: 400 });
  }

  const tagList = tags.split(',').map((t: string) => t.trim()).filter(Boolean);

  await db.run(
    `UPDATE movies SET name = ?, url = ?, rating = ?, releaseDate = ?, tags = ? WHERE id = ?`,
    [name, url, rating, releaseDate, tagList.join(','), id]
  );

  for (const tag of tagList) {
    await db.run(`INSERT OR IGNORE INTO hashtags (tag) VALUES (?)`, [tag]);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const db = await initDB();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));

  if (!id) {
    return NextResponse.json({ error: 'Movie ID is required.' }, { status: 400 });
  }

  await db.run('DELETE FROM movies WHERE id = ?', id);
  return NextResponse.json({ success: true }, { status: 200 });
}
