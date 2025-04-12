export async function GET(request: Request) {
    const host = request.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/admob/real`);
    const real = await res.json();
    const my_json=[
        {
            APP_AD_ID:"ca-app-pub-3940256099942544~3347511713",
            Banner_AD_UNIT_ID:"ca-app-pub-3940256099942544/6300978111",
            REWARDED_AD_UNIT_ID:"ca-app-pub-3940256099942544/5224354917"
        },
        {
            APP_AD_ID : process.env.APP_AD_ID,
            Banner_AD_UNIT_ID : process.env.Banner_AD_UNIT_ID,
            REWARDED_AD_UNIT_ID : process.env.REWARDED_AD_UNIT_ID
        }
    ];
    return Response.json(my_json[real]);
}