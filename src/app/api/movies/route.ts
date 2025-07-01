// src/app/api/movies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // Yahan hum apna banaya hua 'pool' import karenge

// Helper function to process tags
const processAndStoreTags = async (tagsString: string): Promise<string[]> => {
  if (!tagsString || typeof tagsString !== 'string') return [];
  
  const uniqueTags = [
    ...new Set(
      tagsString.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag)
    )
  ];

  if (uniqueTags.length > 0) {
    // ON CONFLICT...DO NOTHING PostgreSQL ke liye 'INSERT OR IGNORE' ka kaam karta hai
    const query = 'INSERT INTO hashtags (tag) VALUES ($1) ON CONFLICT (tag) DO NOTHING;';
    const client = await pool.connect();
    try {
      // Transaction use karna best practice hai jab multiple inserts karne ho
      await client.query('BEGIN');
      for (const tag of uniqueTags) {
          await client.query(query, [tag]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  return uniqueTags;
};

// GET: Saare movies fetch karne ke liye
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM movies ORDER BY name ASC');
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch movies:', error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
}

// POST: Nayi movie add karne ke liye
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, rating, releaseDate, tags } = body;

    const trimmedName = name?.trim();
    if (!trimmedName || !tags) {
      return NextResponse.json({ error: 'Name and tags are required.' }, { status: 400 });
    }

    const processedTagsArray = await processAndStoreTags(tags);
    if (processedTagsArray.length === 0) {
      return NextResponse.json({ error: 'At least one valid tag is required.' }, { status: 400 });
    }
    const finalTagsString = processedTagsArray.join(',');

    const query = `
      INSERT INTO movies (name, url, rating, releaseDate, tags) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`; // RETURNING * se poora naya record wapas mil jayega
    
    // Parameters ko ek array mein pass karte hain
    const values = [trimmedName, url || null, rating || null, releaseDate || null, finalTagsString];
    
    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 }); // 201 Created status
  } catch (error: any) {
    console.error('Failed to add movie:', error);
    // PostgreSQL unique violation error code
    if (error.code === '23505') {
      return NextResponse.json({ error: `Movie with name "${error.constraint}" already exists.` }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ error: 'Failed to add movie' }, { status: 500 });
  }
}

// PUT: Movie update karne ke liye
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, url, rating, releaseDate, tags } = body;

    const trimmedName = name?.trim();
    if (!id || !trimmedName || !tags) {
      return NextResponse.json({ error: 'ID, name, and tags are required.' }, { status: 400 });
    }

    const processedTagsArray = await processAndStoreTags(tags);
    if (processedTagsArray.length === 0) {
      return NextResponse.json({ error: 'At least one valid tag is required.' }, { status: 400 });
    }
    const finalTagsString = processedTagsArray.join(',');

    const query = `
      UPDATE movies 
      SET name = $1, url = $2, rating = $3, releaseDate = $4, tags = $5 
      WHERE id = $6
      RETURNING *`; // Updated record wapas lene ke liye

    const values = [trimmedName, url || null, rating || null, releaseDate || null, finalTagsString, id];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    console.error('Failed to update movie:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: `Another movie with this name already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
  }
}

// DELETE: Movie delete karne ke liye
export async function DELETE(req: NextRequest) {
  try {
    // App router mein 'id' search parameter se aayega
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'A valid movie ID is required.' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM movies WHERE id = $1', [Number(id)]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Movie deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete movie:', error);
    return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
  }
}