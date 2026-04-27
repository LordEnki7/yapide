import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { OrderItemInput, Product } from "@workspace/api-client-react";

export type CartItem = OrderItemInput & {
  product: Product;
  note?: string;
};

interface CartContextType {
  items: CartItem[];
  businessId: number | null;
  businessCategory: string | null;
  addItem: (product: Product, quantity: number, category?: string) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateNote: (productId: number, note: string) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("qlq_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [businessId, setBusinessId] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem("qlq_cart_business");
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const [businessCategory, setBusinessCategory] = useState<string | null>(() => {
    try {
      return localStorage.getItem("qlq_cart_category") ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem("qlq_cart", JSON.stringify(items));
    if (businessId) {
      localStorage.setItem("qlq_cart_business", businessId.toString());
    } else {
      localStorage.removeItem("qlq_cart_business");
    }
    if (businessCategory) {
      localStorage.setItem("qlq_cart_category", businessCategory);
    } else {
      localStorage.removeItem("qlq_cart_category");
    }
  }, [items, businessId, businessCategory]);

  const addItem = (product: Product, quantity: number, category?: string) => {
    setItems((current) => {
      if (businessId !== null && businessId !== product.businessId) {
        setBusinessId(product.businessId);
        setBusinessCategory(category ?? null);
        return [{ productId: product.id, quantity, product }];
      }

      setBusinessId(product.businessId);
      if (category) setBusinessCategory(category);
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, { productId: product.id, quantity, product }];
    });
  };

  const removeItem = (productId: number) => {
    setItems((current) => {
      const updated = current.filter((item) => item.productId !== productId);
      if (updated.length === 0) setBusinessId(null);
      return updated;
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateNote = (productId: number, note: string) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, note: note.trim() || undefined } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setBusinessId(null);
    setBusinessCategory(null);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        businessId,
        businessCategory,
        addItem,
        removeItem,
        updateQuantity,
        updateNote,
        clearCart,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
