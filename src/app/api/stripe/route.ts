// src/app/api/stripe/webhook/route.ts
import prisma from "@/lib/db";
import Stripe from "stripe";

export const runtime = "nodejs"; // force Node runtime
export const dynamic = "force-dynamic"; // disable caching

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    console.error("Webhook missing signature header");
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email;
      if (email) {
        const res = await prisma.user.updateMany({
          where: { email },
          data: { hasAccess: true },
        });
        console.info("Webhook: updated user access", {
          email,
          count: res.count,
        });
      } else {
        console.warn(
          "Webhook: checkout.session.completed with no customer_email"
        );
      }
    } else {
      console.log("Unhandled event type:", event.type);
    }
  } catch (err) {
    // Log and still 200 so Stripe doesn't retry forever
    console.error("Webhook handler error:", err);
  }

  return Response.json({ received: true }, { status: 200 });
}
