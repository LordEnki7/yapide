import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { useCreateOrder, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2, MapPin, CreditCard, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CustomerCart() {
  const { items, removeItem, updateQuantity, clearCart, totalAmount, businessId } = useCart();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const DELIVERY_FEE = 175;

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        clearCart();
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        navigate(`/customer/orders/${order.id}`);
        toast({ title: t.orderSent, description: t.orderOnWay });
      },
      onError: () => {
        toast({ title: t.error, description: t.orderError, variant: "destructive" });
      },
    },
  });

  const handleOrder = () => {
    if (!address.trim()) {
      toast({ title: t.missingAddress, description: t.addressRequired, variant: "destructive" });
      return;
    }
    if (!businessId) return;

    createOrder.mutate({
      businessId,
      paymentMethod,
      deliveryAddress: address,
      notes: notes || undefined,
      items: items.map(i => ({ productId: i.productId!, quantity: i.quantity })),
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-black mb-2">{t.emptyCart}</h2>
        <p className="text-gray-400 mb-8">{t.emptyCartMsg}</p>
        <Link href="/customer">
          <Button className="bg-yellow-400 text-black font-bold hover:bg-yellow-300">{t.exploreBusinesses}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/customer">
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.yourOrder}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {items.map((item, idx) => (
            <div key={item.productId} className={`flex items-center gap-3 p-4 ${idx < items.length - 1 ? "border-b border-white/5" : ""}`}>
              {item.product.imageUrl && (
                <img src={item.product.imageUrl} alt={item.product.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{item.product.name}</p>
                <p className="text-yellow-400 font-bold text-sm">{formatDOP(item.product.price)} × {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.productId!, item.quantity - 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm hover:bg-white/20">-</button>
                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId!, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm hover:bg-white/20">+</button>
                <button onClick={() => removeItem(item.productId!)} className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition ml-1">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-yellow-400" />
            <h3 className="font-bold">{t.deliveryAddress}</h3>
          </div>
          <Input
            placeholder={t.addressPlaceholder}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            data-testid="input-address"
          />
          <Textarea
            placeholder={t.specialInstructions}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 mt-3 resize-none"
            rows={2}
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-bold mb-3">{t.paymentMethod}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMethod === "cash" ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5"}`}
              data-testid="payment-cash"
            >
              <Banknote size={24} className={paymentMethod === "cash" ? "text-yellow-400" : "text-gray-400"} />
              <span className={`text-sm font-bold ${paymentMethod === "cash" ? "text-yellow-400" : "text-gray-400"}`}>{t.cash}</span>
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMethod === "card" ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5"}`}
              data-testid="payment-card"
            >
              <CreditCard size={24} className={paymentMethod === "card" ? "text-yellow-400" : "text-gray-400"} />
              <span className={`text-sm font-bold ${paymentMethod === "card" ? "text-yellow-400" : "text-gray-400"}`}>{t.card}</span>
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>{t.subtotal}</span>
            <span>{formatDOP(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>{t.delivery}</span>
            <span>{formatDOP(DELIVERY_FEE)}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between font-black text-lg">
            <span>{t.total}</span>
            <span className="text-yellow-400">{formatDOP(totalAmount + DELIVERY_FEE)}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-yellow-400/20 z-20">
        <Button
          className="w-full bg-yellow-400 text-black font-black text-lg h-14 hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50"
          onClick={handleOrder}
          disabled={createOrder.isPending}
          data-testid="button-place-order"
        >
          {createOrder.isPending ? t.placing : t.orderNow(formatDOP(totalAmount + DELIVERY_FEE))}
        </Button>
      </div>
    </div>
  );
}
