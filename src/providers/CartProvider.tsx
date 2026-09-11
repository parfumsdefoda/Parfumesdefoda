"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  name: string;
  image: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, sizeLabel: string) => void;
  updateQuantity: (productId: string, sizeLabel: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function useCartDrawerOpen(): boolean {
  const context = useContext(DrawerOpenContext);
  if (!context) {
    throw new Error("useCartDrawerOpen must be used within a CartProvider");
  }
  return context;
}

const DrawerOpenContext = createContext<boolean | undefined>(undefined);


const STORAGE_KEY = "parfumsdefoda-cart";

/**
 * Safely reads cart from localStorage.
 * Only called client-side after hydration.
 */
function readCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * CartProvider manages the shopping cart state.
 * Cart is persisted to localStorage so it survives page refreshes.
 *
 * Hydration strategy:
 * - Initialize with [] (matches server render — no hydration mismatch)
 * - In useEffect (client-only), read localStorage and update items
 * - Badge naturally appears after hydration (cartCount > 0)
 *
 * Future enhancement: Replace with Zustand store for better performance.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const isFirstRender = useRef(true);

  // Hydrate from localStorage after mount (client-only)
  // Server renders []; client first render also []; effect loads stored items.
  // This prevents hydration mismatch (lazy init reads localStorage on client but not server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrating from external store on mount
    setItems(readCartFromStorage());
  }, []);

  // Persist to localStorage on change (skip initial hydration)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Silently fail
    }
  }, [items]);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === newItem.productId && item.sizeLabel === newItem.sizeLabel,
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === newItem.productId && item.sizeLabel === newItem.sizeLabel
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string, sizeLabel: string) => {
    setItems((prev) =>
      prev.filter(
        (item) => !(item.productId === productId && item.sizeLabel === sizeLabel),
      ),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, sizeLabel: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, sizeLabel);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId && item.sizeLabel === sizeLabel
            ? { ...item, quantity }
            : item,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail
    }
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const [drawerOpen, setDrawerOpenState] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpenState(true), []);
  const closeDrawer = useCallback(() => setDrawerOpenState(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      <DrawerOpenContext.Provider value={drawerOpen}>
        {children}
      </DrawerOpenContext.Provider>
    </CartContext.Provider>
  );
}
