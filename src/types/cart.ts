/**
 * Cart types — used by CartProvider and cart feature.
 */
export interface CartItem {
  productId: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  name: string;
  image: string;
}

export interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, sizeLabel: string) => void;
  updateQuantity: (productId: string, sizeLabel: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}
