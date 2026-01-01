
export interface ItemVariation {
  id: string;
  label: string; // e.g., "Small", "500ml", "Full"
  price: number;
  stock: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number; // Base price or fallback
  category: string;
  image: string;
  description: string;
  stock: number; // Overall or base stock
  minStock?: number;
  variations?: ItemVariation[]; // Optional sizes/volumes
  piecesPerSet?: number; // New: Number of pieces in one order/set
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariation?: ItemVariation;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  tax: number;
  grandTotal: number;
  date: string;
  status: 'paid' | 'pending' | 'delivered';
  type: 'dine-in' | 'takeaway';
  tableNumber?: string;
  paymentMethod?: 'cash' | 'qr';
}

export type ViewState = 'pos' | 'admin' | 'reports';
