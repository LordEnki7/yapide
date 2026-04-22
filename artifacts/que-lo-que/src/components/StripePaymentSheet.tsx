import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, X } from "lucide-react";

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

async function getStripe() {
  if (!stripePromise) {
    const res = await fetch(`${API}/api/payments/config`, { credentials: "include" });
    const { publishableKey } = await res.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface Props {
  amountDOP: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message ?? "Error al procesar");
      setLoading(false);
      return;
    }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmErr) {
      setError(confirmErr.message ?? "Pago rechazado");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setError("El pago no fue completado. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { name: "auto" } },
        }}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-14 rounded-2xl font-black text-lg bg-[#FFD700] text-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
      >
        {loading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <>
            <Lock size={18} />
            Pagar con tarjeta
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full h-11 rounded-2xl font-bold text-sm text-white/60 hover:text-white transition"
      >
        Cancelar
      </button>

      <p className="text-center text-[10px] text-white/30 flex items-center justify-center gap-1">
        <Lock size={9} /> Pago seguro con Stripe
      </p>
    </form>
  );
}

export default function StripePaymentSheet({ amountDOP, onSuccess, onCancel }: Props) {
  const [stripe, setStripe] = useState<Awaited<ReturnType<typeof loadStripe>> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [s, intentRes] = await Promise.all([
          getStripe(),
          fetch(`${API}/api/payments/create-intent`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: Math.round(amountDOP * 100), currency: "dop" }),
          }),
        ]);

        if (!intentRes.ok) {
          const data = await intentRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Error al iniciar el pago");
        }

        const { clientSecret: cs } = await intentRes.json();
        if (!cancelled) {
          setStripe(s);
          setClientSecret(cs);
        }
      } catch (err: any) {
        if (!cancelled) setInitError(err.message ?? "Error de conexión");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [amountDOP]);

  if (initError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4">
        <p className="text-red-400 text-sm text-center">⚠️ {initError}</p>
        <button onClick={onCancel} className="text-white/60 text-sm underline">Volver</button>
      </div>
    );
  }

  if (!stripe || !clientSecret) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader2 size={28} className="animate-spin text-[#FFD700]" />
        <p className="text-white/50 text-sm">Preparando pago seguro…</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#FFD700",
            colorBackground: "#0d2057",
            colorText: "#ffffff",
            colorDanger: "#f87171",
            borderRadius: "12px",
            fontFamily: "system-ui, sans-serif",
          },
        },
      }}
    >
      <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
