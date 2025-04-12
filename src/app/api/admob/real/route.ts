export async function GET() {
    const real = process.env.ADMOB_REAL || 0;
    return Response.json(real);
}