/**
 * Order types — used by checkout feature.
 */
export interface OrderFormData {
  name: string;
  phone: string;
  governorate: string;
  city: string;
  addressDetails: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sizeLabel: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Order {
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    governorate: string;
    city: string;
    addressDetails: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}
