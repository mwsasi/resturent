
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  tax: number;
  grandTotal: number;
  date: string; // ISO string
  status: 'paid' | 'pending';
}

export type ViewState = 'pos' | 'admin' | 'reports';
