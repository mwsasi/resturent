
import React, { useState, useEffect } from 'react';
import { ViewState, MenuItem, Order, CartItem, ItemVariation } from './types';
import { INITIAL_MENU } from './constants';
import POSView from './components/POSView';
import AdminView from './components/AdminView';
import ReportsView from './components/ReportsView';
import Header from './components/Header';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('supreme_fc_menu');
    return saved ? JSON.parse(saved) : INITIAL_MENU;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('supreme_fc_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    localStorage.setItem('supreme_fc_menu', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('supreme_fc_orders', JSON.stringify(orders));
  }, [orders]);

  const updateInventory = (itemsToDecrement: CartItem[]) => {
    setMenu(prevMenu => prevMenu.map(menuItem => {
      const soldItems = itemsToDecrement.filter(i => i.id === menuItem.id);
      if (soldItems.length > 0) {
        let updatedItem = { ...menuItem };
        
        soldItems.forEach(sold => {
          if (sold.selectedVariation && updatedItem.variations) {
            updatedItem.variations = updatedItem.variations.map(v => 
              v.id === sold.selectedVariation?.id 
                ? { ...v, stock: Math.max(0, v.stock - sold.quantity) }
                : v
            );
          } else {
            updatedItem.stock = Math.max(0, updatedItem.stock - sold.quantity);
          }
        });
        
        return updatedItem;
      }
      return menuItem;
    }));
  };

  const addToCart = (item: MenuItem, variation?: ItemVariation) => {
    const existingInCart = cart.find(i => 
      variation 
        ? (i.id === item.id && i.selectedVariation?.id === variation.id)
        : (i.id === item.id && !i.selectedVariation)
    );

    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;
    const availableStock = variation ? variation.stock : item.stock;
    
    if (currentQtyInCart >= availableStock) {
      alert(`Stock limit reached for ${item.name}.`);
      return;
    }

    setCart(prev => {
      if (existingInCart) {
        return prev.map(i => {
          const isMatch = variation 
            ? (i.id === item.id && i.selectedVariation?.id === variation.id)
            : (i.id === item.id && !i.selectedVariation);
          return isMatch ? { ...i, quantity: i.quantity + 1 } : i;
        });
      }
      return [...prev, { ...item, quantity: 1, selectedVariation: variation }];
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => {
      const currentKey = item.selectedVariation ? `${item.id}-${item.selectedVariation.id}` : item.id;
      return currentKey !== cartKey;
    }));
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(i => {
      const currentKey = i.selectedVariation ? `${i.id}-${i.selectedVariation.id}` : i.id;
      if (currentKey === cartKey) {
        const menuItem = menu.find(m => m.id === i.id);
        const availableStock = i.selectedVariation ? i.selectedVariation.stock : (menuItem?.stock || 0);
        if (delta > 0 && i.quantity >= availableStock) return i;
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const completeOrder = (type: 'dine-in' | 'takeaway', tableNumber?: string) => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((acc, item) => {
      const price = item.selectedVariation ? item.selectedVariation.price : item.price;
      return acc + (price * item.quantity);
    }, 0);
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
    updateInventory(cart);
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
          const existingIndex = updatedItems.findIndex(i => 
            newItem.selectedVariation 
              ? (i.id === newItem.id && i.selectedVariation?.id === newItem.selectedVariation.id)
              : (i.id === newItem.id && !i.selectedVariation)
          );
          if (existingIndex > -1) {
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + newItem.quantity
            };
          } else {
            updatedItems.push({ ...newItem });
          }
        });
        const newSubtotal = updatedItems.reduce((acc, i) => {
          const price = i.selectedVariation ? i.selectedVariation.price : i.price;
          return acc + (price * i.quantity);
        }, 0);
        return { ...order, items: updatedItems, total: newSubtotal, grandTotal: newSubtotal };
      }
      return order;
    }));
    updateInventory(cart);
    clearCart();
    return orders.find(o => o.id === orderId);
  };

  const updateOrderStatus = (orderId: string, status: Order['status'], paymentMethod?: Order['paymentMethod']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status, paymentMethod: paymentMethod || order.paymentMethod } : order
    ));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header currentView={view} setView={setView} />
      <main className="flex-1 overflow-hidden bg-slate-100">
        {view === 'pos' && (
          <POSView 
            menu={menu} cart={cart} orders={orders}
            addToCart={addToCart} updateQuantity={updateQuantity}
            removeFromCart={removeFromCart} clearCart={clearCart}
            completeOrder={completeOrder} appendItemsToOrder={appendItemsToOrder}
            updateOrderStatus={updateOrderStatus}
          />
        )}
        {view === 'admin' && <AdminView menu={menu} setMenu={setMenu} />}
        {view === 'reports' && <ReportsView orders={orders} />}
      </main>
      <footer className="bg-white border-t py-1 px-4 text-center text-[10px] text-slate-400 no-print flex items-center justify-center gap-2">
        <span className="font-bold">SUPREME FOOD COURT</span>
        <span className="opacity-50">v2.0.0 (Mobile Optimized)</span>
      </footer>
    </div>
  );
};

export default App;
