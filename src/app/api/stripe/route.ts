import prisma from "@/lib/db";
import Stripe from "stripe";

export const runtime = "nodejs"; // ensure Node runtime
export const dynamic = "force-dynamic"; // avoid caching

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    console.error("Webhook missing signature header");
    // 400 is the correct response for missing/invalid signature
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Webhook verification failed", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email;
        if (!email) {
          console.warn("No customer_email on session; skipping update.");
          break;
        }
        const res = await prisma.user.updateMany({
          where: { email },
          data: { hasAccess: true },
        });
        if (res.count === 0) {
          console.warn("Webhook: no user updated for email:", email);
        } else {
          console.info("Webhook: access granted for:", email);
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    // Log but still return 200 so Stripe doesn't retry forever
    console.error("Webhook handler error:", err);
  }

  return Response.json({ received: true }, { status: 200 });
}
