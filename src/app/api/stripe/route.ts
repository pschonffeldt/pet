import prisma from "@/lib/db";

export async function POST(request: Request) {
  const data = await request.json();

  //   verify webhook came from stripe

  //   fulfill order
  await prisma.user.update({
    where: {
      email: data.data.object.customer_email,
    },
    data: {
      hasAccess: true,
    },
  });

  //   return 200 ok
  return Response.json(null, { status: 200 });
}
