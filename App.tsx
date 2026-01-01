
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, MenuItem, Order, CartItem } from './types';
import { INITIAL_MENU } from './constants';
import POSView from './components/POSView';
import AdminView from './components/AdminView';
import ReportsView from './components/ReportsView';
import Header from './components/Header';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('spice_route_menu');
    return saved ? JSON.parse(saved) : INITIAL_MENU;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('spice_route_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    localStorage.setItem('spice_route_menu', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('spice_route_orders', JSON.stringify(orders));
  }, [orders]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const completeOrder = (type: 'dine-in' | 'takeaway', tableNumber?: string) => {
    if (cart.length === 0) return;
    
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      items: [...cart],
      total: subtotal,
      tax: 0,
      grandTotal: subtotal,
      date: new Date().toISOString(),
      status: 'pending',
      type: type,
      tableNumber: tableNumber
    };

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const appendItemsToOrder = (orderId: string) => {
    if (cart.length === 0) return;

    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const updatedItems = [...order.items];
        
        cart.forEach(newItem => {
          const existingIndex = updatedItems.findIndex(i => i.id === newItem.id);
          if (existingIndex > -1) {
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + newItem.quantity
            };
          } else {
            updatedItems.push({ ...newItem });
          }
        });

        const newSubtotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        
        return {
          ...order,
          items: updatedItems,
          total: newSubtotal,
          grandTotal: newSubtotal
        };
      }
      return order;
    }));
    
    const updatedOrder = orders.find(o => o.id === orderId);
    clearCart();
    return updatedOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status'], paymentMethod?: Order['paymentMethod']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status, paymentMethod: paymentMethod || order.paymentMethod } : order
    ));
  };

  const updateMenu = (newMenu: MenuItem[]) => setMenu(newMenu);

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentView={view} setView={setView} />
      
      <main className="flex-1 overflow-hidden bg-slate-50">
        {view === 'pos' && (
          <POSView 
            menu={menu} 
            cart={cart}
            orders={orders}
            addToCart={addToCart} 
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            completeOrder={completeOrder}
            appendItemsToOrder={appendItemsToOrder}
            updateOrderStatus={updateOrderStatus}
          />
        )}
        {view === 'admin' && (
          <AdminView menu={menu} setMenu={updateMenu} />
        )}
        {view === 'reports' && (
          <ReportsView orders={orders} />
        )}
      </main>

      <footer className="bg-white border-t py-2 px-4 text-center text-xs text-slate-400 no-print">
        &copy; 2024 SpiceRoute Restaurant Management. v1.0.0
      </footer>
    </div>
  );
};

export default App;
