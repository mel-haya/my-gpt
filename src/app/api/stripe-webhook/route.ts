import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { addSubscription } from "@/services/subscriptionService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody, // convert ArrayBuffer to Buffer
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error verifying Stripe webhook signature:", err);
      return NextResponse.json({ error: err }, { status: 400 });
    } else {
      console.error("Unknown error verifying Stripe webhook signature");
      return NextResponse.json({ error: "Unknown error" }, { status: 400 });
    }
  }
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const userId = paymentIntent.metadata.userId;

    // Log the payment intent object for inspection
    console.log("Stripe payment_intent.succeeded:", {
      paymentIntentId: paymentIntent.id,
      userId: userId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });

    // Here you can use the userId to update user subscription status in your database
    // Example: await updateUserSubscription(userId, 'pro');
    await addSubscription(userId);

    return NextResponse.json(
      {
        received: true,
        userId: userId,
        message: "Payment successful",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ received: true });
}
