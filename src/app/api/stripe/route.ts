import prisma from "@/lib/db";
import Stripe from "stripe";

export const runtime = "nodejs"; // ensure Node runtime (not Edge)
export const dynamic = "force-dynamic"; // optional; avoids caching

// Use the SDK's default pinned API version to avoid TS literal mismatches
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Webhook missing signature header");
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
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
          console.warn("No customer_email on checkout.session.completed");
          break;
        }

        // updateMany: don't throw if user not found; just log
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
    console.error("Webhook handler error:", err);
    // still acknowledge so Stripe doesn't retry forever
  }

  return Response.json({ received: true }, { status: 200 });
}
