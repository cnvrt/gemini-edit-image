// src/lib/db.ts
import { Pool } from 'pg';

// TypeScript ko batane ke liye ki hum global scope par ek custom property add kar rahe hain.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool;
}

let pool: Pool;

// Ye check development mein 'hot reloading' se baar-baar naye connection banane se rokta hai.
if (process.env.NODE_ENV === 'development') {
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: false, // Local dev mein SSL ki zaroorat nahi
    });
  }
  pool = global._pgPool;
} else {
  // Production (Vercel) mein hamesha naya pool banega
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false, // Vercel ke liye ye zaroori hai
    },
  });
}

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set.");
}

export default pool;