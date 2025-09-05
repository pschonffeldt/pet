export async function POST(request: Request) {
  const body = await request.text();

  //   return 200 ok
  return Response.json(null, { status: 200 });
}
