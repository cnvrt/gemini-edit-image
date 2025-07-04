// src/app/api/movies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Ek specific movie ko ID se GET karne ke liye
export async function GET(
  req: NextRequest,
  { params }: any
) {
  try {
    // const { searchParams } = new URL(req.url);
    // const id = Number(searchParams.get('id'));
    const id = params.id; // App router mein dynamic part 'params' se milta hai

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'A valid movie ID is required.' }, { status: 400 });
    }

    const query = 'SELECT * FROM movies WHERE id = $1';
    const result = await pool.query(query, [Number(id)]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch movie:`, error);
    return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 });
  }
}

// Ek specific movie ko ID se DELETE karne ke liye
export async function DELETE(
  req: NextRequest,
  { params }: any
) {
  try {
    const id = params.id;
    // const { searchParams } = new URL(req.url);
    // const id = Number(searchParams.get('id'));

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'A valid movie ID is required.' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM movies WHERE id = $1', [Number(id)]);

    // rowCount se check karenge ki kuch delete hua ya nahi
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Movie deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete movie:`, error);
    return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
  }
}