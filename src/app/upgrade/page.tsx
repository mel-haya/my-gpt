"use client";

import convertToSubcurrency from "@/lib/convertToSubcurrency";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

function StripePaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!stripe || !elements) {
      setError("Stripe is not loaded");
      setLoading(false);
      return;
    }
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Optionally, you can specify a return_url here

      },
      redirect: "if_required",
    });
    if (error) {
      setError(error.message || "Payment failed");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return <div className="text-green-400 font-bold mt-4">Payment successful! 🎉</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
      <PaymentElement />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <button
        type="submit"
        className="w-full py-3 rounded-lg font-bold text-lg bg-linear-to-r from-blue-500 to-purple-500 text-white shadow-lg cursor-pointer hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-60"
        disabled={!stripe || loading}
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";


export default function UpgradePage() {
  const SUBSCRIPTION_PRICE = 8;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const { userId } = useAuth();

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env variable");
  }
  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );


  // Only fetch client secret when user clicks Upgrade
  const handleUpgradeClick = async () => {
    if (clientSecret) {
      setShowPayment(true);
      return;
    }
    const res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: convertToSubcurrency(SUBSCRIPTION_PRICE),
        userId: userId,
      }),
    });
    const data = await res.json();
    setClientSecret(data.clientSecret);
    setShowPayment(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-[#18181b] to-[#312e81] text-white font-sans">
        <div className="flex justify-start mb-4 fixed top-8 left-8">
          <Link 
            href="/"
            className="text-[#c7d2fe] hover:text-blue-400 transition-colors flex items-center gap-2 text-sm"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      <div className="bg-[#232336]/90 rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center border border-[#312e81]">
        <h1 className="text-3xl font-bold mb-3 bg-linear-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          Upgrade to Pro
        </h1>
        <p className="text-base mb-5 text-[#c7d2fe]">
          <span className="font-semibold text-blue-400">
            No more daily limits
          </span>{" "}
          <br />
          <span className="font-semibold text-purple-400">
            Access to advanced models
          </span>{" "}
          <br />
          <span className="text-[#a1a1aa]">Priority support &amp; more</span>
        </p>
        <div className="text-4xl font-extrabold text-blue-400 mb-2">
          ${SUBSCRIPTION_PRICE}
          <span className="text-base text-[#a1a1aa] font-normal">/month</span>
        </div>
        {!showPayment && (
          <button
            className="w-full mt-4 py-3 rounded-lg font-bold text-lg bg-linear-to-r from-blue-500 to-purple-500 text-white shadow-lg cursor-pointer hover:from-blue-600 hover:to-purple-600 transition-colors"
            onClick={handleUpgradeClick}
          >
            Upgrade
          </button>
        )}
        {showPayment && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
              },
            }}
          >
            <StripePaymentForm />
          </Elements>
        )}
      </div>
    </div>
  );
}
